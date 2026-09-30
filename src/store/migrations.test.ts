import { describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  InvalidEventError,
  isAppEvent,
  NewerSchemaError,
  migrateEvent,
  type Migration,
} from '@/store/migrations';

function validEvent(): Record<string, unknown> {
  return {
    id: 'e1',
    at: new Date().toISOString(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    learnerId: 'l1',
    sessionId: 's1',
    activityId: 'DX-ADD',
    type: 'session.started',
    activityKind: 'diagnostic',
    activityVersion: 'DX-ADD v2',
  };
}

describe('migrateEvent', () => {
  it('ผ่าน record ที่ตรง schema ปัจจุบันเลย', () => {
    const event = migrateEvent(validEvent());
    expect(event.type).toBe('session.started');
  });

  it('ไล่ migration จาก version เก่ากว่าไปจนถึงปัจจุบัน', () => {
    const raw = { ...validEvent(), schemaVersion: 0, legacyField: true };
    delete (raw as Record<string, unknown>).legacyField;
    const fakeMigration: Migration = (r) => {
      const next = { ...r };
      delete next.legacyField;
      return next;
    };
    const migrations: Record<number, Migration> = { 0: fakeMigration };
    const event = migrateEvent({ ...raw, schemaVersion: 0 }, migrations, 1);
    expect(event.schemaVersion).toBe(1);
  });

  it('ปฏิเสธ schemaVersion ใหม่กว่าที่รองรับ', () => {
    const raw = { ...validEvent(), schemaVersion: 99 };
    expect(() => migrateEvent(raw)).toThrow(NewerSchemaError);
  });

  it('ปฏิเสธ record ที่ผิดรูปแบบ', () => {
    const raw = { ...validEvent(), type: 'not-a-real-type' };
    expect(() => migrateEvent(raw)).toThrow(InvalidEventError);
  });

  it('ปฏิเสธ record ที่ไม่มี schemaVersion', () => {
    expect(() => migrateEvent({ foo: 'bar' })).toThrow(InvalidEventError);
  });
});

describe('isAppEvent: field ใหม่ของ item.answered (ADR-0008)', () => {
  const answered = (extra: Record<string, unknown> = {}) => ({
    ...validEvent(),
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
    ...extra,
  });

  it('รับ event เก่าที่ไม่มี answeredAt / strategyLatencyMs', () => {
    expect(isAppEvent(answered())).toBe(true);
  });

  it('รับ event ใหม่ที่มี 2 field', () => {
    expect(
      isAppEvent(answered({ answeredAt: '2026-01-01T00:00:00.000Z', strategyLatencyMs: 2300 })),
    ).toBe(true);
  });

  it('ปฏิเสธเมื่อชนิดผิด', () => {
    expect(isAppEvent(answered({ strategyLatencyMs: '5' }))).toBe(false);
    expect(isAppEvent(answered({ answeredAt: 123 }))).toBe(false);
  });
});

describe('isAppEvent: field และชนิดใหม่ของ ADD-04 (ADR-0008)', () => {
  const answered = (extra: Record<string, unknown> = {}) => ({
    ...validEvent(),
    type: 'item.answered',
    itemId: 'B3.1',
    skillId: 'add.make-10',
    problem: { kind: 'arith', op: '+', a: 8, b: 6 },
    expected: 14,
    response: 14,
    correct: true,
    latencyMs: 1000,
    latencyValid: true,
    fluent: null,
    attemptNo: 1,
    ...extra,
  });
  const ev = (type: string, extra: Record<string, unknown>) => ({
    ...validEvent(),
    type,
    ...extra,
  });

  it('รับ item.answered ที่มี field ใหม่ครบ และยังรับ event เก่า (ไม่มี field ใหม่)', () => {
    expect(isAppEvent(answered())).toBe(true);
    expect(
      isAppEvent(
        answered({
          blockId: 'b1',
          section: 'B3',
          mode: 'fade',
          stepId: 'total',
          subAnswers: [
            { stepId: 'gap', response: 2, expected: 2, correct: true },
            { stepId: 'rest', response: 6, expected: 4, correct: false, misconceptionId: 'M7' },
          ],
          revealed: true,
          manip: { taps: 2, drops: 1, rejected: 0 },
        }),
      ),
    ).toBe(true);
  });

  it.each([
    ['blockId ไม่ใช่ string', { blockId: 5 }],
    ['section ไม่ใช่ string', { section: 5 }],
    ['mode นอกชุด', { mode: 'zoom' }],
    ['stepId นอกชุด', { stepId: 'other' }],
    ['subAnswers ไม่ใช่ array', { subAnswers: 'x' }],
    [
      'subAnswers stepId ผิด',
      { subAnswers: [{ stepId: 'total', response: 1, expected: 1, correct: true }] },
    ],
    ['subAnswers ขาด field', { subAnswers: [{ stepId: 'gap', response: 1 }] }],
    ['revealed ไม่ใช่ boolean', { revealed: 'yes' }],
    ['manip ไม่ใช่ object', { manip: 3 }],
    ['manip.taps ไม่ใช่ number', { manip: { taps: 'a' } }],
  ])('ปฏิเสธ item.answered เมื่อ %s', (_name, extra) => {
    expect(isAppEvent(answered(extra))).toBe(false);
  });

  it('session.started: sitting เป็น number เท่านั้น', () => {
    expect(isAppEvent({ ...validEvent(), sitting: 2 })).toBe(true);
    expect(isAppEvent({ ...validEvent(), sitting: '2' })).toBe(false);
  });

  it('block.started', () => {
    expect(isAppEvent(ev('block.started', { blockId: 'b', blockKind: 'A' }))).toBe(true);
    expect(
      isAppEvent(
        ev('block.started', {
          blockId: 'b',
          blockKind: 'practice',
          round: 1,
          seed: 42,
          skillId: 'add.bonds-10',
          skipped: { itemIds: ['A1.1'], reason: 'check' },
        }),
      ),
    ).toBe(true);
    expect(isAppEvent(ev('block.started', { blockKind: 'A' }))).toBe(false);
    expect(isAppEvent(ev('block.started', { blockId: 'b', blockKind: 'Z' }))).toBe(false);
    expect(isAppEvent(ev('block.started', { blockId: 'b', blockKind: 'A', round: 'x' }))).toBe(
      false,
    );
    expect(
      isAppEvent(
        ev('block.started', {
          blockId: 'b',
          blockKind: 'A',
          skipped: { itemIds: [], reason: 'x' },
        }),
      ),
    ).toBe(false);
  });

  it('block.completed', () => {
    expect(
      isAppEvent(ev('block.completed', { blockId: 'b', blockKind: 'A', outcome: 'passed' })),
    ).toBe(true);
    expect(
      isAppEvent(
        ev('block.completed', {
          blockId: 'b',
          blockKind: 'B',
          outcome: 'passed-trend',
          round: 1,
          skipReason: 'manual',
          level: 'noCount',
          flags: ['tray-B1'],
          detail: { pairs: 4, revealed: false, note: 'x' },
          skillId: 'add.make-10',
          metrics: {
            total: 6,
            correct: 5,
            fastCount: 4,
            meanLatencyMs: null,
            misconceptions: [{ id: 'M5', itemIds: ['B4.1'] }],
          },
        }),
      ),
    ).toBe(true);
    for (const outcome of ['passed', 'passed-trend', 'not-passed', 'skipped', 'done']) {
      expect(isAppEvent(ev('block.completed', { blockId: 'b', blockKind: 'A', outcome }))).toBe(
        true,
      );
    }
    expect(isAppEvent(ev('block.completed', { blockId: 'b', blockKind: 'A', outcome: 'x' }))).toBe(
      false,
    );
    expect(isAppEvent(ev('block.completed', { blockId: 'b', blockKind: 'A' }))).toBe(false);
    expect(
      isAppEvent(
        ev('block.completed', { blockId: 'b', blockKind: 'A', outcome: 'done', level: 'x' }),
      ),
    ).toBe(false);
    expect(
      isAppEvent(
        ev('block.completed', { blockId: 'b', blockKind: 'A', outcome: 'done', flags: [1] }),
      ),
    ).toBe(false);
    expect(
      isAppEvent(
        ev('block.completed', {
          blockId: 'b',
          blockKind: 'A',
          outcome: 'done',
          metrics: { total: 1 },
        }),
      ),
    ).toBe(false);
  });

  it('parent.noted', () => {
    expect(isAppEvent(ev('parent.noted', {}))).toBe(true);
    expect(
      isAppEvent(
        ev('parent.noted', {
          blockKind: 'B',
          fingers: 'most',
          mouth: 'none',
          note: 'ใช้นิ้วบางข้อ',
          resolvedFlag: 'tray-B1',
        }),
      ),
    ).toBe(true);
    expect(isAppEvent(ev('parent.noted', { blockKind: 'C' }))).toBe(false);
    expect(isAppEvent(ev('parent.noted', { fingers: 'all' }))).toBe(false);
    expect(isAppEvent(ev('parent.noted', { mouth: 1 }))).toBe(false);
    expect(isAppEvent(ev('parent.noted', { note: 5 }))).toBe(false);
  });

  it('migrateEvent ผ่านชนิดใหม่ (schemaVersion ยัง 1)', () => {
    const e = migrateEvent(
      ev('block.completed', { blockId: 'b', blockKind: 'A', outcome: 'done' }),
    );
    expect(e.type).toBe('block.completed');
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
  });
});
