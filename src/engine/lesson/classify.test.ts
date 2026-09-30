import { describe, expect, it } from 'vitest';
import { classifyLessonAnswer, type AnswerKind } from '@/engine/lesson/classify';
import type { Problem, StrategyId } from '@/engine/types';

// ตารางเทสต์พิมพ์จาก LS ADD-04 §2/§4 และ Tech Spec §4.5 โดยตรง (ไม่ import จากเนื้อหา)
const gapProblem = (part: number, missing: 'first' | 'second' = 'second'): Problem => ({
  kind: 'missing-part',
  whole: 10,
  part,
  missing,
});
const arith = (a: number, b: number): Problem => ({ kind: 'arith', op: '+', a, b });

type Row = [string, AnswerKind, Problem, number, string | undefined, StrategyId?];

const rows: Row[] = [
  // L1
  ['L1 แฟลช 7 จุด ตอบ 7', 'gap', gapProblem(7), 7, 'L1'],
  ['L1 part 9 ตอบ 9', 'gap', gapProblem(9), 9, 'L1'],
  ['L1 ? + 4 ตอบ 4', 'gap', gapProblem(4, 'first'), 4, 'L1'],
  ['L1 8+5 ช่องขาด ตอบ 8', 'gap', arith(8, 5), 8, 'L1'],
  // M4
  ['M4 7 + ? ตอบ 17', 'gap', gapProblem(7), 17, 'M4'],
  ['M4 ? + 4 ตอบ 14', 'gap', gapProblem(4, 'first'), 14, 'M4'],
  ['M4 part 9 ตอบ 19', 'gap', gapProblem(9), 19, 'M4'],
  // M5
  ['M5 gap 7 ตอบ 2', 'gap', gapProblem(7), 2, 'M5'],
  ['M5 gap 7 ตอบ 4', 'gap', gapProblem(7), 4, 'M5'],
  ['M5 gap part 9 ตอบ 0', 'gap', gapProblem(9), 0, 'M5'],
  ['M5 gap part 9 ตอบ 2', 'gap', gapProblem(9), 2, 'M5'],
  ['M5 rest 8+5 ตอบ 2', 'rest', arith(8, 5), 2, 'M5'],
  ['M5 rest 8+5 ตอบ 4', 'rest', arith(8, 5), 4, 'M5'],
  ['M5 total 8+5 ตอบ 12', 'total', arith(8, 5), 12, 'M5'],
  ['M5 total 8+5 ตอบ 14', 'total', arith(8, 5), 14, 'M5'],
  ['M5 total 4+7 ตอบ 10', 'total', arith(4, 7), 10, 'M5'],
  ['M5 total 4+7 ตอบ 12', 'total', arith(4, 7), 12, 'M5'],
  // M6
  ['M6 8+5 ตอบ 3', 'total', arith(8, 5), 3, 'M6'],
  ['M6 9+7 ตอบ 6', 'total', arith(9, 7), 6, 'M6'],
  ['M6 4+7 ตอบ 1', 'total', arith(4, 7), 1, 'M6'],
  // M7
  ['M7 8+5 ตอบ 15', 'total', arith(8, 5), 15, 'M7'],
  ['M7 8+5 ตอบ 18', 'total', arith(8, 5), 18, 'M7'],
  ['M7 9+7 ตอบ 19', 'total', arith(9, 7), 19, 'M7'],
  ['M7 7+4 ตอบ 14', 'total', arith(7, 4), 14, 'M7'],
  ['M7 7+4 ตอบ 17', 'total', arith(7, 4), 17, 'M7'],
  ['M7 rest 8+5 ตอบ 5', 'rest', arith(8, 5), 5, 'M7'],
  ['M7 rest 9+6 ตอบ 6 (ไม่ใช่ M5)', 'rest', arith(9, 6), 6, 'M7'],
  // MX
  ['MX gap 99', 'gap', gapProblem(7), 99, 'MX'],
  ['MX rest 99', 'rest', arith(8, 5), 99, 'MX'],
  ['MX total 99', 'total', arith(8, 5), 99, 'MX'],
  ['MX total 8+5 ตอบ 0', 'total', arith(8, 5), 0, 'MX'],
  ['MX gap เฉลย + 2 (7 → 5)', 'gap', gapProblem(7), 5, 'MX'],
  // ถูก
  ['ถูก gap', 'gap', gapProblem(7), 3, undefined],
  ['ถูก gap ? + 4', 'gap', gapProblem(4, 'first'), 6, undefined],
  ['ถูก rest', 'rest', arith(8, 5), 3, undefined],
  ['ถูก total', 'total', arith(8, 5), 13, undefined],
];

