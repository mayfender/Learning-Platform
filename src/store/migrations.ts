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
  'block.started',
  'block.completed',
  'parent.noted',
  'session.completed',
  'session.abandoned',
]);

const BLOCK_KINDS = new Set(['check', 'A', 'B', 'practice', 'review', 'drill', 'challenge']);
const BLOCK_OUTCOMES = new Set(['passed', 'passed-trend', 'not-passed', 'skipped', 'done']);
const NOTE_FREQUENCIES = new Set(['none', 'some', 'most']);
const STEP_IDS = new Set(['gap', 'rest', 'total', 'q1', 'q2']);
const MODES = new Set(['see', 'fade', 'mind']);

function optional(value: unknown, check: (v: unknown) => boolean): boolean {
  return value === undefined || check(value);
}
const isNumber = (v: unknown): boolean => typeof v === 'number';
const isString = (v: unknown): boolean => typeof v === 'string';
const isBoolean = (v: unknown): boolean => typeof v === 'boolean';
const isRecord = (v: unknown): boolean => typeof v === 'object' && v !== null && !Array.isArray(v);

function isSubAnswers(v: unknown): boolean {
  return (
    Array.isArray(v) &&
    v.every((x) => {
      if (!isRecord(x)) return false;
      const r = x as Record<string, unknown>;
      return (
        (r.stepId === 'gap' || r.stepId === 'rest') &&
        typeof r.response === 'number' &&
        typeof r.expected === 'number' &&
        typeof r.correct === 'boolean' &&
        optional(r.misconceptionId, isString)
      );
    })
  );
}

function isManip(v: unknown): boolean {
  if (!isRecord(v)) return false;
  const r = v as Record<string, unknown>;
  return (
    optional(r.taps, isNumber) && optional(r.drops, isNumber) && optional(r.rejected, isNumber)
  );
}

function isMetrics(v: unknown): boolean {
  if (!isRecord(v)) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.total === 'number' &&
    typeof r.correct === 'number' &&
    typeof r.fastCount === 'number' &&
    (r.meanLatencyMs === null || typeof r.meanLatencyMs === 'number') &&
    Array.isArray(r.misconceptions)
  );
}

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
      return (
        typeof v.activityKind === 'string' &&
        typeof v.activityVersion === 'string' &&
        optional(v.sitting, isNumber)
      );
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
        typeof v.attemptNo === 'number' &&
        (v.answeredAt === undefined || typeof v.answeredAt === 'string') &&
        (v.strategyLatencyMs === undefined || typeof v.strategyLatencyMs === 'number') &&
        optional(v.blockId, isString) &&
        optional(v.section, isString) &&
        optional(v.mode, (m) => typeof m === 'string' && MODES.has(m)) &&
        optional(v.stepId, (m) => typeof m === 'string' && STEP_IDS.has(m)) &&
        optional(v.subAnswers, isSubAnswers) &&
        optional(v.revealed, isBoolean) &&
        optional(v.manip, isManip)
      );
    case 'block.started':
      return (
        typeof v.blockId === 'string' &&
        typeof v.blockKind === 'string' &&
        BLOCK_KINDS.has(v.blockKind) &&
        optional(v.round, isNumber) &&
        optional(v.seed, isNumber) &&
        optional(v.skillId, isString) &&
        optional(
          v.skipped,
          (x) =>
            isRecord(x) &&
            Array.isArray((x as Record<string, unknown>).itemIds) &&
            ((x as Record<string, unknown>).reason === 'check' ||
              (x as Record<string, unknown>).reason === 'manual'),
        )
      );
    case 'block.completed':
      return (
        typeof v.blockId === 'string' &&
        typeof v.blockKind === 'string' &&
        BLOCK_KINDS.has(v.blockKind) &&
        typeof v.outcome === 'string' &&
        BLOCK_OUTCOMES.has(v.outcome) &&
        optional(v.round, isNumber) &&
        optional(v.skillId, isString) &&
        optional(v.skipReason, (x) => x === 'check' || x === 'manual') &&
        optional(v.metrics, isMetrics) &&
        optional(v.level, (x) => x === 'noCount' || x === 'automatic' || x === 'none') &&
        optional(v.flags, (x) => Array.isArray(x) && x.every(isString)) &&
        optional(v.detail, isRecord)
      );
    case 'parent.noted':
      return (
        optional(v.blockKind, (x) => x === 'A' || x === 'B') &&
        optional(v.fingers, (x) => typeof x === 'string' && NOTE_FREQUENCIES.has(x)) &&
        optional(v.mouth, (x) => typeof x === 'string' && NOTE_FREQUENCIES.has(x)) &&
        optional(v.note, isString) &&
        optional(v.resolvedFlag, isString)
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
