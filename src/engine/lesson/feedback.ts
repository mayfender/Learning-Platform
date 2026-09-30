import { makeTenPlan } from '@/engine/lesson/makeTenPlan';
import type { AnswerKind } from '@/engine/lesson/classify';
import type { LessonItem, LessonTexts } from '@/engine/lesson/types';

// ข้อความตอบกลับที่ machine ส่งให้หน้าจอ (ข้อความทั้งหมดมาจากเนื้อหา ไม่ฝังในโค้ด)
export interface Feedback {
  kind: 'correct' | 'wrong' | 'revealed';
  misconceptionId?: string;
  // ข้อความตามลำดับที่แสดง (ว่างได้)
  texts: string[];
  // ไฮไลต์ที่ให้หน้าจอวาด: ช่องที่ว่างตอนเริ่ม (A) หรือกองที่เหลือ (B)
  highlight: 'gap-cells' | 'pile-rest' | 'none';
}

export function fill(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in params ? String(params[key]) : whole,
  );
}

export function nOf(item: LessonItem): number {
  const p = item.problem;
  if (p.kind === 'missing-part') return p.part;
  if (p.kind === 'arith') return Math.max(p.a, p.b);
  throw new Error('ข้อนี้ไม่มีกล่อง');
}

export function planOf(item: LessonItem): ReturnType<typeof makeTenPlan> {
  const p = item.problem;
  if (p.kind !== 'arith') throw new Error('ข้อนี้ไม่ใช่โจทย์บวก');
  return makeTenPlan(p.a, p.b);
}

// ตัวตั้งต้นในกล่อง {a} และตัวในกอง {b} ของข้อบวก (ตัวใหญ่เสมอ)
export function makeParams(item: LessonItem): Record<string, number> {
  const plan = planOf(item);
  return {
    a: plan.boxDots,
    b: plan.pileDots,
    gap: plan.gap,
    rest: plan.rest,
    total: plan.total,
    pile: plan.pileDots,
  };
}

export function correctText(texts: LessonTexts, item: LessonItem, block: 'A' | 'B'): string {
  if (block === 'A') {
    const n = nOf(item);
    return fill(texts.feedback.correctGap, { n, x: 10 - n });
  }
  return fill(texts.feedback.correctMake, makeParams(item));
}

// ข้อความของรหัสความเข้าใจผิดตามชนิดช่อง (A: ช่องว่างของกล่อง, B: ขาด/เหลือ/ผลรวม)
export function wrongText(
  texts: LessonTexts,
  kind: AnswerKind,
  misconceptionId: string | undefined,
  block: 'A' | 'B',
  item: LessonItem,
): string {
  const f = texts.feedback;
  const mx = block === 'A' ? f.mxA : f.mxB;
  if (kind === 'gap') {
    switch (misconceptionId) {
      case 'L1':
        return f.l1;
      case 'M5':
        return f.m5Gap;
      case 'M4':
        return f.m4;
      default:
        return mx;
    }
  }
  const params = item.problem.kind === 'arith' ? makeParams(item) : {};
  switch (misconceptionId) {
    case 'M7':
      return fill(f.m7, params);
    case 'M6':
      return kind === 'total' ? f.m6 : mx;
    case 'M5':
      return f.m5Make;
    default:
      return mx;
  }
}
