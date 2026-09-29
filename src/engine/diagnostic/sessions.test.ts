import { describe, expect, it } from 'vitest';
import { groupSessions } from '@/engine/diagnostic/sessions';
import type { AppEvent } from '@/engine/types';

function started(id: string, sessionId: string, at: string): AppEvent {
  return {
    id,
    at,
    schemaVersion: 1,
    learnerId: 'l1',
    sessionId,
    activityId: 'DX-ADD',
    type: 'session.started',
    activityKind: 'diagnostic',
    activityVersion: 'DX-ADD v2',
  };
}

function completed(id: string, sessionId: string, at: string): AppEvent {
  return {
    id,
    at,
    schemaVersion: 1,
    learnerId: 'l1',
    sessionId,
    activityId: 'DX-ADD',
    type: 'session.completed',
    activityVersion: 'DX-ADD v2',
    summary: {
      kind: 'diagnostic',
      completion: 'complete',
      stages: [],
      groups: [],
      skippedStageIds: [],
      misconceptions: [],
      recommendation: { kind: 'incomplete' },
    },
  };
}

function abandoned(id: string, sessionId: string, at: string): AppEvent {
  return {
    id,
    at,
    schemaVersion: 1,
    learnerId: 'l1',
    sessionId,
    activityId: 'DX-ADD',
    type: 'session.abandoned',
    activityVersion: 'DX-ADD v2',
    summary: {
      kind: 'diagnostic',
      completion: 'partial',
      stages: [],
      groups: [],
      skippedStageIds: [],
      misconceptions: [],
      recommendation: { kind: 'incomplete' },
    },
  };
}

describe('groupSessions', () => {
  it('จัดกลุ่มตาม sessionId และเรียงใหม่→เก่า', () => {
    const events: AppEvent[] = [
      started('e1', 's1', '2026-01-01T00:00:00.000Z'),
      completed('e2', 's1', '2026-01-01T00:05:00.000Z'),
      started('e3', 's2', '2026-01-02T00:00:00.000Z'),
    ];
    const sessions = groupSessions(events);
    expect(sessions.map((s) => s.sessionId)).toEqual(['s2', 's1']);
  });

  it('status complete', () => {
    const events: AppEvent[] = [
      started('e1', 's1', '2026-01-01T00:00:00.000Z'),
      completed('e2', 's1', '2026-01-01T00:05:00.000Z'),
    ];
    const [session] = groupSessions(events);
    expect(session!.status).toBe('complete');
    expect(session!.summary?.completion).toBe('complete');
  });

  it('status abandoned', () => {
    const events: AppEvent[] = [
      started('e1', 's1', '2026-01-01T00:00:00.000Z'),
      abandoned('e2', 's1', '2026-01-01T00:05:00.000Z'),
    ];
    const [session] = groupSessions(events);
    expect(session!.status).toBe('abandoned');
  });

  it('status open (ไม่มี event จบ)', () => {
    const events: AppEvent[] = [started('e1', 's1', '2026-01-01T00:00:00.000Z')];
    const [session] = groupSessions(events);
    expect(session!.status).toBe('open');
    expect(session!.endedAt).toBeUndefined();
  });
});
