import { describe, expect, it } from 'vitest';
import { answerTime } from '@/engine/answerTime';
import type { AppEvent } from '@/engine/types';

type Answered = Extract<AppEvent, { type: 'item.answered' }>;

const base: Answered = {
  id: 'e',
  at: '2026-01-01T00:00:05.000Z',
  schemaVersion: 1,
  learnerId: 'l',
  sessionId: 's',
  activityId: 'DX-ADD',
  type: 'item.answered',
  itemId: '4.1',
  skillId: 'add.x',
  problem: { kind: 'arith', op: '+', a: 8, b: 5 },
  expected: 13,
  response: 13,
  correct: true,
  latencyMs: 1000,
  latencyValid: true,
  fluent: null,
  attemptNo: 1,
};

describe('answerTime', () => {
  it('มี answeredAt ใช้ answeredAt', () => {
    expect(answerTime({ ...base, answeredAt: '2026-01-01T00:00:01.000Z' })).toBe(
      '2026-01-01T00:00:01.000Z',
    );
  });
  it('ไม่มี answeredAt (event เก่า) ใช้ at', () => {
    expect(answerTime(base)).toBe(base.at);
  });
});
