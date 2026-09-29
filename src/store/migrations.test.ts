import { describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  InvalidEventError,
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
