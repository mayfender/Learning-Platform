import type { MakeTenPlan } from '@/engine/lesson/types';

// แผน make-ten: เริ่มจากตัวใหญ่เสมอ (Tech Spec §4.1) — ขาดเท่าไรถึงสิบ เอามาจากกอง เหลือเท่าไรบวกกับสิบ
export function makeTenPlan(a: number, b: number): MakeTenPlan {
  const valid = (n: number): boolean => Number.isInteger(n) && n >= 1 && n <= 9;
  if (!valid(a) || !valid(b) || a + b <= 10) {
    throw new RangeError(`makeTenPlan ใช้ได้เฉพาะ a, b เป็น 1–9 ที่ a + b > 10 (ได้ ${a}, ${b})`);
  }
  const boxDots = Math.max(a, b);
  const pileDots = Math.min(a, b);
  const gap = 10 - boxDots;
  return { boxDots, pileDots, gap, rest: pileDots - gap, total: a + b };
}
