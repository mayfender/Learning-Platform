import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Learner } from '@/engine/types';
import { openIndexedDbStore } from '@/store/IndexedDbStore';
import { createMemoryStore } from '@/store/MemoryStore';
import { newId } from '@/store/ids';
import { createOutbox, type Outbox } from '@/store/outbox';
import { requestPersistence } from '@/store/persist';
import type { ProgressStore } from '@/store/ProgressStore';
import { strings } from '@/app/strings';

export type StorageMode = 'indexeddb' | 'memory-fallback';

export interface ProgressContextValue {
  store: ProgressStore;
  outbox: Outbox;
  storageMode: StorageMode;
  learners: Learner[];
  currentLearner: Learner | undefined;
  createLearner: (nickname: string) => Promise<Learner>;
  setCurrentLearner: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextValue | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components -- hook อยู่คู่กับ context/provider ตามรูปแบบมาตรฐาน
export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress ต้องใช้ภายใน ProgressProvider');
  return ctx;
}

interface ProgressProviderProps {
  children: ReactNode;
  createStoreForTest?: () => Promise<ProgressStore>;
}

export function ProgressProvider({ children, createStoreForTest }: ProgressProviderProps) {
  const [value, setValue] = useState<ProgressContextValue | undefined>(undefined);
  const storeRef = useRef<ProgressStore | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function init(): Promise<void> {
      let store: ProgressStore;
      let storageMode: StorageMode;
      try {
        store = createStoreForTest ? await createStoreForTest() : await openIndexedDbStore();
        storageMode = 'indexeddb';
      } catch {
        store = createMemoryStore();
        storageMode = 'memory-fallback';
      }
      storeRef.current = store;
      const outbox = createOutbox(store);
      void requestPersistence().then((result) => {
        void store.setMeta('persistence', { checkedAt: new Date().toISOString(), result });
      });

      async function loadLearners(): Promise<{ learners: Learner[]; currentLearner?: Learner }> {
        const learners = await store.listLearners();
        const currentLearnerId = await store.getMeta('currentLearnerId');
        const currentLearner =
          learners.find((l) => l.id === currentLearnerId) ?? learners[0] ?? undefined;
        return { learners, currentLearner };
      }

      async function refresh(): Promise<void> {
        const { learners, currentLearner } = await loadLearners();
        setValue((prev) => (prev ? { ...prev, learners, currentLearner } : prev));
      }

      async function createLearner(nickname: string): Promise<Learner> {
        const learner: Learner = { id: newId(), nickname, createdAt: new Date().toISOString() };
        await store.addLearners([learner]);
        await store.setMeta('currentLearnerId', learner.id);
        await refresh();
        return learner;
      }

      async function setCurrentLearner(id: string): Promise<void> {
        await store.setMeta('currentLearnerId', id);
        await refresh();
      }

      const { learners, currentLearner } = await loadLearners();

      if (!cancelled) {
        setValue({
          store,
          outbox,
          storageMode,
          learners,
          currentLearner,
          createLearner,
          setCurrentLearner,
          refresh,
        });
      }
    }

    void init();

    return () => {
      cancelled = true;
      void storeRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!value) {
    return <p>{strings.loading}</p>;
  }

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}
