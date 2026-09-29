import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AppEvent, Learner } from '@/engine/types';
import { migrateEvent } from '@/store/migrations';
import type { EventQuery, MetaValues, ProgressStore } from '@/store/ProgressStore';

interface LearningPlatformDB extends DBSchema {
  learners: {
    key: string;
    value: Learner;
  };
  events: {
    key: string;
    value: AppEvent;
    indexes: {
      'by-learner': string;
      'by-learner-activity': [string, string];
      'by-session': string;
    };
  };
  meta: {
    key: string;
    value: unknown;
  };
}

const DB_VERSION = 1;

function upgrade(db: IDBPDatabase<LearningPlatformDB>, oldVersion: number): void {
  switch (oldVersion) {
    case 0: {
      db.createObjectStore('learners', { keyPath: 'id' });
      const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
      eventsStore.createIndex('by-learner', 'learnerId');
      eventsStore.createIndex('by-learner-activity', ['learnerId', 'activityId']);
      eventsStore.createIndex('by-session', 'sessionId');
      db.createObjectStore('meta');
      break;
    }
    default:
      break;
  }
}

export interface OpenIndexedDbStoreOptions {
  dbName?: string;
}

export async function openIndexedDbStore(
  options: OpenIndexedDbStoreOptions = {},
): Promise<ProgressStore> {
  // ชื่อ DB ต้องไม่ generic เพราะ origin mayfender.github.io ใช้ร่วมกับ GitHub Pages ทุก repo
  const { dbName = 'learning-platform' } = options;

  const db = await openDB<LearningPlatformDB>(dbName, DB_VERSION, { upgrade });

  const store: ProgressStore = {
    kind: 'indexeddb',

    async listLearners() {
      const learners = await db.getAll('learners');
      return learners
        .map((l) => structuredClone(l))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    },

    async addLearners(newLearners) {
      const tx = db.transaction('learners', 'readwrite');
      let added = 0;
      for (const learner of newLearners) {
        const existing = await tx.store.get(learner.id);
        if (existing) continue;
        await tx.store.put(structuredClone(learner));
        added += 1;
      }
      await tx.done;
      return added;
    },

    async appendEvents(newEvents) {
      const tx = db.transaction('events', 'readwrite');
      let added = 0;
      for (const event of newEvents) {
        const existing = await tx.store.get(event.id);
        if (existing) continue;
        await tx.store.put(structuredClone(event));
        added += 1;
      }
      await tx.done;
      return added;
    },

    async listEvents(query?: EventQuery) {
      let result: AppEvent[];
      if (query?.sessionId !== undefined) {
        result = await db.getAllFromIndex('events', 'by-session', query.sessionId);
      } else if (query?.learnerId !== undefined && query?.activityId !== undefined) {
        result = await db.getAllFromIndex('events', 'by-learner-activity', [
          query.learnerId,
          query.activityId,
        ]);
      } else if (query?.learnerId !== undefined) {
        result = await db.getAllFromIndex('events', 'by-learner', query.learnerId);
      } else {
        result = await db.getAll('events');
      }

      if (query?.learnerId !== undefined) {
        result = result.filter((e) => e.learnerId === query.learnerId);
      }
      if (query?.activityId !== undefined) {
        result = result.filter((e) => e.activityId === query.activityId);
      }
      if (query?.sessionId !== undefined) {
        result = result.filter((e) => e.sessionId === query.sessionId);
      }

      result.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
      return result.map((e) => migrateEvent(structuredClone(e)));
    },

    async getMeta<K extends keyof MetaValues>(key: K) {
      const value = await db.get('meta', key);
      if (value === undefined) return undefined;
      return structuredClone(value) as MetaValues[K];
    },

    async setMeta<K extends keyof MetaValues>(key: K, value: MetaValues[K]) {
      await db.put('meta', structuredClone(value), key);
    },

    async close() {
      db.close();
    },
  };

  return store;
}
