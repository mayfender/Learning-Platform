import type { AppEvent } from '@/engine/types';
import type { ProgressStore } from '@/store/ProgressStore';

export interface Outbox {
  append(events: AppEvent[]): void;
  pending(): readonly AppEvent[];
  subscribe(cb: () => void): () => void;
  flush(): Promise<void>;
}

export interface CreateOutboxOptions {
  retryMs?: number;
}

export function createOutbox(store: ProgressStore, opts: CreateOutboxOptions = {}): Outbox {
  const { retryMs = 5000 } = opts;
  let queue: AppEvent[] = [];
  const subscribers = new Set<() => void>();
  let flushing = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  function notify(): void {
    for (const cb of subscribers) cb();
  }

  function ensureTimer(): void {
    if (timer !== undefined) return;
    timer = setInterval(() => {
      void flush();
    }, retryMs);
  }

  async function flush(): Promise<void> {
    if (flushing) return;
    flushing = true;
    try {
      // วนส่งต่อจนคิวว่าง (event ที่ append ระหว่างส่งจะถูกส่งในรอบถัดไปทันที)
      while (queue.length > 0) {
        const toSend = [...queue];
        await store.appendEvents(toSend);
        const sentIds = new Set(toSend.map((e) => e.id));
        queue = queue.filter((e) => !sentIds.has(e.id));
        notify();
      }
    } catch {
      // ยังล้มอยู่ ลองใหม่รอบถัดไปด้วย timer
    } finally {
      flushing = false;
    }
  }

  return {
    append(events: AppEvent[]) {
      if (events.length === 0) return;
      queue = [...queue, ...events];
      notify();
      ensureTimer();
      void flush();
    },
    pending() {
      return queue;
    },
    subscribe(cb: () => void) {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    async flush() {
      await flush();
    },
  };
}
