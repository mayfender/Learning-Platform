import type { AnswerRecord } from '@/engine/diagnostic/types';
import type {
  Diagnostic,
  DiagnosticItem,
  DiagnosticStage,
  GroupStatus,
  StageGroup,
  StageSummary,
} from '@/engine/types';

export function isFluent(
  item: DiagnosticItem,
  correct: boolean,
  latencyMs: number,
  latencyValid: boolean,
): boolean | null {
  if (item.fluentMs === undefined) return null;
  if (!correct) return false;
  if (!latencyValid) return true;
  return latencyMs <= item.fluentMs;
}

function strategyCounting(
  dx: Diagnostic,
  strategySetId: string | undefined,
  strategyId: string | undefined,
): 'yes' | 'no' | 'ignore' | undefined {
  if (!strategySetId || !strategyId) return undefined;
  const set = dx.strategySets.find((s) => s.id === strategySetId);
  return set?.options.find((o) => o.id === strategyId)?.counting;
}

export function summarizeStage(
  dx: Diagnostic,
  stage: DiagnosticStage,
  answers: readonly AnswerRecord[],
  skippedStageIds: readonly string[],
): StageSummary {
  const stageAnswers = answers.filter((a) => a.stageId === stage.id);
  const skipped = skippedStageIds.includes(stage.id);

  let status: StageSummary['status'];
  if (skipped) status = 'skipped';
  else if (stageAnswers.length === 0) status = 'not-reached';
  else if (stageAnswers.length === stage.items.length) status = 'done';
  else status = 'incomplete';

  const correct = stageAnswers.filter((a) => a.correct).length;
  const answeredCount = stageAnswers.length;

  const hasFluentItems = stage.items.some((it) => it.fluentMs !== undefined);
  const fluentCount = hasFluentItems ? stageAnswers.filter((a) => a.fluent === true).length : null;

  const hasStrategyItems = stage.items.some((it) => it.strategySetId !== undefined);
  const countingCount = hasStrategyItems
    ? stageAnswers.filter((a) => strategyCounting(dx, a.strategySetId, a.strategyId) === 'yes')
        .length
    : null;

  const validLatencies = stageAnswers.filter((a) => a.latencyValid).map((a) => a.latencyMs);
  const meanLatencyMs =
    validLatencies.length > 0
      ? validLatencies.reduce((sum, v) => sum + v, 0) / validLatencies.length
      : null;

  let level: StageSummary['level'] = null;
  if (status === 'skipped') {
    level = 'skipped';
  } else if (status === 'done' && stage.level) {
    const { good, mid } = stage.level;
    const goodFluentOk = good.minFluent === undefined || (fluentCount ?? 0) >= good.minFluent;
    const goodCountingOk =
      good.maxCounting === undefined || (countingCount ?? 0) <= good.maxCounting;
    if (correct >= good.minCorrect && goodFluentOk && goodCountingOk) {
      level = 'good';
    } else if (correct >= mid.minCorrect) {
      level = 'mid';
    } else {
      level = 'low';
    }
  }

  return {
    stageId: stage.id,
    number: stage.number,
    status,
    answered: answeredCount,
    correct,
    fluentCount,
    countingCount,
    meanLatencyMs,
    level,
  };
}

export function evaluateGroup(
  group: StageGroup,
  answers: readonly AnswerRecord[],
  stageStatus: StageSummary['status'],
): GroupStatus {
  if (stageStatus === 'skipped') return 'skipped';
  if (stageStatus !== 'done') return 'not-evaluated';

  for (const itemId of group.itemIds) {
    const answer = answers.find((a) => a.itemId === itemId);
    if (!answer) return 'not-evaluated';
    if (!answer.correct) return 'fail';
    if (answer.fluent !== true) return 'fail';
    if (answer.strategyId && group.forbidStrategies.includes(answer.strategyId)) return 'fail';
  }
  return 'pass';
}
