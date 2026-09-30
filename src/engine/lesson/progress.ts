import { evaluateCheck, type AnsweredPayload } from '@/engine/lesson/evaluate';
import type { Lesson } from '@/engine/lesson/types';
import type {
  AppEvent,
  BlockKind,
  BlockMetrics,
  BlockOutcome,
  BlockSkipReason,
  EventPayload,
  LessonFlag,
  NoteFrequency,
  Skill,
  SkillId,
} from '@/engine/types';

// ความก้าวหน้าของบทไม่เก็บเป็นสถานะ ให้คำนวณจาก event log ทุกครั้ง (Tech Spec §5.5, ADR-0003)
// เฉพาะ block ที่มี block.completed เท่านั้นที่มีผลต่อสถานะ (block ที่ไม่จบเริ่มใหม่ทั้ง block)

// ลำดับรอบของ block ส่วน A: 0 = ทำจริง, 1 = A2 ซ้ำ, 2 = A3 ซ้ำ (ผ่านซ้ำ), 3 = A3 ทบทวนหลัง B ไม่ผ่าน (remedial)
export const A_ROUND = { main: 0, a2Retry: 1, a3Retry: 2, remedial: 3 } as const;

export interface BlockRun {
  blockId: string;
  kind: BlockKind;
  round: number;
  skillId?: SkillId;
  seed?: number;
  skipped?: { itemIds: string[]; reason: BlockSkipReason };
  answers: AnsweredPayload[];
  completed?: {
    outcome: BlockOutcome;
    skipReason?: BlockSkipReason;
    flags: LessonFlag[];
    metrics?: BlockMetrics;
    level?: 'noCount' | 'automatic' | 'none';
    detail?: Record<string, number | string | boolean>;
  };
}

export type PartStatus = 'todo' | 'passed' | 'passed-trend' | 'not-passed' | 'stalled' | 'skipped';
// block ถัดไปของส่วนนี้ (null = ไม่มีอะไรต้องทำ)
export type PartNext = 'main' | 'a2-retry' | 'a3-retry' | 'b-retry' | 'remedial' | null;

export interface PartProgress {
  status: PartStatus;
  next: PartNext;
  round: number; // เลขรอบของ block ถัดไป
}

export interface ParentNoteRecord {
  fingers?: NoteFrequency;
  mouth?: NoteFrequency;
  note?: string;
}

export interface LessonProgress {
  lessonId: string;
  sittingsCompleted: number;
  sitting: number; // ครั้งที่ปัจจุบัน = ครั้งที่จบแล้ว + 1
  runs: BlockRun[];
  check: { done: boolean; skipA12: boolean; skipB12: boolean };
  A: PartProgress;
  B: PartProgress & { restarted: boolean };
  practiceDone: SkillId[];
  challengeDone: boolean;
  pendingFlags: LessonFlag[];
  notes: { A?: ParentNoteRecord; B?: ParentNoteRecord };
  // รอบฝึก/ทบทวนล่าสุดของแต่ละทักษะ (ใช้เทียบใน roundSummary และเลี่ยงโจทย์ซ้ำ)
  lastRounds: Partial<Record<SkillId, AnsweredPayload[]>>;
}

export interface ProgressContext {
  lesson: Lesson;
  skills: readonly Skill[];
}

export function initialProgress(lesson: Lesson): LessonProgress {
  return {
    lessonId: lesson.id,
    sittingsCompleted: 0,
    sitting: 1,
    runs: [],
    check: { done: false, skipA12: false, skipB12: false },
    A: { status: 'todo', next: 'main', round: A_ROUND.main },
    B: { status: 'todo', next: 'main', round: 0, restarted: false },
    practiceDone: [],
    challengeDone: false,
    pendingFlags: [],
    notes: {},
    lastRounds: {},
  };
}

function findRun(p: LessonProgress, blockId: string): BlockRun | undefined {
  for (let i = p.runs.length - 1; i >= 0; i -= 1) {
    if (p.runs[i]!.blockId === blockId) return p.runs[i];
  }
  return undefined;
}

