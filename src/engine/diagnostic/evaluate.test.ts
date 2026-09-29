import { describe, expect, it } from 'vitest';
import { DX_ADD } from '@/content/diagnostics/DX-ADD';
import { evaluateGroup, isFluent, summarizeStage } from '@/engine/diagnostic/evaluate';
import type { AnswerRecord } from '@/engine/diagnostic/types';
import type { DiagnosticItem, StrategyId } from '@/engine/types';

function findItem(id: string): DiagnosticItem {
  for (const stage of DX_ADD.stages) {
    const item = stage.items.find((it) => it.id === id);
    if (item) return item;
  }
  throw new Error(`ไม่พบข้อ ${id}`);
}

function answer(itemId: string, overrides: Partial<AnswerRecord> = {}): AnswerRecord {
  const item = findItem(itemId);
  const stage = DX_ADD.stages.find((s) => s.items.some((it) => it.id === itemId))!;
  const correct = overrides.correct ?? true;
  const response = overrides.response ?? item.expected;
  const latencyMs = overrides.latencyMs ?? 100;
  const latencyValid = overrides.latencyValid ?? true;
  return {
    itemId,
    stageId: stage.id,
    ladderSteps: item.ladderSteps,
    skillId: item.skillId,
    problem: item.problem,
    expected: item.expected,
    response,
    correct,
    latencyMs,
    latencyValid,
    fluent: isFluent(item, correct, latencyMs, latencyValid),
    strategySetId: item.strategySetId,
    strategyId: overrides.strategyId,
    ...overrides,
  };
}

describe('isFluent', () => {
  const item = findItem('3.3'); // fluentMs 4000

  it('ไม่มี fluentMs → null', () => {
    expect(isFluent(findItem('1.1'), true, 100, true)).toBeNull();
  });
  it('ผิด → false เสมอ', () => {
    expect(isFluent(item, false, 100, true)).toBe(false);
    expect(isFluent(item, false, 100, false)).toBe(false);
  });
  it('ถูกแต่เวลาใช้ไม่ได้ → true', () => {
    expect(isFluent(item, true, 999999, false)).toBe(true);
  });
  it('ถูกและเวลา <= เกณฑ์พอดี → true', () => {
    expect(isFluent(item, true, 4000, true)).toBe(true);
  });
  it('ถูกและเวลาเกินเกณฑ์ → false', () => {
    expect(isFluent(item, true, 4001, true)).toBe(false);
  });
});

const s2 = DX_ADD.stages.find((s) => s.id === 's2')!;
const s3 = DX_ADD.stages.find((s) => s.id === 's3')!;
const s4 = DX_ADD.stages.find((s) => s.id === 's4')!;

describe('summarizeStage — ระดับด่าน 2 (LS §6)', () => {
  it('ถูก 4 คล่อง 2 → mid', () => {
    const answers = [
      answer('2.1', { latencyMs: 2000 }),
      answer('2.2', { latencyMs: 2000 }),
      answer('2.3', { latencyMs: 5000 }),
      answer('2.4', { latencyMs: 5000 }),
    ];
    const summary = summarizeStage(DX_ADD, s2, answers, []);
    expect(summary.correct).toBe(4);
    expect(summary.fluentCount).toBe(2);
    expect(summary.level).toBe('mid');
  });

  it('ถูก 4 คล่อง 3 → good', () => {
    const answers = [
      answer('2.1', { latencyMs: 2000 }),
      answer('2.2', { latencyMs: 2000 }),
      answer('2.3', { latencyMs: 2000 }),
      answer('2.4', { latencyMs: 5000 }),
    ];
    const summary = summarizeStage(DX_ADD, s2, answers, []);
    expect(summary.level).toBe('good');
  });
});

