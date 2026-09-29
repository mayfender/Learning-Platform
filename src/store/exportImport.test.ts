import { describe, expect, it } from 'vitest';
import { createMemoryStore } from '@/store/MemoryStore';
import {
  NewerSchemaError,
  NotOurFileError,
  exportData,
  exportFileName,
  importData,
} from '@/store/exportImport';

function makeEvent(id: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    at: '2026-01-01T00:00:00.000Z',
    schemaVersion: 1 as const,
    learnerId: 'l1',
    sessionId: 's1',
    activityId: 'DX-ADD',
    type: 'session.started' as const,
    ...overrides,
  };
}

describe('exportFileName', () => {
  it('สร้างชื่อไฟล์ตามเวลาท้องถิ่น ลงท้าย .export.json', () => {
    const now = new Date(2026, 0, 5, 9, 7);
    expect(exportFileName(now)).toBe('math-learning-20260105-0907.export.json');
  });
});

describe('export → import', () => {
  it('export แล้ว import เข้า store ใหม่ได้ข้อมูลเท่ากัน', async () => {
    const store = createMemoryStore();
    await store.addLearners([
      { id: 'l1', nickname: 'หนูดี', createdAt: '2026-01-01T00:00:00.000Z' },
    ]);
    await store.appendEvents([makeEvent('e1')]);

    const file = await exportData(store);
    expect(file.app).toBe('math-learning');
    expect(file.learners).toHaveLength(1);
    expect(file.events).toHaveLength(1);
    expect(await store.getMeta('lastExportAt')).toBe(file.exportedAt);

    const store2 = createMemoryStore();
    const result = await importData(store2, file);
    expect(result).toEqual({ learnersAdded: 1, eventsAdded: 1, eventsSkipped: 0, invalid: 0 });
    expect(await store2.listLearners()).toHaveLength(1);
    expect(await store2.listEvents()).toHaveLength(1);
  });

  it('import ไฟล์เดิมซ้ำได้ eventsAdded = 0', async () => {
    const store = createMemoryStore();
    await store.appendEvents([makeEvent('e1')]);
    const file = await exportData(store);

    const store2 = createMemoryStore();
    await importData(store2, file);
    const result2 = await importData(store2, file);
    expect(result2.eventsAdded).toBe(0);
    expect(result2.eventsSkipped).toBe(1);
  });

  it('รวม 2 เครื่องที่มี event ซ้อนกันบางส่วน', async () => {
    const deviceA = createMemoryStore();
    await deviceA.appendEvents([makeEvent('e1'), makeEvent('e2')]);
    const fileA = await exportData(deviceA);

    const deviceB = createMemoryStore();
    await deviceB.appendEvents([makeEvent('e2'), makeEvent('e3')]);
    const fileB = await exportData(deviceB);

    const merged = createMemoryStore();
    await importData(merged, fileA);
    const resultB = await importData(merged, fileB);
    expect(resultB.eventsAdded).toBe(1);
    expect(resultB.eventsSkipped).toBe(1);
    expect(await merged.listEvents()).toHaveLength(3);
  });

  it('ปฏิเสธไฟล์ผิดประเภท', async () => {
    const store = createMemoryStore();
    await expect(importData(store, { app: 'other-app' })).rejects.toThrow(NotOurFileError);
  });

  it('ปฏิเสธไฟล์ schemaVersion ใหม่กว่า', async () => {
    const store = createMemoryStore();
    await expect(
      importData(store, { app: 'math-learning', schemaVersion: 999, learners: [], events: [] }),
    ).rejects.toThrow(NewerSchemaError);
  });

  it('event เสียบางตัวถูกนับเป็น invalid และข้าม ไม่ล้มทั้งไฟล์', async () => {
    const store = createMemoryStore();
    const file = {
      app: 'math-learning' as const,
      schemaVersion: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      learners: [],
      events: [makeEvent('good'), { id: 'bad', type: 'not-real' }],
    };
    const result = await importData(store, file);
    expect(result.eventsAdded).toBe(1);
    expect(result.invalid).toBe(1);
  });

  it('import ไม่เปลี่ยน currentLearnerId', async () => {
    const store = createMemoryStore();
    await store.setMeta('currentLearnerId', 'existing');
    const file = {
      app: 'math-learning' as const,
      schemaVersion: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      learners: [{ id: 'l2', nickname: 'ใหม่', createdAt: '2026-01-01T00:00:00.000Z' }],
      events: [],
    };
    await importData(store, file);
    expect(await store.getMeta('currentLearnerId')).toBe('existing');
  });
});
