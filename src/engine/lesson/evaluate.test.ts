import { describe, expect, it } from 'vitest';
import { skills } from '@/content/skills';
import {
  evaluateA,
  evaluateB,
  evaluateCheck,
  isFastAnswer,
  roundLevel,
  summarizeAnswers,
  type AnsweredPayload,
} from '@/engine/lesson/evaluate';
import { lesson } from '@/engine/lesson/testHarness';

type AnsOpts = NonNullable<Parameters<typeof ans>[2]>;

function ans(
  section: string,
  itemId: string,
  o: {
    correct?: boolean;
    ms?: number;
    valid?: boolean;
    mis?: string;
    sub?: NonNullable<AnsweredPayload['subAnswers']>;
    attemptNo?: number;
    skill?: 'add.bonds-10' | 'add.make-10';
  } = {},
): AnsweredPayload {
  const correct = o.correct ?? true;
  return {
    type: 'item.answered',
    itemId,
    skillId:
      o.skill ?? (section.startsWith('B') || section === 'c' ? 'add.make-10' : 'add.bonds-10'),
    problem: { kind: 'arith', op: '+', a: 8, b: 5 },
    expected: 13,
    response: correct ? 13 : 12,
    correct,
    latencyMs: o.ms ?? 1000,
    latencyValid: o.valid ?? true,
    fluent: null,
    attemptNo: o.attemptNo ?? 1,
    section,
    ...(o.mis ? { misconceptionId: o.mis } : {}),
    ...(o.sub ? { subAnswers: o.sub } : {}),
  };
}

const a3 = (specs: [boolean, number][]): AnsweredPayload[] =>
  specs.map(([correct, ms], i) =>
    ans('A3', `A3.${i + 1}`, {
      correct,
      ms,
      skill: 'add.bonds-10',
      mis: correct ? undefined : 'M5',
    }),
  );

describe('isFastAnswer', () => {
  it('เร็ว = ถูก และ (เวลา ≤ เกณฑ์ หรือ แท็บซ่อน)', () => {
    expect(isFastAnswer({ correct: true, latencyValid: true, latencyMs: 5000 }, 5000)).toBe(true);
    expect(isFastAnswer({ correct: true, latencyValid: true, latencyMs: 5001 }, 5000)).toBe(false);
    expect(isFastAnswer({ correct: true, latencyValid: false, latencyMs: 99999 }, 5000)).toBe(true);
    expect(isFastAnswer({ correct: false, latencyValid: false, latencyMs: 1 }, 5000)).toBe(false);
    expect(isFastAnswer({ correct: false, latencyValid: true, latencyMs: 1 }, 5000)).toBe(false);
  });
});

describe('evaluateCheck (AC3)', () => {
  const c = (over: Record<string, Partial<AnsOpts>> = {}) =>
    ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'].map((id) =>
      ans('c', id, {
        skill: id <= 'c3' ? 'add.bonds-10' : 'add.make-10',
        ms: 1000,
        ...over[id],
      }),
    );

  it('ถูกหมดและเร็วทุกข้อ → ข้ามทั้ง A1+A2 และ B1+B2', () => {
    expect(evaluateCheck(lesson, c(), skills)).toEqual({ skipA12: true, skipB12: true });
  });

  it('ขอบเวลา: c1–c3 พอดี 5000 ms ข้าม, 5001 ไม่ข้าม; c4–c6 พอดี 8000 ข้าม, 8001 ไม่ข้าม', () => {
    expect(evaluateCheck(lesson, c({ c3: { ms: 5000 }, c6: { ms: 8000 } }), skills)).toEqual({
      skipA12: true,
      skipB12: true,
    });
    expect(evaluateCheck(lesson, c({ c3: { ms: 5001 }, c6: { ms: 8001 } }), skills)).toEqual({
      skipA12: false,
      skipB12: false,
    });
  });

  it('ผิด 1 ข้อในกลุ่มไหน กลุ่มนั้นไม่ข้าม อีกกลุ่มไม่กระทบ', () => {
    expect(evaluateCheck(lesson, c({ c5: { correct: false, mis: 'M7' } }), skills)).toEqual({
      skipA12: true,
      skipB12: false,
    });
    expect(evaluateCheck(lesson, c({ c2: { correct: false } }), skills)).toEqual({
      skipA12: false,
      skipB12: true,
    });
  });

  it('ข้อขาด (ยังไม่ตอบ) ไม่ข้าม; แท็บซ่อนและถูก = เร็ว', () => {
    expect(evaluateCheck(lesson, c().slice(0, 4), skills).skipB12).toBe(false);
    expect(evaluateCheck(lesson, c({ c1: { ms: 99999, valid: false } }), skills).skipA12).toBe(
      true,
    );
  });
});

