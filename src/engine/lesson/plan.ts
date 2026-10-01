import { generateA2Retry, generateA3Retry, generateBondsRound } from '@/engine/generators/bonds10';
import {
  generateB3Retry,
  generateB4Retry,
  generateMakeTenRound,
  type Pair,
} from '@/engine/generators/makeTen';
import {
  evaluateA,
  evaluateB,
  roundLevel,
  summarizeAnswers,
  thresholdOf,
  type AnsweredPayload,
} from '@/engine/lesson/evaluate';
import { A_ROUND, type LessonProgress, type ProgressContext } from '@/engine/lesson/progress';
import type { LessonItem } from '@/engine/lesson/types';
import type {
  BlockKind,
  BlockMetrics,
  BlockOutcome,
  BlockSkipReason,
  LessonFlag,
  SkillId,
} from '@/engine/types';

export type BlockVariant =
  | 'main' // check, A, B (ทำจริง)
  | 'a2-retry' // A ไม่ผ่าน: ทำ A2 ซ้ำด้วยชุดใหม่
  | 'a3-retry' // ครั้งถัดไป: A3 ชุดใหม่เพื่อวัดผ่านซ้ำ
  | 'b-retry' // B ไม่ผ่าน: B3+B4 ชุดใหม่
  | 'remedial' // B ไม่ผ่านครบรอบ: ย้อนไป A3 ชุดใหม่
  | 'practice'
  | 'review'
  | 'challenge';

export interface BlockSlot {
  kind: BlockKind;
  variant: BlockVariant;
  round: number;
  skillId?: SkillId;
}

export type ParentInstructionReason = 'talk-A' | 'tray-B1' | 'stalled-A' | 'stalled-B';

export type QueueItem =
  { type: 'block'; slot: BlockSlot } | { type: 'instruction'; reason: ParentInstructionReason };

export type PlannedStep =
  | { kind: 'item'; item: LessonItem }
  | { kind: 'compare' }
  | { kind: 'rule'; which: 'A' | 'B' }
  | { kind: 'tell-parent' }
  | { kind: 'challenge' };

export interface PlannedBlock {
  slot: BlockSlot;
  steps: PlannedStep[];
  seed?: number;
  skillId?: SkillId;
  skipped?: { itemIds: string[]; reason: BlockSkipReason };
}

export interface SittingPlan {
  lessonId: string;
  sitting: number;
  seed: number;
  queue: QueueItem[];
  progress: LessonProgress;
  // false = ไม่มีหน้าส่งเครื่อง/บันทึกของพ่อปลายรอบ (รอบทบทวนนอกบท)
  handover: boolean;
  lessonComplete: boolean;
}

export function deriveSeed(base: number, ordinal: number): number {
  return (base + Math.imul(ordinal + 1, 2654435761)) >>> 0;
}

export function blockSlot(
  kind: BlockKind,
  variant: BlockVariant,
  round = 0,
  skillId?: SkillId,
): BlockSlot {
  return { kind, variant, round, ...(skillId ? { skillId } : {}) };
}

const isPassed = (s: string): boolean => s === 'passed' || s === 'passed-trend';

// --- วางแผนครั้ง (sitting) จากความก้าวหน้าที่คำนวณจาก log ---

