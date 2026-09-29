import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOutbox } from '@/store/outbox';
import type { ProgressStore } from '@/store/ProgressStore';

function makeEvent(id: string) {
  return {
    id,
    at: '2026-01-01T00:00:00.000Z',
    schemaVersion: 1 as const,
    learnerId: 'l1',
    sessionId: 's1',
    activityId: 'DX-ADD',
    type: 'session.started' as const,
    activityKind: 'diagnostic' as const,
    activityVersion: 'DX-ADD v2',
  };
}

function fakeStore(appendEvents: ProgressStore['appendEvents']): ProgressStore {
  return {
    kind: 'memory',
    listLearners: async () => [],
    addLearners: async () => 0,
    appendEvents,
    listEvents: async () => [],
    getMeta: async () => undefined,
    setMeta: async () => {},
    close: async () => {},
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createOutbox', () => {
  it('append แล้วพยายามเขียนทันที ถ้าสำเร็จ pending ว่างเปล่า', async () => {
    const appendEvents = vi.fn().mockResolvedValue(1);
    const outbox = createOutbox(fakeStore(appendEvents));
    outbox.append([makeEvent('e1')]);
    await vi.waitFor(() => expect(outbox.pending()).toHaveLength(0));
    expect(appendEvents).toHaveBeenCalledTimes(1);
  });

  it('เขียนไม่สำเร็จครั้งแรก แล้วลองใหม่ตาม retryMs จนสำเร็จ ลำดับคงเดิม', async () => {
    const appendEvents = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue(2);
    const store = fakeStore(appendEvents);
    const outbox = createOutbox(store, { retryMs: 1000 });

    outbox.append([makeEvent('e1')]);
    await vi.waitFor(() => expect(appendEvents).toHaveBeenCalledTimes(1));
    expect(outbox.pending().map((e) => e.id)).toEqual(['e1']);

    outbox.append([makeEvent('e2')]);
    expect(outbox.pending().map((e) => e.id)).toEqual(['e1', 'e2']);

    await vi.advanceTimersByTimeAsync(1000);
    await vi.waitFor(() => expect(outbox.pending()).toHaveLength(0));
    const lastCallArgs = appendEvents.mock.calls.at(-1)?.[0] as { id: string }[];
    expect(lastCallArgs.map((e) => e.id)).toEqual(['e1', 'e2']);
  });

  it('แจ้ง subscriber เมื่อ pending เปลี่ยน', async () => {
    const appendEvents = vi.fn().mockResolvedValue(1);
    const outbox = createOutbox(fakeStore(appendEvents));
    const cb = vi.fn();
    outbox.subscribe(cb);
    outbox.append([makeEvent('e1')]);
    expect(cb).toHaveBeenCalled();
  });

  it('append ระหว่างที่กำลังเขียน จะถูกเขียนต่อทันทีโดยไม่ต้องรอ retry', async () => {
    let release: () => void = () => {};
    const appendEvents = vi
      .fn()
      .mockImplementationOnce(() => new Promise<number>((r) => (release = () => r(1))))
      .mockResolvedValue(1);
    const outbox = createOutbox(fakeStore(appendEvents), { retryMs: 60_000 });
    outbox.append([makeEvent('e1')]);
    outbox.append([makeEvent('e2')]);
    expect(appendEvents).toHaveBeenCalledTimes(1);
    release();
    await vi.waitFor(() => expect(outbox.pending()).toHaveLength(0));
    expect(appendEvents).toHaveBeenCalledTimes(2);
    expect((appendEvents.mock.calls[1]![0] as { id: string }[]).map((e) => e.id)).toEqual(['e2']);
  });
});
