import type { AppEvent } from '@/engine/types';

export const CURRENT_SCHEMA_VERSION = 1;

export type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

// key n = แปลงจาก schemaVersion n ไป n+1 (ว่างใน M0 เพราะยังไม่เคยเขียน event)
export const MIGRATIONS: Record<number, Migration> = {};

export class InvalidEventError extends Error {
  constructor(message = 'invalid event') {
    super(message);
    this.name = 'InvalidEventError';
  }
}

export class NewerSchemaError extends Error {
  constructor(message = 'schemaVersion ใหม่กว่าที่แอปรองรับ') {
    super(message);
    this.name = 'NewerSchemaError';
  }
}

const EVENT_TYPES = new Set([
  'session.started',
  'item.answered',
  'strategy.reported',
  'session.completed',
  'session.abandoned',
]);

export function isAppEvent(value: unknown): value is AppEvent {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || v.id.length === 0) return false;
  if (typeof v.at !== 'string' || v.at.length === 0) return false;
  if (v.schemaVersion !== CURRENT_SCHEMA_VERSION) return false;
  if (typeof v.learnerId !== 'string' || v.learnerId.length === 0) return false;
  if (typeof v.sessionId !== 'string' || v.sessionId.length === 0) return false;
  if (typeof v.activityId !== 'string' || v.activityId.length === 0) return false;
  if (typeof v.type !== 'string' || !EVENT_TYPES.has(v.type)) return false;

  switch (v.type) {
    case 'session.started':
      return typeof v.activityKind === 'string' && typeof v.activityVersion === 'string';
    case 'item.answered':
      return (
        typeof v.itemId === 'string' &&
        typeof v.skillId === 'string' &&
        typeof v.problem === 'object' &&
        v.problem !== null &&
        typeof v.expected === 'number' &&
        typeof v.response === 'number' &&
        typeof v.correct === 'boolean' &&
        typeof v.latencyMs === 'number' &&
        typeof v.latencyValid === 'boolean' &&
        (v.fluent === null || typeof v.fluent === 'boolean') &&
        typeof v.attemptNo === 'number'
      );
    case 'strategy.reported':
      return typeof v.itemId === 'string' && typeof v.strategyId === 'string';
    case 'session.completed':
    case 'session.abandoned':
      return (
        typeof v.activityVersion === 'string' && typeof v.summary === 'object' && v.summary !== null
      );
    default:
      return true;
  }
}

export function migrateEvent(
  raw: unknown,
  migrations: Record<number, Migration> = MIGRATIONS,
  target: number = CURRENT_SCHEMA_VERSION,
): AppEvent {
  if (typeof raw !== 'object' || raw === null) {
    throw new InvalidEventError('event ไม่ใช่ object');
  }
  let record = raw as Record<string, unknown>;
  const startVersion = record.schemaVersion;
  if (typeof startVersion !== 'number') {
    throw new InvalidEventError('ไม่มี schemaVersion');
  }
  if (startVersion > target) {
    throw new NewerSchemaError();
  }

  let version = startVersion;
  while (version < target) {
    const migrate = migrations[version];
    if (!migrate) {
      throw new InvalidEventError(`ไม่มี migration จาก schemaVersion ${version}`);
    }
    record = migrate(record);
    version += 1;
    record.schemaVersion = version;
  }

  if (!isAppEvent(record)) {
    throw new InvalidEventError('รูปแบบ event ไม่ถูกต้องหลัง migrate');
  }
  return record;
}