export function planSitting(
  ctx: ProgressContext,
  progress: LessonProgress,
  opts: { seed: number },
): SittingPlan {
  const { lesson } = ctx;
  const config = lesson.sittings.find((s) => s.no === progress.sitting);
  const inSitting = new Set<BlockKind>(config?.blocks ?? []);
  const queue: QueueItem[] = [];
  const push = (slot: BlockSlot): void => void queue.push({ type: 'block', slot });

  if (!progress.check.done && inSitting.has('check')) push(blockSlot('check', 'main'));

  // ส่วน A: ค้างอยู่ก็ทำต่อเสมอ (รวมรอบซ้ำ)
  const a = progress.A;
  if (a.next === 'main') push(blockSlot('A', 'main', A_ROUND.main));
  else if (a.next === 'a2-retry') push(blockSlot('A', 'a2-retry', A_ROUND.a2Retry));
  else if (a.next === 'a3-retry' && progress.sitting >= 2) {
    // A3 ซ้ำอยู่ครั้งถัดไปเสมอ ธงของพ่อไม่เป็นเงื่อนไข (หน้าคำแนะนำที่ค้างแทรกไว้หัวคิวด้านล่าง)
    push(blockSlot('A', 'a3-retry', A_ROUND.a3Retry));
  }

  // ส่วน B
  const b = progress.B;
  let bInQueue = false;
  if (b.next === 'main' && (inSitting.has('B') || b.restarted)) {
    push(blockSlot('B', 'main', 0));
    bInQueue = true;
  } else if (b.next === 'b-retry') {
    push(blockSlot('B', 'b-retry', b.round));
    bInQueue = true;
  } else if (b.next === 'remedial') {
    push(blockSlot('A', 'remedial', A_ROUND.remedial));
    queue.push({ type: 'instruction', reason: 'stalled-B' });
  }

  // ฝึกให้คล่องและปริศนาตามหลัง B ที่ผ่านแล้ว (หรือ B ที่อยู่ในคิว)
  const bResolved = isPassed(b.status) || b.status === 'skipped';
  if (bInQueue || bResolved) {
    for (const round of lesson.practice.rounds) {
      if (!progress.practiceDone.includes(round.skillId)) {
        push(blockSlot('practice', 'practice', 0, round.skillId));
      }
    }
    if (!progress.challengeDone) push(blockSlot('challenge', 'challenge', 0));
  }

  // ธงที่ค้าง (ปิดแอปก่อนพ่อกด "ทำแล้ว")
  if (progress.pendingFlags.includes('tray-B1')) {
    queue.unshift({ type: 'instruction', reason: 'tray-B1' });
  }
  if (progress.pendingFlags.includes('talk-A')) {
    const at = queue.findIndex((q) => q.type === 'block' && q.slot.variant === 'a2-retry');
    queue.splice(at >= 0 ? at + 1 : 0, 0, { type: 'instruction', reason: 'talk-A' });
  }

  return {
    lessonId: lesson.id,
    sitting: progress.sitting,
    seed: opts.seed,
    queue,
    progress,
    handover: true,
    lessonComplete: progress.sitting > lesson.sittings.length && queue.length === 0,
  };
}

// แผนรอบทบทวนนอกบท (Tech Spec §5.6): 1 รอบต่อทักษะที่ครบกำหนด ทำต่อกัน bonds ก่อน make-ten
export function planReview(
  ctx: ProgressContext,
  progress: LessonProgress,
  skillIds: readonly SkillId[],
  opts: { seed: number },
): SittingPlan {
  const order = ctx.lesson.practice.rounds.map((r) => r.skillId);
  const queue: QueueItem[] = order
    .filter((id) => skillIds.includes(id))
    .map((id) => ({ type: 'block', slot: blockSlot('review', 'review', 0, id) }));
  return {
    lessonId: ctx.lesson.id,
    sitting: progress.sitting,
    seed: opts.seed,
    queue,
    progress,
    handover: false,
    lessonComplete: false,
  };
}

// --- สร้างเนื้อหาของ block (แก้ข้อที่ข้าม ชุดตัวเลขใหม่) ---

const partsOf = (items: readonly LessonItem[]): number[] =>
  items.flatMap((i) => (i.problem.kind === 'missing-part' ? [i.problem.part] : []));

function pairOf(item: LessonItem): Pair | undefined {
  return item.problem.kind === 'arith' ? [item.problem.a, item.problem.b] : undefined;
}

function pairsOfItems(items: readonly LessonItem[]): Pair[] {
  return items.flatMap((i) => {
    const p = pairOf(i);
    return p ? [p] : [];
  });
}

function pairsOfAnswers(answers: readonly AnsweredPayload[]): Pair[] {
  return answers.flatMap((a) =>
    a.problem.kind === 'arith' ? [[a.problem.a, a.problem.b] as Pair] : [],
  );
}

const asSteps = (items: readonly LessonItem[]): PlannedStep[] =>
  items.map((item) => ({ kind: 'item', item }));

