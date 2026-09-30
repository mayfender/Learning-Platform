import type { ItemField, Lesson, LessonItem } from '@/engine/lesson/types';
import type { Problem, SkillId } from '@/engine/types';
import { addMisconceptions } from '@/content/misconceptions';
import { addMindView } from '@/content/strategies';

// บทเรียน ADD-04 "ช่องว่างและเติมให้เต็มสิบ" — ข้อความและตัวเลขพิมพ์จาก Lesson Spec ตามตัวอักษร
// (ข้อความที่ LS ไม่ได้กำหนดคือ P1–P15 ใน Tech Spec §4.7 ซึ่ง Designer รับรองแล้ว)

const BONDS: SkillId = 'add.bonds-10';
const MAKE10: SkillId = 'add.make-10';

const gap = (part: number, missing: 'first' | 'second' = 'second'): Problem => ({
  kind: 'missing-part',
  whole: 10,
  part,
  missing,
});
const sum = (a: number, b: number): Problem => ({ kind: 'arith', op: '+', a, b });

function item(
  id: string,
  section: string,
  flow: LessonItem['flow'],
  skillId: SkillId,
  problem: Problem,
  expected: number,
  mode: LessonItem['mode'],
  fields?: readonly ItemField[],
): LessonItem {
  return { id, section, flow, skillId, problem, expected, mode, ...(fields ? { fields } : {}) };
}

// เช็คก่อน c1–c6 (LS §3)
const check: LessonItem[] = [
  item('c1', 'c', 'silent-flash-gap', BONDS, gap(7), 3, 'fade'),
  item('c2', 'c', 'silent-flash-gap', BONDS, gap(9), 1, 'fade'),
  item('c3', 'c', 'silent-flash-gap', BONDS, gap(4), 6, 'fade'),
  item('c4', 'c', 'silent-text', MAKE10, sum(8, 5), 13, 'mind'),
  item('c5', 'c', 'silent-text', MAKE10, sum(9, 7), 16, 'mind'),
  item('c6', 'c', 'silent-text', MAKE10, sum(4, 7), 11, 'mind'),
];

// A1 เห็น (8, 6, 3) → 2, 4, 7
const a1: LessonItem[] = [
  item('A1.1', 'A1', 'guided-fill', BONDS, gap(8), 2, 'see'),
  item('A1.2', 'A1', 'guided-fill', BONDS, gap(6), 4, 'see'),
  item('A1.3', 'A1', 'guided-fill', BONDS, gap(3), 7, 'see'),
];

// A2 ภาพจาง (6, 2, 8, 3, 1, 7) → 4, 8, 2, 7, 9, 3
const a2: LessonItem[] = [
  item('A2.1', 'A2', 'teach-flash-gap', BONDS, gap(6), 4, 'fade'),
  item('A2.2', 'A2', 'teach-flash-gap', BONDS, gap(2), 8, 'fade'),
  item('A2.3', 'A2', 'teach-flash-gap', BONDS, gap(8), 2, 'fade'),
  item('A2.4', 'A2', 'teach-flash-gap', BONDS, gap(3), 7, 'fade'),
  item('A2.5', 'A2', 'teach-flash-gap', BONDS, gap(1), 9, 'fade'),
  item('A2.6', 'A2', 'teach-flash-gap', BONDS, gap(7), 3, 'fade'),
];

// A3 นึกเอง: 7+?, ?+4, 8+?, ?+3, 6+?, ?+9 → 3, 6, 2, 7, 4, 1
const a3: LessonItem[] = [
  item('A3.1', 'A3', 'mind-gap', BONDS, gap(7, 'second'), 3, 'mind'),
  item('A3.2', 'A3', 'mind-gap', BONDS, gap(4, 'first'), 6, 'mind'),
  item('A3.3', 'A3', 'mind-gap', BONDS, gap(8, 'second'), 2, 'mind'),
  item('A3.4', 'A3', 'mind-gap', BONDS, gap(3, 'first'), 7, 'mind'),
  item('A3.5', 'A3', 'mind-gap', BONDS, gap(6, 'second'), 4, 'mind'),
  item('A3.6', 'A3', 'mind-gap', BONDS, gap(9, 'first'), 1, 'mind'),
];

