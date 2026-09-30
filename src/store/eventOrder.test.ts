import { describe, expect, it } from 'vitest';
import type { AppEvent } from '@/engine/types';
import { compareEvents } from '@/store/eventOrder';

const base = {
  schemaVersion: 1 as const,
  learnerId: 'l1',
  sessionId: 's1',
  activityId: 'DX-ADD',
};
const summary = {
  kind: 'diagnostic' as const,
  completion: 'complete' as const,
  stages: [],
  groups: [],
  skippedStageIds: [],
  misconceptions: [],
  recommendation: { kind: 'incomplete' as const },
};

function ev(type: AppEvent['type'], id: string, at: string): AppEvent {
  switch (type) {
    case 'session.started':
      return { ...base, id, at, type, activityKind: 'diagnostic', activityVersion: 'v' };
    case 'item.answered':
      return {
        ...base,
        id,
        at,
        type,
        itemId: '5.4',
        skillId: 'add.x',
        problem: { kind: 'arith', op: '+', a: 1, b: 1 },
        expected: 2,
        response: 2,
        correct: true,
        latencyMs: 1,
        latencyValid: true,
        fluent: null,
        attemptNo: 1,
      };
    case 'strategy.reported':
      return { ...base, id, at, type, itemId: '5.4', strategyId: 'known' };
    case 'block.started':
      return { ...base, id, at, type, blockId: 'b1', blockKind: 'A' };
    case 'block.completed':
      return { ...base, id, at, type, blockId: 'b1', blockKind: 'A', outcome: 'passed' };
    case 'parent.noted':
      return { ...base, id, at, type, blockKind: 'A', fingers: 'some' };
    case 'session.completed':
    case 'session.abandoned':
      return { ...base, id, at, type, activityVersion: 'v', summary };
  }
}

const T = '2026-01-01T00:00:00.000Z';

describe('compareEvents', () => {
  it('at เท่ากัน: item.answered ก่อน session.completed/abandoned ทุกลำดับของ id (200 ชุด)', () => {
    for (let n = 0; n < 200; n += 1) {
      const idA = Math.random().toString(36).slice(2);
      const idB = Math.random().toString(36).slice(2);
      for (const end of ['session.completed', 'session.abandoned'] as const) {
        const sorted = [ev(end, idA, T), ev('item.answered', idB, T)].sort(compareEvents);
        expect(sorted.map((e) => e.type)).toEqual(['item.answered', end]);
      }
    }
  });

  it('at ต่างกัน เรียงตาม at แม้ชนิดสวนทาง', () => {
    const sorted = [
      ev('session.completed', 'a', '2026-01-01T00:00:01.000Z'),
      ev('item.answered', 'b', '2026-01-01T00:00:02.000Z'),
    ].sort(compareEvents);
    expect(sorted.map((e) => e.type)).toEqual(['session.completed', 'item.answered']);
  });

  it('ลำดับชนิดเมื่อ at เท่ากัน: started < answered = reported < completed = abandoned', () => {
    const sorted = [
      ev('session.abandoned', 'a', T),
      ev('strategy.reported', 'd', T),
      ev('session.started', 'z', T),
      ev('item.answered', 'c', T),
    ].sort(compareEvents);
    expect(sorted.map((e) => e.type)).toEqual([
      'session.started',
      'item.answered',
      'strategy.reported',
      'session.abandoned',
    ]);
  });

  it('ชนิดเดียวกัน at เท่ากัน เรียงตาม id', () => {
    const sorted = [ev('item.answered', 'b', T), ev('item.answered', 'a', T)].sort(compareEvents);
    expect(sorted.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('ชนิดใหม่ของ ADD-04 (ADR-0008): started < block.started < answered < block.completed = parent.noted < completed', () => {
    const sorted = [
      ev('session.completed', 'a', T),
      ev('parent.noted', 'z', T),
      ev('block.completed', 'c', T),
      ev('item.answered', 'd', T),
      ev('block.started', 'e', T),
      ev('session.started', 'f', T),
    ].sort(compareEvents);
    expect(sorted.map((e) => e.type)).toEqual([
      'session.started',
      'block.started',
      'item.answered',
      'block.completed',
      'parent.noted',
      'session.completed',
    ]);
  });

  it('parent.noted และ block.completed ที่ at เท่ากันเรียงตาม id', () => {
    const sorted = [ev('parent.noted', 'b', T), ev('block.completed', 'a', T)].sort(compareEvents);
    expect(sorted.map((e) => e.id)).toEqual(['a', 'b']);
  });
});
