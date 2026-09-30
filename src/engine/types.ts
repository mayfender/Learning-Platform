// Type กลางของเนื้อหาและ event (overview §4, Tech Spec DX-ADD §4.1, §6)

export type SkillId = `${'add' | 'sub' | 'mul' | 'div'}.${string}`;

// เฉลยต้องคำนวณได้จากโจทย์ (ADR-0004)
export type Problem =
  | { kind: 'arith'; op: '+' | '-' | '×' | '÷'; a: number; b: number }
  | { kind: 'missing-part'; whole: number; part: number } // part + ? = whole
  | { kind: 'subitize'; count: number; visual: 'ten-frame' | 'abacus' };

export interface Learner {
  id: string;
  nickname: string;
  createdAt: string;
}

export interface Misconception {
  id: string;
  description: string;
  observedBy: string;
}

export type ExampleCheck =
  | { kind: 'sums-equal'; groups: readonly (readonly number[])[] }
  | { kind: 'count-on'; start: number; count: number }
  | { kind: 'jumps'; start: number; steps: readonly number[] };

export type StrategyId =
  | 'count-fingers'
  | 'count-on'
  | 'make-ten'
  | 'doubles'
  | 'known'
  | 'count-by-one'
  | 'column'
  | 'split-place'
  | 'jump-tens'
  | 'round'
  | 'unsure';

export interface StrategyOption {
  id: StrategyId;
  label: string;
  example?: { text: string; check?: ExampleCheck };
  counting: 'yes' | 'no' | 'ignore';
}

export interface StrategySet {
  id: string;
  options: readonly StrategyOption[];
}

export interface WrongAnswerRule {
  response: number;
  misconceptionId: string;
  byStrategy?: Partial<Record<StrategyId, string>>;
}

export interface FlashVisual {
  type: 'ten-frame';
  mode: 'flash';
  readyMs: number;
  flashMs: number;
  colorMode: 'single' | 'split-5';
}

export interface Choice {
  value: number;
  misconceptionId?: string;
}

export interface Item {
  id: string;
  skillId: SkillId;
  problem: Problem;
  expected: number;
  input: 'keypad' | 'choices';
  choices?: readonly Choice[];
  visual?: FlashVisual;
  fluentMs?: number;
  strategySetId?: string;
}

export interface DiagnosticItem extends Item {
  input: 'keypad';
  ladderSteps: readonly number[];
  wrongAnswers: readonly WrongAnswerRule[];
}

export interface StageLevelCriteria {
  good: { minCorrect: number; minFluent?: number; maxCounting?: number };
  mid: { minCorrect: number };
}

export interface StageGroup {
  id: string;
  itemIds: readonly string[];
  forbidStrategies: readonly StrategyId[];
}

export interface DiagnosticStage {
  id: string;
  number: number;
  title: string;
  intro: string;
  instruction: string;
  items: readonly DiagnosticItem[];
  level?: StageLevelCriteria;
  groups?: readonly StageGroup[];
  skipIf?: { stageId: string; correctAtMost: number };
}

export type RecommendationCondition =
  | { kind: 'stage-not-good'; stageId: string }
  | { kind: 'group-not-pass'; groupId: string; orStageSkipped?: string }
  | { kind: 'item-strategy-not'; itemId: string; strategyId: StrategyId }
  | { kind: 'always' };

export interface RecommendationRule {
  no: number;
  when: RecommendationCondition;
  ladderStep: number;
  reason: string;
}

export interface LadderStepInfo {
  step: number;
  name: string;
}

export interface NumberTalk {
  ladderStep: number;
  prompt: string;
  questions: readonly string[];
}

