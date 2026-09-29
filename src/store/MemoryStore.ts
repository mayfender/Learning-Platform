import type { AppEvent, Learner } from '@/engine/types';
import { migrateEvent } from '@/store/migrations';
import type { EventQuery, MetaValues, ProgressStore } from '@/store/ProgressStore';

export function createMemoryStore(): ProgressStore {
  const learners = new Map<string, Learner>();
  const events = new Map<string, AppEvent>();
  const meta = new Map<string, unknown>();

  const store: ProgressStore = {
    kind: 'memory',

    async listLearners() {
      return [...learners.values()]
        .map((l) => structuredClone(l))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    },

    async addLearners(newLearners) {
      let added = 0;
      for (const learner of newLearners) {
        if (learners.has(learner.id)) continue;
        learners.set(learner.id, structuredClone(learner));
        added += 1;
      }
      return added;
    },

    async appendEvents(newEvents) {
      let added = 0;
      for (const event of newEvents) {
        if (events.has(event.id)) continue;
        events.set(event.id, structuredClone(event));
        added += 1;
      }
      return added;
    },

    async listEvents(query?: EventQuery) {
      let result = [...events.values()];
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
      if (!meta.has(key)) return undefined;
      return structuredClone(meta.get(key)) as MetaValues[K];
    },

    async setMeta<K extends keyof MetaValues>(key: K, value: MetaValues[K]) {
      meta.set(key, structuredClone(value));
    },

    async close() {
      // ไม่มีทรัพยากรต้องปิด
    },
  };

  return store;
}
