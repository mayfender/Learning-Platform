import type { AnswerRecord } from '@/engine/diagnostic/types';
import type {
  Diagnostic,
  GroupSummary,
  Recommendation,
  RecommendationRule,
  StageSummary,
} from '@/engine/types';

type EvalResult = 'not-evaluable' | boolean;

function evalRule(
  dx: Diagnostic,
  rule: RecommendationRule,
  stageById: Map<string, StageSummary>,
  groupById: Map<string, GroupSummary>,
  answers: readonly AnswerRecord[],
): EvalResult {
  const cond = rule.when;
  switch (cond.kind) {
    case 'stage-not-good': {
      const stage = stageById.get(cond.stageId);
      if (!stage) return 'not-evaluable';
      if (stage.status !== 'done' && stage.status !== 'skipped') return 'not-evaluable';
      return stage.level !== 'good';
    }
    case 'group-not-pass': {
      const group = groupById.get(cond.groupId);
      if (!group) return 'not-evaluable';
      if (group.status === 'not-evaluated') return 'not-evaluable';
      if (group.status === 'fail' || group.status === 'skipped') return true;
      if (cond.orStageSkipped) {
        const stage = stageById.get(cond.orStageSkipped);
        if (stage?.status === 'skipped') return true;
      }
      return false;
    }
    case 'item-strategy-not': {
      const stage = dx.stages.find((s) => s.items.some((it) => it.id === cond.itemId));
      const stageSummary = stage ? stageById.get(stage.id) : undefined;
      if (!stageSummary || stageSummary.status !== 'done') return 'not-evaluable';
      const answer = answers.find((a) => a.itemId === cond.itemId);
      if (!answer) return 'not-evaluable';
      return answer.strategyId !== cond.strategyId;
    }
    case 'always': {
      const allDone = [...stageById.values()].every(
        (s) => s.status === 'done' || s.status === 'skipped',
      );
      if (!allDone) return 'not-evaluable';
      return true;
    }
  }
}

export function recommend(
  dx: Diagnostic,
  stages: StageSummary[],
  groups: GroupSummary[],
  answers: AnswerRecord[],
): Recommendation {
  const stageById = new Map(stages.map((s) => [s.stageId, s]));
  const groupById = new Map(groups.map((g) => [g.groupId, g]));

  for (const rule of dx.recommendation) {
    const result = evalRule(dx, rule, stageById, groupById, answers);
    if (result === 'not-evaluable') return { kind: 'incomplete' };
    if (result) return { kind: 'step', ladderStep: rule.ladderStep, ruleNo: rule.no };
  }
  return { kind: 'incomplete' };
}
