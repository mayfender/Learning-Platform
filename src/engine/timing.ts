export interface SilentTimer {
  start(): void;
  invalidate(): void;
  stop(): { latencyMs: number; latencyValid: boolean };
}

export function createSilentTimer(now: () => number = () => performance.now()): SilentTimer {
  let startedAt: number | undefined;
  let valid = true;

  return {
    start() {
      startedAt = now();
      valid = true;
    },
    invalidate() {
      valid = false;
    },
    stop() {
      const end = now();
      const latencyMs = startedAt === undefined ? 0 : Math.round(end - startedAt);
      return { latencyMs, latencyValid: valid };
    },
  };
}
