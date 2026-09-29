// ชุดข้อมูลทดสอบ (Test Plan §3) ผลที่คาดทุกค่าคิดเองจาก Lesson Spec §6–§7 ไม่ได้ดูจากแอป
import { ITEMS, ITEM_BY_ID, type Plan, type StrategyId } from './dx';

export type Level = 'good' | 'mid' | 'low';
export const LEVEL_TEXT: Record<Level, string> = {
  good: 'คล่องแล้ว',
  mid: 'ยังไม่อัตโนมัติ',
  low: 'ยังไม่แน่น',
};
export type GroupResult = 'pass' | 'fail' | 'skipped';
export const GROUP_TEXT: Record<GroupResult, string> = {
  pass: 'ผ่าน',
  fail: 'ยังไม่ผ่าน',
  skipped: 'ข้าม',
};

export interface Scenario {
  code: string;
  title: string;
  plan: Plan;
  /** ระดับด่าน 1–4 */
  levels: [Level, Level, Level, Level];
  /** กลุ่ม 5A 5B 5C */
  groups: [GroupResult, GroupResult, GroupResult];
  rec: number;
  /** รหัสความเข้าใจผิดที่ต้องพบ -> ข้อ */
  misc: Record<string, string[]>;
  /** จำนวนข้อที่ตอบถูกในด่าน 1–4 (คอลัมน์ "ถูก") */
  correct: [number, number, number, number];
  /** จำนวนข้อที่ใช้การนับ ด่าน 3 และ 4 (คอลัมน์ "ใช้การนับ") */
  counting: [number, number];
  skipsStage5?: boolean;
}

/** ms ทุกข้อ = เกณฑ์เวลาพอดี */
function atThreshold(extra: Plan = {}): Plan {
  const p: Plan = {};
  for (const it of ITEMS) if (it.fluentMs) p[it.id] = { ms: it.fluentMs };
  for (const [id, a] of Object.entries(extra)) p[id] = { ...p[id], ...a };
  return p;
}
function overThreshold(): Plan {
  const p: Plan = {};
  for (const it of ITEMS) if (it.fluentMs) p[it.id] = { ms: it.fluentMs + 1 };
  return p;
}

