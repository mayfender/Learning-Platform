import { describe, expect, it } from 'vitest';
import { createRng } from '@/engine/rng';

describe('createRng', () => {
  it('seed เดียวกันได้ลำดับเดียวกัน และ seed ต่างกันได้ต่างกัน', () => {
    const a = createRng(42);
    const b = createRng(42);
    const c = createRng(43);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    const seqC = Array.from({ length: 10 }, () => c.next());
    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqC);
  });

  it('next อยู่ใน [0,1) และ int อยู่ในช่วงรวมปลายทั้งสองข้าง', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i += 1) {
      const x = rng.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      const n = rng.int(3, 6);
      expect(Number.isInteger(n)).toBe(true);
      seen.add(n);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });

  it('shuffle ไม่เปลี่ยนต้นฉบับและได้สมาชิกครบเท่าเดิม', () => {
    const rng = createRng(1);
    const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const out = rng.shuffle(xs);
    expect(xs).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect([...out].sort((p, q) => p - q)).toEqual(xs);
  });

  it('pick จากรายการว่าง throw', () => {
    expect(() => createRng(1).pick([])).toThrow();
  });
});