// B1 เห็น (8+5, 9+6, 7+4) เฉลยผลรวม 13, 15, 11 (ขาด 2/1/3 เหลือ 3/5/1 คำนวณจาก makeTenPlan)
const b1: LessonItem[] = [
  item('B1.1', 'B1', 'guided-move', MAKE10, sum(8, 5), 13, 'see'),
  item('B1.2', 'B1', 'guided-move', MAKE10, sum(9, 6), 15, 'see'),
  item('B1.3', 'B1', 'guided-move', MAKE10, sum(7, 4), 11, 'see'),
];

// B3 ภาพจาง (8+6, 9+5, 7+8, 6+9, 8+4, 7+6) → 14, 14, 15, 15, 12, 13
const THREE: readonly ItemField[] = ['gap', 'rest', 'total'];
const ONE: readonly ItemField[] = ['total'];
const b3: LessonItem[] = [
  item('B3.1', 'B3', 'teach-flash-make', MAKE10, sum(8, 6), 14, 'fade', THREE),
  item('B3.2', 'B3', 'teach-flash-make', MAKE10, sum(9, 5), 14, 'fade', THREE),
  item('B3.3', 'B3', 'teach-flash-make', MAKE10, sum(7, 8), 15, 'fade', THREE),
  item('B3.4', 'B3', 'teach-flash-make', MAKE10, sum(6, 9), 15, 'fade', ONE),
  item('B3.5', 'B3', 'teach-flash-make', MAKE10, sum(8, 4), 12, 'fade', ONE),
  item('B3.6', 'B3', 'teach-flash-make', MAKE10, sum(7, 6), 13, 'fade', ONE),
];

// B4 นึกเอง (8+3, 9+7, 5+8, 6+8, 9+4, 8+9) → 11, 16, 13, 14, 13, 17
const b4: LessonItem[] = [
  item('B4.1', 'B4', 'mind-make', MAKE10, sum(8, 3), 11, 'mind'),
  item('B4.2', 'B4', 'mind-make', MAKE10, sum(9, 7), 16, 'mind'),
  item('B4.3', 'B4', 'mind-make', MAKE10, sum(5, 8), 13, 'mind'),
  item('B4.4', 'B4', 'mind-make', MAKE10, sum(6, 8), 14, 'mind'),
  item('B4.5', 'B4', 'mind-make', MAKE10, sum(9, 4), 13, 'mind'),
  item('B4.6', 'B4', 'mind-make', MAKE10, sum(8, 9), 17, 'mind'),
];

