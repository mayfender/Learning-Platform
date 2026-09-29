import type { Problem, SkillId, StrategyId } from '@/engine/types';

// บันทึกข้อที่ตอบเสร็จแล้ว (ยังไม่ผ่าน envelope ของ event) ใช้ภายใน engine/diagnostic เท่านั้น
export interface AnswerRecord {
  itemId: string;
  stageId: string;
  ladderSteps: readonly number[];
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
}
