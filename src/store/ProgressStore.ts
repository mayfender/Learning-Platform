import type { AppEvent, Learner } from '@/engine/types';

export interface EventQuery {
  learnerId?: string;
  activityId?: string;
  sessionId?: string;
}

export type PersistResult = 'granted' | 'denied' | 'unsupported';

export interface MetaValues {
  currentLearnerId: string;
  lastExportAt: string; // ISO
  persistence: { checkedAt: string; result: PersistResult };
}

export interface ProgressStore {
  readonly kind: 'indexeddb' | 'memory';
  listLearners(): Promise<Learner[]>;
  addLearners(learners: Learner[]): Promise<number>;
  appendEvents(events: AppEvent[]): Promise<number>;
  listEvents(query?: EventQuery): Promise<AppEvent[]>;
  getMeta<K extends keyof MetaValues>(key: K): Promise<MetaValues[K] | undefined>;
  setMeta<K extends keyof MetaValues>(key: K, value: MetaValues[K]): Promise<void>;
  close(): Promise<void>;
}