export const ADD_04: Lesson = {
  kind: 'lesson',
  id: 'ADD-04',
  version: 'ADD-04 v1',
  title: 'ช่องว่างและเติมให้เต็มสิบ',
  ladderStep: 4,
  skills: [BONDS, MAKE10],
  timing: { ackMs: 1000, readyMs: 900, flashMs: 1500, pileFlashMs: 2000 },
  strategySets: [addMindView],
  misconceptions: addMisconceptions,
  sittings: [
    { no: 1, blocks: ['check', 'A'] },
    { no: 2, blocks: ['B', 'practice', 'challenge'] },
  ],
  check: {
    items: check,
    skip: {
      A: { itemIds: ['c1', 'c2', 'c3'], skillId: BONDS },
      B: { itemIds: ['c4', 'c5', 'c6'], skillId: MAKE10 },
    },
  },
  blocks: {
    A: {
      a1,
      a2,
      a3,
      pass: { minCorrect: 5, minFast: 4 }, // LS §9: A3 ถูก ≥ 5/6 และ ≥ 4 ข้อ ≤ noCountMs
      onFail: { a2RetryRounds: 1 },
    },
    B: {
      b1,
      compare: {
        problem: { a: 4, b: 9 },
        boards: [
          { boxDots: 4, pileDots: 9 },
          { boxDots: 9, pileDots: 4 },
        ],
        questions: [
          {
            id: 'q1',
            text: 'ทั้งสองแบบได้เท่ากันไหม',
            options: [
              { value: 1, label: 'ได้เท่ากัน' },
              { value: 2, label: 'ไม่เท่ากัน' },
            ],
            expected: 1,
          },
          {
            id: 'q2',
            text: 'แบบไหนย้ายน้อยกว่า',
            options: [
              { value: 4, label: 'เริ่มจาก 4' },
              { value: 9, label: 'เริ่มจาก 9' },
            ],
            expected: 9,
          },
        ],
      },
      b3,
      b4,
      pass: { minCorrect: 5, minFast: 4 },
      trend: {
        compareItemIds: ['B3.4', 'B3.5', 'B3.6'],
        maxRatio: 0.8,
        forbidMisconceptions: ['L1', 'M6', 'M7'],
      },
      trayFlag: { misconceptions: ['M6', 'M7'], minCount: 2 },
      onFail: { maxRetryRounds: 2 },
    },
  },
  practice: {
    rounds: [
      { skillId: BONDS, generator: 'bonds-10', count: 4 },
      { skillId: MAKE10, generator: 'make-ten', count: 4 },
    ],
  },
  challenge: {
    cards: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    target: 10,
    hints: [
      'เริ่มจากการ์ด 9 ก่อน 9 ต้องคู่กับอะไร',
      'จับคู่ 9, 8, 7, 6 ก่อน (แต่ละใบใกล้ 10 กว่า) แล้วดูว่าเหลืออะไร',
      'ลอง 5 คู่กับ 5 ได้ไหม มีการ์ด 5 กี่ใบ',
    ],
    answer: {
      leftover: 5,
      pairs: [
        [1, 9],
        [2, 8],
        [3, 7],
        [4, 6],
      ],
      explanation:
        'คู่ที่ได้คือ 1+9, 2+8, 3+7, 4+6 เหลือใบ 5 เพราะ 5+5 = 10 แต่มีการ์ด 5 แค่ใบเดียว ไม่มีอีกใบมาคู่',
    },
  },
  drill: {
    skillId: BONDS,
    minutes: 2,
    unlock: { consecutiveRounds: 2, minCorrect: 3, minAutomatic: 3 },
  },
  texts: {
    go: 'ไปเลย',
    next: 'ต่อไป', // P1
    submit: 'ตอบ',
    answerPlaceholder: 'แตะตัวเลขด้านล่าง',
    skip: 'ข้าม', // P15
    acks: ['รับแล้ว!', 'โอเค ไปต่อ!', 'เยี่ยม ขอบคุณ!'],
    flash: {
      ready: 'พร้อมนะ...',
      show: 'ดู!',
      hiddenGap: 'ซ่อนแล้ว! ว่างกี่ช่องนะ?',
      hiddenMake: 'ซ่อนแล้ว!',
    },
    // LS §11 ประโยคเปิดแต่ละส่วน (P10)
    intros: {
      check:
        'เช็คก่อน — ขอดูหน่อยว่าอะไรที่หนูทำได้แล้วบ้าง จะได้ข้ามส่วนที่รู้แล้ว ตอบเท่าที่คิดได้เลย',
      A: 'ส่วน A: ช่องว่างคือคำตอบ — ในกล่อง 10 ช่อง ช่องที่ยังว่างบอกคำตอบได้ ลองดูสิ',
      B: 'ส่วน B: เติมให้เต็มสิบ — ทำให้กล่องเต็ม 10 ก่อน แล้วค่อยบวกที่เหลือ ลองเล่นดู',
      challenge:
        'ปริศนา: ใบไหนไม่มีคู่ — การ์ดเลข 1 ถึง 9 จับคู่ให้บวกกันได้ 10 ให้ได้มากที่สุด แล้วดูว่าใบไหนเหลือ',
    },
    sittingIntro: { button: 'ไปเลย' },
    questions: {
      a1: 'เติมอีกกี่ช่องถึงจะเต็ม',
      b1Gap: 'กล่องขาดอีกกี่ช่องถึงเต็ม',
      b1Rest: 'เหลือในกองกี่จุด',
      b1Total: '10 กับ {rest} ได้เท่าไร',
      mindView: 'ในหัวเห็นอะไร',
    },
    fieldLabels: { gap: 'ขาด', rest: 'เหลือ', total: 'ผลรวม' },
    feedback: {
      correctGap: 'ใช่ ช่องว่าง {x} ช่อง {n} กับ {x} ได้ 10',
      correctMake:
        '{a} ขาด {gap} ก็เอา {gap} จาก {b} มาเติม เหลือ {rest} 10 กับ {rest} ได้ {total}',
      l1: 'นั่นคือจุดที่มีอยู่ ลองดูช่องที่ยังว่าง',
      m5Gap: 'ลองดูทีละแถว แถวบนเต็ม 5 แล้ว แถวล่างมีอีกกี่ช่อง',
      m4: 'หาช่องที่ยังว่าง ไม่ใช่เอาตัวเลขมารวมกัน ลองดูช่องว่างในกล่อง', // P4
      mxA: 'ลองดูช่องที่ยังว่างในกล่อง', // P5
      mxB: 'ลองดูทีละขั้น ขาดเท่าไร เหลือเท่าไร แล้วรวมกับ 10', // P5
      m5Make: 'ลองนับจุดที่เหลือในกองทีละกลุ่มอีกที', // P6
      m7: 'ในกองยังมี {pile} จุดหรือเปล่า ตอนนี้ย้ายไป {gap} แล้ว เหลือกี่จุด',
      m6: 'นั่นคือส่วนที่เหลือ อย่าลืมกล่องที่เต็ม 10 แล้ว',
      a3Wrong: 'ลองนึกกล่อง 10 ช่องที่มี {n} จุด',
      fingers: 'นิ้วช่วยได้นะ ลองนึกภาพกล่อง 10 ช่องดูสิ ช่องว่างอยู่ตรงไหน',
      reveal: 'มาดูด้วยกันนะ', // P7
    },
    rules: {
      A: 'ช่องที่เต็ม + ช่องที่ว่าง = 10 เสมอ ดูช่องว่างก็รู้คำตอบ',
      B2: 'เริ่มจากตัวที่ใกล้ 10 กว่า จะย้ายน้อยกว่า',
      B: 'ขาดเท่าไรถึงสิบ เอามาจากอีกตัว เหลือเท่าไรก็บวกกับสิบ',
    },
    tellParent: 'เล่าให้พ่อฟัง 1 ข้อ ว่าทำยังไง (ไม่ใช้จอ)',
    compare: {
      startLabel: 'เริ่มจาก {n}', // P9
      movedCount: 'ย้ายไป {k} จุด',
      result: 'เหลือ {r} 10 กับ {r} ได้ {t}',
    },
    handover: 'วันนี้พอแค่นี้ ส่งเครื่องให้พ่อได้เลย', // P8
    parentNote: {
      title: 'บันทึกสำหรับพ่อ',
      fingers: 'ใช้นิ้ว',
      mouth: 'ขยับปากนับ',
      options: { none: 'ไม่ใช้', some: 'บางข้อ', most: 'เกือบทุกข้อ' },
      note: 'โน้ต (ไม่บังคับ)',
      save: 'บันทึก',
      skip: 'ข้าม',
    },
    roundEnd: { faster: 'วันนี้เร็วกว่าครั้งก่อน {k} ข้อ', done: 'วันนี้ทำครบ {n} ข้อ' }, // LS §6.3
    challenge: {
      tryButton: 'ลองเลย',
      laterButton: 'ไว้ก่อน',
      hintButton: 'ขอคำใบ้',
      restartButton: 'เริ่มใหม่',
      question: 'ใบไหนที่เหลืออยู่ แล้วทำไม',
      tellButton: 'เล่าให้พ่อฟังว่าทำไม',
      revealButton: 'ดูเฉลย',
    },
    card: {
      sitting: 'ครั้งที่ {n}',
      done: 'ทำครบแล้ว',
      review: 'ทบทวนวันนี้',
      drill: 'ท่องซ้ำ 2 นาที',
    }, // P12
    stop: {
      title: 'หยุดบทเรียนนี้?',
      body: 'ส่วนที่ยังไม่จบจะเริ่มใหม่ทั้งส่วนเมื่อกลับมา',
      confirmLabel: 'หยุด',
      cancelLabel: 'ทำต่อ',
      skipBlockLabel: 'ข้ามส่วนนี้',
    },
  },
  parentGuide: {
    materials: {
      title: 'ของจริงที่พ่อควรเตรียม',
      items: [
        'ถาดไข่ 10 ช่อง (ตัดจากถาด 12 หรือวาดตาราง 2×5)',
        'เหรียญหรือเลโก้ 15 ชิ้น แบ่ง 2 สี',
        'การ์ดเลข 1–9 อย่างละใบ (สำหรับปริศนา)',
      ],
    },
    numberTalks: {
      title: 'คุยกัน (Number Talks)',
      problems: 'โจทย์ที่ 1: 8 + 5 · โจทย์ที่ 2: 9 + 6 (ถ้าเหลือเวลา 7 + 4)',
      openingQuestions: ['หนูคิดยังไง', 'ในหัวเห็นอะไร', 'มีวิธีอื่นไหม', 'นิ้วช่วยตอนไหน'],
      thoughts: [
        {
          thought: '"8 ขาด 2 เอา 2 จาก 5 เหลือ 3 เป็น 13"',
          response: 'วาด number bond 5 → 2 + 3 และกล่อง 10 ช่องให้ดู',
        },
        {
          thought: '"นับต่อจาก 8: 9, 10, 11, 12, 13"',
          response: 'ไม่ต้องห้าม ถามว่า "ตอนไหนที่หนูหยุดที่ 10" แล้วชี้ว่าตรงนั้นคือกล่องเต็ม',
        },
        {
          thought: 'ใช้นิ้วแล้วแยก 5 เป็น 2 กับ 3',
          response: 'วิธีนี้เป็น make-ten ที่ใช้นิ้วช่วย ให้ชม',
        },
        { thought: '"จำได้เลย"', response: 'ถามว่า "ถ้าเป็น 8 + 7 ล่ะ"' },
      ],
      avoid: [
        '"ง่ายนิดเดียว"',
        '"เก่งมาก" (ชมที่วิธีคิด เช่น "เอาจากกองมาเติมกล่องให้เต็มก่อน ฉลาดดี")',
        '"ห้ามนับนิ้ว"',
        '"เร็วๆ หน่อย"',
      ],
    },
    challengeExtension: {
      question: 'ถ้ามีการ์ด 1–10 ล่ะ',
      answer: 'จับคู่ได้ 4 คู่เหมือนเดิม เหลือ 5 และ 10 เพราะ 10 ต้องคู่กับ 0 ซึ่งไม่มีการ์ด',
    },
    instructions: {
      talkA: 'ให้พ่อทำ Number Talks ด้วยถาดไข่จริง',
      trayB1: 'ให้พ่อกลับไปทำ B1 ด้วยของจริง (ถาดไข่) ก่อน',
      stalledA: 'ส่วน A ยังไม่ผ่านซ้ำ ให้พ่อแจ้ง Designer และตัดสินใจว่าจะให้เล่นส่วน B ต่อไหม',
      stalledB: 'ส่วน B ยังไม่ผ่าน ให้พ่อแจ้ง Designer และกดเริ่มส่วน B ใหม่ที่หน้าพ่อเมื่อพร้อม',
      done: 'ทำแล้ว',
      restartB: 'เริ่มส่วน B ใหม่',
    },
  },
};
