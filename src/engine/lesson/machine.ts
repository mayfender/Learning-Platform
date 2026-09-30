import { classifyLessonAnswer, type AnswerKind } from '@/engine/lesson/classify';
import { isFastAnswer, thresholdOf, type AnsweredPayload } from '@/engine/lesson/evaluate';
import {
  correctText,
  fill,
  makeParams,
  nOf,
  planOf,
  wrongText,
  type Feedback,
} from '@/engine/lesson/feedback';
import { applyEvent, type LessonProgress, type ProgressContext } from '@/engine/lesson/progress';
import {
  buildBlock,
  completeBlock,
  deriveSeed,
  type BlockSlot,
  type ParentInstructionReason,
  type PlannedBlock,
  type QueueItem,
  type SittingPlan,
} from '@/engine/lesson/plan';
import { roundSummary } from '@/engine/lesson/roundSummary';
import type { ChoiceQuestion, Lesson, LessonItem } from '@/engine/lesson/types';
import type { makeTenPlan } from '@/engine/lesson/makeTenPlan';
import type {
  EventPayload,
  LessonFlag,
  LessonSummary,
  NoteFrequency,
  Skill,
  StrategyId,
} from '@/engine/types';

// ตัวเล่นบทเรียน (Tech Spec §5.4): เครื่องสถานะ pure — ไม่มี side effect
// การ emit event / ตั้ง timer ทำโดย runner ใน dispatch ครั้งเดียว (ห้ามอยู่ใน setState updater)

export interface AnswerTiming {
  latencyMs: number;
  latencyValid: boolean;
  flashInterrupted: boolean;
  answeredAt: string; // ISO เวลาที่ลูกกด "ตอบ"
}

export type LessonAction =
  | { type: 'START' } // sitting-intro → เริ่ม (emit session.started)
  | { type: 'BLOCK_GO' } // block-intro → เริ่ม block (emit block.started)
  | { type: 'READY_DONE' } // schedule: จบ "พร้อมนะ..."
  | { type: 'FLASH_END' } // จบแฟลช (component เรียกเมื่อ onFlashEnd)
  | { type: 'ACK_DONE' } // schedule: จบข้อความรับคำตอบ
  | { type: 'TAP_CELL'; index: number } // A1: แตะช่องว่างในกล่อง
  | { type: 'MOVE_DOT'; cellIndex: number; board?: 0 | 1 } // B1/B2: ย้ายจุดจากกองเข้าช่อง (ลากหรือแตะ)
  | { type: 'MOVE_REJECTED'; why: 'outside' | 'full'; board?: 0 | 1 }
  | ({ type: 'SUBMIT'; response: number } & AnswerTiming)
  | ({
      type: 'SUBMIT_FIELDS';
      values: { gap: number; rest: number; total: number };
    } & AnswerTiming) // B3 ข้อ 1–3 (3 ช่อง)
  | { type: 'STRATEGY_PICK'; strategyId: StrategyId; strategyLatencyMs?: number }
  | { type: 'STRATEGY_SKIP' } // เฉพาะข้อสุดท้ายของรอบฝึก/ทบทวน (ไม่บังคับ)
  | ({ type: 'OPTION_PICK'; value: number } & AnswerTiming) // B2 คำถามเลือกตอบ
  | { type: 'NEXT' } // ปุ่ม "ต่อไป" ของหน้าเฉลย/กฎ/ฯลฯ
  | { type: 'CHALLENGE_TRY' }
  | { type: 'CHALLENGE_LATER' }
  | { type: 'CHALLENGE_PAIR'; a: number; b: number }
  | { type: 'CHALLENGE_HINT' }
  | { type: 'CHALLENGE_RESTART' }
  | { type: 'CHALLENGE_PICK'; card: number }
  | { type: 'CHALLENGE_REVEAL' }
  | { type: 'PARENT_DONE' } // หน้าพ่อแนะนำ: "ทำแล้ว" (emit parent.noted resolvedFlag)
  | { type: 'PARENT_CONTINUE' } // หน้าพ่อแนะนำ: ไปต่อโดยยังไม่ปิดธง (พ่อกด "ทำแล้ว" ที่หน้าพ่อของบทภายหลังได้ Tech Spec §5.7)
  | { type: 'HANDOVER_DONE' } // ลูกส่งเครื่องให้พ่อแล้ว
  | { type: 'NOTE_SAVE'; fingers: NoteFrequency; mouth: NoteFrequency; note?: string }
  | { type: 'NOTE_SKIP' }
  | { type: 'SKIP_BLOCK' } // พ่อข้ามส่วนนี้ (A, B, practice, challenge)
  | { type: 'STOP' };

export type LessonEffect =
  | { type: 'emit'; event: EventPayload }
  | { type: 'schedule'; afterMs: number; action: 'READY_DONE' | 'ACK_DONE' };

export type ItemStage = 'ready' | 'show' | 'answering' | 'ack' | 'mind' | 'feedback';
export type ItemSub = 'gap' | 'move' | 'rest' | 'total';

export interface ItemView {
  stage: ItemStage;
  // ขั้นย่อยที่กำลังตอบ: ข้อทั่วไปคือ 'gap' (ช่องว่าง) หรือ 'total' (ผลรวม); B1 ไล่ gap → move → rest → total
  sub: ItemSub;
  // A1: index ช่องที่แตะเติมแล้ว · B1: index ช่องที่ย้ายจุดมาแล้ว
  added: readonly number[];
  attempts: { gap: number; rest: number; total: number };
  feedback: Feedback | null;
  ackText: string | null;
  mind: 'required' | 'optional' | null;
  // หน้า feedback ที่ต้องกด "ต่อไป": ไปที่ไหนต่อ ('done' = ข้อถัดไป)
  after: ItemSub | 'done' | null;
  manip: { taps: number; drops: number; rejected: number };
}

export interface CompareBoardView {
  boxDots: number;
  pileDots: number;
  moved: readonly number[];
}

export interface CompareView {
  stage: 'move' | 'q1' | 'q2' | 'rule';
  boards: readonly [CompareBoardView, CompareBoardView];
  question: ChoiceQuestion | null;
  attempts: number;
  revealed: boolean;
  ruleText: string | null;
  manip: { drops: number; rejected: number };
}

export interface ChallengeView {
  step: 'intro' | 'play' | 'ask' | 'reveal';
  pairs: readonly (readonly [number, number])[];
  hintsUsed: number;
  hint: string | null;
  restarts: number;
  rejected: number;
  picked: number | null;
}