describe('evaluateA: ผ่านส่วน A = A3 ถูก ≥ 5/6 และเร็ว ≥ 4 ข้อ (≤ 5000 ms)', () => {
  it('ถูก 5 เร็ว 4 → ผ่าน', () => {
    const ev = evaluateA(
      lesson,
      a3([
        [true, 1000],
        [true, 2000],
        [true, 3000],
        [true, 4000],
        [true, 9000],
        [false, 500],
      ]),
      skills,
    );
    expect(ev.outcome).toBe('passed');
    expect(ev.metrics).toMatchObject({ total: 6, correct: 5, fastCount: 4 });
  });

  it('ถูก 5 เร็ว 3 → ไม่ผ่าน', () => {
    const ev = evaluateA(
      lesson,
      a3([
        [true, 1000],
        [true, 2000],
        [true, 3000],
        [true, 6000],
        [true, 9000],
        [false, 500],
      ]),
      skills,
    );
    expect(ev.outcome).toBe('not-passed');
    expect(ev.metrics.fastCount).toBe(3);
  });

  it('ถูก 4 เร็ว 4 → ไม่ผ่าน; ถูก 6 เร็ว 6 → ผ่าน', () => {
    expect(
      evaluateA(
        lesson,
        a3([
          [true, 1],
          [true, 1],
          [true, 1],
          [true, 1],
          [false, 1],
          [false, 1],
        ]),
        skills,
      ).outcome,
    ).toBe('not-passed');
    expect(
      evaluateA(lesson, a3(Array(6).fill([true, 1000]) as [boolean, number][]), skills).outcome,
    ).toBe('passed');
  });

  it('พอดีเกณฑ์ 5000 ms ถือว่าเร็ว; 5001 ไม่เร็ว', () => {
    const fast = evaluateA(
      lesson,
      a3([
        [true, 5000],
        [true, 5000],
        [true, 5000],
        [true, 5000],
        [true, 9000],
        [true, 9000],
      ]),
      skills,
    );
    expect(fast.outcome).toBe('passed');
    const slow = evaluateA(
      lesson,
      a3([
        [true, 5001],
        [true, 5000],
        [true, 5000],
        [true, 5000],
        [true, 9000],
        [true, 9000],
      ]),
      skills,
    );
    expect(slow.outcome).toBe('not-passed');
  });

  it('แท็บซ่อนและถูก = เร็ว (ไม่ว่าเวลาเท่าไร)', () => {
    const list = a3(Array(6).fill([true, 99999]) as [boolean, number][]).map((a) => ({
      ...a,
      latencyValid: false,
    }));
    expect(evaluateA(lesson, list, skills).outcome).toBe('passed');
  });

  it('นับเฉพาะ attemptNo === 1 และเฉพาะ section A3', () => {
    const base = a3([
      [true, 1000],
      [true, 1000],
      [true, 1000],
      [false, 1000],
      [false, 1000],
      [false, 1000],
    ]);
    const extra = [
      ...base,
      ans('A3', 'A3.4', { attemptNo: 2 }),
      ans('A3', 'A3.5', { attemptNo: 2 }),
      ans('A2', 'A2.1'),
      ans('A1', 'A1.1'),
    ];
    const ev = evaluateA(lesson, extra, skills);
    expect(ev.metrics.correct).toBe(3);
    expect(ev.outcome).toBe('not-passed');
  });

  it('metrics: ค่าเฉลี่ยเวลาข้ามข้อที่ latencyValid=false และรวมรหัสความเข้าใจผิดตามข้อ', () => {
    const list = a3([
      [true, 1000],
      [true, 3000],
      [false, 5000],
      [true, 1],
      [true, 1],
      [true, 1],
    ]);
    list[3] = { ...list[3]!, latencyValid: false, latencyMs: 90000 };
    const ev = evaluateA(lesson, list, skills);
    expect(ev.metrics.meanLatencyMs).toBeCloseTo((1000 + 3000 + 5000 + 1 + 1) / 5);
    expect(ev.metrics.misconceptions).toEqual([{ id: 'M5', itemIds: ['A3.3'] }]);
  });
});

