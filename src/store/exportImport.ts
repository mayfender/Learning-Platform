import type { AppEvent, Learner } from '@/engine/types';
import { CURRENT_SCHEMA_VERSION, migrateEvent } from '@/store/migrations';
import type { ProgressStore } from '@/store/ProgressStore';

export interface ExportFile {
  app: 'math-learning';
  schemaVersion: number;
  exportedAt: string;
  learners: Learner[];
  events: AppEvent[];
}

export class NotOurFileError extends Error {
  constructor(message = 'ไฟล์นี้ไม่ใช่ไฟล์ของแอปนี้') {
    super(message);
    this.name = 'NotOurFileError';
  }
}

export class NewerSchemaError extends Error {
  constructor(message = 'ไฟล์นี้มาจากแอปเวอร์ชันใหม่กว่า กรุณาอัปเดตแอปก่อน') {
    super(message);
    this.name = 'NewerSchemaError';
  }
}

export interface ImportResult {
  learnersAdded: number;
  eventsAdded: number;
  eventsSkipped: number;
  invalid: number;
}

export async function exportData(
  store: ProgressStore,
  now: Date = new Date(),
): Promise<ExportFile> {
  const [learners, events] = await Promise.all([store.listLearners(), store.listEvents()]);
  const exportedAt = now.toISOString();
  await store.setMeta('lastExportAt', exportedAt);
  return {
    app: 'math-learning',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt,
    learners,
    events,
  };
}

export function exportFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  return `math-learning-${y}${m}${d}-${hh}${mm}.export.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function importData(store: ProgressStore, json: unknown): Promise<ImportResult> {
  if (!isRecord(json) || json.app !== 'math-learning') {
    throw new NotOurFileError();
  }
  const schemaVersion = json.schemaVersion;
  if (typeof schemaVersion !== 'number' || schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new NewerSchemaError();
  }

  const rawLearners = Array.isArray(json.learners) ? json.learners : [];
  const rawEvents = Array.isArray(json.events) ? json.events : [];

  const learners: Learner[] = rawLearners.filter(
    (l): l is Learner =>
      isRecord(l) &&
      typeof l.id === 'string' &&
      typeof l.nickname === 'string' &&
      typeof l.createdAt === 'string',
  );
  const learnersAdded = await store.addLearners(learners);

  let invalid = 0;
  const validEvents: AppEvent[] = [];
  for (const raw of rawEvents) {
    try {
      validEvents.push(migrateEvent(raw));
    } catch {
      invalid += 1;
    }
  }

  const eventsAdded = await store.appendEvents(validEvents);
  const eventsSkipped = validEvents.length - eventsAdded;

  return { learnersAdded, eventsAdded, eventsSkipped, invalid };
}
