import { describe, expect, it } from 'vitest';
import { makeTenPlan } from '@/engine/lesson/makeTenPlan';

describe('makeTenPlan', () => {
  // ตารางพิมพ์จาก LS ADD-04 §4 B1/B3 (ตัวตั้งต้นในกล่อง, กอง, ขาด, เหลือ, ผลรวม) ห้าม import จากเนื้อหา
  const table: [number, number, number, number, number, number, number][] = [
    // a, b, box, pile, gap, rest, total
    [8, 5, 8, 5, 2, 3, 13],
    [9, 6, 9, 6, 1, 5, 15],
    [7, 4, 7, 4, 3, 1, 11],
    [8, 6, 8, 6, 2, 4, 14],
    [9, 5, 9, 5, 1, 4, 14],
    [7, 8, 8, 7, 2, 5, 15], // 7+8 เริ่มจาก 8
    [6, 9, 9, 6, 1, 5, 15],
    [8, 4, 8, 4, 2, 2, 12],
    [7, 6, 7, 6, 3, 3, 13], // 7+6 เริ่มจาก 7
  ];
  it.each(table)('%i + %i', (a, b, box, pile, gap, rest, total) => {
    expect(makeTenPlan(a, b)).toEqual({
      boxDots: box,
      pileDots: pile,
      gap,
      rest,
      total,
    });
  });

  it('ทุกคู่ที่ใช้ได้ (a,b ∈ 2..9, 11 ≤ a+b ≤ 18) ได้ค่าที่สอดคล้องกัน', () => {
    let count = 0;
    for (let a = 2; a <= 9; a += 1) {
      for (let b = 2; b <= 9; b += 1) {
        if (a + b < 11 || a + b > 18) continue;
        const p = makeTenPlan(a, b);
        count += 1;
        expect(p.boxDots).toBe(Math.max(a, b));
        expect(p.pileDots).toBe(Math.min(a, b));
        expect(p.boxDots + p.gap).toBe(10);
        expect(p.gap + p.rest).toBe(p.pileDots);
        expect(p.rest).toBeGreaterThanOrEqual(1);
        expect(10 + p.rest).toBe(a + b);
        expect(p.total).toBe(a + b);
      }
    }
    expect(count).toBeGreaterThan(0);
  });

  it('a + b ≤ 10 หรือค่านอก 1–9 throw', () => {
    expect(() => makeTenPlan(5, 5)).toThrow(RangeError);
    expect(() => makeTenPlan(0, 9)).toThrow(RangeError);
    expect(() => makeTenPlan(10, 5)).toThrow(RangeError);
    expect(() => makeTenPlan(2.5, 9)).toThrow(RangeError);
  });
});
