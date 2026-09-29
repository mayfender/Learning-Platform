import { evaluateGroup, summarizeStage } from '@/engine/diagnostic/evaluate';
import { recommend } from '@/engine/diagnostic/recommend';
import type { AnswerRecord } from '@/engine/diagnostic/types';
import type { Diagnostic, DiagnosticSummary, GroupSummary, StageSummary } from '@/engine/types';

export function summarize(
  dx: Diagnostic,
  answers: readonly AnswerRecord[],
  skippedStageIds: readonly string[],
  completion: 'complete' | 'partial',
): DiagnosticSummary {
  const stages: StageSummary[] = dx.stages.map((stage) =>
    summarizeStage(dx, stage, answers, skippedStageIds),
  );
  const stageStatusById = new Map(stages.map((s) => [s.stageId, s.status]));

  const groups: GroupSummary[] = [];
  for (const stage of dx.stages) {
    if (!stage.groups) continue;
    const stageStatus = stageStatusById.get(stage.id) ?? 'not-reached';
    for (const group of stage.groups) {
      groups.push({
        groupId: group.id,
        status: evaluateGroup(group, answers, stageStatus),
      });
    }
  }

  const misconceptionOrder = dx.misconceptions.map((m) => m.id);
  const byId = new Map<string, Set<string>>();
  for (const answer of answers) {
    if (answer.correct || !answer.misconceptionId) continue;
    const set = byId.get(answer.misconceptionId) ?? new Set<string>();
    set.add(answer.itemId);
    byId.set(answer.misconceptionId, set);
  }
  const misconceptions = misconceptionOrder
    .filter((id) => byId.has(id))
    .map((id) => ({ id, itemIds: [...byId.get(id)!].sort() }));

  const recommendation = recommend(dx, stages, groups, [...answers]);

  return {
    kind: 'diagnostic',
    completion,
    stages,
    groups,
    skippedStageIds: [...skippedStageIds],
    misconceptions,
    recommendation,
  };
}
