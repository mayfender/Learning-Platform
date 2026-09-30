import { describe, expect, it } from 'vitest';
import {
  bondsKey,
  generateA2Retry,
  generateA3Retry,
  generateBondsRound,
  type BondsItemKey,
} from '@/engine/generators/bonds10';
import {
  generateB3Retry,
  generateB4Retry,
  generateMakeTenRound,
  MAKE_TEN_PAIRS,
  pairKey,
  type Pair,
} from '@/engine/generators/makeTen';
import { makeTenPlan } from '@/engine/lesson/makeTenPlan';
import { solve } from '@/engine/problem';
import type { LessonItem } from '@/engine/lesson/types';

const SEEDS = Array.from({ length: 600 }, (_, i) => i * 7919 + 13);

// ฟังก์ชันตรวจอิสระ (ไม่พึ่งการคำนวณของ generator)
function operands(item: LessonItem): { a: number; b: number } {
  if (item.problem.kind !== 'arith') throw new Error('ต้องเป็น arith');
  return { a: item.problem.a, b: item.problem.b };
}
function partOf(item: LessonItem): number {
  if (item.problem.kind !== 'missing-part') throw new Error('ต้องเป็น missing-part');
  return item.problem.part;
}
function missingOf(item: LessonItem): 'first' | 'second' {
  if (item.problem.kind !== 'missing-part') throw new Error('ต้องเป็น missing-part');
  return item.problem.missing ?? 'second';
}
function unorderedKey(item: LessonItem): string {
  const { a, b } = operands(item);
  return `${Math.min(a, b)}+${Math.max(a, b)}`;
}

// ตัวอย่างโจทย์ 13 ข้อใน LS §6 (พิมพ์ซ้ำจาก LS) — solve ต้องตรงเฉลย และอยู่ในเงื่อนไขของ generator
describe('ตัวอย่างโจทย์ใน LS §6', () => {
  const bonds: [number, 'first' | 'second', number][] = [
    [7, 'second', 3],
    [4, 'first', 6],
    [9, 'second', 1],
    [2, 'first', 8],
    [6, 'second', 4],
  ];
  it.each(bonds)('bonds n=%i (%s) เฉลย %i', (n, missing, answer) => {
    expect(solve({ kind: 'missing-part', whole: 10, part: n, missing })).toBe(answer);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(9);
  });

  const makeTen: [number, number, number][] = [
    [8, 5, 13],
    [9, 6, 15],
    [7, 4, 11],
    [4, 9, 13],
    [8, 7, 15],
    [9, 8, 17],
    [6, 7, 13],
    [7, 9, 16],
  ];
  it.each(makeTen)('make-ten %i + %i = %i', (a, b, answer) => {
    expect(solve({ kind: 'arith', op: '+', a, b })).toBe(answer);
    expect(a).not.toBe(b);
    expect(MAKE_TEN_PAIRS.some(([x, y]) => pairKey(x, y) === pairKey(a, b))).toBe(true);
  });
});

describe('generateBondsRound (N5, 600 seed)', () => {
  it('เงื่อนไขทุกแถวของ §4.4', () => {
    let withFive = 0;
    for (const seed of SEEDS) {
      const items = generateBondsRound(seed);
      expect(items).toHaveLength(4);
      const ns = items.map(partOf);
      expect(new Set(ns).size).toBe(4); // n ไม่ซ้ำในรอบ
      for (const n of ns) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(9);
      }
      const fives = ns.filter((n) => n === 5).length;
      expect(fives).toBeLessThanOrEqual(1);
      withFive += fives;
      // แฟลช 2 + ตัวเลข 2 (ตำแหน่งหาย first 1 second 1)
      expect(items.filter((i) => i.flow === 'silent-flash-gap')).toHaveLength(2);
      const text = items.filter((i) => i.flow === 'silent-text');
      expect(text).toHaveLength(2);
      expect(text.filter((i) => missingOf(i) === 'first')).toHaveLength(1);
      expect(text.filter((i) => missingOf(i) === 'second')).toHaveLength(1);
      for (const item of items) {
        expect(item.skillId).toBe('add.bonds-10');
        expect(item.expected).toBe(10 - partOf(item));
        expect(item.expected).toBe(solve(item.problem));
        if (item.problem.kind === 'missing-part') expect(item.problem.whole).toBe(10);
      }
      expect(new Set(items.map((i) => i.id)).size).toBe(4);
    }
    // n = 5 ปรากฏได้จริงในบาง seed แต่ไม่ใช่ส่วนใหญ่
    expect(withFive).toBeGreaterThan(0);
    expect(withFive).toBeLessThan(SEEDS.length / 2);
  });

  it('deterministic: seed เดียวกันได้รอบเดียวกัน', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      expect(generateBondsRound(seed)).toEqual(generateBondsRound(seed));
    }
    expect(generateBondsRound(1)).not.toEqual(generateBondsRound(2));
  });

  it('avoid: ไม่มีข้อที่ (n, รูปแบบ) ตรงกับข้อของรอบก่อน', () => {
    for (const seed of SEEDS) {
      const prev = generateBondsRound(seed + 1).map(bondsKey);
      const items = generateBondsRound(seed, { avoid: prev });
      for (const key of items.map(bondsKey)) {
        expect(prev.some((p) => p.n === key.n && p.form === key.form)).toBe(false);
      }
    }
  });

  it('avoid ที่เลี่ยงไม่ได้ทั้งหมด: ยังได้ 4 ข้อที่เงื่อนไขครบ (ยอมซ้ำ)', () => {
    const avoid: BondsItemKey[] = [];
    for (let n = 1; n <= 9; n += 1) {
      for (const form of ['flash', 'gap-first', 'gap-second'] as const) avoid.push({ n, form });
    }
    const items = generateBondsRound(5, { avoid });
    expect(items).toHaveLength(4);
    expect(new Set(items.map(partOf)).size).toBe(4);
  });
});

