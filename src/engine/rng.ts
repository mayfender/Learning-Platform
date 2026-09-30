// ตัวสุ่มที่ทำซ้ำได้จาก seed (mulberry32) — generator ทุกตัวต้องใช้ตัวนี้ ห้ามใช้ Math.random() (ADR-0004)
export interface Rng {
  next(): number; // [0, 1)
  int(min: number, max: number): number; // จำนวนเต็ม min..max รวมปลาย
  shuffle<T>(xs: readonly T[]): T[];
  pick<T>(xs: readonly T[]): T;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function int(min: number, max: number): number {
    return min + Math.floor(next() * (max - min + 1));
  }
  function shuffle<T>(xs: readonly T[]): T[] {
    const out = [...xs];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = int(0, i);
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  }
  function pick<T>(xs: readonly T[]): T {
    if (xs.length === 0) throw new Error('pick จากรายการว่าง');
    return xs[int(0, xs.length - 1)]!;
  }
  return { next, int, shuffle, pick };
}