export interface DiagnosticTexts {
  parentIntro: {
    title: string;
    description: string;
    bullets: readonly { strong?: string; text: string }[];
    button: string;
  };
  kidIntro: {
    title: string;
    lines: readonly [string, string];
    button: string;
  };
  stageGo: string;
  flash: { ready: string; show: string; hidden: string };
  answerPlaceholder: string;
  submit: string;
  acks: readonly string[];
  strategyQuestion: string;
  stageComplete: string; // มี {n} และ {m}
  kidEnd: { title: string; text: string; button: string };
  results: {
    recommend: string; // มี {n} และ {name}
    parentNote: string;
    incomplete: string;
    levels: { good: string; mid: string; low: string; skipped: string };
    ladderPassed: string;
    ladderStart: string;
    noMisconception: string;
    retry: string;
    stageStatusIncomplete: string;
    stageStatusNotReached: string;
    groupPass: string;
    groupFail: string;
    groupSkipped: string;
    groupNotEvaluated: string;
    inProgressBadge: string;
    fluentYes: string;
    fluentNo: string;
    fluentDash: string;
    correct: string;
    wrongWithExpected: string; // มี {expected}
    timeFootnote: string;
    foundInItems: string; // มี {itemIds}
  };
  stop: {
    title: string;
    body: string;
    confirmLabel: string;
    cancelLabel: string;
  };
}

// หน้าตัวอย่างและข้อลองเองก่อนข้อแรก (ไม่บันทึก event ไม่นับในผล) — Lesson Spec §8.2.1
export interface DiagnosticExample {
  demo: { count: number; acceptOnly: number };
  try: { count: number; readyMs: number; flashMs: number; revealMs: number };
  texts: { demo: string; try: string; reveal: string };
}

export interface Diagnostic {
  kind: 'diagnostic';
  id: string;
  version: string;
  title: string;
  ladder: readonly LadderStepInfo[];
  misconceptions: readonly Misconception[];
  strategySets: readonly StrategySet[];
  timing: { ackMs: number };
  example?: DiagnosticExample;
  stages: readonly DiagnosticStage[];
  recommendation: readonly RecommendationRule[];
  texts: DiagnosticTexts;
  numberTalks: { items: readonly NumberTalk[]; rules: readonly string[] };
}

// --- Event log ---

export interface EventBase {
  id: string;
  at: string;
  schemaVersion: 1;
  learnerId: string;
  sessionId: string;
  activityId: string;
}

export interface ItemAnsweredEvent {
  type: 'item.answered';
  itemId: string;
  stageId?: string;
  ladderSteps?: number[];
  skillId: SkillId;
  problem: Problem;
  expected: number;
  response: number;
  correct: boolean;
  misconceptionId?: string;
  latencyMs: number;
  latencyValid: boolean;
  fluentMs?: number;
  fluent: boolean | null;
  strategySetId?: string;
  strategyId?: StrategyId;
  flashInterrupted?: boolean;
  // เวลาที่ลูกกด "ตอบ" (ISO) — `at` คือเวลาบันทึก event (ADR-0008) ข้อที่ถามวิธีคิดจึงช้ากว่าเวลาตอบ
  answeredAt?: string;
  // เวลาตั้งแต่หน้าเลือกวิธีคิดแสดงจนแตะเลือก (ms) เฉพาะข้อที่ถามวิธีคิด ไม่ใส่ถ้าแท็บถูกซ่อน
  strategyLatencyMs?: number;
  attemptNo: number;
}

export interface StageSummary {
  stageId: string;
  number: number;
  status: 'skipped' | 'done' | 'incomplete' | 'not-reached';
  answered: number;
  correct: number;
  fluentCount: number | null;
  countingCount: number | null;
  meanLatencyMs: number | null;
  level: 'good' | 'mid' | 'low' | 'skipped' | null;
}

export type GroupStatus = 'pass' | 'fail' | 'skipped' | 'not-evaluated';

export interface GroupSummary {
  groupId: string;
  status: GroupStatus;
}

export type Recommendation =
  { kind: 'step'; ladderStep: number; ruleNo: number } | { kind: 'incomplete' };

export interface DiagnosticSummary {
  kind: 'diagnostic';
  completion: 'complete' | 'partial';
  stages: StageSummary[];
  groups: GroupSummary[];
  skippedStageIds: string[];
  misconceptions: { id: string; itemIds: string[] }[];
  recommendation: Recommendation;
}

export type SessionSummary = DiagnosticSummary;

export type AppEvent = EventBase &
  (
    | { type: 'session.started'; activityKind: 'diagnostic' | 'lesson'; activityVersion: string }
    | ItemAnsweredEvent
    | { type: 'strategy.reported'; itemId: string; strategyId: StrategyId }
    | { type: 'session.completed'; activityVersion: string; summary: SessionSummary }
    | { type: 'session.abandoned'; activityVersion: string; summary: SessionSummary }
  );