describe('generateMakeTenRound (N5, 600 seed)', () => {
  it('เงื่อนไขทุกแถวของ §4.4', () => {
    for (const seed of SEEDS) {
      const items = generateMakeTenRound(seed);
      expect(items).toHaveLength(4);
      const keys = items.map(unorderedKey);
      expect(new Set(keys).size).toBe(4); // คู่ไม่ซ้ำ (กลับด้านนับเป็นคู่เดียวกัน)
      let bigFirst = 0;
      let smallFirst = 0;
      for (const item of items) {
        const { a, b } = operands(item);
        expect(a).toBeGreaterThanOrEqual(2);
        expect(a).toBeLessThanOrEqual(9);
        expect(b).toBeGreaterThanOrEqual(2);
        expect(b).toBeLessThanOrEqual(9);
        expect(a + b).toBeGreaterThanOrEqual(11);
        expect(a + b).toBeLessThanOrEqual(18);
        expect(a).not.toBe(b);
        if (a > b) bigFirst += 1;
        else smallFirst += 1;
        expect(item.flow).toBe('silent-text');
        expect(item.skillId).toBe('add.make-10');
        expect(item.expected).toBe(a + b);
        expect(item.expected).toBe(solve(item.problem));
        const plan = makeTenPlan(a, b);
        expect(plan.gap).toBeGreaterThanOrEqual(1);
        expect(plan.rest).toBeGreaterThanOrEqual(1);
        expect(plan.boxDots + plan.gap).toBe(10);
        expect(plan.gap + plan.rest).toBe(plan.pileDots);
      }
      expect(bigFirst).toBe(2);
      expect(smallFirst).toBe(2);
    }
  });

  it('deterministic และ avoid', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      expect(generateMakeTenRound(seed)).toEqual(generateMakeTenRound(seed));
      const prev = generateMakeTenRound(seed + 1).map((i) => {
        const { a, b } = operands(i);
        return [a, b] as Pair;
      });
      const prevKeys = prev.map(([a, b]) => pairKey(a, b));
      for (const item of generateMakeTenRound(seed, { avoid: prev })) {
        expect(prevKeys).not.toContain(unorderedKey(item));
      }
    }
  });
});

