import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useActivityRunner, type ActivityMachine } from '@/app/useActivityRunner';
import type { AppEvent } from '@/engine/types';
import type { Outbox } from '@/store/outbox';

type S = { n: number; phase: 'a' | 'b' };
type A = { type: 'GO' } | { type: 'TICK' } | { type: 'NOOP' };

// เครื่องจำลอง: GO → emit session.started 1 ตัว + ตั้ง timer TICK; TICK → emit 2 ตัวในชุดเดียว (transition เดียว)
const machine: ActivityMachine<S, A> = {
  initial: () => ({ n: 0, phase: 'a' }),
  transition(state, action) {
    if (action.type === 'GO') {
      return {
        state: { n: state.n + 1, phase: 'b' },
        effects: [
          {
            type: 'emit',
            event: { type: 'session.started', activityKind: 'lesson', activityVersion: 'v' },
          },
          { type: 'schedule', afterMs: 1000, action: 'TICK' },
        ],
      };
    }
    if (action.type === 'TICK') {
      return {
        state: { n: state.n + 1, phase: 'a' },
        effects: [
          { type: 'emit', event: { type: 'parent.noted', note: 'a' } },
          { type: 'emit', event: { type: 'parent.noted', note: 'b' } },
        ],
      };
    }
    return { state, effects: [] };
  },
};

function fakeOutbox() {
  const batches: AppEvent[][] = [];
  const outbox: Outbox = {
    append: (events) => void batches.push(events),
    pending: () => [],
    subscribe: () => () => {},
    flush: () => Promise.resolve(),
  };
  return { outbox, batches };
}

describe('useActivityRunner', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('StrictMode: event ต่อ action บันทึกครั้งเดียว ประทับ envelope และ at เพิ่มขึ้นเคร่งครัด', () => {
    const { outbox, batches } = fakeOutbox();
    const { result } = renderHook(
      () => useActivityRunner(machine, { learnerId: 'l1', outbox, activityId: 'ADD-04' }),
      { wrapper: StrictMode },
    );
    expect(result.current.state).toEqual({ n: 0, phase: 'a' });

    act(() => result.current.dispatch({ type: 'GO' }));
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(1);
    expect(result.current.state.phase).toBe('b');

    // timer TICK ทำงานหลัง 1000 ms ตามที่ machine สั่ง (effect ทำใน dispatch ครั้งเดียว ไม่ซ้ำ)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(batches).toHaveLength(2);
    expect(batches[1]).toHaveLength(2); // ทั้ง 2 event ของ transition เดียวส่งเป็นชุดเดียว
    expect(result.current.state).toEqual({ n: 2, phase: 'a' });

    const all = batches.flat();
    expect(all).toHaveLength(3);
    for (const e of all) {
      expect(e).toMatchObject({
        schemaVersion: 1,
        learnerId: 'l1',
        sessionId: result.current.sessionId,
        activityId: 'ADD-04',
      });
      expect(typeof e.id).toBe('string');
    }
    expect(new Set(all.map((e) => e.id)).size).toBe(3);
    const ats = all.map((e) => e.at);
    expect([...ats].sort()).toEqual(ats);
    expect(new Set(ats).size).toBe(3); // ms เดียวกันก็ต้องต่างกัน
  });

  it('action ที่ไม่เปลี่ยนอะไรไม่ส่ง event และไม่ทำให้ timer เดิมถูกล้ม', () => {
    const { outbox, batches } = fakeOutbox();
    const { result } = renderHook(() =>
      useActivityRunner(machine, { learnerId: 'l1', outbox, activityId: 'ADD-04' }),
    );
    act(() => result.current.dispatch({ type: 'GO' }));
    const state = result.current.state;
    act(() => result.current.dispatch({ type: 'NOOP' }));
    expect(result.current.state).toBe(state);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(batches).toHaveLength(2);
  });

  it('unmount ล้าง timer ที่ค้าง', () => {
    const { outbox, batches } = fakeOutbox();
    const { result, unmount } = renderHook(() =>
      useActivityRunner(machine, { learnerId: 'l1', outbox, activityId: 'ADD-04' }),
    );
    act(() => result.current.dispatch({ type: 'GO' }));
    unmount();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(batches).toHaveLength(1);
  });
});
