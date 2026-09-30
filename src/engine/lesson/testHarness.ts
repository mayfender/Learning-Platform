// ตัวช่วยสำหรับเทสต์ของ engine บทเรียนเท่านั้น (ไม่ import จากโค้ด production): เล่นบทผ่าน machine อัตโนมัติตามนโยบาย
import { ADD_04 } from '@/content/lessons/ADD-04';
import { skills } from '@/content/skills';
import {
  createLessonMachine,
  type AnswerTiming,
  type LessonAction,
  type LessonEffect,
  type LessonMachine,
  type LessonRunnerState,
} from '@/engine/lesson/machine';
import { nOf, planOf } from '@/engine/lesson/feedback';
import { planSitting, planReview, type SittingPlan } from '@/engine/lesson/plan';
import {
  applyEvent,
  deriveProgress,
  initialProgress,
  type LessonProgress,
} from '@/engine/lesson/progress';
import type { LessonItem } from '@/engine/lesson/types';
import type { AppEvent, EventPayload, SkillId, StrategyId } from '@/engine/types';

export const lesson = ADD_04;
export const ctx = { lesson: ADD_04, skills };

export function counterId(): () => string {
  let n = 0;
  return () => `id-${(n += 1)}`;
}

export type FieldKind = 'gap' | 'rest' | 'total';

export interface Policy {
  // คำตอบของข้อ (ค่าเริ่มต้น = เฉลย) attempt = ครั้งที่ตอบของขั้นนี้ (เริ่ม 1)
  response?: (item: LessonItem, kind: FieldKind, attempt: number) => number | undefined;
  latencyMs?: (item: LessonItem) => number;
  latencyValid?: (item: LessonItem) => boolean;
  mind?: (item: LessonItem) => StrategyId | 'skip';
  option?: (questionId: string, attempt: number) => number | undefined;
  // บันทึกของพ่อ: null = ข้าม
  note?: {
    fingers: 'none' | 'some' | 'most';
    mouth: 'none' | 'some' | 'most';
    note?: string;
  } | null;
  challenge?: 'play' | 'later';
  // หยุดเมื่อเงื่อนไขเป็นจริง (ก่อนทำ action ถัดไป)
  stopWhen?: (run: Run) => boolean;
  maxSteps?: number;
}

export class Run {
  state: LessonRunnerState;
  events: EventPayload[] = [];
  scheduled: 'READY_DONE' | 'ACK_DONE' | null = null;
  steps = 0;

  constructor(
    readonly machine: LessonMachine,
    readonly plan: SittingPlan,
  ) {
    this.state = machine.initial();
  }

  do(action: LessonAction): LessonEffect[] {
    const { state, effects } = this.machine.transition(this.state, action);
    this.state = state;
    for (const e of effects) {
      if (e.type === 'emit') this.events.push(e.event);
      else this.scheduled = e.action;
    }
    return effects;
  }

  fire(): void {
    const a = this.scheduled;
    if (!a) throw new Error('ไม่มี schedule');
    this.scheduled = null;
    this.do({ type: a });
  }

  get phase(): LessonRunnerState['phase'] {
    return this.state.phase;
  }

  types(): string[] {
    return this.events.map((e) => e.type);
  }

  of<T extends EventPayload['type']>(type: T): Extract<EventPayload, { type: T }>[] {
    return this.events.filter((e): e is Extract<EventPayload, { type: T }> => e.type === type);
  }
}

export function newRun(plan: SittingPlan, ids = counterId()): Run {
  return new Run(createLessonMachine(lesson, plan, { skills, newId: ids }), plan);
}

// แผนครั้งที่ปัจจุบันจาก log (ว่าง = ครั้งที่ 1)
export function planFor(events: readonly AppEvent[] = [], seed = 1): SittingPlan {
  return planSitting(ctx, deriveProgress(lesson, skills, events), { seed });
}

export function reviewPlan(skillIds: SkillId[], seed = 1): SittingPlan {
  return planReview(ctx, initialProgress(lesson), skillIds, { seed });
}

const answerTiming = (item: LessonItem, policy: Policy, at: number): AnswerTiming => ({
  latencyMs: policy.latencyMs?.(item) ?? 1000,
  latencyValid: policy.latencyValid?.(item) ?? true,
  flashInterrupted: false,
  answeredAt: new Date(at).toISOString(),
});

function correctFor(item: LessonItem, kind: FieldKind): number {
  if (kind === 'gap') return 10 - nOf(item);
  if (kind === 'rest') return planOf(item).rest;
  return item.expected;
}

const TERMINAL = new Set(['sitting-end', 'stopped']);

