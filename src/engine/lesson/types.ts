import type { BlockKind, Misconception, Problem, SkillId, StrategySet } from '@/engine/types';

export type { BlockKind };

// --- ข้อของบทเรียน (Tech Spec ADD-04 §4.1) ---

export type ItemFlow =
  | 'silent-flash-gap' // check c1–c3, practice/review แฟลช
  | 'silent-text' // check c4–c6, practice/review, drill
  | 'guided-fill' // A1
  | 'teach-flash-gap' // A2
  | 'mind-gap' // A3
  | 'guided-move' // B1
  | 'teach-flash-make' // B3
  | 'mind-make'; // B4

export type ItemField = 'gap' | 'rest' | 'total';

export interface LessonItem {
  id: string; // 'c1' 'A1.1' 'A2.3' 'B3.2' ... ข้อที่ generator สร้าง: 'practice.1' 'A2.r1.3'
  section: string; // 'c' 'A1' 'A2' 'A3' 'B1' 'B2' 'B3' 'B4' 'practice' 'review' 'drill'
  flow: ItemFlow;
  skillId: SkillId;
  problem: Problem; // missing-part (กล่อง/ว่าง) หรือ arith (บวกข้ามสิบ)
  expected: number; // ตรง LS; เทสต์เทียบกับ solve(problem)
  mode: 'see' | 'fade' | 'mind'; // LS §10 โหมดภาพ
  fields?: readonly ItemField[]; // B3: ข้อ 1–3 = ['gap','rest','total'], ข้อ 4–6 = ['total']
}

export interface MakeTenPlan {
  boxDots: number; // max(a, b)
  pileDots: number; // min(a, b)
  gap: number; // 10 − boxDots
  rest: number; // pileDots − gap
  total: number; // a + b
}

// --- เนื้อหา ---

export interface LessonTexts {
  go: string;
  next: string;
  submit: string;
  answerPlaceholder: string;
  skip: string; // P15
  acks: readonly string[];
  flash: { ready: string; show: string; hiddenGap: string; hiddenMake: string };
  intros: { check: string; A: string; B: string; challenge: string };
  sittingIntro: { button: string };
  questions: {
    a1: string;
    b1Gap: string;
    b1Rest: string;
    b1Total: string; // มี {rest}
    mindView: string;
  };
  fieldLabels: { gap: string; rest: string; total: string };
  feedback: {
    correctGap: string; // {n} {x}
    correctMake: string; // {a} {b} {gap} {rest} {total}
    l1: string;
    m5Gap: string;
    m4: string;
    mxA: string;
    mxB: string;
    m5Make: string;
    m7: string; // {pile} {gap}
    m6: string;
    a3Wrong: string; // {n}
    fingers: string;
    reveal: string;
  };
  // A: ท้ายส่วน A · B2: ท้ายหน้าเปรียบเทียบ B2 · B: ท้ายส่วน B (LS §4 มีข้อสรุปกฎ B 2 ข้อ)
  rules: { A: string; B2: string; B: string };
  tellParent: string;
  compare: {
    startLabel: string; // 'เริ่มจาก {n}'
    movedCount: string; // 'ย้ายไป {k} จุด'
    result: string; // 'เหลือ {r} 10 กับ {r} ได้ {t}'
  };
  handover: string;
  parentNote: {
    title: string;
    fingers: string;
    mouth: string;
    options: { none: string; some: string; most: string };
    note: string;
    save: string;
    skip: string;
  };
  roundEnd: { faster: string; done: string };
  challenge: {
    tryButton: string;
    laterButton: string;
    hintButton: string;
    restartButton: string;
    question: string;
    tellButton: string;
    revealButton: string;
  };
  card: { sitting: string; done: string; review: string; drill: string };
  stop: {
    title: string;
    body: string;
    confirmLabel: string;
    cancelLabel: string;
    skipBlockLabel: string;
  };
}

export interface ChoiceQuestion {
  id: 'q1' | 'q2';
  text: string;
  options: readonly { value: number; label: string }[];
  expected: number;
}

export interface BlockPassCriteria {
  minCorrect: number;
  minFast: number;
}

export interface LessonBlockA {
  a1: readonly LessonItem[];
  a2: readonly LessonItem[];
  a3: readonly LessonItem[];
  pass: BlockPassCriteria;
  onFail: { a2RetryRounds: number }; // ทำ A2 ซ้ำกี่รอบ (LS §9: 1)
}

export interface LessonBlockB {
  b1: readonly LessonItem[];
  compare: {
    problem: { a: number; b: number };
    boards: readonly [{ boxDots: number; pileDots: number }, { boxDots: number; pileDots: number }];
    questions: readonly [ChoiceQuestion, ChoiceQuestion];
  };
  b3: readonly LessonItem[];
  b4: readonly LessonItem[];
  pass: BlockPassCriteria;
  trend: {
    compareItemIds: readonly string[]; // B3 ข้อ 4–6
    maxRatio: number; // 0.8 = ลดลง ≥ 20%
    forbidMisconceptions: readonly string[];
  };
  trayFlag: { misconceptions: readonly string[]; minCount: number };
  onFail: { maxRetryRounds: number };
}

export interface ChallengeContent {
  cards: readonly number[];
  target: number;
  hints: readonly [string, string, string];
  answer: {
    leftover: number;
    pairs: readonly (readonly [number, number])[];
    explanation: string;
  };
}

export interface Lesson {
  kind: 'lesson';
  id: string;
  version: string;
  title: string;
  ladderStep: number;
  skills: readonly SkillId[];
  timing: { ackMs: number; readyMs: number; flashMs: number; pileFlashMs: number };
  strategySets: readonly StrategySet[];
  misconceptions: readonly Misconception[];
  sittings: readonly { no: number; blocks: readonly BlockKind[] }[];
  check: {
    items: readonly LessonItem[];
    skip: {
      // ข้าม A1+A2 / B1+B2 เมื่อข้อเหล่านี้ถูกหมดและเร็วทุกข้อ (LS §3)
      A: { itemIds: readonly string[]; skillId: SkillId };
      B: { itemIds: readonly string[]; skillId: SkillId };
    };
  };
  blocks: { A: LessonBlockA; B: LessonBlockB };
  practice: {
    rounds: readonly {
      skillId: SkillId;
      generator: 'bonds-10' | 'make-ten';
      count: number;
    }[];
  };
  challenge: ChallengeContent;
  drill: {
    skillId: SkillId;
    minutes: number;
    unlock: { consecutiveRounds: number; minCorrect: number; minAutomatic: number };
  };
  texts: LessonTexts;
  parentGuide: LessonParentGuide;
}

export interface LessonParentGuide {
  materials: { title: string; items: readonly string[] };
  numberTalks: {
    title: string;
    problems: string;
    openingQuestions: readonly string[];
    openingNote: string; // LS §5: (ถามด้วยความอยากรู้ ไม่ใช่จับผิด)
    thoughts: readonly { thought: string; response: string }[];
    avoid: readonly string[];
  };
  challengeExtension: { question: string; answer: string };
  instructions: {
    talkA: string;
    trayB1: string;
    stalledA: string;
    stalledB: string;
    done: string; // ปุ่ม "ทำแล้ว"
    restartB: string; // ปุ่ม "เริ่มส่วน B ใหม่"
  };
}