export const SCENARIOS: Scenario[] = [
  {
    code: 'S01',
    title: 'ขอบเกณฑ์: ทุกด่านผ่านพอดี -> ขั้น 9',
    plan: atThreshold({
      '2.4': { ms: 3001 }, // คล่อง 3 ข้อ (พอดีเกณฑ์ good)
      '3.1': { ms: 3001 },
      '3.3': { s: 'unsure' }, // unsure ไม่นับเป็นการนับ
      '3.4': { s: 'make-ten' },
      '4.1': { s: 'count-on' }, // นับ 1 ข้อ ยัง good
      '4.2': { s: 'unsure' },
      '4.3': { s: 'make-ten' },
      '4.4': { ms: 4001, s: 'doubles' },
    }),
    levels: ['good', 'good', 'good', 'good'],
    groups: ['pass', 'pass', 'pass'],
    rec: 9,
    misc: {},
    correct: [4, 4, 4, 4],
    counting: [0, 1],
  },
  {
    code: 'S02',
    title: 'ทุกข้อช้ากว่าเกณฑ์ 1 ms -> ขั้น 2',
    plan: overThreshold(),
    levels: ['good', 'mid', 'mid', 'mid'],
    groups: ['fail', 'fail', 'fail'],
    rec: 2,
    misc: {},
    correct: [4, 4, 4, 4],
    counting: [0, 0],
  },
  {
    code: 'S03',
    title: 'ด่าน 1 ถูก 3 (M1) และทุกด่านอื่น mid -> ขั้น 1',
    plan: {
      '1.4': { r: 7 },
      '2.3': { ms: 3001 },
      '2.4': { ms: 3001 },
      '3.3': { s: 'count-on' },
      '4.1': { s: 'count-on' },
      '4.3': { s: 'count-fingers' },
      '5.3': { s: 'count-by-one' },
      '5.4': { r: 65, s: 'column' },
    },
    levels: ['mid', 'mid', 'mid', 'mid'],
    groups: ['pass', 'fail', 'fail'],
    rec: 1,
    misc: { M1: ['1.4'], M10: ['5.4'] },
    correct: [3, 4, 4, 4],
    counting: [1, 2],
  },
  {
    code: 'S04',
    title: 'ทุกด่าน 1–4 ถูกแค่ 2 (low) ด่าน 4 ถูก 2 ยังทำด่าน 5 -> ขั้น 1',
    plan: {
      '1.1': { r: 6 },
      '1.2': { r: 8 },
      '2.1': { r: 2 },
      '2.2': { r: 5 },
      '3.1': { r: 11 },
      '3.2': { r: 15 },
      '4.1': { r: 12 },
      '4.2': { r: 14 },
      '5.1': { ms: 5001 },
      '5.3': { s: 'unsure' },
      '5.4': { s: 'unsure' },
    },
    levels: ['low', 'low', 'low', 'low'],
    groups: ['fail', 'pass', 'pass'],
    rec: 1,
    misc: { M1: ['1.1', '1.2'], M5: ['2.1', '2.2', '3.1', '3.2', '4.1', '4.2'] },
    correct: [2, 2, 2, 2],
    counting: [0, 0],
  },
  {
    code: 'S05',
    title: 'ด่าน 2 คล่องแค่ 2 ข้อ (ถูกครบ) -> ขั้น 2',
    plan: { '2.3': { ms: 3001 }, '2.4': { ms: 3001 } },
    levels: ['good', 'mid', 'good', 'good'],
    groups: ['pass', 'pass', 'pass'],
    rec: 2,
    misc: {},
    correct: [4, 4, 4, 4],
    counting: [0, 0],
  },
  {
    code: 'S06',
    title: 'ด่าน 3 เลือก "นับนิ้ว" ที่ 3.4 -> ขั้น 3',
    plan: { '3.3': { s: 'make-ten' }, '3.4': { s: 'count-fingers' } },
    levels: ['good', 'good', 'mid', 'good'],
    groups: ['pass', 'pass', 'pass'],
    rec: 3,
    misc: {},
    correct: [4, 4, 4, 4],
    counting: [1, 0],
  },
  {
    code: 'S07',
    title: 'ด่าน 4 ใช้การนับ 2 ข้อ -> ขั้น 4',
    plan: { '4.2': { s: 'count-on' }, '4.4': { s: 'count-fingers' } },
    levels: ['good', 'good', 'good', 'mid'],
    groups: ['pass', 'pass', 'pass'],
    rec: 4,
    misc: {},
    correct: [4, 4, 4, 4],
    counting: [0, 2],
  },
  {
    code: 'S08',
    title: '5.1 ถูกแต่ช้า 5001 ms (5A ไม่ผ่าน) -> ขั้น 5',
    plan: { '5.1': { ms: 5001 } },
    levels: ['good', 'good', 'good', 'good'],
    groups: ['fail', 'pass', 'pass'],
    rec: 5,
    misc: {},
    correct: [4, 4, 4, 4],
    counting: [0, 0],
  },
  {
    code: 'S09',
    title: '5.3 เลือก "นับทีละ 1" (5B ไม่ผ่าน) -> ขั้น 6',
    plan: { '5.3': { s: 'count-by-one' } },
    levels: ['good', 'good', 'good', 'good'],
    groups: ['pass', 'fail', 'pass'],
    rec: 6,
    misc: {},
    correct: [4, 4, 4, 4],
    counting: [0, 0],
  },
  {
    code: 'S10',
    title: '5.4 ตอบผิด 76 เลือก "ตั้งบวกในใจ" (M5, 5C ไม่ผ่าน) -> ขั้น 7',
    plan: { '5.4': { r: 76, s: 'column' } },
    levels: ['good', 'good', 'good', 'good'],
    groups: ['pass', 'pass', 'fail'],
    rec: 7,
    misc: { M5: ['5.4'] },
    correct: [4, 4, 4, 4],
    counting: [0, 0],
  },
  {
    code: 'S11a',
    title: '5.4 ถูก เลือก "ตั้งบวกในใจ" (ไม่ใช่ปัดเลข) -> ขั้น 8',
    plan: { '5.4': { s: 'column' } },
    levels: ['good', 'good', 'good', 'good'],
    groups: ['pass', 'pass', 'pass'],
    rec: 8,
    misc: {},
    correct: [4, 4, 4, 4],
    counting: [0, 0],
  },
  {
    code: 'S11b',
    title: '5.4 ถูก เลือก "บอกไม่ถูก" -> ขั้น 8',
    plan: { '5.4': { s: 'unsure' } },
    levels: ['good', 'good', 'good', 'good'],
    groups: ['pass', 'pass', 'pass'],
    rec: 8,
    misc: {},
    correct: [4, 4, 4, 4],
    counting: [0, 0],
  },
  {
    code: 'S11c',
    title: '5.4 ถูก เลือก "นับทีละ 1" (5C ไม่ผ่าน) -> ขั้น 7',
    plan: { '5.4': { s: 'count-by-one' } },
    levels: ['good', 'good', 'good', 'good'],
    groups: ['pass', 'pass', 'fail'],
    rec: 7,
    misc: {},
    correct: [4, 4, 4, 4],
    counting: [0, 0],
  },
  {
    code: 'S12',
    title: 'ด่าน 2 ถูก 2 (low) ด่าน 3 นับ (mid) -> ขั้น 2 (กฎแรกที่จริง)',
    plan: { '2.1': { r: 2 }, '2.2': { r: 5 }, '3.3': { s: 'count-on' } },
    levels: ['good', 'low', 'mid', 'good'],
    groups: ['pass', 'pass', 'pass'],
    rec: 2,
    misc: { M5: ['2.1', '2.2'] },
    correct: [4, 2, 4, 4],
    counting: [1, 0],
  },
  {
    code: 'S13',
    title: 'ด่าน 4 ถูก 2 ข้อพอดี -> ยังเห็นด่าน 5 -> ขั้น 4',
    plan: { '4.1': { r: 12 }, '4.2': { r: 14 } },
    levels: ['good', 'good', 'good', 'low'],
    groups: ['pass', 'pass', 'pass'],
    rec: 4,
    misc: { M5: ['4.1', '4.2'] },
    correct: [4, 4, 4, 2],
    counting: [0, 0],
  },
  {
    code: 'S14',
    title: 'ด่าน 4 ถูก 1 ข้อ -> ข้ามด่าน 5 -> ขั้น 4',
    plan: { '4.1': { r: 12 }, '4.2': { r: 14 }, '4.3': { r: 10 } },
    levels: ['good', 'good', 'good', 'low'],
    groups: ['skipped', 'skipped', 'skipped'],
    rec: 4,
    misc: { M5: ['4.1', '4.2', '4.3'] },
    correct: [4, 4, 4, 1],
    counting: [0, 0],
    skipsStage5: true,
  },
  {
    code: 'S15',
    title: 'ตอบผิดหมดทุกข้อ (ด่าน 4 ถูก 0 -> ข้ามด่าน 5) -> ขั้น 1',
    plan: {
      '1.1': { r: 5 },
      '1.2': { r: 5 },
      '1.3': { r: 5 },
      '1.4': { r: 5 },
      '2.1': { r: 17 },
      '2.2': { r: 14 },
      '2.3': { r: 18 },
      '2.4': { r: 13 },
      '3.1': { r: 2 },
      '3.2': { r: 6 },
      '3.3': { r: 3 },
      '3.4': { r: 5 },
      '4.1': { r: 12 },
      '4.2': { r: 14 },
      '4.3': { r: 10 },
      '4.4': { r: 12 },
    },
    levels: ['low', 'low', 'low', 'low'],
    groups: ['skipped', 'skipped', 'skipped'],
    rec: 1,
    misc: {
      M2: ['1.1', '1.2', '1.3', '1.4'],
      M4: ['2.1', '2.2', '2.3', '2.4'],
      M5: ['4.1', '4.2', '4.3', '4.4'],
      M6: ['3.1', '3.2', '3.3', '3.4'],
    },
    correct: [0, 0, 0, 0],
    counting: [0, 0],
    skipsStage5: true,
  },
];

