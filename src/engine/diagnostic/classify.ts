import { solve } from '@/engine/problem';
import type { DiagnosticItem, StrategyId } from '@/engine/types';

export function classify(
  item: DiagnosticItem,
  response: number,
  strategyId?: StrategyId,
): { correct: boolean; misconceptionId?: string } {
  if (response === solve(item.problem)) {
    return { correct: true };
  }
  const rule = item.wrongAnswers.find((r) => r.response === response);
  if (!rule) {
    return { correct: false, misconceptionId: 'MX' };
  }
  const byStrategy = strategyId ? rule.byStrategy?.[strategyId] : undefined;
  return { correct: false, misconceptionId: byStrategy ?? rule.misconceptionId };
}