describe('evaluateB', () => {
  const mk = (b3: Partial<AnsOpts>[], b4: Partial<AnsOpts>[]): AnsweredPayload[] => [
    ...b3.map((o, i) =>
      ans('B3', `B3.${i + 1}`, {
        ...o,
        // ข้อ 1–3 มี subAnswers (3 ช่อง) ข้อ 4–6 ช่องเดียว
        sub: i < 3 ? (o.sub ?? []) : undefined,
      }),
    ),
    ...b4.map((o, i) => ans('B4', `B4.${i + 1}`, o)),
  ];
  const six = (ms: number) => Array.from({ length: 6 }, () => ({ ms }));

  it('ผ่านส่วน B: B4 ถูก ≥ 5/6 และเร็ว ≥ 4 ข้อ (≤ 8000)', () => {
    const b4 = [
      { ms: 8000 },
      { ms: 8000 },
      { ms: 8000 },
      { ms: 8000 },
      { ms: 20000 },
      { correct: false, ms: 1 },
    ];
    const ev = evaluateB(lesson, mk(six(1000), b4), skills);
    expect(ev.outcome).toBe('passed');
    expect(ev.metrics).toMatchObject({ correct: 5, fastCount: 4 });
  });

  it('เร็ว 3 ไม่ผ่านตามปกติ (และไม่เข้าเงื่อนไขแนวโน้มเมื่อเวลาไม่ลด)', () => {
    const b4 = [
      { ms: 8000 },
      { ms: 8000 },
      { ms: 8000 },
      { ms: 8001 },
      { ms: 20000 },
      { ms: 20000 },
    ];
    expect(evaluateB(lesson, mk(six(1000), b4), skills).outcome).toBe('not-passed');
  });

  describe('กำลังไปได้ดี: เวลาเฉลี่ย B4 ลด ≥ 20% เทียบ B3 ข้อ 4–6', () => {
    // B3 ข้อ 4–6 = 10000 ms ทั้งหมด (ข้อ 1–3 ไม่นำมาคิด) B4 ต้อง ≤ 8000 ms เฉลี่ย แต่ผ่านตามปกติไม่ได้
    const b3 = [
      { ms: 1000 },
      { ms: 1000 },
      { ms: 1000 },
      { ms: 10000 },
      { ms: 10000 },
      { ms: 10000 },
    ];
    // B4 ถูก 4 (ไม่ถึง 5) เพื่อไม่ผ่านตามปกติ: 2 ข้อผิดแบบ M5
    const b4 = (ms: number) => [
      { ms },
      { ms },
      { ms },
      { ms },
      { correct: false, ms, mis: 'M5' },
      { correct: false, ms, mis: 'MX' },
    ];

    it('ลด 20% พอดี (8000 เทียบ 10000) → ผ่านแบบกำลังไปได้ดี', () => {
      expect(evaluateB(lesson, mk(b3, b4(8000)), skills).outcome).toBe('passed-trend');
    });
    it('ลด 19% (8100) → ไม่ผ่าน', () => {
      expect(evaluateB(lesson, mk(b3, b4(8100)), skills).outcome).toBe('not-passed');
    });
    it('เทียบเฉพาะ B3 ข้อ 4–6: ข้อ 1–3 ที่ช้ามากไม่ช่วยให้ผ่านแนวโน้ม', () => {
      const slowFirst = [
        { ms: 60000 },
        { ms: 60000 },
        { ms: 60000 },
        { ms: 10000 },
        { ms: 10000 },
        { ms: 10000 },
      ];
      expect(evaluateB(lesson, mk(slowFirst, b4(8100)), skills).outcome).toBe('not-passed');
      expect(evaluateB(lesson, mk(slowFirst, b4(8000)), skills).outcome).toBe('passed-trend');
    });
    it('มี L1 ใน B3 → ไม่ผ่านแม้เวลาลด', () => {
      const withL1 = b3.map((o, i) => (i === 3 ? { ...o, correct: false, mis: 'L1' } : o));
      expect(evaluateB(lesson, mk(withL1, b4(5000)), skills).outcome).toBe('not-passed');
    });
    it('มี M6 หรือ M7 ใน B4 → ไม่ผ่านแนวโน้ม', () => {
      for (const mis of ['M6', 'M7']) {
        const list = b4(5000);
        list[5] = { correct: false, ms: 5000, mis };
        expect(evaluateB(lesson, mk(b3, list), skills).outcome).toBe('not-passed');
      }
    });
    it('M7 ในช่อง "เหลือ" ของ B3 (subAnswers) ก็ทำให้ไม่ผ่านแนวโน้ม', () => {
      const list = b3.map((o, i) =>
        i === 0
          ? {
              ...o,
              sub: [
                {
                  stepId: 'rest' as const,
                  response: 6,
                  expected: 4,
                  correct: false,
                  misconceptionId: 'M7',
                },
              ],
            }
          : o,
      );
      expect(evaluateB(lesson, mk(list, b4(5000)), skills).outcome).toBe('not-passed');
    });
    it('M5/MX ไม่ขัดแนวโน้ม (ข้อ B4 ที่ผิด M5/MX ในชุดทดสอบด้านบนยังผ่านแนวโน้ม)', () => {
      expect(evaluateB(lesson, mk(b3, b4(5000)), skills).outcome).toBe('passed-trend');
    });
    it('ค่าเฉลี่ยข้ามข้อที่ latencyValid=false', () => {
      const list = b4(8000);
      list[0] = { ms: 90000, valid: false } as never;
      // ข้อที่ไม่ valid ไม่นำมาเฉลี่ย → ยังเท่ากับ 8000
      expect(evaluateB(lesson, mk(b3, list), skills).outcome).toBe('passed-trend');
    });
    it('ไม่มีเวลา B3 ข้อ 4–6 ที่ใช้ได้ → ไม่ผ่านแนวโน้ม', () => {
      const noBase = b3.map((o, i) => (i >= 3 ? { ...o, valid: false } : o));
      expect(evaluateB(lesson, mk(noBase, b4(1000)), skills).outcome).toBe('not-passed');
    });
  });

  describe('ธง tray-B1: ข้อที่ตอบผิดเป็น M6/M7 ใน B3+B4 รวม ≥ 2 ข้อ', () => {
    const ok = six(1000);
    it('1 ข้อ ไม่ธง / 2 ข้อ ธง', () => {
      const one = [...ok];
      one[2] = { correct: false, ms: 1000, mis: 'M6' } as never;
      expect(evaluateB(lesson, mk(ok, one), skills).trayFlag).toBe(false);
      const two = [...one];
      two[3] = { correct: false, ms: 1000, mis: 'M7' } as never;
      expect(evaluateB(lesson, mk(ok, two), skills).trayFlag).toBe(true);
    });
    it('นับข้อทั้งจาก B3 (รวมช่อง "เหลือ") และ B4', () => {
      const b3 = [...ok];
      b3[0] = {
        ms: 1000,
        sub: [
          {
            stepId: 'rest' as const,
            response: 6,
            expected: 4,
            correct: false,
            misconceptionId: 'M7',
          },
        ],
      } as never;
      const b4 = [...ok];
      b4[1] = { correct: false, ms: 1000, mis: 'M6' } as never;
      expect(evaluateB(lesson, mk(b3, b4), skills).trayFlag).toBe(true);
      // ข้อเดียวกันที่มี M7 ทั้งระดับข้อและช่องย่อย นับเป็น 1 ข้อ
      const dup = [...ok];
      dup[0] = {
        correct: false,
        mis: 'M7',
        ms: 1000,
        sub: [
          {
            stepId: 'rest' as const,
            response: 6,
            expected: 4,
            correct: false,
            misconceptionId: 'M7',
          },
        ],
      } as never;
      expect(evaluateB(lesson, mk(dup, ok), skills).trayFlag).toBe(false);
    });
    it('M5/L1/MX ไม่นับเป็นธง', () => {
      const b4 = [...ok];
      b4[0] = { correct: false, ms: 1, mis: 'M5' } as never;
      b4[1] = { correct: false, ms: 1, mis: 'MX' } as never;
      b4[2] = { correct: false, ms: 1, mis: 'L1' } as never;
      expect(evaluateB(lesson, mk(ok, b4), skills).trayFlag).toBe(false);
    });
  });

  it('ข้อ B4 ที่ attemptNo > 1 ไม่นับ', () => {
    const list = [
      ...mk(six(1000), six(1000)),
      ans('B4', 'B4.1', { attemptNo: 2, correct: false, mis: 'M7' }),
    ];
    expect(evaluateB(lesson, list, skills).metrics.total).toBe(6);
  });
});