// ----------------------------------------------------------------- เนื้อหาหน้าพ่อ (LS §7 และ §10)

export const REASON: Record<number, string> = {
  1: 'ลูกยังต้องนับจุดทีละจุด ยังไม่เห็นก้อน 5 และ 10 ทันที ซึ่งเป็นฐานของทุกอย่างที่เหลือ',
  2: 'ลูกเห็นภาพ 10 ช่องได้แล้ว แต่คู่รวม 10 ยังไม่อัตโนมัติ ต้องแน่นก่อนถึงจะทำให้ครบ 10 ได้',
  3: 'คู่รวม 10 ได้แล้ว ต่อไปคือเลขคู่ ซึ่งเป็นทางลัดที่ใช้บ่อย ขั้นนี้ใช้เวลาไม่นาน แล้วไปขั้น 4 ต่อ',
  4: 'พื้นฐานพร้อมแล้ว แต่บวกข้ามสิบยังนับต่ออยู่ ขั้นนี้สำคัญที่สุดของบันได',
  5: 'บวกหลักเดียวคล่องแล้ว ขั้นต่อไปคือมองสิบเป็นก้อนหนึ่ง',
  6: 'บวกสิบได้แล้ว ต่อไปคือแยกหลักสิบกับหน่วย',
  7: 'แยกหลักได้แล้ว ต่อไปคือกระโดดบนเส้นจำนวน แล้วต่อด้วยการปัดให้กลม',
  8: 'พื้นฐานแน่นแล้ว ไปฝึกปัดให้กลมแล้วชดเชย เพื่อให้มีหลายวิธีให้เลือก',
  9: 'ลูกมีหลายวิธีแล้ว ไปฝึกเลือกวิธีเองและอธิบายว่าทำไม',
};
export const PARENT_NOTE =
  'ถ้าเห็นว่าผลไม่ตรงกับที่รู้จักลูก ให้เชื่อสิ่งที่เห็นและเลือกขั้นเองได้ ผลนี้มาจากโจทย์ 20 ข้อเท่านั้น';

