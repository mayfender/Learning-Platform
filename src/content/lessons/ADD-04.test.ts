import { describe, expect, it } from 'vitest';
import { ADD_04 } from '@/content/lessons/ADD-04';
import { addMisconceptions } from '@/content/misconceptions';
import { skills } from '@/content/skills';
import { addMindView } from '@/content/strategies';
import { makeTenPlan } from '@/engine/lesson/makeTenPlan';
import type { LessonItem } from '@/engine/lesson/types';
import { solve } from '@/engine/problem';

// ตารางคาดหวังพิมพ์ใหม่จาก LS ADD-04 §3–§4 โดยตรง (ห้าม import จากไฟล์เนื้อหา)
type Row = {
  id: string;
  flow: string;
  skillId: string;
  problem: unknown;
  expected: number;
  mode: 'see' | 'fade' | 'mind';
};
const gap = (part: number, missing?: 'first' | 'second') => ({
  kind: 'missing-part',
  whole: 10,
  part,
  missing: missing ?? 'second',
});
const sum = (a: number, b: number) => ({ kind: 'arith', op: '+', a, b });
const row = (
  id: string,
  flow: string,
  skillId: string,
  problem: unknown,
  expected: number,
  mode: Row['mode'],
): Row => ({ id, flow, skillId, problem, expected, mode });

const CHECK: Row[] = [
  row('c1', 'silent-flash-gap', 'add.bonds-10', gap(7), 3, 'fade'),
  row('c2', 'silent-flash-gap', 'add.bonds-10', gap(9), 1, 'fade'),
  row('c3', 'silent-flash-gap', 'add.bonds-10', gap(4), 6, 'fade'),
  row('c4', 'silent-text', 'add.make-10', sum(8, 5), 13, 'mind'),
  row('c5', 'silent-text', 'add.make-10', sum(9, 7), 16, 'mind'),
  row('c6', 'silent-text', 'add.make-10', sum(4, 7), 11, 'mind'),
];
const A1: Row[] = [
  row('A1.1', 'guided-fill', 'add.bonds-10', gap(8), 2, 'see'),
  row('A1.2', 'guided-fill', 'add.bonds-10', gap(6), 4, 'see'),
  row('A1.3', 'guided-fill', 'add.bonds-10', gap(3), 7, 'see'),
];
const A2: Row[] = [
  row('A2.1', 'teach-flash-gap', 'add.bonds-10', gap(6), 4, 'fade'),
  row('A2.2', 'teach-flash-gap', 'add.bonds-10', gap(2), 8, 'fade'),
  row('A2.3', 'teach-flash-gap', 'add.bonds-10', gap(8), 2, 'fade'),
  row('A2.4', 'teach-flash-gap', 'add.bonds-10', gap(3), 7, 'fade'),
  row('A2.5', 'teach-flash-gap', 'add.bonds-10', gap(1), 9, 'fade'),
  row('A2.6', 'teach-flash-gap', 'add.bonds-10', gap(7), 3, 'fade'),
];
const A3: Row[] = [
  row('A3.1', 'mind-gap', 'add.bonds-10', gap(7, 'second'), 3, 'mind'),
  row('A3.2', 'mind-gap', 'add.bonds-10', gap(4, 'first'), 6, 'mind'),
  row('A3.3', 'mind-gap', 'add.bonds-10', gap(8, 'second'), 2, 'mind'),
  row('A3.4', 'mind-gap', 'add.bonds-10', gap(3, 'first'), 7, 'mind'),
  row('A3.5', 'mind-gap', 'add.bonds-10', gap(6, 'second'), 4, 'mind'),
  row('A3.6', 'mind-gap', 'add.bonds-10', gap(9, 'first'), 1, 'mind'),
];
const B1: Row[] = [
  row('B1.1', 'guided-move', 'add.make-10', sum(8, 5), 13, 'see'),
  row('B1.2', 'guided-move', 'add.make-10', sum(9, 6), 15, 'see'),
  row('B1.3', 'guided-move', 'add.make-10', sum(7, 4), 11, 'see'),
];
const B3: Row[] = [
  row('B3.1', 'teach-flash-make', 'add.make-10', sum(8, 6), 14, 'fade'),
  row('B3.2', 'teach-flash-make', 'add.make-10', sum(9, 5), 14, 'fade'),
  row('B3.3', 'teach-flash-make', 'add.make-10', sum(7, 8), 15, 'fade'),
  row('B3.4', 'teach-flash-make', 'add.make-10', sum(6, 9), 15, 'fade'),
  row('B3.5', 'teach-flash-make', 'add.make-10', sum(8, 4), 12, 'fade'),
  row('B3.6', 'teach-flash-make', 'add.make-10', sum(7, 6), 13, 'fade'),
];
const B4: Row[] = [
  row('B4.1', 'mind-make', 'add.make-10', sum(8, 3), 11, 'mind'),
  row('B4.2', 'mind-make', 'add.make-10', sum(9, 7), 16, 'mind'),
  row('B4.3', 'mind-make', 'add.make-10', sum(5, 8), 13, 'mind'),
  row('B4.4', 'mind-make', 'add.make-10', sum(6, 8), 14, 'mind'),
  row('B4.5', 'mind-make', 'add.make-10', sum(9, 4), 13, 'mind'),
  row('B4.6', 'mind-make', 'add.make-10', sum(8, 9), 17, 'mind'),
];

