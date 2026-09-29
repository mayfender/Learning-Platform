import { describe, expect, it } from 'vitest';
import { formatExample, formatProblem, solve } from '@/engine/problem';

describe('solve', () => {
  it('arith +', () => {
    expect(solve({ kind: 'arith', op: '+', a: 6, b: 7 })).toBe(13);
  });
  it('arith -', () => {
    expect(solve({ kind: 'arith', op: '-', a: 10, b: 3 })).toBe(7);
  });
  it('arith ×', () => {
    expect(solve({ kind: 'arith', op: '×', a: 4, b: 5 })).toBe(20);
  });
  it('arith ÷ ลงตัว', () => {
    expect(solve({ kind: 'arith', op: '÷', a: 20, b: 4 })).toBe(5);
  });
  it('arith ÷ ไม่ลงตัว throw', () => {
    expect(() => solve({ kind: 'arith', op: '÷', a: 7, b: 2 })).toThrow();
  });
  it('arith ÷ 0 throw', () => {
    expect(() => solve({ kind: 'arith', op: '÷', a: 7, b: 0 })).toThrow();
  });
  it('missing-part', () => {
    expect(solve({ kind: 'missing-part', whole: 10, part: 7 })).toBe(3);
  });
  it('subitize', () => {
    expect(solve({ kind: 'subitize', count: 7, visual: 'ten-frame' })).toBe(7);
  });
});

describe('formatProblem', () => {
  it('arith', () => {
    expect(formatProblem({ kind: 'arith', op: '+', a: 8, b: 5 })).toBe('8 + 5 = ?');
  });
  it('missing-part', () => {
    expect(formatProblem({ kind: 'missing-part', whole: 10, part: 7 })).toBe('7 + ? = 10');
  });
  it('subitize', () => {
    expect(formatProblem({ kind: 'subitize', count: 7, visual: 'ten-frame' })).toBe('แฟลช 7 จุด');
  });
});

describe('formatExample', () => {
  it('sums-equal', () => {
    expect(
      formatExample({
        kind: 'sums-equal',
        groups: [
          [9, 3],
          [9, 1, 2],
        ],
      }),
    ).toBe('9+3 = 9+1+2');
  });
  it('count-on', () => {
    expect(formatExample({ kind: 'count-on', start: 9, count: 3 })).toBe('9… 10, 11, 12');
  });
  it('jumps', () => {
    expect(formatExample({ kind: 'jumps', start: 23, steps: [10, 4] })).toBe('23 → 33 → 37');
  });
});