export function buildBlock(
  ctx: ProgressContext,
  slot: BlockSlot,
  progress: LessonProgress,
  seed: number,
): PlannedBlock {
  const { lesson } = ctx;
  const A = lesson.blocks.A;
  const B = lesson.blocks.B;

  switch (slot.variant) {
    case 'main': {
      if (slot.kind === 'check') return { slot, steps: asSteps(lesson.check.items) };
      if (slot.kind === 'A') {
        const skip = progress.check.done && progress.check.skipA12;
        return {
          slot,
          steps: [
            ...(skip ? [] : [...asSteps(A.a1), ...asSteps(A.a2)]),
            ...asSteps(A.a3),
            { kind: 'rule', which: 'A' },
          ],
          ...(skip
            ? {
                skipped: { itemIds: [...A.a1, ...A.a2].map((i) => i.id), reason: 'check' as const },
              }
            : {}),
        };
      }
      const skip = progress.check.done && progress.check.skipB12;
      return {
        slot,
        steps: [
          ...(skip ? [] : [...asSteps(B.b1), { kind: 'compare' } as const]),
          ...asSteps(B.b3),
          ...asSteps(B.b4),
          { kind: 'tell-parent' },
          { kind: 'rule', which: 'B' },
        ],
        ...(skip
          ? {
              skipped: {
                itemIds: [
                  ...B.b1.map((i) => i.id),
                  ...B.compare.questions.map((q) => `B2.${q.id}`),
                ],
                reason: 'check' as const,
              },
            }
          : {}),
      };
    }
    case 'a2-retry':
      return {
        slot,
        seed,
        steps: asSteps(generateA2Retry(seed, partsOf(A.a2), { idPrefix: `A2.r${slot.round}` })),
      };
    case 'a3-retry':
      // A3 ชุดใหม่ที่วัดผ่านซ้ำ: ต่อท้ายด้วยข้อสรุปกฎ A เหมือนส่วน A ปกติ (Tech Spec §5.2.4 "ต่อท้าย A3")
      return {
        slot,
        seed,
        steps: [
          ...asSteps(generateA3Retry(seed, partsOf(A.a3), { idPrefix: `A3.r${slot.round}` })),
          { kind: 'rule', which: 'A' },
        ],
      };
    case 'remedial':
      return {
        slot,
        seed,
        steps: asSteps(generateA3Retry(seed, partsOf(A.a3), { idPrefix: `A3.m${slot.round}` })),
      };
    case 'b-retry': {
      const used: Pair[] = [
        ...pairsOfItems([...B.b3, ...B.b4]),
        ...progress.runs
          .filter((r) => r.kind === 'B' && r.round > 0)
          .flatMap((r) => pairsOfAnswers(r.answers)),
      ];
      const b3 = generateB3Retry(seed, used, { idPrefix: `B3.r${slot.round}` });
      const b4 = generateB4Retry(deriveSeed(seed, 1), [...used, ...pairsOfItems(b3)], {
        idPrefix: `B4.r${slot.round}`,
      });
      return { slot, seed, steps: [...asSteps(b3), ...asSteps(b4)] };
    }
    case 'practice':
    case 'review': {
      const skillId = slot.skillId;
      if (!skillId) throw new Error('block ฝึก/ทบทวนต้องมี skillId');
      const round = lesson.practice.rounds.find((r) => r.skillId === skillId);
      if (!round) throw new Error(`ไม่มีรอบฝึกของ ${skillId}`);
      const previous = progress.lastRounds[skillId] ?? [];
      const section = slot.variant;
      const items =
        round.generator === 'bonds-10'
          ? generateBondsRound(seed, {
              avoid: previous.flatMap((a) => {
                if (a.problem.kind !== 'missing-part') return [];
                return [
                  {
                    n: a.problem.part,
                    form:
                      a.mode === 'fade'
                        ? ('flash' as const)
                        : a.problem.missing === 'first'
                          ? ('gap-first' as const)
                          : ('gap-second' as const),
                  },
                ];
              }),
              idPrefix: section,
              section,
            })
          : generateMakeTenRound(seed, {
              avoid: pairsOfAnswers(previous),
              idPrefix: section,
              section,
            });
      return { slot, seed, skillId, steps: asSteps(items) };
    }
    case 'challenge':
      return { slot, steps: [{ kind: 'challenge' }] };
  }
}

// --- ตัดสินเมื่อ block จบ ---