function applyCompleted(p: LessonProgress, run: BlockRun, ctx: ProgressContext): void {
  const done = run.completed!;
  p.pendingFlags.push(...done.flags);

  if (run.kind === 'check') {
    if (done.outcome === 'done') {
      p.check = { done: true, ...evaluateCheck(ctx.lesson, run.answers, ctx.skills) };
    }
    return;
  }

  if (run.kind === 'A') {
    if (done.outcome === 'skipped') {
      p.A = { status: 'skipped', next: null, round: p.A.round };
      return;
    }
    if (run.round === A_ROUND.main || run.round === A_ROUND.a3Retry) {
      if (done.outcome === 'passed' || done.outcome === 'passed-trend') {
        p.A = { status: done.outcome, next: null, round: run.round };
      } else if (run.round === A_ROUND.main) {
        p.A = { status: 'not-passed', next: 'a2-retry', round: A_ROUND.a2Retry };
      } else {
        p.A = { status: 'stalled', next: null, round: run.round };
      }
    } else if (run.round === A_ROUND.a2Retry) {
      p.A = { ...p.A, next: 'a3-retry', round: A_ROUND.a3Retry };
    } else if (run.round === A_ROUND.remedial && p.B.next === 'remedial') {
      // A3 ทบทวนหลัง B ไม่ผ่านครบรอบ: ส่วน B หยุดรอ (พ่อกด "เริ่มส่วน B ใหม่")
      p.B = { ...p.B, status: 'stalled', next: null };
    }
    return;
  }

  if (run.kind === 'B') {
    if (done.outcome === 'skipped') {
      p.B = { ...p.B, status: 'skipped', next: null };
      return;
    }
    if (done.outcome === 'passed' || done.outcome === 'passed-trend') {
      p.B = { ...p.B, status: done.outcome, next: null, round: run.round };
      return;
    }
    const maxRetry = ctx.lesson.blocks.B.onFail.maxRetryRounds;
    if (run.round < maxRetry) {
      p.B = { ...p.B, status: 'not-passed', next: 'b-retry', round: run.round + 1 };
    } else {
      p.B = { ...p.B, status: 'not-passed', next: 'remedial', round: A_ROUND.remedial };
    }
    return;
  }

  if (run.kind === 'practice' || run.kind === 'review') {
    if (run.kind === 'practice' && run.skillId && !p.practiceDone.includes(run.skillId)) {
      p.practiceDone.push(run.skillId);
    }
    if (run.skillId) p.lastRounds[run.skillId] = run.answers.filter((a) => a.attemptNo === 1);
    return;
  }

  if (run.kind === 'challenge') p.challengeDone = true;
}

// เพิ่ม 1 event เข้าความก้าวหน้า (pure: คืนสำเนาใหม่) ใช้ทั้ง deriveProgress และ machine
export function applyEvent(
  progress: LessonProgress,
  event: EventPayload | AppEvent,
  ctx: ProgressContext,
): LessonProgress {
  const p = structuredClone(progress);
  switch (event.type) {
    case 'block.started':
      p.runs.push({
        blockId: event.blockId,
        kind: event.blockKind,
        round: event.round ?? 0,
        skillId: event.skillId,
        seed: event.seed,
        skipped: event.skipped,
        answers: [],
      });
      break;
    case 'item.answered': {
      if (event.blockId === undefined) break;
      findRun(p, event.blockId)?.answers.push(event);
      break;
    }
    case 'block.completed': {
      const run = findRun(p, event.blockId);
      if (!run) break;
      run.completed = {
        outcome: event.outcome,
        skipReason: event.skipReason,
        flags: [...(event.flags ?? [])],
        metrics: event.metrics,
        level: event.level,
        detail: event.detail,
      };
      applyCompleted(p, run, ctx);
      break;
    }
    case 'parent.noted': {
      if (event.resolvedFlag === 'restart-B') {
        p.B = { status: 'todo', next: 'main', round: 0, restarted: true };
        p.pendingFlags = p.pendingFlags.filter((f) => f !== 'stalled-B');
      } else if (event.resolvedFlag !== undefined) {
        const i = p.pendingFlags.indexOf(event.resolvedFlag as LessonFlag);
        if (i >= 0) p.pendingFlags.splice(i, 1);
      }
      if (event.blockKind && (event.fingers || event.mouth || event.note !== undefined)) {
        p.notes[event.blockKind] = {
          fingers: event.fingers,
          mouth: event.mouth,
          note: event.note,
        };
      }
      break;
    }
    default:
      break;
  }
  return p;
}

// คำนวณความก้าวหน้าจาก log ของบท (ต้องส่ง event ที่เรียงด้วย compareEvents แล้ว)
export function deriveProgress(
  lesson: Lesson,
  skills: readonly Skill[],
  events: readonly AppEvent[],
): LessonProgress {
  const ctx: ProgressContext = { lesson, skills };
  const own = events.filter((e) => e.activityId === lesson.id);
  // เรียงตาม at แบบเสถียร (event ที่ at เท่ากันคงลำดับเดิมจาก store)
  const ordered = own
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (a.e.at < b.e.at ? -1 : a.e.at > b.e.at ? 1 : a.i - b.i))
    .map((x) => x.e);

  let progress = initialProgress(lesson);
  const lessonSessions = new Set<string>(); // session ที่เป็น "ครั้ง" ของบท (session.started มี sitting)
  let completed = 0;
  for (const e of ordered) {
    if (e.type === 'session.started') {
      if (e.sitting !== undefined) lessonSessions.add(e.sessionId);
      continue;
    }
    if (e.type === 'session.completed') {
      if (lessonSessions.has(e.sessionId)) completed += 1;
      continue;
    }
    progress = applyEvent(progress, e, ctx);
  }
  progress.sittingsCompleted = completed;
  progress.sitting = completed + 1;
  return progress;
}