export const NUMBER_TALK: Record<number, { prompt: string; questions: string[] }> = {
  1: {
    prompt: 'วางเหรียญหรือเลโก้ 7 ชิ้นในกล่องไข่ 10 ช่อง (หรือวาดตาราง 2×5) ให้ดู 2 วินาทีแล้วปิด',
    questions: ['เห็นกี่อัน', 'รู้ได้ยังไงโดยไม่ต้องนับ'],
  },
  2: { prompt: '7 กับอะไรได้ 10', questions: ['รู้ได้ยังไง', 'ถ้าเป็น 6 ล่ะ ต่างกันยังไง'] },
  3: { prompt: '7 + 8', questions: ['หนูคิดยังไง', 'มีเลขคู่ซ่อนอยู่ไหม'] },
  4: { prompt: '8 + 5', questions: ['หนูคิดยังไง', 'ถ้าต้องทำให้ 8 เป็น 10 ก่อน จะทำยังไง'] },
  5: { prompt: '47 + 10', questions: ['สิบที่เพิ่มมาไปอยู่ตรงไหน'] },
  6: { prompt: '38 + 25', questions: ['หนูคิดยังไง', 'มีวิธีอื่นไหม'] },
  7: { prompt: '38 + 25', questions: ['ถ้ากระโดดบนเส้นจำนวน จะกระโดดยังไง'] },
  8: { prompt: '49 + 26', questions: ['49 ใกล้เลขอะไรที่บวกง่าย'] },
  9: { prompt: '99 + 47', questions: ['วิธีไหนเร็วที่สุด ทำไม'] },
};
export const NUMBER_TALK_RULES = [
  'ถามวิธีคิดก่อน อย่าเพิ่งบอกว่าถูกหรือผิด',
  'ถ้าลูกนับ ไม่ต้องห้าม ถามว่า "มีวิธีที่เร็วกว่านี้ไหม"',
  'วาดสิ่งที่ลูกเล่าเป็นภาพ (เช่น number bond) ให้ลูกเห็น',
  'ไม่พูดว่า "ง่ายนิดเดียว" หรือ "เก่งมาก" ให้ชมที่วิธีคิด เช่น "วิธีนี้ฉลาดดี เพราะ..."',
];

