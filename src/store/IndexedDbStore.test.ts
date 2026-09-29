import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openIndexedDbStore } from '@/store/IndexedDbStore';
import { runProgressStoreContract } from '@/store/progressStore.contract';

let counter = 0;
function uniqueDbName(): string {
  counter += 1;
  return `test-db-${counter}-${Date.now()}`;
}

runProgressStoreContract('IndexedDbStore', async () =>
  openIndexedDbStore({ dbName: uniqueDbName() }),
);

describe('IndexedDbStore เฉพาะ', () => {
  it('ปิดแล้วเปิดใหม่ด้วย dbName เดิม ข้อมูลยังอยู่', async () => {
    const dbName = uniqueDbName();
    const store1 = await openIndexedDbStore({ dbName });
    await store1.addLearners([
      { id: 'l1', nickname: 'หนูดี', createdAt: '2026-01-01T00:00:00.000Z' },
    ]);
    await store1.close();

    const store2 = await openIndexedDbStore({ dbName });
    const learners = await store2.listLearners();
    expect(learners).toHaveLength(1);
    expect(learners[0]?.nickname).toBe('หนูดี');
    await store2.close();
  });
});
