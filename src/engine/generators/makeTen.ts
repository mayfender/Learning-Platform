import { createRng, type Rng } from '@/engine/rng';
import type { ItemField, LessonItem } from '@/engine/lesson/types';
import type { SkillId } from '@/engine/types';

const SKILL: SkillId = 'add.make-10';

export type Pair = readonly [number, number];

// คู่ที่ใช้ได้ทั้งหมด (ไม่สนลำดับ x < y): a,b ∈ 2..9, a ≠ b, 11 ≤ a+b ≤ 18 — มี 16 คู่
export const MAKE_TEN_PAIRS: readonly Pair[] = (() => {
  const out: Pair[] = [];
  for (let x = 2; x <= 9; x += 1) {
    for (let y = x + 1; y <= 9; y += 1) {
      if (x + y >= 11 && x + y <= 18) out.push([x, y]);
    }
  }
  return out;
})();

export function pairKey(a: number, b: number): string {
  return a < b ? `${a}+${b}` : `${b}+${a}`;
}

function toItem(
  a: number,
  b: number,
  id: string,
  section: string,
  flow: LessonItem['flow'],
  mode: LessonItem['mode'],
  fields?: readonly ItemField[],
): LessonItem {
  return {
    id,
    section,
    flow,
    skillId: SKILL,
    problem: { kind: 'arith', op: '+', a, b },
    expected: a + b,
    mode,
    ...(fields ? { fields } : {}),
  };
}

// เลือกคู่ไม่ซ้ำกัน: ใช้คู่ที่ไม่อยู่ใน avoid ก่อน ถ้าไม่พอจึงเติมด้วยคู่ใน avoid ที่เก่าที่สุด
// (คู่ที่ใช้ได้มีแค่ 16 คู่ ชุดเดิมของ B3+B4 ใช้ไปแล้ว 11 คู่ จึงเลี่ยงทั้งหมดไม่ได้เสมอไป)
export function pickPairs(rng: Rng, count: number, avoid: readonly Pair[] = []): Pair[] {
  const avoidKeys = avoid.map(([a, b]) => pairKey(a, b));
  const fresh = rng.shuffle(MAKE_TEN_PAIRS.filter(([a, b]) => !avoidKeys.includes(pairKey(a, b))));
  const chosen = fresh.slice(0, count);
  if (chosen.length < count) {
    const used = new Set(chosen.map(([a, b]) => pairKey(a, b)));
    // avoid เรียงจากเก่าไปใหม่ ใช้ตัวเก่าก่อน
    for (const key of avoidKeys) {
      if (chosen.length >= count) break;
      if (used.has(key)) continue;
      const pair = MAKE_TEN_PAIRS.find(([a, b]) => pairKey(a, b) === key);
      if (pair) {
        chosen.push(pair);
        used.add(key);
      }
    }
  }
  return rng.shuffle(chosen);
}

// จัดลำดับตัวตั้ง: ครึ่งหนึ่งตัวใหญ่ก่อน อีกครึ่งตัวเล็กก่อน (ตำแหน่งที่ได้ตัวใหญ่ก่อนสุ่ม)
function orient(rng: Rng, pairs: readonly Pair[]): Pair[] {
  const flags = rng.shuffle(pairs.map((_, i) => i < Math.floor(pairs.length / 2)));
  return pairs.map(([x, y], i): Pair => (flags[i] ? [y, x] : [x, y]));
}

// รอบ make-ten 4 ข้อ (Tech Spec §4.4): ตัวใหญ่ก่อน 2 ตัวเล็กก่อน 2 คู่ไม่ซ้ำกันและไม่ตรง avoid
export function generateMakeTenRound(
  seed: number,
  opts: { avoid?: readonly Pair[]; idPrefix?: string; section?: string } = {},
): LessonItem[] {
  const rng = createRng(seed);
  const pairs = rng.shuffle(orient(rng, pickPairs(rng, 4, opts.avoid ?? [])));
  const prefix = opts.idPrefix ?? 'practice';
  const section = opts.section ?? 'practice';
  return pairs.map(([a, b], i) =>
    toItem(a, b, `${prefix}.${i + 1}`, section, 'silent-text', 'mind'),
  );
}

const B3_FIELDS: readonly (readonly ItemField[])[] = [
  ['gap', 'rest', 'total'],
  ['gap', 'rest', 'total'],
  ['gap', 'rest', 'total'],
  ['total'],
  ['total'],
  ['total'],
];

// B3 ซ้ำ: 6 ข้อ แฟลชกล่อง+กอง (ข้อ 1–3 สามช่อง 4–6 ช่องเดียว)
export function generateB3Retry(
  seed: number,
  avoid: readonly Pair[],
  opts: { idPrefix?: string } = {},
): LessonItem[] {
  const rng = createRng(seed);
  const prefix = opts.idPrefix ?? 'B3.r';
  return rng
    .shuffle(orient(rng, pickPairs(rng, 6, avoid)))
    .map(([a, b], i) =>
      toItem(a, b, `${prefix}.${i + 1}`, 'B3', 'teach-flash-make', 'fade', B3_FIELDS[i]),
    );
}

// B4 ซ้ำ: 6 ข้อ นึกเอง (ช่องเดียว)
export function generateB4Retry(
  seed: number,
  avoid: readonly Pair[],
  opts: { idPrefix?: string } = {},
): LessonItem[] {
  const rng = createRng(seed);
  const prefix = opts.idPrefix ?? 'B4.r';
  return rng
    .shuffle(orient(rng, pickPairs(rng, 6, avoid)))
    .map(([a, b], i) => toItem(a, b, `${prefix}.${i + 1}`, 'B4', 'mind-make', 'mind'));
}