export type LessonPhase =
  | { kind: 'sitting-intro' }
  | { kind: 'block-intro'; slot: BlockSlot; text: string }
  | { kind: 'item'; item: LessonItem; stepIdx: number; view: ItemView }
  | { kind: 'compare'; view: CompareView }
  | { kind: 'rule'; which: 'A' | 'B'; text: string }
  | { kind: 'tell-parent'; text: string }
  | { kind: 'challenge'; view: ChallengeView }
  | { kind: 'round-end'; text: string }
  | { kind: 'parent-instruction'; reason: ParentInstructionReason }
  | { kind: 'handover' }
  | { kind: 'parent-note'; blockKinds: readonly ('A' | 'B')[]; index: number }
  | { kind: 'sitting-end' }
  | { kind: 'stopped' };

interface PendingAnswer {
  item: LessonItem;
  response: number;
  timing: AnswerTiming;
  attemptNo: number;
  sub: ItemSub;
  manip?: { taps: number; drops: number; rejected: number };
  subAnswers?: AnsweredPayload['subAnswers'];
  fieldsCorrect: boolean; // ทุกช่องที่ตอบถูกหรือไม่ (B3 3 ช่อง)
  firstWrongField?: AnswerKind;
  firstWrongMis?: string;
}

interface CurrentBlock {
  planned: PlannedBlock;
  blockId: string;
  stepIdx: number;
  answers: AnsweredPayload[];
  // ข้อสุดท้ายของ block ที่เป็นข้อ (สำหรับถามในหัวเห็นอะไรแบบไม่บังคับ)
  lastItemStepIdx: number;
}

export interface LessonRunnerState {
  phase: LessonPhase;
  started: boolean;
  progress: LessonProgress;
  queue: readonly QueueItem[];
  cur: CurrentBlock | null;
  submitted: number;
  blocksStarted: number;
  pending: PendingAnswer | null;
  session: {
    blocks: { kind: LessonSummary['blocks'][number]['kind']; outcome: string; round?: number }[];
    flags: LessonFlag[];
    taught: ('A' | 'B')[];
  };
}

export interface LessonMachineOptions {
  skills: readonly Skill[];
  newId: () => string;
}

export interface LessonMachine {
  initial(): LessonRunnerState;
  transition(
    state: LessonRunnerState,
    action: LessonAction,
  ): { state: LessonRunnerState; effects: LessonEffect[] };
}

const MAX_ATTEMPTS = 3; // ตอบผิดครบ 3 ครั้งแล้วเฉลยให้ (Designer Q6)
const MAX_NOTE_LENGTH = 200;

type Result = { state: LessonRunnerState; effects: LessonEffect[] };

