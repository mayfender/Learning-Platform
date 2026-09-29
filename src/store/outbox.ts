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
    if (queue.length === 0) return;
    flushing = true;
    try {
      const toSend = [...queue];
      await store.appendEvents(toSend);
      // เขียนสำเร็จทั้งชุด: ลบเฉพาะที่ส่งไปตอนนี้ ลำดับส่วนที่เหลือคงเดิม
      const sentIds = new Set(toSend.map((e) => e.id));
      const remaining = queue.filter((e) => !sentIds.has(e.id));
      if (remaining.length !== queue.length) {
        queue = remaining;
        notify();
      }
    } catch {
      // ยังล้มอยู่ ลองใหม่รอบถัดไป
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
