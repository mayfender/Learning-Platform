// Type กลางของเนื้อหาและ event (overview §4) — M0 ยังไม่มีเนื้อหาจริง มีไว้ให้ store และ content อ้างอิง

export type SkillId = `${'add' | 'sub' | 'mul' | 'div'}.${string}`;

// เฉลยต้องคำนวณได้จากโจทย์ (ADR-0004)
export type Problem =
  | { kind: 'arith'; op: '+' | '-' | '×' | '÷'; a: number; b: number }
  | { kind: 'missing-part'; whole: number; part: number }
  | { kind: 'subitize'; count: number; visual: 'ten-frame' | 'abacus' };

export interface Learner {
  id: string;
  nickname: string;
  createdAt: string;
}

export interface EventBase {
  id: string;
  at: string;
  schemaVersion: 1;
  learnerId: string;
  sessionId: string;
  activityId: string;
}

export type AppEvent = EventBase &
  (
    | { type: 'session.started' }
    | {
        type: 'item.answered';
        itemId: string;
        skillId: SkillId;
        problem: Problem;
        response: number;
        correct: boolean;
        misconceptionId?: string;
        latencyMs: number;
        attemptNo: number;
      }
    | { type: 'strategy.reported'; itemId: string; strategyId: string }
    | { type: 'session.completed'; summary?: unknown }
    | { type: 'session.abandoned' }
  );