// ขาด / เหลือ / ผลรวม ของ B1 และ B3 (LS §4)
const B1_PLAN: [string, number, number, number][] = [
  ['B1.1', 2, 3, 13],
  ['B1.2', 1, 5, 15],
  ['B1.3', 3, 1, 11],
];
const B3_PLAN: [string, number, number, number][] = [
  ['B3.1', 2, 4, 14],
  ['B3.2', 1, 4, 14],
  ['B3.3', 2, 5, 15],
  ['B3.4', 1, 5, 15],
  ['B3.5', 2, 2, 12],
  ['B3.6', 3, 3, 13],
];

function checkGroup(name: string, actual: readonly LessonItem[], expected: Row[]): void {
  describe(name, () => {
    it(`มี ${expected.length} ข้อ ตรง LS ทุกข้อ (id, flow, ทักษะ, โจทย์, เฉลย, โหมดภาพ)`, () => {
      expect(actual).toHaveLength(expected.length);
      actual.forEach((it, i) => {
        const want = expected[i]!;
        expect(it.id).toBe(want.id);
        expect(it.flow, it.id).toBe(want.flow);
        expect(it.skillId, it.id).toBe(want.skillId);
        expect(it.problem, it.id).toEqual(want.problem);
        expect(it.expected, it.id).toBe(want.expected);
        expect(it.mode, it.id).toBe(want.mode);
      });
    });
    it('เฉลย = solve(problem) ทุกข้อ', () => {
      for (const it of actual) expect(solve(it.problem), it.id).toBe(it.expected);
    });
  });
}

