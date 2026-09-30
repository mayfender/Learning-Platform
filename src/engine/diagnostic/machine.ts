import { classify } from '@/engine/diagnostic/classify';
import { isFluent } from '@/engine/diagnostic/evaluate';
import { summarize } from '@/engine/diagnostic/summary';
import type { AnswerRecord } from '@/engine/diagnostic/types';
import type { AppEvent, Diagnostic, StrategyId } from '@/engine/types';

export type Phase =
  | { kind: 'parent-intro' }
  | { kind: 'kid-intro' }
  | { kind: 'stage-intro'; stage: number; completed: { n: number; m: number } | null }
  | { kind: 'example'; step: 'demo' | 'try-ready' | 'try-show' | 'try-answering' | 'try-reveal' }
  | { kind: 'item'; stage: number; item: number; step: 'ready' | 'show' | 'answering' }
  | { kind: 'ack'; stage: number; item: number; text: string }
  | { kind: 'strategy'; stage: number; item: number }
  | { kind: 'kid-end' }
  | { kind: 'stopped' };

interface PendingAnswer {
  itemId: string;
  stageId: string;
  response: number;
  correct: boolean;
  latencyMs: number;
  latencyValid: boolean;
  fluent: boolean | null;
  flashInterrupted: boolean;
  answeredAt: string;
}

export interface RunnerState {
  phase: Phase;
  started: boolean;
  answers: readonly AnswerRecord[];
  pending: PendingAnswer | null;
  submitted: number;
  skippedStageIds: readonly string[];
}

export type RunnerAction =
  | { type: 'PARENT_CONTINUE' }
  | { type: 'KID_START' }
  | { type: 'STAGE_GO' }
  | { type: 'READY_DONE' }
  | { type: 'FLASH_END' }
  | {
      type: 'SUBMIT';
      response: number;
      latencyMs: number;
      latencyValid: boolean;
      flashInterrupted: boolean;
      answeredAt: string;
    }
  | { type: 'ACK_DONE' }
  | { type: 'STRATEGY_PICK'; strategyId: StrategyId; strategyLatencyMs?: number }
  | { type: 'EXAMPLE_SUBMIT'; response: number }
  | { type: 'EXAMPLE_DONE' }
  | { type: 'STOP' };

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
export type EventPayload = DistributiveOmit<
  AppEvent,
  'id' | 'at' | 'schemaVersion' | 'learnerId' | 'sessionId' | 'activityId'
>;

export type Effect =
  | { type: 'emit'; event: EventPayload }
  | { type: 'schedule'; afterMs: number; action: 'READY_DONE' | 'ACK_DONE' | 'EXAMPLE_DONE' };

export interface DiagnosticMachine {
  initial(): RunnerState;
  transition(state: RunnerState, action: RunnerAction): { state: RunnerState; effects: Effect[] };
}

