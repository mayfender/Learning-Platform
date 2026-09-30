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

describe('groupSessions: session ของบทเรียน', () => {
  it('session.completed ที่มี LessonSummary ไม่ถูกส่งเป็น summary ของแบบทดสอบวินิจฉัย', () => {
    const events: AppEvent[] = [
      {
        id: 'l1',
        at: '2026-01-01T00:00:00.000Z',
        schemaVersion: 1,
        learnerId: 'l1',
        sessionId: 'lesson1',
        activityId: 'ADD-04',
        type: 'session.started',
        activityKind: 'lesson',
        activityVersion: 'ADD-04 v1',
        sitting: 1,
      },
      {
        id: 'l2',
        at: '2026-01-01T00:10:00.000Z',
        schemaVersion: 1,
        learnerId: 'l1',
        sessionId: 'lesson1',
        activityId: 'ADD-04',
        type: 'session.completed',
        activityVersion: 'ADD-04 v1',
        summary: { kind: 'lesson', sitting: 1, blocks: [], flags: [] },
      },
    ];
    const [session] = groupSessions(events);
    expect(session!.status).toBe('complete');
    expect(session!.activityId).toBe('ADD-04');
    expect(session!.summary).toBeUndefined();
  });
});

describe('groupSessions: ข้อมูลเก่าที่ at ซ้ำ (บั๊กข้อ 5.4)', () => {
  function answered(id: string, itemId: string, at: string): AppEvent {
    return {
      id,
      at,
      schemaVersion: 1,
      learnerId: 'l1',
      sessionId: 's1',
      activityId: 'DX-ADD',
      type: 'item.answered',
      itemId,
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
  }

  it('ได้ items ครบ 20 ข้อ และ endedAt ไม่ก่อนข้อสุดท้าย (ส่ง event สลับลำดับ)', () => {
    const events: AppEvent[] = [started('s0', 's1', '2026-01-01T00:00:00.000Z')];
    for (let i = 1; i <= 19; i += 1) {
      const at = new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString();
      events.push(answered(`i${i}`, `q${i}`, at));
    }
    const last = '2026-01-01T00:00:30.000Z';
    // completed มาก่อน answered ในอาร์เรย์และ id ของ completed เรียงก่อน (เหมือนข้อมูลจริงที่พัง)
    events.push(completed('a-done', 's1', last), answered('z-last', 'q20', last));
    const [session] = groupSessions(events);
    expect(session!.items).toHaveLength(20);
    expect(session!.items.at(-1)!.itemId).toBe('q20');
    expect(session!.endedAt).toBe(last);
    expect(session!.status).toBe('complete');
  });
});