// เล่นจนจบครั้ง (หรือจน stopWhen) ตามนโยบาย
export function play(run: Run, policy: Policy = {}): Run {
  const max = policy.maxSteps ?? 5000;
  const attempts = new Map<string, number>();
  let clock = Date.UTC(2026, 0, 1);
  while (!TERMINAL.has(run.phase.kind)) {
    if (policy.stopWhen?.(run)) return run;
    run.steps += 1;
    if (run.steps > max) throw new Error(`เล่นไม่จบใน ${max} ขั้น phase=${run.phase.kind}`);
    clock += 1000;
    const phase = run.phase;
    switch (phase.kind) {
      case 'sitting-intro':
        run.do({ type: 'START' });
        break;
      case 'block-intro':
        run.do({ type: 'BLOCK_GO' });
        break;
      case 'item': {
        const { item, view } = phase;
        if (view.stage === 'ready' || view.stage === 'ack') run.fire();
        else if (view.stage === 'show') run.do({ type: 'FLASH_END' });
        else if (view.stage === 'mind') {
          const wanted = policy.mind?.(item) ?? 'see-box';
          // ข้อที่บังคับถาม (A3/B4) ข้ามไม่ได้ ใช้ see-box แทน
          const pick = wanted === 'skip' && view.mind === 'required' ? 'see-box' : wanted;
          if (pick === 'skip') run.do({ type: 'STRATEGY_SKIP' });
          else run.do({ type: 'STRATEGY_PICK', strategyId: pick, strategyLatencyMs: 900 });
        } else if (view.stage === 'feedback') run.do({ type: 'NEXT' });
        else {
          // answering
          const timing = answerTiming(item, policy, clock);
          if (item.flow === 'guided-move' && view.sub === 'move') {
            const p = planOf(item);
            for (let i = 0; i < p.gap; i += 1) {
              run.do({ type: 'MOVE_DOT', cellIndex: p.boxDots + i });
            }
          } else if (item.flow === 'teach-flash-make' && (item.fields ?? []).length === 3) {
            const key = `${item.id}`;
            const attempt = (attempts.get(key) ?? 0) + 1;
            attempts.set(key, attempt);
            run.do({
              type: 'SUBMIT_FIELDS',
              values: {
                gap: policy.response?.(item, 'gap', attempt) ?? correctFor(item, 'gap'),
                rest: policy.response?.(item, 'rest', attempt) ?? correctFor(item, 'rest'),
                total: policy.response?.(item, 'total', attempt) ?? correctFor(item, 'total'),
              },
              ...timing,
            });
          } else {
            const kind: FieldKind =
              item.flow === 'guided-move'
                ? (view.sub as FieldKind)
                : item.problem.kind === 'missing-part'
                  ? 'gap'
                  : 'total';
            const key = `${item.id}/${kind}`;
            const attempt = (attempts.get(key) ?? 0) + 1;
            attempts.set(key, attempt);
            run.do({
              type: 'SUBMIT',
              response: policy.response?.(item, kind, attempt) ?? correctFor(item, kind),
              ...timing,
            });
          }
        }
        break;
      }
      case 'compare': {
        const view = phase.view;
        if (view.stage === 'move') {
          view.boards.forEach((b, board) => {
            for (let i = b.boxDots; i < 10; i += 1) {
              run.do({ type: 'MOVE_DOT', cellIndex: i, board: board as 0 | 1 });
            }
          });
        } else if (view.stage === 'rule') run.do({ type: 'NEXT' });
        else {
          const q = view.question!;
          const attempt = view.attempts + 1;
          run.do({
            type: 'OPTION_PICK',
            value: policy.option?.(q.id, attempt) ?? q.expected,
            latencyMs: 1000,
            latencyValid: true,
            flashInterrupted: false,
            answeredAt: new Date(clock).toISOString(),
          });
        }
        break;
      }
      case 'rule':
      case 'tell-parent':
      case 'round-end':
        run.do({ type: 'NEXT' });
        break;
      case 'challenge': {
        const view = phase.view;
        if (view.step === 'intro') {
          run.do({ type: policy.challenge === 'later' ? 'CHALLENGE_LATER' : 'CHALLENGE_TRY' });
        } else if (view.step === 'play') {
          for (const [a, b] of lesson.challenge.answer.pairs)
            run.do({ type: 'CHALLENGE_PAIR', a, b });
        } else if (view.step === 'ask') {
          if (view.picked === null)
            run.do({ type: 'CHALLENGE_PICK', card: lesson.challenge.answer.leftover });
          else run.do({ type: 'CHALLENGE_REVEAL' });
        } else run.do({ type: 'NEXT' });
        break;
      }
      case 'parent-instruction':
        run.do({ type: 'PARENT_DONE' });
        break;
      case 'handover':
        run.do({ type: 'HANDOVER_DONE' });
        break;
      case 'parent-note':
        if (policy.note === null || policy.note === undefined) run.do({ type: 'NOTE_SKIP' });
        else run.do({ type: 'NOTE_SAVE', ...policy.note });
        break;
    }
  }
  return run;
}

// แปลง payload ที่ machine ส่งออกเป็น event ที่บันทึกแล้ว (ใส่ envelope, at เพิ่มขึ้นทีละ 1 ms)
export function toStored(
  events: readonly EventPayload[],
  opts: { sessionId: string; startMs?: number; learnerId?: string },
): AppEvent[] {
  let t = opts.startMs ?? Date.UTC(2026, 0, 1);
  return events.map((e, i) => {
    t += 1;
    return {
      ...e,
      id: `${opts.sessionId}-${i}`,
      at: new Date(t).toISOString(),
      schemaVersion: 1,
      learnerId: opts.learnerId ?? 'l1',
      sessionId: opts.sessionId,
      activityId: lesson.id,
    };
  });
}

// เล่นครั้งหนึ่งจนจบแล้วคืน event ที่บันทึก (ต่อกับ log เดิมได้)
export function playSitting(
  prior: readonly AppEvent[],
  policy: Policy,
  opts: { sessionId: string; startMs: number; seed?: number },
): { run: Run; stored: AppEvent[] } {
  const run = play(newRun(planFor(prior, opts.seed ?? 1)), policy);
  return { run, stored: toStored(run.events, opts) };
}

export function foldAll(events: readonly EventPayload[]): LessonProgress {
  let p = initialProgress(lesson);
  for (const e of events) p = applyEvent(p, e, ctx);
  return p;
}