export function createLessonMachine(
  lesson: Lesson,
  plan: SittingPlan,
  options: LessonMachineOptions,
): LessonMachine {
  const ctx: ProgressContext = { lesson, skills: options.skills };
  const texts = lesson.texts;
  const strategySet = lesson.strategySets[0]!;
  const noop = (state: LessonRunnerState): Result => ({ state, effects: [] });

  function initial(): LessonRunnerState {
    return {
      phase: { kind: 'sitting-intro' },
      started: false,
      progress: plan.progress,
      queue: plan.queue,
      cur: null,
      submitted: 0,
      blocksStarted: 0,
      pending: null,
      session: { blocks: [], flags: [], taught: [] },
    };
  }

  // ---------- ตัวช่วย ----------

  function fold(state: LessonRunnerState, events: readonly EventPayload[]): LessonRunnerState {
    let progress = state.progress;
    for (const e of events) progress = applyEvent(progress, e, ctx);
    return { ...state, progress };
  }

  const emit = (event: EventPayload): LessonEffect => ({ type: 'emit', event });

  function answerKindOf(item: LessonItem): AnswerKind {
    return item.problem.kind === 'missing-part' ? 'gap' : 'total';
  }

  function blockGroupOf(item: LessonItem): 'A' | 'B' {
    return item.flow === 'guided-fill' ||
      item.flow === 'teach-flash-gap' ||
      item.flow === 'mind-gap'
      ? 'A'
      : 'B';
  }

  function isFlashFlow(item: LessonItem): boolean {
    return (
      item.flow === 'silent-flash-gap' ||
      item.flow === 'teach-flash-gap' ||
      item.flow === 'teach-flash-make'
    );
  }

  // ข้อนี้ถามในหัวเห็นอะไรหรือไม่ (A3/B4 บังคับ, ข้อสุดท้ายของรอบฝึก/ทบทวนไม่บังคับ)
  function askMind(
    cur: CurrentBlock,
    item: LessonItem,
    stepIdx: number,
  ): 'required' | 'optional' | null {
    if (item.flow === 'mind-gap' || item.flow === 'mind-make') return 'required';
    const kind = cur.planned.slot.kind;
    if ((kind === 'practice' || kind === 'review') && stepIdx === cur.lastItemStepIdx) {
      return 'optional';
    }
    return null;
  }

  function fluentOf(item: LessonItem, correct: boolean, timing: AnswerTiming) {
    if (item.flow === 'guided-fill' || item.flow === 'guided-move') {
      return { fluentMs: undefined, fluent: null };
    }
    const fluentMs = thresholdOf(options.skills, item.skillId, 'noCount');
    return { fluentMs, fluent: isFastAnswer({ correct, ...timing }, fluentMs) };
  }

  interface AnsweredArgs {
    item: LessonItem;
    response: number;
    expected?: number;
    correct: boolean;
    misconceptionId?: string;
    timing: AnswerTiming;
    attemptNo: number;
    stepId?: AnsweredPayload['stepId'];
    subAnswers?: AnsweredPayload['subAnswers'];
    revealed?: boolean;
    manip?: { taps: number; drops: number; rejected: number };
    strategyId?: StrategyId;
    strategyLatencyMs?: number;
  }

  function answeredEvent(cur: CurrentBlock, a: AnsweredArgs): AnsweredPayload {
    const { fluentMs, fluent } = fluentOf(a.item, a.correct, a.timing);
    const payload: AnsweredPayload = {
      type: 'item.answered',
      itemId: a.item.id,
      skillId: a.item.skillId,
      problem: a.item.problem,
      expected: a.expected ?? a.item.expected,
      response: a.response,
      correct: a.correct,
      latencyMs: a.timing.latencyMs,
      latencyValid: a.timing.latencyValid,
      fluent,
      attemptNo: a.attemptNo,
      answeredAt: a.timing.answeredAt,
      blockId: cur.blockId,
      section: a.item.section,
      mode: a.item.mode,
    };
    if (a.misconceptionId) payload.misconceptionId = a.misconceptionId;
    if (fluentMs !== undefined) payload.fluentMs = fluentMs;
    if (a.timing.flashInterrupted) payload.flashInterrupted = true;
    if (a.stepId) payload.stepId = a.stepId;
    if (a.subAnswers) payload.subAnswers = a.subAnswers;
    if (a.revealed) payload.revealed = true;
    if (a.manip) payload.manip = a.manip;
    if (a.strategyId) {
      payload.strategySetId = strategySet.id;
      payload.strategyId = a.strategyId;
    }
    if (a.strategyLatencyMs !== undefined) payload.strategyLatencyMs = a.strategyLatencyMs;
    return payload;
  }

  // บันทึกข้อที่ตอบใน block ปัจจุบัน + fold เข้าความก้าวหน้า + คืน effect
  function recordAnswer(
    state: LessonRunnerState,
    payload: AnsweredPayload,
  ): { state: LessonRunnerState; effects: LessonEffect[] } {
    const cur = state.cur!;
    const next = fold({ ...state, cur: { ...cur, answers: [...cur.answers, payload] } }, [payload]);
    return { state: next, effects: [emit(payload)] };
  }

  function setItem(state: LessonRunnerState, patch: Partial<ItemView>): LessonRunnerState {
    if (state.phase.kind !== 'item') return state;
    return {
      ...state,
      phase: { ...state.phase, view: { ...state.phase.view, ...patch } },
    };
  }

  function baseView(): ItemView {
    return {
      stage: 'answering',
      sub: 'gap',
      added: [],
      attempts: { gap: 0, rest: 0, total: 0 },
      feedback: null,
      ackText: null,
      mind: null,
      after: null,
      manip: { taps: 0, drops: 0, rejected: 0 },
    };
  }

  // ---------- ลำดับ block / คิว ----------

  function hasIntro(slot: BlockSlot): boolean {
    return (
      (slot.variant === 'main' &&
        (slot.kind === 'check' || slot.kind === 'A' || slot.kind === 'B')) ||
      slot.variant === 'a2-retry' || // A2 ซ้ำ / A3 ชุดใหม่: มีหน้าเปิดส่วนเหมือนส่วน A ปกติ (ไม่ emit block.started ทันที)
      slot.variant === 'a3-retry' ||
      slot.variant === 'challenge'
    );
  }

  function introText(slot: BlockSlot): string {
    if (slot.variant === 'challenge') return texts.intros.challenge;
    if (slot.kind === 'check') return texts.intros.check;
    return slot.kind === 'A' ? texts.intros.A : texts.intros.B;
  }

  function completeSession(state: LessonRunnerState): Result {
    const summary: LessonSummary = {
      kind: 'lesson',
      sitting: plan.sitting,
      blocks: state.session.blocks,
      flags: state.session.flags,
    };
    return {
      state: { ...state, phase: { kind: 'sitting-end' } },
      effects: [emit({ type: 'session.completed', activityVersion: lesson.version, summary })],
    };
  }

  function advanceQueue(state: LessonRunnerState): Result {
    const [next, ...rest] = state.queue;
    const s: LessonRunnerState = { ...state, queue: rest, cur: null, pending: null };
    if (!next) {
      if (!plan.handover) return completeSession(s);
      return { state: { ...s, phase: { kind: 'handover' } }, effects: [] };
    }
    if (next.type === 'instruction') {
      return {
        state: { ...s, phase: { kind: 'parent-instruction', reason: next.reason } },
        effects: [],
      };
    }
    if (hasIntro(next.slot)) {
      return {
        state: {
          ...s,
          phase: { kind: 'block-intro', slot: next.slot, text: introText(next.slot) },
        },
        effects: [],
      };
    }
    return startBlock(s, next.slot);
  }

  function startBlock(state: LessonRunnerState, slot: BlockSlot): Result {
    const seed = deriveSeed(plan.seed, state.blocksStarted);
    const planned = buildBlock(ctx, slot, state.progress, seed);
    const blockId = options.newId();
    let lastItemStepIdx = -1;
    planned.steps.forEach((step, i) => {
      if (step.kind === 'item') lastItemStepIdx = i;
    });
    const started: EventPayload = {
      type: 'block.started',
      blockId,
      blockKind: slot.kind,
      round: slot.round,
      ...(planned.seed !== undefined ? { seed: planned.seed } : {}),
      ...(planned.skipped ? { skipped: planned.skipped } : {}),
      ...(planned.skillId ? { skillId: planned.skillId } : {}),
    };
    const s = fold(
      {
        ...state,
        blocksStarted: state.blocksStarted + 1,
        cur: { planned, blockId, stepIdx: 0, answers: [], lastItemStepIdx },
      },
      [started],
    );
    if (planned.steps.length === 0) {
      const done = finishBlock(s, {});
      return { state: done.state, effects: [emit(started), ...done.effects] };
    }
    const entered = enterStep(s, 0);
    return { state: entered.state, effects: [emit(started), ...entered.effects] };
  }

  function enterStep(state: LessonRunnerState, stepIdx: number): Result {
    const cur = state.cur!;
    const step = cur.planned.steps[stepIdx]!;
    const s: LessonRunnerState = { ...state, cur: { ...cur, stepIdx }, pending: null };
    switch (step.kind) {
      case 'item': {
        const item = step.item;
        const view: ItemView = {
          ...baseView(),
          sub: item.flow === 'guided-move' ? 'gap' : answerKindOf(item) === 'gap' ? 'gap' : 'total',
          stage: isFlashFlow(item) ? 'ready' : 'answering',
        };
        return {
          state: { ...s, phase: { kind: 'item', item, stepIdx, view } },
          effects: isFlashFlow(item)
            ? [{ type: 'schedule', afterMs: lesson.timing.readyMs, action: 'READY_DONE' }]
            : [],
        };
      }
      case 'compare': {
        const boards = lesson.blocks.B.compare.boards.map((b) => ({
          boxDots: b.boxDots,
          pileDots: b.pileDots,
          moved: [] as number[],
        })) as unknown as CompareView['boards'];
        return {
          state: {
            ...s,
            phase: {
              kind: 'compare',
              view: {
                stage: 'move',
                boards,
                question: null,
                attempts: 0,
                revealed: false,
                ruleText: null,
                manip: { drops: 0, rejected: 0 },
              },
            },
          },
          effects: [],
        };
      }
      case 'rule':
        return {
          state: {
            ...s,
            phase: {
              kind: 'rule',
              which: step.which,
              text: step.which === 'A' ? texts.rules.A : texts.rules.B,
            },
          },
          effects: [],
        };
      case 'tell-parent':
        return {
          state: { ...s, phase: { kind: 'tell-parent', text: texts.tellParent } },
          effects: [],
        };
      case 'challenge':
        return {
          state: {
            ...s,
            phase: {
              kind: 'challenge',
              view: {
                step: 'intro',
                pairs: [],
                hintsUsed: 0,
                hint: null,
                restarts: 0,
                rejected: 0,
                picked: null,
              },
            },
          },
          effects: [],
        };
    }
  }

  function advanceStep(state: LessonRunnerState): Result {
    const cur = state.cur!;
    const nextIdx = cur.stepIdx + 1;
    if (nextIdx < cur.planned.steps.length) return enterStep(state, nextIdx);
    return finishBlock(state, {});
  }

  function finishBlock(
    state: LessonRunnerState,
    opts: { skippedManual?: boolean; detail?: Record<string, number | string | boolean> },
  ): Result {
    const cur = state.cur!;
    const slot = cur.planned.slot;
    const completion = completeBlock(ctx, slot, cur.answers, { skippedManual: opts.skippedManual });

    // ข้อความจบรอบ ต้องคำนวณก่อนนำรอบนี้เข้าความก้าวหน้า (เทียบกับรอบก่อนของทักษะเดียวกัน)
    const isRound = slot.kind === 'practice' || slot.kind === 'review';
    const roundText =
      isRound && !opts.skippedManual
        ? roundSummary(
            cur.answers,
            slot.skillId ? state.progress.lastRounds[slot.skillId] : undefined,
            texts.roundEnd,
          )
        : null;

    const completed: EventPayload = {
      type: 'block.completed',
      blockId: cur.blockId,
      blockKind: slot.kind,
      round: slot.round,
      outcome: completion.outcome,
      ...(completion.skipReason ? { skipReason: completion.skipReason } : {}),
      ...(completion.metrics ? { metrics: completion.metrics } : {}),
      ...(completion.level ? { level: completion.level } : {}),
      ...(completion.flags.length > 0 ? { flags: completion.flags } : {}),
      ...(opts.detail ? { detail: opts.detail } : {}),
      ...(cur.planned.skillId ? { skillId: cur.planned.skillId } : {}),
    };

    const taught =
      (slot.kind === 'A' || slot.kind === 'B') &&
      slot.variant !== 'remedial' &&
      completion.outcome !== 'skipped';
    const session = {
      blocks: [
        ...state.session.blocks,
        { kind: slot.kind, outcome: completion.outcome, round: slot.round },
      ],
      flags: [...state.session.flags, ...completion.flags],
      taught:
        taught && !state.session.taught.includes(slot.kind as 'A' | 'B')
          ? [...state.session.taught, slot.kind as 'A' | 'B']
          : state.session.taught,
    };
    const queue = completion.truncate
      ? completion.prepend
      : [...completion.prepend, ...state.queue];
    const s = fold({ ...state, session, queue }, [completed]);

    if (roundText !== null) {
      return {
        state: { ...s, phase: { kind: 'round-end', text: roundText } },
        effects: [emit(completed)],
      };
    }
    const next = advanceQueue(s);
    return { state: next.state, effects: [emit(completed), ...next.effects] };
  }

  // ---------- การตอบ ----------

  function ackFor(state: LessonRunnerState): { text: string; submitted: number } {
    return {
      text: texts.acks[state.submitted % texts.acks.length]!,
      submitted: state.submitted + 1,
    };
  }

  function feedbackFromAnswer(
    item: LessonItem,
    kind: AnswerKind,
    correct: boolean,
    mis: string | undefined,
    group: 'A' | 'B',
  ): Feedback {
    if (correct)
      return { kind: 'correct', texts: [correctText(texts, item, group)], highlight: 'none' };
    return {
      kind: 'wrong',
      misconceptionId: mis,
      texts: [wrongText(texts, kind, mis, group, item)],
      highlight: kind === 'gap' ? 'gap-cells' : 'pile-rest',
    };
  }

  function onSubmit(
    state: LessonRunnerState,
    action: Extract<LessonAction, { type: 'SUBMIT' }>,
  ): Result {
    if (state.phase.kind !== 'item') return noop(state);
    const { item, view } = state.phase;
    if (view.stage !== 'answering') return noop(state);
    const cur = state.cur!;
    const timing: AnswerTiming = {
      latencyMs: action.latencyMs,
      latencyValid: action.latencyValid,
      flashInterrupted: action.flashInterrupted,
      answeredAt: action.answeredAt,
    };

    switch (item.flow) {
      case 'silent-flash-gap':
      case 'silent-text': {
        const kind = answerKindOf(item);
        const { correct, misconceptionId } = classifyLessonAnswer(
          kind,
          item.problem,
          action.response,
        );
        const ack = ackFor(state);
        const mind = askMind(cur, item, state.phase.stepIdx);
        const effects: LessonEffect[] = [
          { type: 'schedule', afterMs: lesson.timing.ackMs, action: 'ACK_DONE' },
        ];
        let s = setItem(
          { ...state, submitted: ack.submitted },
          {
            stage: 'ack',
            ackText: ack.text,
            mind,
          },
        );
        if (mind) {
          s = {
            ...s,
            pending: {
              item,
              response: action.response,
              timing,
              attemptNo: 1,
              sub: view.sub,
              fieldsCorrect: correct,
            },
          };
          return { state: s, effects };
        }
        const rec = recordAnswer(
          s,
          answeredEvent(cur, {
            item,
            response: action.response,
            correct,
            misconceptionId,
            timing,
            attemptNo: 1,
          }),
        );
        return { state: rec.state, effects: [...effects, ...rec.effects] };
      }

      case 'teach-flash-gap': {
        const { correct, misconceptionId } = classifyLessonAnswer(
          'gap',
          item.problem,
          action.response,
        );
        const rec = recordAnswer(
          state,
          answeredEvent(cur, {
            item,
            response: action.response,
            correct,
            misconceptionId,
            timing,
            attemptNo: 1,
          }),
        );
        return {
          state: setItem(rec.state, {
            stage: 'feedback',
            after: 'done',
            feedback: feedbackFromAnswer(item, 'gap', correct, misconceptionId, 'A'),
          }),
          effects: rec.effects,
        };
      }

      case 'mind-gap':
      case 'mind-make': {
        const kind = answerKindOf(item);
        const { correct } = classifyLessonAnswer(kind, item.problem, action.response);
        return {
          state: {
            ...setItem(state, { stage: 'mind', mind: 'required' }),
            pending: {
              item,
              response: action.response,
              timing,
              attemptNo: 1,
              sub: view.sub,
              fieldsCorrect: correct,
            },
          },
          effects: [],
        };
      }

      case 'teach-flash-make': {
        // ข้อ 1–3 ตอบ 3 ช่องพร้อมกัน ต้องใช้ SUBMIT_FIELDS
        if ((item.fields ?? ['total']).length !== 1) return noop(state);
        // ข้อ 4–6: ช่องเดียว (ผลรวม)
        return submitMake(state, item, timing, {
          gap: undefined,
          rest: undefined,
          total: action.response,
        });
      }

      case 'guided-fill':
        return submitGuidedFill(state, item, view, timing, action.response);

      case 'guided-move':
        return submitGuidedMove(state, item, view, timing, action.response);
    }
  }

  function onSubmitFields(
    state: LessonRunnerState,
    action: Extract<LessonAction, { type: 'SUBMIT_FIELDS' }>,
  ): Result {
    if (state.phase.kind !== 'item') return noop(state);
    const { item, view } = state.phase;
    if (view.stage !== 'answering' || item.flow !== 'teach-flash-make') return noop(state);
    if ((item.fields ?? ['total']).length !== 3) return noop(state);
    const timing: AnswerTiming = {
      latencyMs: action.latencyMs,
      latencyValid: action.latencyValid,
      flashInterrupted: action.flashInterrupted,
      answeredAt: action.answeredAt,
    };
    return submitMake(state, item, timing, action.values);
  }

  // B3: ตอบขาด/เหลือ/ผลรวมพร้อมกัน แต่ละช่องจัดประเภทแยก (Tech Spec §5.2, AC10)
  function submitMake(
    state: LessonRunnerState,
    item: LessonItem,
    timing: AnswerTiming,
    values: { gap?: number; rest?: number; total: number },
  ): Result {
    const cur = state.cur!;
    const plan10 = planOf(item);
    const totalC = classifyLessonAnswer('total', item.problem, values.total);
    const subAnswers: NonNullable<AnsweredPayload['subAnswers']> = [];
    let firstWrong: { kind: AnswerKind; mis: string | undefined } | null = null;
    if (values.gap !== undefined) {
      const c = classifyLessonAnswer('gap', item.problem, values.gap);
      subAnswers.push({
        stepId: 'gap',
        response: values.gap,
        expected: plan10.gap,
        correct: c.correct,
        ...(c.misconceptionId ? { misconceptionId: c.misconceptionId } : {}),
      });
      if (!c.correct && !firstWrong) firstWrong = { kind: 'gap', mis: c.misconceptionId };
    }
    if (values.rest !== undefined) {
      const c = classifyLessonAnswer('rest', item.problem, values.rest);
      subAnswers.push({
        stepId: 'rest',
        response: values.rest,
        expected: plan10.rest,
        correct: c.correct,
        ...(c.misconceptionId ? { misconceptionId: c.misconceptionId } : {}),
      });
      if (!c.correct && !firstWrong) firstWrong = { kind: 'rest', mis: c.misconceptionId };
    }
    if (!totalC.correct && !firstWrong) firstWrong = { kind: 'total', mis: totalC.misconceptionId };

    const rec = recordAnswer(
      state,
      answeredEvent(cur, {
        item,
        response: values.total,
        correct: totalC.correct,
        misconceptionId: totalC.misconceptionId,
        timing,
        attemptNo: 1,
        ...(subAnswers.length > 0 ? { subAnswers } : {}),
      }),
    );
    const feedback: Feedback = firstWrong
      ? {
          kind: 'wrong',
          misconceptionId: firstWrong.mis,
          texts: [wrongText(texts, firstWrong.kind, firstWrong.mis, 'B', item)],
          highlight: firstWrong.kind === 'gap' ? 'gap-cells' : 'pile-rest',
        }
      : { kind: 'correct', texts: [correctText(texts, item, 'B')], highlight: 'none' };
    return {
      state: setItem(rec.state, { stage: 'feedback', after: 'done', feedback }),
      effects: rec.effects,
    };
  }

  // A1: ตอบพร้อมแตะเติมช่อง ตอบผิดแก้ได้ ≤ 3 ครั้งแล้วเฉลย
  function submitGuidedFill(
    state: LessonRunnerState,
    item: LessonItem,
    view: ItemView,
    timing: AnswerTiming,
    response: number,
  ): Result {
    const cur = state.cur!;
    const n = nOf(item);
    const { correct, misconceptionId } = classifyLessonAnswer('gap', item.problem, response);
    const attemptNo = view.attempts.gap + 1;
    const revealed = !correct && attemptNo >= MAX_ATTEMPTS;
    const rec = recordAnswer(
      state,
      answeredEvent(cur, {
        item,
        response,
        correct,
        misconceptionId,
        timing,
        attemptNo,
        stepId: 'gap',
        ...(revealed ? { revealed: true } : {}),
        manip: view.manip,
      }),
    );
    const gapCells = Array.from({ length: 10 - n }, (_, i) => n + i);
    if (correct || revealed) {
      const fb: Feedback = correct
        ? { kind: 'correct', texts: [correctText(texts, item, 'A')], highlight: 'gap-cells' }
        : {
            kind: 'revealed',
            misconceptionId,
            texts: [texts.feedback.reveal, correctText(texts, item, 'A')],
            highlight: 'gap-cells',
          };
      return {
        state: setItem(rec.state, {
          stage: 'feedback',
          after: 'done',
          feedback: fb,
          added: gapCells,
          attempts: { ...view.attempts, gap: attemptNo },
        }),
        effects: rec.effects,
      };
    }
    return {
      state: setItem(rec.state, {
        feedback: feedbackFromAnswer(item, 'gap', false, misconceptionId, 'A'),
        attempts: { ...view.attempts, gap: attemptNo },
      }),
      effects: rec.effects,
    };
  }

  // B1: 3 ขั้น ขาด → (ย้ายจุด) → เหลือ → ผลรวม
  function submitGuidedMove(
    state: LessonRunnerState,
    item: LessonItem,
    view: ItemView,
    timing: AnswerTiming,
    response: number,
  ): Result {
    const sub = view.sub;
    if (sub === 'move') return noop(state);
    const cur = state.cur!;
    const p = planOf(item);
    const kind: AnswerKind = sub;
    const { correct, misconceptionId } = classifyLessonAnswer(kind, item.problem, response);
    const attemptNo = view.attempts[kind] + 1;
    const revealed = !correct && attemptNo >= MAX_ATTEMPTS;
    const expected = kind === 'gap' ? p.gap : kind === 'rest' ? p.rest : p.total;
    const rec = recordAnswer(
      state,
      answeredEvent(cur, {
        item,
        response,
        expected,
        correct,
        misconceptionId,
        timing,
        attemptNo,
        stepId: kind,
        ...(revealed ? { revealed: true } : {}),
        manip: view.manip,
      }),
    );
    const attempts = { ...view.attempts, [kind]: attemptNo };
    const nextSub: ItemSub | 'done' = kind === 'gap' ? 'move' : kind === 'rest' ? 'total' : 'done';

    if (correct) {
      if (nextSub === 'done') {
        return {
          state: setItem(rec.state, {
            stage: 'feedback',
            after: 'done',
            attempts,
            feedback: {
              kind: 'correct',
              texts: [correctText(texts, item, 'B')],
              highlight: 'none',
            },
          }),
          effects: rec.effects,
        };
      }
      return {
        state: setItem(rec.state, { sub: nextSub, attempts, feedback: null }),
        effects: rec.effects,
      };
    }
    if (revealed) {
      // เฉลยให้: ขั้นย้ายจุดที่ถูกเฉลยให้ย้ายครบทันที
      const movedAll =
        kind === 'gap' ? { added: Array.from({ length: p.gap }, (_, i) => p.boxDots + i) } : {};
      const texts2 =
        nextSub === 'done'
          ? [texts.feedback.reveal, correctText(texts, item, 'B')]
          : [texts.feedback.reveal];
      return {
        state: setItem(rec.state, {
          stage: 'feedback',
          after: nextSub === 'move' ? 'rest' : nextSub,
          attempts,
          ...movedAll,
          feedback: { kind: 'revealed', misconceptionId, texts: texts2, highlight: 'none' },
        }),
        effects: rec.effects,
      };
    }
    return {
      state: setItem(rec.state, {
        attempts,
        feedback: feedbackFromAnswer(item, kind, false, misconceptionId, 'B'),
      }),
      effects: rec.effects,
    };
  }

  // ---------- คำตอบ "ในหัวเห็นอะไร" ----------

  function onStrategy(
    state: LessonRunnerState,
    strategyId: StrategyId | undefined,
    strategyLatencyMs: number | undefined,
  ): Result {
    if (state.phase.kind !== 'item' || !state.pending) return noop(state);
    const { item, view } = state.phase;
    if (view.stage !== 'mind') return noop(state);
    if (strategyId !== undefined && !strategySet.options.some((o) => o.id === strategyId)) {
      return noop(state);
    }
    if (strategyId === undefined && view.mind !== 'optional') return noop(state);
    const cur = state.cur!;
    const pending = state.pending;
    const kind = answerKindOf(item);
    const { correct, misconceptionId } = classifyLessonAnswer(
      kind,
      item.problem,
      pending.response,
      {
        mindView: strategyId,
      },
    );
    const rec = recordAnswer(
      { ...state, pending: null },
      answeredEvent(cur, {
        item,
        response: pending.response,
        correct,
        misconceptionId,
        timing: pending.timing,
        attemptNo: 1,
        strategyId,
        strategyLatencyMs,
      }),
    );

    if (item.flow === 'mind-gap' || item.flow === 'mind-make') {
      const group = blockGroupOf(item);
      const t: string[] = [];
      let highlight: Feedback['highlight'] = 'none';
      if (item.flow === 'mind-gap') {
        if (correct) t.push(correctText(texts, item, 'A'));
        else {
          t.push(fill(texts.feedback.a3Wrong, { n: nOf(item) }));
          highlight = 'gap-cells';
        }
      } else {
        if (!correct) t.push(wrongText(texts, 'total', misconceptionId, 'B', item));
        t.push(correctText(texts, item, group));
      }
      if (strategyId === 'count-fingers') t.push(texts.feedback.fingers);
      return {
        state: setItem(rec.state, {
          stage: 'feedback',
          after: 'done',
          feedback: {
            kind: correct ? 'correct' : 'wrong',
            misconceptionId,
            texts: t,
            highlight,
          },
        }),
        effects: rec.effects,
      };
    }
    // ข้อในรอบฝึก/ทบทวน: เงียบ ไปข้อถัดไปเลย
    const next = advanceStep(rec.state);
    return { state: next.state, effects: [...rec.effects, ...next.effects] };
  }

  // ---------- B1/B2: ย้ายจุด ----------

  function onMoveDot(
    state: LessonRunnerState,
    action: Extract<LessonAction, { type: 'MOVE_DOT' }>,
  ): Result {
    if (state.phase.kind === 'item') {
      const { item, view } = state.phase;
      if (item.flow !== 'guided-move' || view.sub !== 'move' || view.stage !== 'answering') {
        return noop(state);
      }
      const p = planOf(item);
      const idx = action.cellIndex;
      if (idx < p.boxDots || idx > 9 || view.added.includes(idx)) return noop(state);
      const added = [...view.added, idx];
      const manip = { ...view.manip, drops: view.manip.drops + 1 };
      // กล่องเต็ม → ขึ้น NumberBond แล้วถาม "เหลือในกองกี่จุด"
      return {
        state: setItem(state, { added, manip, sub: added.length >= p.gap ? 'rest' : 'move' }),
        effects: [],
      };
    }
    if (state.phase.kind === 'compare') {
      const view = state.phase.view;
      if (view.stage !== 'move') return noop(state);
      const b = action.board ?? 0;
      const board = view.boards[b];
      const idx = action.cellIndex;
      if (idx < board.boxDots || idx > 9 || board.moved.includes(idx)) return noop(state);
      const boards = view.boards.map((x, i) =>
        i === b ? { ...x, moved: [...x.moved, idx] } : x,
      ) as unknown as CompareView['boards'];
      const allFull = boards.every((x) => x.moved.length >= 10 - x.boxDots);
      const question = allFull ? lesson.blocks.B.compare.questions[0] : null;
      return {
        state: {
          ...state,
          phase: {
            kind: 'compare',
            view: {
              ...view,
              boards,
              stage: allFull ? 'q1' : 'move',
              question,
              attempts: 0,
              manip: { ...view.manip, drops: view.manip.drops + 1 },
            },
          },
        },
        effects: [],
      };
    }
    return noop(state);
  }

  function onMoveRejected(state: LessonRunnerState): Result {
    if (state.phase.kind === 'item') {
      const { item, view } = state.phase;
      if (item.flow !== 'guided-move' || view.sub !== 'move') return noop(state);
      return {
        state: setItem(state, { manip: { ...view.manip, rejected: view.manip.rejected + 1 } }),
        effects: [],
      };
    }
    if (state.phase.kind === 'compare' && state.phase.view.stage === 'move') {
      const view = state.phase.view;
      return {
        state: {
          ...state,
          phase: {
            kind: 'compare',
            view: { ...view, manip: { ...view.manip, rejected: view.manip.rejected + 1 } },
          },
        },
        effects: [],
      };
    }
    return noop(state);
  }

  function onTapCell(state: LessonRunnerState, index: number): Result {
    if (state.phase.kind !== 'item') return noop(state);
    const { item, view } = state.phase;
    if (item.flow !== 'guided-fill' || view.stage !== 'answering') return noop(state);
    const n = nOf(item);
    if (index < n || index > 9 || view.added.includes(index)) return noop(state); // ช่องที่มีจุดแล้ว/เติมแล้วไม่มีผล
    return {
      state: setItem(state, {
        added: [...view.added, index],
        manip: { ...view.manip, taps: view.manip.taps + 1 },
      }),
      effects: [],
    };
  }

  // B2: คำถามเลือกตอบ 2 ข้อ
  function onOptionPick(
    state: LessonRunnerState,
    action: Extract<LessonAction, { type: 'OPTION_PICK' }>,
  ): Result {
    if (state.phase.kind !== 'compare') return noop(state);
    const view = state.phase.view;
    if ((view.stage !== 'q1' && view.stage !== 'q2') || !view.question) return noop(state);
    const q = view.question;
    if (!q.options.some((o) => o.value === action.value)) return noop(state);
    const cur = state.cur!;
    const { a, b } = lesson.blocks.B.compare.problem;
    const correct = action.value === q.expected;
    const attemptNo = view.attempts + 1;
    const revealed = !correct && attemptNo >= MAX_ATTEMPTS;
    const timing: AnswerTiming = {
      latencyMs: action.latencyMs,
      latencyValid: action.latencyValid,
      flashInterrupted: action.flashInterrupted,
      answeredAt: action.answeredAt,
    };
    const item: LessonItem = {
      id: `B2.${q.id}`,
      section: 'B2',
      flow: 'guided-move',
      skillId: 'add.make-10',
      problem: { kind: 'arith', op: '+', a, b },
      expected: q.expected,
      mode: 'see',
    };
    const payload = answeredEvent(cur, {
      item,
      response: action.value,
      correct,
      timing,
      attemptNo,
      stepId: q.id,
      ...(revealed ? { revealed: true } : {}),
      ...(q.id === 'q1' && attemptNo === 1
        ? { manip: { taps: 0, drops: view.manip.drops, rejected: view.manip.rejected } }
        : {}),
    });
    const rec = recordAnswer(state, payload);
    if (!correct && !revealed) {
      return {
        state: { ...rec.state, phase: { kind: 'compare', view: { ...view, attempts: attemptNo } } },
        effects: rec.effects,
      };
    }
    if (q.id === 'q1') {
      return {
        state: {
          ...rec.state,
          phase: {
            kind: 'compare',
            view: {
              ...view,
              stage: 'q2',
              question: lesson.blocks.B.compare.questions[1],
              attempts: 0,
              revealed: view.revealed || revealed,
            },
          },
        },
        effects: rec.effects,
      };
    }
    return {
      state: {
        ...rec.state,
        phase: {
          kind: 'compare',
          view: {
            ...view,
            stage: 'rule',
            question: null,
            attempts: attemptNo,
            revealed: view.revealed || revealed,
            ruleText: texts.rules.B2,
          },
        },
      },
      effects: rec.effects,
    };
  }

  // ---------- ปริศนา ----------

  function onChallenge(state: LessonRunnerState, action: LessonAction): Result {
    if (state.phase.kind !== 'challenge') return noop(state);
    const view = state.phase.view;
    const c = lesson.challenge;
    const set = (patch: Partial<ChallengeView>): Result => ({
      state: { ...state, phase: { kind: 'challenge', view: { ...view, ...patch } } },
      effects: [],
    });

    if (view.step === 'intro') {
      if (action.type === 'CHALLENGE_TRY') return set({ step: 'play' });
      if (action.type === 'CHALLENGE_LATER') return finishBlock(state, { skippedManual: true });
      return noop(state);
    }
    if (view.step === 'play') {
      if (action.type === 'CHALLENGE_HINT') {
        const used = Math.min(c.hints.length, view.hintsUsed + 1);
        return set({ hintsUsed: used, hint: c.hints[used - 1] ?? null });
      }
      if (action.type === 'CHALLENGE_RESTART') {
        return set({ pairs: [], restarts: view.restarts + 1, picked: null });
      }
      if (action.type === 'CHALLENGE_PAIR') {
        const { a, b } = action;
        const usedCards = view.pairs.flat();
        const valid =
          a !== b &&
          c.cards.includes(a) &&
          c.cards.includes(b) &&
          !usedCards.includes(a) &&
          !usedCards.includes(b) &&
          a + b === c.target;
        if (!valid) return set({ rejected: view.rejected + 1 });
        const pairs = [...view.pairs, [Math.min(a, b), Math.max(a, b)] as const];
        const allPaired = pairs.length >= Math.floor(c.cards.length / 2);
        return set({ pairs, step: allPaired ? 'ask' : 'play' });
      }
      return noop(state);
    }
    if (view.step === 'ask') {
      if (action.type === 'CHALLENGE_PICK') {
        const used = view.pairs.flat();
        const left = c.cards.filter((x) => !used.includes(x));
        if (left.length !== 1 || left[0] !== action.card) return noop(state);
        return set({ picked: action.card });
      }
      if (action.type === 'CHALLENGE_REVEAL' && view.picked !== null)
        return set({ step: 'reveal' });
      return noop(state);
    }
    if (action.type === 'NEXT') {
      return finishBlock(state, {
        detail: {
          pairs: view.pairs.length,
          leftover: view.picked ?? 0,
          hintsUsed: view.hintsUsed,
          restarts: view.restarts,
          revealed: true,
        },
      });
    }
    return noop(state);
  }

  // ---------- NEXT ----------

  function onNext(state: LessonRunnerState): Result {
    const phase = state.phase;
    if (phase.kind === 'item') {
      if (phase.view.stage !== 'feedback') return noop(state);
      const after = phase.view.after;
      if (after === 'done' || after === null) return advanceStep(state);
      return {
        state: setItem(state, { stage: 'answering', sub: after, feedback: null, after: null }),
        effects: [],
      };
    }
    if (phase.kind === 'rule' || phase.kind === 'tell-parent') return advanceStep(state);
    if (phase.kind === 'compare') {
      return phase.view.stage === 'rule' ? advanceStep(state) : noop(state);
    }
    if (phase.kind === 'challenge') return onChallenge(state, { type: 'NEXT' });
    if (phase.kind === 'round-end') return advanceQueue(state);
    return noop(state);
  }

  // ---------- หลัก ----------

  function transition(state: LessonRunnerState, action: LessonAction): Result {
    if (action.type === 'STOP') {
      if (state.phase.kind === 'sitting-end' || state.phase.kind === 'stopped') return noop(state);
      if (!state.started) return { state: { ...state, phase: { kind: 'stopped' } }, effects: [] };
      // block ที่ยังไม่จบไม่มี block.completed; ข้อที่ตอบแล้วแต่ยังไม่ผ่านคำถามในหัวเห็นอะไรไม่ถูกบันทึก
      const summary: LessonSummary = {
        kind: 'lesson',
        sitting: plan.sitting,
        blocks: state.session.blocks,
        flags: state.session.flags,
      };
      return {
        state: { ...state, phase: { kind: 'stopped' }, pending: null },
        effects: [emit({ type: 'session.abandoned', activityVersion: lesson.version, summary })],
      };
    }

    const phase = state.phase;

    if (action.type === 'SKIP_BLOCK') {
      const cur = state.cur;
      const inBlock =
        cur !== null &&
        (phase.kind === 'item' ||
          phase.kind === 'compare' ||
          phase.kind === 'rule' ||
          phase.kind === 'tell-parent' ||
          phase.kind === 'challenge' ||
          phase.kind === 'round-end');
      if (!inBlock || phase.kind === 'round-end') return noop(state);
      const kind = cur.planned.slot.kind;
      if (kind !== 'A' && kind !== 'B' && kind !== 'challenge' && kind !== 'practice')
        return noop(state);
      return finishBlock({ ...state, pending: null }, { skippedManual: true });
    }

    switch (phase.kind) {
      case 'sitting-intro':
        if (action.type !== 'START') return noop(state);
        {
          const started: EventPayload = {
            type: 'session.started',
            activityKind: 'lesson',
            activityVersion: lesson.version,
            ...(plan.handover ? { sitting: plan.sitting } : {}),
          };
          const next = advanceQueue({ ...state, started: true });
          return { state: next.state, effects: [emit(started), ...next.effects] };
        }

      case 'block-intro':
        if (action.type !== 'BLOCK_GO') return noop(state);
        return startBlock(state, phase.slot);

      case 'item': {
        const stage = phase.view.stage;
        if (stage === 'ready' && action.type === 'READY_DONE') {
          return { state: setItem(state, { stage: 'show' }), effects: [] };
        }
        if (stage === 'show' && action.type === 'FLASH_END') {
          return { state: setItem(state, { stage: 'answering' }), effects: [] };
        }
        if (action.type === 'TAP_CELL') return onTapCell(state, action.index);
        if (action.type === 'MOVE_DOT') return onMoveDot(state, action);
        if (action.type === 'MOVE_REJECTED') return onMoveRejected(state);
        if (action.type === 'SUBMIT') return onSubmit(state, action);
        if (action.type === 'SUBMIT_FIELDS') return onSubmitFields(state, action);
        if (stage === 'ack' && action.type === 'ACK_DONE') {
          if (state.pending) return { state: setItem(state, { stage: 'mind' }), effects: [] };
          return advanceStep(state);
        }
        if (stage === 'mind' && action.type === 'STRATEGY_PICK') {
          return onStrategy(state, action.strategyId, action.strategyLatencyMs);
        }
        if (stage === 'mind' && action.type === 'STRATEGY_SKIP')
          return onStrategy(state, undefined, undefined);
        if (action.type === 'NEXT') return onNext(state);
        return noop(state);
      }

      case 'compare':
        if (action.type === 'MOVE_DOT') return onMoveDot(state, action);
        if (action.type === 'MOVE_REJECTED') return onMoveRejected(state);
        if (action.type === 'OPTION_PICK') return onOptionPick(state, action);
        if (action.type === 'NEXT') return onNext(state);
        return noop(state);

      case 'rule':
      case 'tell-parent':
      case 'round-end':
        return action.type === 'NEXT' ? onNext(state) : noop(state);

      case 'challenge':
        return onChallenge(state, action);

      case 'parent-instruction': {
        if (action.type === 'PARENT_CONTINUE') {
          const next = advanceQueue(state);
          return { state: next.state, effects: next.effects };
        }
        if (action.type !== 'PARENT_DONE') return noop(state);
        const noted: EventPayload = { type: 'parent.noted', resolvedFlag: phase.reason };
        const s = fold(state, [noted]);
        const next = advanceQueue(s);
        return { state: next.state, effects: [emit(noted), ...next.effects] };
      }

      case 'handover': {
        if (action.type !== 'HANDOVER_DONE') return noop(state);
        if (state.session.taught.length === 0) return completeSession(state);
        return {
          state: {
            ...state,
            phase: { kind: 'parent-note', blockKinds: state.session.taught, index: 0 },
          },
          effects: [],
        };
      }

      case 'parent-note': {
        if (action.type !== 'NOTE_SAVE' && action.type !== 'NOTE_SKIP') return noop(state);
        let s = state;
        const effects: LessonEffect[] = [];
        if (action.type === 'NOTE_SAVE') {
          const note = action.note?.trim().slice(0, MAX_NOTE_LENGTH);
          const noted: EventPayload = {
            type: 'parent.noted',
            blockKind: phase.blockKinds[phase.index]!,
            fingers: action.fingers,
            mouth: action.mouth,
            ...(note ? { note } : {}),
          };
          s = fold(s, [noted]);
          effects.push(emit(noted));
        }
        const index = phase.index + 1;
        if (index < phase.blockKinds.length) {
          return {
            state: { ...s, phase: { kind: 'parent-note', blockKinds: phase.blockKinds, index } },
            effects,
          };
        }
        const done = completeSession(s);
        return { state: done.state, effects: [...effects, ...done.effects] };
      }

      default:
        return noop(state);
    }
  }

  return { initial, transition };
}

// ตัวเลขช่วยสำหรับหน้าจอ: ค่าของ makeTenPlan ต่อข้อ (แสดงกล่อง/กอง/NumberBond)
export function itemPlan(item: LessonItem): ReturnType<typeof makeTenPlan> {
  return planOf(item);
}

export { makeParams };