describe('summarizeStage — ระดับด่าน 3 (นับเป็นการนับ)', () => {
  it('3.3 เลือก count-on (การนับ) → mid แม้ถูกครบคล่องครบ', () => {
    const answers = [
      answer('3.1', { latencyMs: 1000 }),
      answer('3.2', { latencyMs: 1000 }),
      answer('3.3', { latencyMs: 1000, strategyId: 'count-on' as StrategyId }),
      answer('3.4', { latencyMs: 1000, strategyId: 'known' as StrategyId }),
    ];
    const summary = summarizeStage(DX_ADD, s3, answers, []);
    expect(summary.correct).toBe(4);
    expect(summary.countingCount).toBe(1);
    expect(summary.level).toBe('mid');
  });

  it('unsure ไม่นับเป็นการนับ → good', () => {
    const answers = [
      answer('3.1', { latencyMs: 1000 }),
      answer('3.2', { latencyMs: 1000 }),
      answer('3.3', { latencyMs: 1000, strategyId: 'unsure' as StrategyId }),
      answer('3.4', { latencyMs: 1000, strategyId: 'known' as StrategyId }),
    ];
    const summary = summarizeStage(DX_ADD, s3, answers, []);
    expect(summary.countingCount).toBe(0);
    expect(summary.level).toBe('good');
  });
});

describe('summarizeStage — ระดับด่าน 4 (maxCounting 1)', () => {
  function stage4Answers(countingStrategies: StrategyId[]): AnswerRecord[] {
    const ids = ['4.1', '4.2', '4.3', '4.4'];
    return ids.map((id, i) =>
      answer(id, {
        latencyMs: 1000,
        strategyId: countingStrategies[i] ?? 'known',
      }),
    );
  }

  it('นับ 2 ข้อ → mid', () => {
    const answers = stage4Answers(['count-fingers', 'count-on'] as StrategyId[]);
    const summary = summarizeStage(DX_ADD, s4, answers, []);
    expect(summary.countingCount).toBe(2);
    expect(summary.level).toBe('mid');
  });

  it('นับ 1 ข้อ → good', () => {
    const answers = stage4Answers(['count-fingers'] as StrategyId[]);
    const summary = summarizeStage(DX_ADD, s4, answers, []);
    expect(summary.countingCount).toBe(1);
    expect(summary.level).toBe('good');
  });
});

describe('evaluateGroup — 5A/5B/5C', () => {
  const s5 = DX_ADD.stages.find((s) => s.id === 's5')!;
  const group5A = s5.groups!.find((g) => g.id === '5A')!;
  const group5B = s5.groups!.find((g) => g.id === '5B')!;

  it('stage skipped → skipped', () => {
    expect(evaluateGroup(group5A, [], 'skipped')).toBe('skipped');
  });

  it('stage ไม่ done → not-evaluated', () => {
    expect(evaluateGroup(group5A, [], 'incomplete')).toBe('not-evaluated');
  });

  it('5A ผ่านเมื่อถูกและคล่องทั้ง 2 ข้อ', () => {
    const answers = [answer('5.1', { latencyMs: 1000 }), answer('5.2', { latencyMs: 1000 })];
    expect(evaluateGroup(group5A, answers, 'done')).toBe('pass');
  });

  it('5A ไม่ผ่านเมื่อช้ากว่าเกณฑ์', () => {
    const answers = [answer('5.1', { latencyMs: 9000 }), answer('5.2', { latencyMs: 1000 })];
    expect(evaluateGroup(group5A, answers, 'done')).toBe('fail');
  });

  it('5B ไม่ผ่านเมื่อเลือก count-by-one', () => {
    const answers = [answer('5.3', { latencyMs: 1000, strategyId: 'count-by-one' as StrategyId })];
    expect(evaluateGroup(group5B, answers, 'done')).toBe('fail');
  });

  it('5B ผ่านเมื่อถูก คล่อง และไม่ใช่ count-by-one', () => {
    const answers = [answer('5.3', { latencyMs: 1000, strategyId: 'column' as StrategyId })];
    expect(evaluateGroup(group5B, answers, 'done')).toBe('pass');
  });
});