describe('ชุดตัวเลขใหม่สำหรับทำซ้ำ (LS §9)', () => {
  const A2_ORIG = [6, 2, 8, 3, 1, 7];
  const A3_ORIG = [7, 4, 8, 3, 6, 9];

  it('A2 ซ้ำ: 6 ข้อ n ไม่ซ้ำ ไม่มี 5 มี 4 และ 9 ครบ และลำดับต่างจากเดิม', () => {
    for (const seed of SEEDS) {
      const items = generateA2Retry(seed, A2_ORIG);
      const ns = items.map(partOf);
      expect(items).toHaveLength(6);
      expect(new Set(ns).size).toBe(6);
      expect(ns).not.toContain(5);
      expect(ns).toContain(4);
      expect(ns).toContain(9);
      expect(ns).not.toEqual(A2_ORIG);
      for (const item of items) {
        expect(item.flow).toBe('teach-flash-gap');
        expect(item.expected).toBe(10 - partOf(item));
        expect(item.expected).toBe(solve(item.problem));
      }
    }
  });

  it('A3 ซ้ำ: มี 1 และ 2 ครบ ตำแหน่งที่หาย first 3 / second 3 ลำดับต่างจากเดิม', () => {
    for (const seed of SEEDS) {
      const items = generateA3Retry(seed, A3_ORIG);
      const ns = items.map(partOf);
      expect(items).toHaveLength(6);
      expect(new Set(ns).size).toBe(6);
      expect(ns).not.toContain(5);
      expect(ns).toContain(1);
      expect(ns).toContain(2);
      expect(ns).not.toEqual(A3_ORIG);
      expect(items.filter((i) => missingOf(i) === 'first')).toHaveLength(3);
      expect(items.filter((i) => missingOf(i) === 'second')).toHaveLength(3);
      for (const item of items) {
        expect(item.flow).toBe('mind-gap');
        expect(item.expected).toBe(solve(item.problem));
      }
    }
  });

  // คู่ที่ใช้ในชุดเดิมของ B3 (8+6 9+5 7+8 6+9 8+4 7+6) และ B4 (8+3 9+7 5+8 6+8 9+4 8+9)
  const B_ORIG: Pair[] = [
    [8, 6],
    [9, 5],
    [7, 8],
    [6, 9],
    [8, 4],
    [7, 6],
    [8, 3],
    [9, 7],
    [5, 8],
    [6, 8],
    [9, 4],
    [8, 9],
  ];

  it('B3/B4 ซ้ำ: 6 ข้อ กฎ make-ten คู่ไม่ซ้ำกันเอง fields ของ B3 ข้อ 1–3 สามช่อง 4–6 ช่องเดียว', () => {
    for (const seed of SEEDS) {
      const b3 = generateB3Retry(seed, B_ORIG);
      const b4 = generateB4Retry(seed + 5, B_ORIG);
      for (const [items, flow] of [
        [b3, 'teach-flash-make'],
        [b4, 'mind-make'],
      ] as const) {
        expect(items).toHaveLength(6);
        expect(new Set(items.map(unorderedKey)).size).toBe(6);
        for (const item of items) {
          const { a, b } = operands(item);
          expect(a + b).toBeGreaterThanOrEqual(11);
          expect(a + b).toBeLessThanOrEqual(18);
          expect(a).not.toBe(b);
          expect(a).toBeGreaterThanOrEqual(2);
          expect(b).toBeLessThanOrEqual(9);
          expect(item.flow).toBe(flow);
          expect(item.expected).toBe(a + b);
          expect(item.expected).toBe(solve(item.problem));
          const plan = makeTenPlan(a, b);
          expect(plan.rest).toBeGreaterThanOrEqual(1);
        }
      }
      expect(b3.map((i) => i.fields)).toEqual([
        ['gap', 'rest', 'total'],
        ['gap', 'rest', 'total'],
        ['gap', 'rest', 'total'],
        ['total'],
        ['total'],
        ['total'],
      ]);
      expect(b4.every((i) => i.fields === undefined)).toBe(true);
    }
  });

  it('B3/B4 ซ้ำ: ใช้คู่ที่ไม่เคยใช้ก่อนเท่าที่มี (คู่ที่ใช้ได้มีแค่ 16 ชุดเดิมใช้ 11) แล้วจึงใช้ซ้ำ', () => {
    const origKeys = new Set(B_ORIG.map(([a, b]) => pairKey(a, b)));
    const unused = MAKE_TEN_PAIRS.filter(([a, b]) => !origKeys.has(pairKey(a, b)));
    expect(unused.length).toBe(16 - origKeys.size);
    for (const seed of SEEDS.slice(0, 100)) {
      const items = generateB3Retry(seed, B_ORIG);
      const fresh = items.filter((i) => !origKeys.has(unorderedKey(i)));
      expect(fresh).toHaveLength(unused.length);
    }
    // ถ้า avoid น้อย ต้องไม่ซ้ำกับ avoid เลย
    const small: Pair[] = [
      [8, 6],
      [9, 5],
    ];
    for (const seed of SEEDS.slice(0, 100)) {
      for (const item of generateB4Retry(seed, small)) {
        expect(['6+8', '5+9']).not.toContain(unorderedKey(item));
      }
    }
  });

  it('deterministic', () => {
    expect(generateB3Retry(9, B_ORIG)).toEqual(generateB3Retry(9, B_ORIG));
    expect(generateA2Retry(9, A2_ORIG)).toEqual(generateA2Retry(9, A2_ORIG));
    expect(generateA3Retry(9, A3_ORIG)).toEqual(generateA3Retry(9, A3_ORIG));
  });
});
