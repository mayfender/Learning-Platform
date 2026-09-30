import { createRng, type Rng } from '@/engine/rng';
import { solve } from '@/engine/problem';
import type { LessonItem } from '@/engine/lesson/types';
import type { Problem, SkillId } from '@/engine/types';

// รูปแบบของข้อ bonds: flash = แฟลชกล่อง n จุด (ว่างกี่ช่อง), gap-second = `n + ? = 10`, gap-first = `? + n = 10`
export type BondsForm = 'flash' | 'gap-second' | 'gap-first';
export interface BondsItemKey {
  n: number;
  form: BondsForm;
}

const SKILL: SkillId = 'add.bonds-10';
const WITHOUT_FIVE = [1, 2, 3, 4, 6, 7, 8, 9] as const;

export function bondsKey(item: LessonItem): BondsItemKey {
  if (item.problem.kind !== 'missing-part') throw new Error('ไม่ใช่ข้อ bonds');
  const form: BondsForm =
    item.flow === 'silent-flash-gap'
      ? 'flash'
      : item.problem.missing === 'first'
        ? 'gap-first'
        : 'gap-second';
  return { n: item.problem.part, form };
}

function problemFor(key: BondsItemKey): Problem {
  return key.form === 'gap-first'
    ? { kind: 'missing-part', whole: 10, part: key.n, missing: 'first' }
    : { kind: 'missing-part', whole: 10, part: key.n, missing: 'second' };
}

function buildItem(key: BondsItemKey, id: string, section: string): LessonItem {
  const problem = problemFor(key);
  return {
    id,
    section,
    flow: key.form === 'flash' ? 'silent-flash-gap' : 'silent-text',
    skillId: SKILL,
    problem,
    expected: solve(problem),
    mode: key.form === 'flash' ? 'fade' : 'mind',
  };
}

function collides(keys: readonly BondsItemKey[], avoid: readonly BondsItemKey[]): boolean {
  return keys.some((k) => avoid.some((a) => a.n === k.n && a.form === k.form));
}

function draw(rng: Rng): BondsItemKey[] {
  // n = 5 เข้าตัวเลือกได้น้อย (20%) และ n ไม่ซ้ำในรอบ จึงปรากฏได้ไม่เกิน 1 ข้อ
  const pool: number[] = rng.next() < 0.2 ? [...WITHOUT_FIVE, 5] : [...WITHOUT_FIVE];
  const ns = rng.shuffle(pool).slice(0, 4);
  const forms = rng.shuffle<BondsForm>(['flash', 'flash', 'gap-second', 'gap-first']);
  return ns.map((n, i) => ({ n, form: forms[i]! }));
}

// รอบ bonds 4 ข้อ (Tech Spec §4.4): n ไม่ซ้ำ, แฟลช 2 + ตัวเลข 2 (ตำแหน่งที่หาย second 1 first 1)
export function generateBondsRound(
  seed: number,
  opts: { avoid?: readonly BondsItemKey[]; idPrefix?: string; section?: string } = {},
): LessonItem[] {
  const rng = createRng(seed);
  const avoid = opts.avoid ?? [];
  let keys = draw(rng);
  for (let attempt = 0; attempt < 200 && collides(keys, avoid); attempt += 1) {
    keys = draw(rng);
  }
  const prefix = opts.idPrefix ?? 'practice';
  const section = opts.section ?? 'practice';
  return keys.map((k, i) => buildItem(k, `${prefix}.${i + 1}`, section));
}

function sameOrder(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

// ชุดตัวเลขใหม่สำหรับทำซ้ำ (LS §9): ต้องมี n ที่ไม่เคยอยู่ในชุดเดิมครบ และลำดับต่างจากชุดเดิม
function retryNumbers(rng: Rng, avoid: readonly number[], count: number): number[] {
  const fresh = rng.shuffle(WITHOUT_FIVE.filter((n) => !avoid.includes(n))).slice(0, count);
  const rest = rng.shuffle(WITHOUT_FIVE.filter((n) => !fresh.includes(n)));
  const chosen = [...fresh, ...rest.slice(0, count - fresh.length)];
  let ordered = rng.shuffle(chosen);
  for (let attempt = 0; attempt < 100 && sameOrder(ordered, avoid); attempt += 1) {
    ordered = rng.shuffle(chosen);
  }
  return ordered;
}

// A2 ซ้ำ: แฟลชกล่อง n จุด 6 ข้อ (flow เดียวกับ A2)
export function generateA2Retry(
  seed: number,
  avoid: readonly number[],
  opts: { idPrefix?: string } = {},
): LessonItem[] {
  const rng = createRng(seed);
  const prefix = opts.idPrefix ?? 'A2.r1';
  return retryNumbers(rng, avoid, 6).map((n, i) => {
    const problem: Problem = { kind: 'missing-part', whole: 10, part: n, missing: 'second' };
    return {
      id: `${prefix}.${i + 1}`,
      section: 'A2',
      flow: 'teach-flash-gap',
      skillId: SKILL,
      problem,
      expected: solve(problem),
      mode: 'fade',
    };
  });
}

// A3 ซ้ำ: กฎเดียวกับ A3 เดิม (ตำแหน่งที่หายสลับ ครึ่ง/ครึ่ง)
export function generateA3Retry(
  seed: number,
  avoid: readonly number[],
  opts: { idPrefix?: string } = {},
): LessonItem[] {
  const rng = createRng(seed);
  const prefix = opts.idPrefix ?? 'A3.r';
  const ns = retryNumbers(rng, avoid, 6);
  const positions = rng.shuffle<'first' | 'second'>([
    'first',
    'first',
    'first',
    'second',
    'second',
    'second',
  ]);
  return ns.map((n, i) => {
    const problem: Problem = { kind: 'missing-part', whole: 10, part: n, missing: positions[i]! };
    return {
      id: `${prefix}.${i + 1}`,
      section: 'A3',
      flow: 'mind-gap',
      skillId: SKILL,
      problem,
      expected: solve(problem),
      mode: 'mind',
    };
  });
}