export function createDiagnosticMachine(dx: Diagnostic): DiagnosticMachine {
  function initial(): RunnerState {
    return {
      phase: { kind: 'parent-intro' },
      started: false,
      answers: [],
      pending: null,
      submitted: 0,
      skippedStageIds: [],
    };
  }

  function enterItem(stageIdx: number, itemIdx: number): { phase: Phase; effects: Effect[] } {
    const item = dx.stages[stageIdx]!.items[itemIdx]!;
    if (item.visual?.mode === 'flash') {
      return {
        phase: { kind: 'item', stage: stageIdx, item: itemIdx, step: 'ready' },
        effects: [{ type: 'schedule', afterMs: item.visual.readyMs, action: 'READY_DONE' }],
      };
    }
    return {
      phase: { kind: 'item', stage: stageIdx, item: itemIdx, step: 'answering' },
      effects: [],
    };
  }

  function advance(
    state: RunnerState,
    stageIdx: number,
    itemIdx: number,
  ): { phase: Phase; effects: Effect[]; skippedStageIds: readonly string[] } {
    const stage = dx.stages[stageIdx]!;
    if (itemIdx + 1 < stage.items.length) {
      const { phase, effects } = enterItem(stageIdx, itemIdx + 1);
      return { phase, effects, skippedStageIds: state.skippedStageIds };
    }

    let nextStageIdx = stageIdx + 1;
    const skippedStageIds = [...state.skippedStageIds];
    while (nextStageIdx < dx.stages.length) {
      const nextStage = dx.stages[nextStageIdx]!;
      if (nextStage.skipIf) {
        const refStage = dx.stages.find((s) => s.id === nextStage.skipIf!.stageId);
        const correctInRef = refStage
          ? state.answers.filter((a) => a.stageId === refStage.id && a.correct).length
          : 0;
        if (correctInRef <= nextStage.skipIf.correctAtMost) {
          skippedStageIds.push(nextStage.id);
          nextStageIdx += 1;
          continue;
        }
      }
      break;
    }

    if (nextStageIdx < dx.stages.length) {
      return {
        phase: {
          kind: 'stage-intro',
          stage: nextStageIdx,
          completed: { n: stage.number, m: dx.stages.length - stage.number },
        },
        effects: [],
        skippedStageIds,
      };
    }

    const summary = summarize(dx, state.answers, skippedStageIds, 'complete');
    return {
      phase: { kind: 'kid-end' },
      effects: [
        {
          type: 'emit',
          event: { type: 'session.completed', activityVersion: dx.version, summary },
        },
      ],
      skippedStageIds,
    };
  }

  function noop(state: RunnerState): { state: RunnerState; effects: Effect[] } {
    return { state, effects: [] };
  }

  function transition(
    state: RunnerState,
    action: RunnerAction,
  ): { state: RunnerState; effects: Effect[] } {
    if (action.type === 'STOP') {
      if (state.phase.kind === 'kid-end' || state.phase.kind === 'stopped') {
        return noop(state);
      }
      if (!state.started) {
        return { state: { ...state, phase: { kind: 'stopped' } }, effects: [] };
      }
      const summary = summarize(dx, state.answers, state.skippedStageIds, 'partial');
      return {
        state: { ...state, phase: { kind: 'stopped' }, pending: null },
        effects: [
          {
            type: 'emit',
            event: { type: 'session.abandoned', activityVersion: dx.version, summary },
          },
        ],
      };
    }

    const { phase } = state;

    if (phase.kind === 'parent-intro' && action.type === 'PARENT_CONTINUE') {
      return { state: { ...state, phase: { kind: 'kid-intro' } }, effects: [] };
    }

    if (phase.kind === 'kid-intro' && action.type === 'KID_START') {
      const { phase: itemPhase, effects } = enterItemOrStageIntro();
      return {
        state: { ...state, started: true, phase: itemPhase },
        effects: [
          {
            type: 'emit',
            event: {
              type: 'session.started',
              activityKind: 'diagnostic',
              activityVersion: dx.version,
            },
          },
          ...effects,
        ],
      };
    }

    if (phase.kind === 'stage-intro' && action.type === 'STAGE_GO') {
      if (phase.stage === 0 && dx.example) {
        return { state: { ...state, phase: { kind: 'example', step: 'demo' } }, effects: [] };
      }
      const { phase: itemPhase, effects } = enterItem(phase.stage, 0);
      return { state: { ...state, phase: itemPhase }, effects };
    }

    // หน้าตัวอย่าง (Tech Spec §14.1.3): ไม่ emit event และไม่แตะ answers/submitted/pending
    if (phase.kind === 'example' && dx.example) {
      const example = dx.example;
      if (phase.step === 'demo' && action.type === 'EXAMPLE_SUBMIT') {
        if (action.response !== example.demo.acceptOnly) return noop(state);
        return {
          state: { ...state, phase: { kind: 'example', step: 'try-ready' } },
          effects: [{ type: 'schedule', afterMs: example.try.readyMs, action: 'READY_DONE' }],
        };
      }
      if (phase.step === 'try-ready' && action.type === 'READY_DONE') {
        return { state: { ...state, phase: { kind: 'example', step: 'try-show' } }, effects: [] };
      }
      if (phase.step === 'try-show' && action.type === 'FLASH_END') {
        return {
          state: { ...state, phase: { kind: 'example', step: 'try-answering' } },
          effects: [],
        };
      }
      if (phase.step === 'try-answering' && action.type === 'EXAMPLE_SUBMIT') {
        return {
          state: { ...state, phase: { kind: 'example', step: 'try-reveal' } },
          effects: [{ type: 'schedule', afterMs: example.try.revealMs, action: 'EXAMPLE_DONE' }],
        };
      }
      if (phase.step === 'try-reveal' && action.type === 'EXAMPLE_DONE') {
        const { phase: itemPhase, effects } = enterItem(0, 0);
        return { state: { ...state, phase: itemPhase }, effects };
      }
      return noop(state);
    }

    if (phase.kind === 'item' && phase.step === 'ready' && action.type === 'READY_DONE') {
      return { state: { ...state, phase: { ...phase, step: 'show' } }, effects: [] };
    }

    if (phase.kind === 'item' && phase.step === 'show' && action.type === 'FLASH_END') {
      return { state: { ...state, phase: { ...phase, step: 'answering' } }, effects: [] };
    }

    if (phase.kind === 'item' && phase.step === 'answering' && action.type === 'SUBMIT') {
      const item = dx.stages[phase.stage]!.items[phase.item]!;
      const stageId = dx.stages[phase.stage]!.id;
      const { correct } = classify(item, action.response);
      const fluent = isFluent(item, correct, action.latencyMs, action.latencyValid);
      const ackText = dx.texts.acks[state.submitted % dx.texts.acks.length]!;
      const nextSubmitted = state.submitted + 1;
      const ackPhase: Phase = { kind: 'ack', stage: phase.stage, item: phase.item, text: ackText };
      const effects: Effect[] = [
        { type: 'schedule', afterMs: dx.timing.ackMs, action: 'ACK_DONE' },
      ];

      if (!item.strategySetId) {
        const { misconceptionId } = classify(item, action.response);
        const record: AnswerRecord = {
          itemId: item.id,
          stageId,
          ladderSteps: item.ladderSteps,
          skillId: item.skillId,
          problem: item.problem,
          expected: item.expected,
          response: action.response,
          correct,
          misconceptionId,
          latencyMs: action.latencyMs,
          latencyValid: action.latencyValid,
          fluentMs: item.fluentMs,
          fluent,
          flashInterrupted: action.flashInterrupted || undefined,
          answeredAt: action.answeredAt,
        };
        return {
          state: {
            ...state,
            phase: ackPhase,
            submitted: nextSubmitted,
            answers: [...state.answers, record],
          },
          effects: [...effects, { type: 'emit', event: toItemAnsweredEvent(record) }],
        };
      }

      return {
        state: {
          ...state,
          phase: ackPhase,
          submitted: nextSubmitted,
          pending: {
            itemId: item.id,
            stageId,
            response: action.response,
            correct,
            latencyMs: action.latencyMs,
            latencyValid: action.latencyValid,
            fluent,
            flashInterrupted: action.flashInterrupted,
            answeredAt: action.answeredAt,
          },
        },
        effects,
      };
    }

    if (phase.kind === 'ack' && action.type === 'ACK_DONE') {
      if (state.pending) {
        return {
          state: { ...state, phase: { kind: 'strategy', stage: phase.stage, item: phase.item } },
          effects: [],
        };
      }
      const {
        phase: nextPhase,
        effects,
        skippedStageIds,
      } = advance(state, phase.stage, phase.item);
      return { state: { ...state, phase: nextPhase, skippedStageIds }, effects };
    }

    if (phase.kind === 'strategy' && action.type === 'STRATEGY_PICK') {
      const item = dx.stages[phase.stage]!.items[phase.item]!;
      const set = dx.strategySets.find((s) => s.id === item.strategySetId);
      const valid = set?.options.some((o) => o.id === action.strategyId) ?? false;
      if (!valid || !state.pending) {
        return noop(state);
      }
      const pending = state.pending;
      const { misconceptionId } = classify(item, pending.response, action.strategyId);
      const record: AnswerRecord = {
        itemId: item.id,
        stageId: pending.stageId,
        ladderSteps: item.ladderSteps,
        skillId: item.skillId,
        problem: item.problem,
        expected: item.expected,
        response: pending.response,
        correct: pending.correct,
        misconceptionId,
        latencyMs: pending.latencyMs,
        latencyValid: pending.latencyValid,
        fluentMs: item.fluentMs,
        fluent: pending.fluent,
        strategySetId: item.strategySetId,
        strategyId: action.strategyId,
        flashInterrupted: pending.flashInterrupted || undefined,
        answeredAt: pending.answeredAt,
        strategyLatencyMs: action.strategyLatencyMs,
      };
      const {
        phase: nextPhase,
        effects,
        skippedStageIds,
      } = advance({ ...state, answers: [...state.answers, record] }, phase.stage, phase.item);
      return {
        state: {
          ...state,
          phase: nextPhase,
          answers: [...state.answers, record],
          pending: null,
          skippedStageIds,
        },
        effects: [{ type: 'emit', event: toItemAnsweredEvent(record) }, ...effects],
      };
    }

    return noop(state);
  }

  function enterItemOrStageIntro(): { phase: Phase; effects: Effect[] } {
    return { phase: { kind: 'stage-intro', stage: 0, completed: null }, effects: [] };
  }

  return { initial, transition };
}

function toItemAnsweredEvent(record: AnswerRecord): EventPayload {
  return {
    type: 'item.answered',
    itemId: record.itemId,
    stageId: record.stageId,
    ladderSteps: [...record.ladderSteps],
    skillId: record.skillId,
    problem: record.problem,
    expected: record.expected,
    response: record.response,
    correct: record.correct,
    misconceptionId: record.misconceptionId,
    latencyMs: record.latencyMs,
    latencyValid: record.latencyValid,
    fluentMs: record.fluentMs,
    fluent: record.fluent,
    strategySetId: record.strategySetId,
    strategyId: record.strategyId,
    flashInterrupted: record.flashInterrupted,
    answeredAt: record.answeredAt,
    strategyLatencyMs: record.strategyLatencyMs,
    attemptNo: 1,
  };
}
