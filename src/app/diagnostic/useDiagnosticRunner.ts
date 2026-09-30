import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useActivityRunner } from '@/app/useActivityRunner';
import {
  createDiagnosticMachine,
  type RunnerAction,
  type RunnerState,
} from '@/engine/diagnostic/machine';
import type { Diagnostic } from '@/engine/types';
import type { Outbox } from '@/store/outbox';

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
  const { state, sessionId, dispatch } = useActivityRunner<RunnerState, RunnerAction>(machine, {
    learnerId,
    outbox,
    activityId: dx.id,
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (state.phase.kind === 'stopped') {
      void navigate(state.started ? `/parent/results/${sessionId}` : '/', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.started]);

  return { state, sessionId, dispatch };
}
