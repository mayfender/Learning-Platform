import { makeTenPlan } from '@/engine/lesson/makeTenPlan';
import type { Problem, StrategyId } from '@/engine/types';

export type LessonMisconception = 'L1' | 'M4' | 'M5' | 'M6' | 'M7' | 'MX';
export type AnswerKind = 'gap' | 'rest' | 'total';

export interface LessonClassification {
  correct: boolean;
  misconceptionId?: LessonMisconception;
}

// n = จำนวนจุดที่เห็นในกล่อง/โจทย์ (missing-part: part, arith: ตัวใหญ่)
function seenInBox(problem: Problem): number {
  if (problem.kind === 'missing-part') return problem.part;
  if (problem.kind === 'arith') return Math.max(problem.a, problem.b);
  throw new Error('classifyLessonAnswer ไม่รองรับโจทย์ชนิดนี้');
}

function arithOperands(problem: Problem): { a: number; b: number } {
  if (problem.kind !== 'arith') {
    throw new Error('ช่อง rest/total ใช้กับโจทย์ arith เท่านั้น');
  }
  return { a: problem.a, b: problem.b };
}

// กฎจับคู่ความเข้าใจผิดของ ADD-04 (LS §2, Tech Spec §4.5) เป็นฟังก์ชันของ "โจทย์ + คำตอบ"
export function classifyLessonAnswer(
  kind: AnswerKind,
  problem: Problem,
  response: number,
  opts?: { mindView?: StrategyId },
): LessonClassification {
  if (kind === 'gap') {
    const n = seenInBox(problem);
    const e = 10 - n;
    if (response === e) return { correct: true };
    if (response === n) return { correct: false, misconceptionId: 'L1' };
    if (response === 10 + n) return { correct: false, misconceptionId: 'M4' };
    if (Math.abs(response - e) === 1) return { correct: false, misconceptionId: 'M5' };
    return { correct: false, misconceptionId: 'MX' };
  }

  const { a, b } = arithOperands(problem);

  if (kind === 'rest') {
    const plan = makeTenPlan(a, b);
    if (response === plan.rest) return { correct: true };
    if (response === plan.pileDots) return { correct: false, misconceptionId: 'M7' };
    if (Math.abs(response - plan.rest) === 1) return { correct: false, misconceptionId: 'M5' };
    return { correct: false, misconceptionId: 'MX' };
  }

  const s = a + b;
  if (response === s) return { correct: true };
  if (response === s - 10) return { correct: false, misconceptionId: 'M6' };
  const nearSum = response === s - 1 || response === s + 1;
  const tenPlus = response === 10 + a || response === 10 + b;
  if (nearSum && tenPlus) {
    // ชนกัน (ตัวบวกตัวหนึ่งเป็น 9 และตอบ s + 1): ให้คำบอกเล่าของลูกตัดสิน (Designer Q1)
    return { correct: false, misconceptionId: opts?.mindView === 'see-box' ? 'M7' : 'M5' };
  }
  if (nearSum) return { correct: false, misconceptionId: 'M5' };
  if (tenPlus) return { correct: false, misconceptionId: 'M7' };
  return { correct: false, misconceptionId: 'MX' };
}