describe('ADD-04 เนื้อหา: ข้อคงที่', () => {
  checkGroup('เช็คก่อน c1–c6', ADD_04.check.items, CHECK);
  checkGroup('A1', ADD_04.blocks.A.a1, A1);
  checkGroup('A2', ADD_04.blocks.A.a2, A2);
  checkGroup('A3', ADD_04.blocks.A.a3, A3);
  checkGroup('B1', ADD_04.blocks.B.b1, B1);
  checkGroup('B3', ADD_04.blocks.B.b3, B3);
  checkGroup('B4', ADD_04.blocks.B.b4, B4);

  it('id ไม่ซ้ำกันทั้งบท', () => {
    const ids = [
      ...ADD_04.check.items,
      ...ADD_04.blocks.A.a1,
      ...ADD_04.blocks.A.a2,
      ...ADD_04.blocks.A.a3,
      ...ADD_04.blocks.B.b1,
      ...ADD_04.blocks.B.b3,
      ...ADD_04.blocks.B.b4,
    ].map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('A3: ตำแหน่งที่หายสลับ second, first, second, first, second, first', () => {
    const positions = ADD_04.blocks.A.a3.map((i) =>
      i.problem.kind === 'missing-part' ? i.problem.missing : undefined,
    );
    expect(positions).toEqual(['second', 'first', 'second', 'first', 'second', 'first']);
  });

  it.each(B1_PLAN)('B1 %s ขาด %i เหลือ %i รวม %i ตรง makeTenPlan', (id, gapN, restN, total) => {
    const it = ADD_04.blocks.B.b1.find((x) => x.id === id)!;
    if (it.problem.kind !== 'arith') throw new Error();
    const plan = makeTenPlan(it.problem.a, it.problem.b);
    expect([plan.gap, plan.rest, plan.total]).toEqual([gapN, restN, total]);
    expect(it.expected).toBe(total);
  });

  it.each(B3_PLAN)('B3 %s ขาด %i เหลือ %i รวม %i ตรง makeTenPlan', (id, gapN, restN, total) => {
    const it = ADD_04.blocks.B.b3.find((x) => x.id === id)!;
    if (it.problem.kind !== 'arith') throw new Error();
    const plan = makeTenPlan(it.problem.a, it.problem.b);
    expect([plan.gap, plan.rest, plan.total]).toEqual([gapN, restN, total]);
    expect(it.expected).toBe(total);
  });

  it('B3 fields: ข้อ 1–3 สามช่อง ข้อ 4–6 ช่องเดียว', () => {
    expect(ADD_04.blocks.B.b3.map((i) => i.fields)).toEqual([
      ['gap', 'rest', 'total'],
      ['gap', 'rest', 'total'],
      ['gap', 'rest', 'total'],
      ['total'],
      ['total'],
      ['total'],
    ]);
  });

  it('B3 ข้อ 7+8 เริ่มจาก 8 และ 7+6 เริ่มจาก 7 (LS §4)', () => {
    expect(makeTenPlan(7, 8).boxDots).toBe(8);
    expect(makeTenPlan(7, 6).boxDots).toBe(7);
  });

  it('B2: 4+9 กับ 9+4, คำถาม 2 ข้อ และเฉลย', () => {
    const c = ADD_04.blocks.B.compare;
    expect(c.problem).toEqual({ a: 4, b: 9 });
    expect(c.boards).toEqual([
      { boxDots: 4, pileDots: 9 },
      { boxDots: 9, pileDots: 4 },
    ]);
    expect(c.questions[0].text).toBe('ทั้งสองแบบได้เท่ากันไหม');
    expect(c.questions[0].options.map((o) => o.label)).toEqual(['ได้เท่ากัน', 'ไม่เท่ากัน']);
    expect(c.questions[0].options.find((o) => o.value === c.questions[0].expected)?.label).toBe(
      'ได้เท่ากัน',
    );
    expect(c.questions[1].text).toBe('แบบไหนย้ายน้อยกว่า');
    expect(c.questions[1].options.map((o) => o.label)).toEqual(['เริ่มจาก 4', 'เริ่มจาก 9']);
    expect(c.questions[1].options.find((o) => o.value === c.questions[1].expected)?.label).toBe(
      'เริ่มจาก 9',
    );
    // ทั้งสองแบบให้ 13 (4+9) และย้าย 6 กับ 1 จุด
    expect(makeTenPlan(4, 9).total).toBe(13);
    expect(10 - 4).toBe(6);
    expect(makeTenPlan(9, 4).gap).toBe(1);
  });
});

describe('ADD-04 เนื้อหา: โครงและอ้างอิง', () => {
  it('ข้อมูลหลัก', () => {
    expect(ADD_04.id).toBe('ADD-04');
    expect(ADD_04.title).toBe('ช่องว่างและเติมให้เต็มสิบ');
    expect(ADD_04.kind).toBe('lesson');
    expect(ADD_04.timing).toEqual({ ackMs: 1000, readyMs: 900, flashMs: 1500, pileFlashMs: 2000 });
    expect(ADD_04.sittings).toEqual([
      { no: 1, blocks: ['check', 'A'] },
      { no: 2, blocks: ['B', 'practice', 'challenge'] },
    ]);
  });

  it('skills, skillId ของทุกข้อ, ชุดกลยุทธ์ และรหัสความเข้าใจผิดมีอยู่จริง', () => {
    const skillIds = new Set(skills.map((s) => s.id));
    for (const id of ADD_04.skills) expect(skillIds.has(id)).toBe(true);
    const items = [
      ...ADD_04.check.items,
      ...ADD_04.blocks.A.a1,
      ...ADD_04.blocks.A.a2,
      ...ADD_04.blocks.A.a3,
      ...ADD_04.blocks.B.b1,
      ...ADD_04.blocks.B.b3,
      ...ADD_04.blocks.B.b4,
    ];
    for (const it of items) expect(skillIds.has(it.skillId), it.id).toBe(true);
    expect(ADD_04.strategySets.map((s) => s.id)).toEqual(['add.mind-view']);
    const miscIds = new Set(addMisconceptions.map((m) => m.id));
    // ทุกรหัสที่ classifyLessonAnswer คืนได้
    for (const id of ['L1', 'M4', 'M5', 'M6', 'M7', 'MX']) expect(miscIds.has(id)).toBe(true);
    expect(ADD_04.misconceptions.some((m) => m.id === 'L1')).toBe(true);
  });

  it('sittings และเกณฑ์ข้ามอ้าง id ที่มีอยู่', () => {
    const checkIds = new Set(ADD_04.check.items.map((i) => i.id));
    for (const id of [...ADD_04.check.skip.A.itemIds, ...ADD_04.check.skip.B.itemIds]) {
      expect(checkIds.has(id)).toBe(true);
    }
    expect(ADD_04.check.skip.A.itemIds).toEqual(['c1', 'c2', 'c3']);
    expect(ADD_04.check.skip.B.itemIds).toEqual(['c4', 'c5', 'c6']);
    const b3Ids = new Set(ADD_04.blocks.B.b3.map((i) => i.id));
    for (const id of ADD_04.blocks.B.trend.compareItemIds) expect(b3Ids.has(id)).toBe(true);
    expect(ADD_04.blocks.B.trend.compareItemIds).toEqual(['B3.4', 'B3.5', 'B3.6']);
    expect(ADD_04.blocks.B.trend.maxRatio).toBe(0.8);
    expect(ADD_04.blocks.B.trend.forbidMisconceptions).toEqual(['L1', 'M6', 'M7']);
    expect(ADD_04.blocks.A.pass).toEqual({ minCorrect: 5, minFast: 4 });
    expect(ADD_04.blocks.B.pass).toEqual({ minCorrect: 5, minFast: 4 });
    expect(ADD_04.blocks.B.trayFlag).toEqual({ misconceptions: ['M6', 'M7'], minCount: 2 });
    expect(ADD_04.blocks.B.onFail.maxRetryRounds).toBe(2);
    expect(ADD_04.blocks.A.onFail.a2RetryRounds).toBe(1);
  });

  it('ฝึกให้คล่อง ท่องซ้ำ', () => {
    expect(ADD_04.practice.rounds).toEqual([
      { skillId: 'add.bonds-10', generator: 'bonds-10', count: 4 },
      { skillId: 'add.make-10', generator: 'make-ten', count: 4 },
    ]);
    expect(ADD_04.drill).toEqual({
      skillId: 'add.bonds-10',
      minutes: 2,
      unlock: { consecutiveRounds: 2, minCorrect: 3, minAutomatic: 3 },
    });
  });

  it('ตัวเลือก add.mind-view 5 ตัว ลำดับและข้อความตาม LS และ counting ตามตาราง', () => {
    expect(addMindView.id).toBe('add.mind-view');
    expect(addMindView.options.map((o) => [o.id, o.label, o.counting])).toEqual([
      ['see-box', 'เห็นกล่อง 10 ช่อง', 'no'],
      ['see-number', 'นึกเป็นตัวเลข', 'no'],
      ['count-fingers', 'นับนิ้ว', 'yes'],
      ['count-in-head', 'นับในใจ', 'yes'],
      ['unsure', 'บอกไม่ถูก', 'ignore'],
    ]);
  });

  it('skills.ts: fluency และ review ตรง LS §6.1–6.2 / ADR-0006', () => {
    const bonds = skills.find((s) => s.id === 'add.bonds-10')!;
    const make = skills.find((s) => s.id === 'add.make-10')!;
    expect(bonds.fluency).toEqual({ noCountMs: 5000, automaticMs: 3000 });
    expect(make.fluency).toEqual({ noCountMs: 8000, automaticMs: 5000 });
    for (const s of [bonds, make]) {
      expect(s.review).toEqual({
        intervalsDays: [1, 2, 4, 7, 14],
        boxLevels: ['noCount', 'noCount', 'automatic', 'automatic', 'automatic'],
        round: { count: 4, minFluent: 3 },
        resetOn: ['L1', 'M4', 'M6', 'M7'],
      });
    }
    // ทักษะอื่นไม่เข้า Leitner
    for (const s of skills.filter((x) => x.id !== 'add.bonds-10' && x.id !== 'add.make-10')) {
      expect(s.review).toBeUndefined();
    }
  });

  it('challenge.answer สอดคล้อง: ผลรวมทุกคู่ 10, เหลือ 5, ผลรวมทั้งหมด 45', () => {
    const c = ADD_04.challenge;
    expect(c.cards).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(c.target).toBe(10);
    for (const [a, b] of c.answer.pairs) expect(a + b).toBe(10);
    expect(c.answer.pairs).toHaveLength(4);
    const used = c.answer.pairs.flat();
    expect(new Set(used).size).toBe(8);
    const leftover = c.cards.filter((x) => !used.includes(x));
    expect(leftover).toEqual([c.answer.leftover]);
    expect(c.answer.leftover).toBe(5);
    expect(c.cards.reduce((s, x) => s + x, 0)).toBe(45);
    // 5 คู่กับ 5 ได้ แต่มีการ์ด 5 ใบเดียว
    expect(c.cards.filter((x) => x === 5)).toHaveLength(1);
  });
});

describe('ADD-04 เนื้อหา: ข้อความตามตัวอักษรของ LS', () => {
  const t = ADD_04.texts;
  it('ข้อความถูก/ผิดของ A1 และ B1 (LS §4)', () => {
    expect(t.feedback.correctGap).toBe('ใช่ ช่องว่าง {x} ช่อง {n} กับ {x} ได้ 10');
    expect(t.feedback.l1).toBe('นั่นคือจุดที่มีอยู่ ลองดูช่องที่ยังว่าง');
    expect(t.feedback.m5Gap).toBe('ลองดูทีละแถว แถวบนเต็ม 5 แล้ว แถวล่างมีอีกกี่ช่อง');
    expect(t.feedback.correctMake).toBe(
      '{a} ขาด {gap} ก็เอา {gap} จาก {b} มาเติม เหลือ {rest} 10 กับ {rest} ได้ {total}',
    );
    expect(t.feedback.m7).toBe(
      'ในกองยังมี {pile} จุดหรือเปล่า ตอนนี้ย้ายไป {gap} แล้ว เหลือกี่จุด',
    );
    expect(t.feedback.m6).toBe('นั่นคือส่วนที่เหลือ อย่าลืมกล่องที่เต็ม 10 แล้ว');
    expect(t.feedback.a3Wrong).toBe('ลองนึกกล่อง 10 ช่องที่มี {n} จุด');
    expect(t.feedback.fingers).toBe('นิ้วช่วยได้นะ ลองนึกภาพกล่อง 10 ช่องดูสิ ช่องว่างอยู่ตรงไหน');
    // ตัวอย่างที่ LS เขียนไว้ตรงกับเทมเพลตเมื่อแทนค่า
    expect(t.feedback.correctGap.replace('{x}', '2').replace('{x}', '2').replace('{n}', '8')).toBe(
      'ใช่ ช่องว่าง 2 ช่อง 8 กับ 2 ได้ 10',
    );
    expect(
      t.feedback.correctMake
        .replaceAll('{a}', '8')
        .replaceAll('{gap}', '2')
        .replaceAll('{b}', '5')
        .replaceAll('{rest}', '3')
        .replaceAll('{total}', '13'),
    ).toBe('8 ขาด 2 ก็เอา 2 จาก 5 มาเติม เหลือ 3 10 กับ 3 ได้ 13');
    expect(t.feedback.m7.replace('{pile}', '5').replace('{gap}', '2')).toBe(
      'ในกองยังมี 5 จุดหรือเปล่า ตอนนี้ย้ายไป 2 แล้ว เหลือกี่จุด',
    );
  });

  it('ข้อสรุปกฎ A/B, คำถาม, ป้ายช่อง (LS §4)', () => {
    expect(t.rules.A).toBe('ช่องที่เต็ม + ช่องที่ว่าง = 10 เสมอ ดูช่องว่างก็รู้คำตอบ');
    expect(t.rules.B2).toBe('เริ่มจากตัวที่ใกล้ 10 กว่า จะย้ายน้อยกว่า');
    expect(t.rules.B).toBe('ขาดเท่าไรถึงสิบ เอามาจากอีกตัว เหลือเท่าไรก็บวกกับสิบ');
    expect(t.questions.a1).toBe('เติมอีกกี่ช่องถึงจะเต็ม');
    expect(t.questions.b1Gap).toBe('กล่องขาดอีกกี่ช่องถึงเต็ม');
    expect(t.questions.b1Rest).toBe('เหลือในกองกี่จุด');
    expect(t.questions.b1Total).toBe('10 กับ {rest} ได้เท่าไร');
    expect(t.questions.mindView).toBe('ในหัวเห็นอะไร');
    expect(t.flash.hiddenGap).toBe('ซ่อนแล้ว! ว่างกี่ช่องนะ?');
    expect(t.fieldLabels).toEqual({ gap: 'ขาด', rest: 'เหลือ', total: 'ผลรวม' });
    expect(t.tellParent).toBe('เล่าให้พ่อฟัง 1 ข้อ ว่าทำยังไง (ไม่ใช้จอ)');
  });

  it('ประโยคเปิดแต่ละส่วน (LS §11)', () => {
    expect(t.intros.check).toBe(
      'เช็คก่อน — ขอดูหน่อยว่าอะไรที่หนูทำได้แล้วบ้าง จะได้ข้ามส่วนที่รู้แล้ว ตอบเท่าที่คิดได้เลย',
    );
    expect(t.intros.A).toBe(
      'ส่วน A: ช่องว่างคือคำตอบ — ในกล่อง 10 ช่อง ช่องที่ยังว่างบอกคำตอบได้ ลองดูสิ',
    );
    expect(t.intros.B).toBe(
      'ส่วน B: เติมให้เต็มสิบ — ทำให้กล่องเต็ม 10 ก่อน แล้วค่อยบวกที่เหลือ ลองเล่นดู',
    );
    expect(t.intros.challenge).toBe(
      'ปริศนา: ใบไหนไม่มีคู่ — การ์ดเลข 1 ถึง 9 จับคู่ให้บวกกันได้ 10 ให้ได้มากที่สุด แล้วดูว่าใบไหนเหลือ',
    );
    expect(t.go).toBe('ไปเลย');
  });

  it('ข้อความจบรอบ (LS §6.3), ปริศนา (LS §7), ข้อเสนอ P1–P15 ที่ Designer รับรอง', () => {
    expect(t.roundEnd.faster).toBe('วันนี้เร็วกว่าครั้งก่อน {k} ข้อ');
    expect(t.roundEnd.done).toBe('วันนี้ทำครบ {n} ข้อ');
    expect(ADD_04.challenge.hints).toEqual([
      'เริ่มจากการ์ด 9 ก่อน 9 ต้องคู่กับอะไร',
      'จับคู่ 9, 8, 7, 6 ก่อน (แต่ละใบใกล้ 10 กว่า) แล้วดูว่าเหลืออะไร',
      'ลอง 5 คู่กับ 5 ได้ไหม มีการ์ด 5 กี่ใบ',
    ]);
    expect(ADD_04.challenge.answer.explanation).toBe(
      'คู่ที่ได้คือ 1+9, 2+8, 3+7, 4+6 เหลือใบ 5 เพราะ 5+5 = 10 แต่มีการ์ด 5 แค่ใบเดียว ไม่มีอีกใบมาคู่',
    );
    // P1, P4, P5, P6, P7, P8, P9, P12, P14, P15
    expect(t.next).toBe('ต่อไป');
    expect(t.feedback.m4).toBe('หาช่องที่ยังว่าง ไม่ใช่เอาตัวเลขมารวมกัน ลองดูช่องว่างในกล่อง');
    expect(t.feedback.mxA).toBe('ลองดูช่องที่ยังว่างในกล่อง');
    expect(t.feedback.mxB).toBe('ลองดูทีละขั้น ขาดเท่าไร เหลือเท่าไร แล้วรวมกับ 10');
    expect(t.feedback.m5Make).toBe('ลองนับจุดที่เหลือในกองทีละกลุ่มอีกที');
    expect(t.feedback.reveal).toBe('มาดูด้วยกันนะ');
    expect(t.handover).toBe('วันนี้พอแค่นี้ ส่งเครื่องให้พ่อได้เลย');
    expect(t.parentNote.title).toBe('บันทึกสำหรับพ่อ');
    expect(t.parentNote.fingers).toBe('ใช้นิ้ว');
    expect(t.parentNote.mouth).toBe('ขยับปากนับ');
    expect(t.parentNote.options).toEqual({ none: 'ไม่ใช้', some: 'บางข้อ', most: 'เกือบทุกข้อ' });
    expect(t.parentNote.note).toBe('โน้ต (ไม่บังคับ)');
    expect(t.parentNote.save).toBe('บันทึก');
    expect(t.parentNote.skip).toBe('ข้าม');
    expect(t.compare.movedCount).toBe('ย้ายไป {k} จุด');
    expect(t.compare.result).toBe('เหลือ {r} 10 กับ {r} ได้ {t}');
    expect(t.compare.startLabel).toBe('เริ่มจาก {n}');
    expect(t.card).toEqual({
      sitting: 'ครั้งที่ {n}',
      done: 'ทำครบแล้ว',
      review: 'ทบทวนวันนี้',
      drill: 'ท่องซ้ำ 2 นาที',
    });
    expect(t.challenge).toEqual({
      tryButton: 'ลองเลย',
      laterButton: 'ไว้ก่อน',
      hintButton: 'ขอคำใบ้',
      restartButton: 'เริ่มใหม่',
      question: 'ใบไหนที่เหลืออยู่ แล้วทำไม',
      tellButton: 'เล่าให้พ่อฟังว่าทำไม',
      revealButton: 'ดูเฉลย',
    });
    expect(t.skip).toBe('ข้าม');
  });

  it('หน้าพ่อ: ของจริงที่ต้องเตรียมและ Number Talks (LS §4, §5) และคำถามต่อยอดปริศนา (LS §7)', () => {
    const g = ADD_04.parentGuide;
    expect(g.materials.items[0]).toBe('ถาดไข่ 10 ช่อง (ตัดจากถาด 12 หรือวาดตาราง 2×5)');
    expect(g.materials.items[1]).toBe('เหรียญหรือเลโก้ 15 ชิ้น แบ่ง 2 สี');
    expect(g.numberTalks.problems).toBe(
      'โจทย์ที่ 1: 8 + 5 · โจทย์ที่ 2: 9 + 6 (ถ้าเหลือเวลา 7 + 4)',
    );
    expect(g.numberTalks.openingQuestions).toEqual([
      'หนูคิดยังไง',
      'ในหัวเห็นอะไร',
      'มีวิธีอื่นไหม',
      'นิ้วช่วยตอนไหน',
    ]);
    expect(g.numberTalks.openingNote).toBe('ถามด้วยความอยากรู้ ไม่ใช่จับผิด');
    expect(g.numberTalks.thoughts.map((x) => x.thought)).toEqual([
      '"8 ขาด 2 เอา 2 จาก 5 เหลือ 3 เป็น 13"',
      '"นับต่อจาก 8: 9, 10, 11, 12, 13"',
      'ใช้นิ้วแล้วแยก 5 เป็น 2 กับ 3',
      '"จำได้เลย"',
    ]);
    expect(g.numberTalks.avoid).toHaveLength(4);
    expect(g.numberTalks.avoid[0]).toBe('"ง่ายนิดเดียว"');
    expect(g.numberTalks.avoid[3]).toBe('"เร็วๆ หน่อย"');
    expect(g.challengeExtension.answer).toContain('เหลือ 5 และ 10');
    expect(g.instructions.trayB1).toContain('กลับไปทำ B1 ด้วยของจริง (ถาดไข่) ก่อน');
    expect(g.instructions.talkA).toContain('Number Talks ด้วยถาดไข่จริง');
  });
});

describe('ADD-04 เนื้อหา: คำต้องห้ามในข้อความที่ลูกเห็น', () => {
  // LS §11: ข้อความหน้าของลูกห้ามมีคำเหล่านี้ ยกเว้นข้อความสถิติจบรอบ §6.3 ("วันนี้เร็วกว่าครั้งก่อน {k} ข้อ")
  const EXEMPT = new Set(['roundEnd.faster']);
  const FORBIDDEN = [
    'ยืม',
    'เก่ง',
    'ง่าย',
    'ผิด',
    'ช้า',
    'เร็ว',
    'คะแนน',
    'ten-frame',
    'number bond',
  ];

  function collect(value: unknown, path: string, out: [string, string][]): void {
    if (typeof value === 'string') out.push([path, value]);
    else if (Array.isArray(value)) value.forEach((v, i) => collect(v, `${path}[${i}]`, out));
    else if (typeof value === 'object' && value !== null) {
      for (const [k, v] of Object.entries(value)) collect(v, path ? `${path}.${k}` : k, out);
    }
  }

  it('ไม่มีคำต้องห้ามใน texts ของลูกและตัวเลือกกลยุทธ์ (ยกเว้นที่ LS เขียนไว้เอง)', () => {
    const strings: [string, string][] = [];
    collect(ADD_04.texts, '', strings);
    collect(
      addMindView.options.map((o) => o.label),
      'strategy',
      strings,
    );
    collect(ADD_04.blocks.B.compare.questions, 'compare.questions', strings);
    collect(ADD_04.challenge, 'challenge', strings);
    expect(strings.length).toBeGreaterThan(30);
    for (const [path, text] of strings) {
      if (EXEMPT.has(path)) continue;
      for (const word of FORBIDDEN) {
        expect(text.includes(word), `${path} มีคำต้องห้าม "${word}": ${text}`).toBe(false);
      }
    }
  });

  it('คำเรียกตามกฎ LS §11 ปรากฏในข้อความ: "กล่อง 10 ช่อง" และ "แยกเลข"/"เอามาเติม" ไม่ถูกแทนด้วยคำอื่น', () => {
    expect(ADD_04.texts.feedback.a3Wrong).toContain('กล่อง 10 ช่อง');
    expect(ADD_04.texts.intros.A).toContain('กล่อง 10 ช่อง');
    expect(ADD_04.texts.feedback.correctMake).toContain('เอา');
    expect(ADD_04.texts.feedback.correctMake).toContain('มาเติม');
  });
});
