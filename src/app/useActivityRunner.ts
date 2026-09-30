import { useEffect, useRef, useState } from 'react';
import type { AppEvent, EventPayload } from '@/engine/types';
import { newId } from '@/store/ids';
import type { Outbox } from '@/store/outbox';
import { createEventStamper } from '@/store/stamp';

// เครื่องสถานะ pure ของกิจกรรม (DX-ADD และบทเรียน): transition คืน state ใหม่กับ effect ที่ runner ต้องทำ
export type ActivityEffect<A extends { type: string }> =
  { type: 'emit'; event: EventPayload } | { type: 'schedule'; afterMs: number; action: A['type'] };

export interface ActivityMachine<S, A extends { type: string }> {
  initial(): S;
  transition(state: S, action: A): { state: S; effects: ActivityEffect<A>[] };
}

export interface UseActivityRunnerOptions {
  learnerId: string;
  outbox: Outbox;
  activityId: string;
}

export interface ActivityRunner<S, A> {
  state: S;
  sessionId: string;
  dispatch: (action: A) => void;
}

// ตัวรันร่วม: คำนวณ transition และทำ effect ภายใน dispatch ครั้งเดียว (ไม่ทำใน state updater เพราะ StrictMode
// เรียก updater ซ้ำ ทำให้ event/timer ซ้ำ) state ล่าสุดเก็บใน ref เพื่อให้ dispatch ต่อเนื่องเห็นค่าตรงกัน
// `machine` ต้องคงที่ตลอดอายุ component (ผู้เรียกใช้ useMemo)
export function useActivityRunner<S, A extends { type: string }>(
  machine: ActivityMachine<S, A>,
  { learnerId, outbox, activityId }: UseActivityRunnerOptions,
): ActivityRunner<S, A> {
  const sessionIdRef = useRef<string | undefined>(undefined);
  if (sessionIdRef.current === undefined) {
    sessionIdRef.current = newId();
  }
  const sessionId = sessionIdRef.current;
  const stamperRef = useRef(createEventStamper());
  const [state, setState] = useState<S>(() => machine.initial());
  const stateRef = useRef<S>(state);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    };
  }, []);

  function dispatch(action: A): void {
    const { state: next, effects } = machine.transition(stateRef.current, action);
    if (next === stateRef.current && effects.length === 0) return;
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    stateRef.current = next;
    const emitted: AppEvent[] = [];
    for (const effect of effects) {
      if (effect.type === 'emit') {
        emitted.push({
          ...effect.event,
          id: newId(),
          at: stamperRef.current.next(),
          schemaVersion: 1,
          learnerId,
          sessionId,
          activityId,
        });
      } else {
        timerRef.current = setTimeout(
          () => dispatch({ type: effect.action } as unknown as A),
          effect.afterMs,
        );
      }
    }
    // ส่งทุก event ของ transition เดียวกันเป็นชุดเดียว (outbox flush ทีละชุด)
    outbox.append(emitted);
    setState(next);
  }

  return { state, sessionId, dispatch };
}