describe('classifyLessonAnswer: รายรูปแบบ', () => {
  it.each(rows)('%s', (_name, kind, problem, response, expected, mind) => {
    const result = classifyLessonAnswer(kind, problem, response, mind ? { mindView: mind } : {});
    if (expected === undefined) {
      expect(result).toEqual({ correct: true });
    } else {
      expect(result).toEqual({ correct: false, misconceptionId: expected });
    }
  });

  it('total เฉลย + 2 ที่ไม่ตรงรูปแบบอื่นเป็น MX (8+5 ตอบ 15 คือ M7 จึงเลือกคู่อื่น)', () => {
    // 4+7 เฉลย 11 → 13 = เฉลย + 2 ไม่ใช่ 10+4=14 หรือ 10+7=17 → MX
    expect(classifyLessonAnswer('total', arith(4, 7), 13)).toEqual({
      correct: false,
      misconceptionId: 'MX',
    });
    // rest: 9+6 เฉลย 5 ตอบ 7 (ไม่ใช่ pile 6) → MX
    expect(classifyLessonAnswer('rest', arith(9, 6), 7)).toEqual({
      correct: false,
      misconceptionId: 'MX',
    });
  });

  describe('กรณีชนกันของ M5/M7 (ตัวบวกตัวหนึ่งเป็น 9 ตอบ s+1)', () => {
    const cases: [string, Problem, number][] = [
      ['9+6 ตอบ 16', arith(9, 6), 16],
      ['6+9 ตอบ 16', arith(6, 9), 16],
      ['9+7 ตอบ 17', arith(9, 7), 17],
    ];
    const noSeeBox: (StrategyId | undefined)[] = [
      undefined,
      'count-fingers',
      'count-in-head',
      'see-number',
      'unsure',
    ];
    it.each(cases)('%s', (_n, problem, response) => {
      for (const mind of noSeeBox) {
        const r = classifyLessonAnswer('total', problem, response, mind ? { mindView: mind } : {});
        expect(r, String(mind)).toEqual({ correct: false, misconceptionId: 'M5' });
      }
      expect(classifyLessonAnswer('total', problem, response, { mindView: 'see-box' })).toEqual({
        correct: false,
        misconceptionId: 'M7',
      });
    });

    it('mindView ไม่มีผลกับคำตอบถูกและกับรหัสที่ไม่ชนกัน', () => {
      const views: StrategyId[] = [
        'see-box',
        'see-number',
        'count-fingers',
        'count-in-head',
        'unsure',
      ];
      for (const mind of views) {
        expect(classifyLessonAnswer('total', arith(9, 6), 15, { mindView: mind })).toEqual({
          correct: true,
        });
        expect(classifyLessonAnswer('total', arith(8, 5), 14, { mindView: mind })).toEqual({
          correct: false,
          misconceptionId: 'M5',
        });
        expect(classifyLessonAnswer('total', arith(8, 5), 15, { mindView: mind })).toEqual({
          correct: false,
          misconceptionId: 'M7',
        });
      }
    });
  });

  it('ใช้กับโจทย์ชนิดที่ไม่รองรับแล้ว throw', () => {
    expect(() =>
      classifyLessonAnswer('gap', { kind: 'subitize', count: 3, visual: 'ten-frame' }, 3),
    ).toThrow();
    expect(() => classifyLessonAnswer('total', gapProblem(7), 3)).toThrow();
  });
});

describe('classifyLessonAnswer: exhaustive', () => {
  const allowed = new Set(['L1', 'M4', 'M5', 'M6', 'M7', 'MX']);

  it('total: ทุก (a,b) ที่ใช้ได้และทุก response 0–999', () => {
    let collisions = 0;
    for (let a = 2; a <= 9; a += 1) {
      for (let b = 2; b <= 9; b += 1) {
        const s = a + b;
        if (s < 11 || s > 18) continue;
        for (let r = 0; r <= 999; r += 1) {
          const out = classifyLessonAnswer('total', arith(a, b), r);
          const again = classifyLessonAnswer('total', arith(a, b), r);
          expect(again).toEqual(out); // deterministic
          expect(out.correct).toBe(r === s);
          if (out.correct) {
            expect(out.misconceptionId).toBeUndefined();
            continue;
          }
          expect(allowed.has(out.misconceptionId!)).toBe(true);
          // total ไม่มี L1 หรือ M4
          expect(['L1', 'M4']).not.toContain(out.misconceptionId);
          if (out.misconceptionId === 'M6') {
            expect(r).toBe(s - 10);
            expect(r).toBeGreaterThanOrEqual(1);
          }
          const nearSum = r === s - 1 || r === s + 1;
          const tenPlus = r === 10 + a || r === 10 + b;
          if (nearSum && tenPlus) {
            collisions += 1;
            // ชนกันเกิดเฉพาะเมื่อมีตัวบวก 9 และตอบ s + 1
            expect(a === 9 || b === 9).toBe(true);
            expect(r).toBe(s + 1);
            expect(out.misconceptionId).toBe('M5');
            expect(classifyLessonAnswer('total', arith(a, b), r, { mindView: 'see-box' })).toEqual({
              correct: false,
              misconceptionId: 'M7',
            });
          }
        }
      }
    }
    expect(collisions).toBeGreaterThan(0);
  });

  it('gap: n 1–9 และ response 0–999', () => {
    for (let n = 1; n <= 9; n += 1) {
      for (const p of [gapProblem(n), gapProblem(n, 'first')]) {
        for (let r = 0; r <= 999; r += 1) {
          const out = classifyLessonAnswer('gap', p, r);
          expect(out.correct).toBe(r === 10 - n);
          if (!out.correct) expect(allowed.has(out.misconceptionId!)).toBe(true);
          // เงื่อนไข L1, M4, M5 ไม่ทับกันและไม่ทับกับเฉลย
          const hits = [r === n, r === 10 + n, Math.abs(r - (10 - n)) === 1].filter(Boolean).length;
          if (r !== 10 - n) expect(hits).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('rest: ทุก (a,b) ที่ใช้ได้', () => {
    for (let a = 2; a <= 9; a += 1) {
      for (let b = 2; b <= 9; b += 1) {
        if (a + b < 11 || a + b > 18) continue;
        const box = Math.max(a, b);
        const pile = Math.min(a, b);
        const rest = pile - (10 - box);
        for (let r = 0; r <= 999; r += 1) {
          const out = classifyLessonAnswer('rest', arith(a, b), r);
          expect(out.correct).toBe(r === rest);
          if (out.correct) continue;
          expect(['M5', 'M7', 'MX']).toContain(out.misconceptionId);
          // M7 มาก่อน M5 เมื่อชนกัน (gap = 1)
          if (r === pile) expect(out.misconceptionId).toBe('M7');
        }
      }
    }
  });
});
