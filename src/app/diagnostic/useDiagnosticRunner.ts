import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  createDiagnosticMachine,
  type RunnerAction,
  type RunnerState,
} from '@/engine/diagnostic/machine';
import type { AppEvent, Diagnostic } from '@/engine/types';
import type { Outbox } from '@/store/outbox';
import { newId } from '@/store/ids';
import { createEventStamper } from '@/store/stamp';

export interface UseDiagnosticRunnerOptions {
  learnerId: string;
  outbox: Outbox;
}

export interface DiagnosticRunner {
  state: RunnerState;
  sessionId: string;
  dispatch: (action: RunnerAction) => void;
}

export function useDiagnosticRunner(
  dx: Diagnostic,
  { learnerId, outbox }: UseDiagnosticRunnerOptions,
): DiagnosticRunner {
  const machine = useMemo(() => createDiagnosticMachine(dx), [dx]);
  const sessionIdRef = useRef<string | undefined>(undefined);
  if (sessionIdRef.current === undefined) {
    sessionIdRef.current = newId();
  }
  const sessionId = sessionIdRef.current;
  const stamperRef = useRef(createEventStamper());
  const [state, setState] = useState<RunnerState>(() => machine.initial());
  const stateRef = useRef<RunnerState>(state);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    };
  }, []);

  // คำนวณ transition และทำ effect ภายใน dispatch ครั้งเดียว (ไม่ทำใน state updater เพราะ StrictMode
  // เรียก updater ซ้ำ ทำให้ event/timer ซ้ำ) state ล่าสุดเก็บใน ref เพื่อให้ dispatch ต่อเนื่องเห็นค่าตรงกัน
  function dispatch(action: RunnerAction): void {
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
          activityId: dx.id,
        });
      } else {
        timerRef.current = setTimeout(() => dispatch({ type: effect.action }), effect.afterMs);
      }
    }
    // ส่งทุก event ของ transition เดียวกันเป็นชุดเดียว (outbox flush ทีละชุด)
    outbox.append(emitted);
    setState(next);
  }

  useEffect(() => {
    if (state.phase.kind === 'stopped') {
      void navigate(state.started ? `/parent/results/${sessionId}` : '/', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.started]);

  return { state, sessionId, dispatch };
}