// ----------------------------------------------------------------- ชุดตรวจ "คำตอบผิด -> รหัส" ครบทุกแบบ

export interface Probe {
  itemId: string;
  r: number;
  s?: StrategyId;
}
const SET_A: StrategyId[] = ['count-fingers', 'count-on', 'make-ten', 'doubles', 'known', 'unsure'];
const SET_B: StrategyId[] = [
  'count-by-one',
  'column',
  'split-place',
  'jump-tens',
  'round',
  'unsure',
];

/** ทุก (ข้อ, คำตอบผิดที่ LS ระบุ, วิธีคิด) ที่ต้องตรวจ แยกตามข้อ */
export function probeQueues(wrong: Record<string, Array<{ r: number; byStrategy?: object }>>): {
  stage14: Probe[][];
  stage5: Probe[][];
} {
  const queues: Record<string, Probe[]> = {};
  for (const [itemId, rules] of Object.entries(wrong)) {
    const item = ITEM_BY_ID[itemId];
    if (!item) continue;
    const set = item.set === 'A' ? SET_A : item.set === 'B' ? SET_B : null;
    const q: Probe[] = [];
    let firstSpecial = true;
    for (const rule of rules) {
      if (!set) {
        q.push({ itemId, r: rule.r });
      } else if (rule.byStrategy) {
        // คำตอบที่ผลขึ้นกับวิธีคิด: ตรวจทุกวิธีคิดของชุดสำหรับคำตอบแรก ที่เหลือตรวจ 2 วิธี
        const list = firstSpecial
          ? set
          : item.set === 'A'
            ? (['doubles', 'known'] as StrategyId[])
            : (['round', 'column'] as StrategyId[]);
        firstSpecial = false;
        for (const s of list) q.push({ itemId, r: rule.r, s });
      } else {
        const list =
          item.set === 'A'
            ? (['doubles', 'make-ten'] as StrategyId[])
            : (['round', 'count-by-one'] as StrategyId[]);
        for (const s of list) q.push({ itemId, r: rule.r, s });
      }
    }
    queues[itemId] = q;
  }
  const pick = (stages: number[]): Probe[][] => {
    const ids = Object.keys(queues).filter((id) => stages.includes(ITEM_BY_ID[id]?.stage ?? 0));
    const n = Math.max(0, ...ids.map((id) => queues[id]?.length ?? 0));
    const sessions: Probe[][] = [];
    for (let k = 0; k < n; k++) {
      const s: Probe[] = [];
      for (const id of ids) {
        const p = queues[id]?.[k];
        if (p) s.push(p);
      }
      sessions.push(s);
    }
    return sessions;
  };
  return { stage14: pick([1, 2, 3, 4]), stage5: pick([5]) };
}