export interface BlockCompletion {
  outcome: BlockOutcome;
  skipReason?: BlockSkipReason;
  metrics?: BlockMetrics;
  level?: 'noCount' | 'automatic' | 'none';
  flags: LessonFlag[];
  // สิ่งที่ต้องแทรกหน้าคิว และตัดของที่เหลือทิ้งหรือไม่ (ส่วน A ไม่ผ่านจบครั้ง ฯลฯ)
  prepend: QueueItem[];
  truncate: boolean;
}

export function completeBlock(
  ctx: ProgressContext,
  slot: BlockSlot,
  answers: readonly AnsweredPayload[],
  opts: { skippedManual?: boolean } = {},
): BlockCompletion {
  const { lesson, skills } = ctx;
  const base = { flags: [] as LessonFlag[], prepend: [] as QueueItem[], truncate: false };

  if (opts.skippedManual) return { ...base, outcome: 'skipped', skipReason: 'manual' };

  const skillThreshold = (skillId: SkillId | undefined): number =>
    skillId ? thresholdOf(skills, skillId, 'noCount') : 0;

  switch (slot.variant) {
    case 'main':
    case 'a3-retry': {
      if (slot.kind === 'check') return { ...base, outcome: 'done' };
      if (slot.kind === 'A') {
        const ev = evaluateA(lesson, answers, skills);
        if (ev.outcome === 'passed') return { ...base, outcome: 'passed', metrics: ev.metrics };
        if (slot.variant === 'main') {
          return {
            ...base,
            outcome: 'not-passed',
            metrics: ev.metrics,
            flags: ['talk-A'],
            // A ไม่ผ่าน: ทำ A2 ซ้ำ → หน้าพ่อ Number Talks → จบครั้ง (ที่เหลือของครั้งนี้ตัดทิ้ง)
            prepend: [
              { type: 'block', slot: blockSlot('A', 'a2-retry', A_ROUND.a2Retry) },
              { type: 'instruction', reason: 'talk-A' },
            ],
            truncate: true,
          };
        }
        // ผ่านซ้ำไม่ได้: แจ้งพ่อและ Designer แต่เปิด B ให้เล่นต่อได้ (พ่อตัดสินใจ)
        return {
          ...base,
          outcome: 'not-passed',
          metrics: ev.metrics,
          flags: ['stalled-A'],
          prepend: [{ type: 'instruction', reason: 'stalled-A' }],
        };
      }
      // variant 'main' ของ B
      return completeB(ctx, slot, answers);
    }
    case 'b-retry':
      return completeB(ctx, slot, answers);
    case 'a2-retry':
    case 'remedial': {
      const threshold = skillThreshold('add.bonds-10');
      return { ...base, outcome: 'done', metrics: summarizeAnswers(answers, threshold) };
    }
    case 'practice':
    case 'review': {
      return {
        ...base,
        outcome: 'done',
        metrics: summarizeAnswers(answers, skillThreshold(slot.skillId)),
        level: slot.skillId ? roundLevel(answers, skills, slot.skillId) : 'none',
      };
    }
    case 'challenge':
      return { ...base, outcome: 'done' };
  }
}

function completeB(
  ctx: ProgressContext,
  slot: BlockSlot,
  answers: readonly AnsweredPayload[],
): BlockCompletion {
  const { lesson, skills } = ctx;
  const ev = evaluateB(lesson, answers, skills);
  const flags: LessonFlag[] = [];
  const prepend: QueueItem[] = [];
  let truncate = false;
  if (ev.trayFlag) {
    flags.push('tray-B1');
    prepend.push({ type: 'instruction', reason: 'tray-B1' });
  }
  if (ev.outcome === 'not-passed') {
    const max = lesson.blocks.B.onFail.maxRetryRounds;
    if (slot.round < max) {
      prepend.push({ type: 'block', slot: blockSlot('B', 'b-retry', slot.round + 1) });
    } else {
      flags.push('stalled-B');
      prepend.push(
        { type: 'block', slot: blockSlot('A', 'remedial', A_ROUND.remedial) },
        { type: 'instruction', reason: 'stalled-B' },
      );
      truncate = true;
    }
  }
  return { outcome: ev.outcome, metrics: ev.metrics, flags, prepend, truncate };
}
