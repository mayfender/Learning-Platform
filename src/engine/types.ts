// Type กลางของเนื้อหาและ event (overview §4, Tech Spec DX-ADD §4.1, §6)

export type SkillId = `${'add' | 'sub' | 'mul' | 'div'}.${string}`;

// เฉลยต้องคำนวณได้จากโจทย์ (ADR-0004)
export type Problem =
  | { kind: 'arith'; op: '+' | '-' | '×' | '÷'; a: number; b: number }
  // part + ? = whole; missing: ด้านที่หาย (ค่าเดิม = 'second' คือ `part + ? = whole`, 'first' คือ `? + part = whole`)
  | { kind: 'missing-part'; whole: number; part: number; missing?: 'first' | 'second' }
  | { kind: 'subitize'; count: number; visual: 'ten-frame' | 'abacus' };

// ระบบทบทวน Leitner (ADR-0006) — ค่าอยู่ใน content/skills.ts
export interface ReviewConfig {
  intervalsDays: readonly number[]; // [1, 2, 4, 7, 14] กล่อง 1..5
  boxLevels: readonly ('noCount' | 'automatic')[];
  round: { count: number; minFluent: number };
  resetOn: readonly string[];
}

export interface Skill {
  id: SkillId;
  ladderStep: number;
  title: string;
  fluency?: { noCountMs: number; automaticMs: number }; // LS ADD-04 §6.1
  review?: ReviewConfig;
}

export type BlockKind = 'check' | 'A' | 'B' | 'practice' | 'review' | 'drill' | 'challenge';

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
  | 'see-box'
  | 'see-number'
  | 'count-in-head'
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
  // --- เพิ่มโดย ADD-04 (ADR-0008: field เสริม ไม่ bump schemaVersion) ---
  blockId?: string;
  section?: string; // 'c' 'A1' 'A2' 'A3' 'B1' 'B2' 'B3' 'B4' 'practice' 'review' 'drill'
  mode?: 'see' | 'fade' | 'mind';
  stepId?: 'gap' | 'rest' | 'total' | 'q1' | 'q2';
  subAnswers?: SubAnswer[];
  revealed?: boolean;
  manip?: { taps?: number; drops?: number; rejected?: number };
}

export interface SubAnswer {
  stepId: 'gap' | 'rest';
  response: number;
  expected: number;
  correct: boolean;
  misconceptionId?: string;
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

export interface LessonSummary {
  kind: 'lesson';
  sitting: number;
  blocks: { kind: BlockKind; outcome: string; round?: number }[];
  flags: string[];
}

export type SessionSummary = DiagnosticSummary | LessonSummary;

export type BlockOutcome = 'passed' | 'passed-trend' | 'not-passed' | 'skipped' | 'done';
export type BlockSkipReason = 'check' | 'manual';
export type LessonFlag = 'talk-A' | 'tray-B1' | 'stalled-A' | 'stalled-B';
export type NoteFrequency = 'none' | 'some' | 'most';

export interface BlockMetrics {
  total: number;
  correct: number;
  fastCount: number;
  meanLatencyMs: number | null;
  misconceptions: { id: string; itemIds: string[] }[];
}

export type AppEvent = EventBase &
  (
    | {
        type: 'session.started';
        activityKind: 'diagnostic' | 'lesson';
        activityVersion: string;
        sitting?: number;
      }
    | ItemAnsweredEvent
    | {
        type: 'block.started';
        blockId: string;
        blockKind: BlockKind;
        round?: number;
        seed?: number;
        skipped?: { itemIds: string[]; reason: BlockSkipReason };
        skillId?: SkillId;
      }
    | {
        type: 'block.completed';
        blockId: string;
        blockKind: BlockKind;
        round?: number;
        outcome: BlockOutcome;
        skipReason?: BlockSkipReason;
        metrics?: BlockMetrics;
        level?: 'noCount' | 'automatic' | 'none';
        flags?: LessonFlag[];
        detail?: Record<string, number | string | boolean>;
        skillId?: SkillId;
      }
    | {
        type: 'parent.noted';
        blockKind?: 'A' | 'B';
        fingers?: NoteFrequency;
        mouth?: NoteFrequency;
        note?: string;
        resolvedFlag?: string;
      }
    | { type: 'strategy.reported'; itemId: string; strategyId: StrategyId }
    | { type: 'session.completed'; activityVersion: string; summary: SessionSummary }
    | { type: 'session.abandoned'; activityVersion: string; summary: SessionSummary }
  );

// event ที่ยังไม่มี envelope (id/at/schemaVersion/learnerId/sessionId/activityId) — machine ส่งออกเป็น effect
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
export type EventPayload = DistributiveOmit<
  AppEvent,
  'id' | 'at' | 'schemaVersion' | 'learnerId' | 'sessionId' | 'activityId'
>;