describe('summarizeAnswers และ roundLevel', () => {
  it('summarizeAnswers นับรวมและจัดกลุ่มรหัสตามข้อ', () => {
    const list = [
      ans('practice', 'p1', { ms: 1000 }),
      ans('practice', 'p2', { correct: false, mis: 'M5', ms: 2000 }),
      ans('practice', 'p3', { correct: false, mis: 'M5', ms: 3000 }),
    ];
    expect(summarizeAnswers(list, 1500)).toEqual({
      total: 3,
      correct: 1,
      fastCount: 1,
      meanLatencyMs: 2000,
      misconceptions: [{ id: 'M5', itemIds: ['p2', 'p3'] }],
    });
  });

  it('roundLevel: อัตโนมัติ (≤ 3000) ≥ 3 ข้อ → automatic; ไม่ต้องนับ (≤ 5000) ≥ 3 ข้อ → noCount; ไม่ถึง → none', () => {
    const r = (ms: number[]) =>
      ms.map((m, i) => ans('review', `r${i}`, { ms: m, skill: 'add.bonds-10' }));
    expect(roundLevel(r([2500, 2800, 3000, 9000]), skills, 'add.bonds-10')).toBe('automatic');
    expect(roundLevel(r([2500, 3500, 4900, 9000]), skills, 'add.bonds-10')).toBe('noCount');
    expect(roundLevel(r([5001, 5001, 1000, 1000]), skills, 'add.bonds-10')).toBe('none');
    // make-10: automatic 5000, noCount 8000
    expect(roundLevel(r([4000, 4500, 5000, 30000]), skills, 'add.make-10')).toBe('automatic');
    expect(roundLevel(r([6000, 7000, 8000, 30000]), skills, 'add.make-10')).toBe('noCount');
    // ทักษะที่ไม่มี review → none
    expect(roundLevel(r([1, 1, 1, 1]), skills, 'add.doubles')).toBe('none');
  });
});
