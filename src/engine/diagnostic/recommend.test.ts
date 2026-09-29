import { describe, expect, it } from 'vitest';
import { DX_ADD } from '@/content/diagnostics/DX-ADD';
import { recommend } from '@/engine/diagnostic/recommend';
import type { AnswerRecord } from '@/engine/diagnostic/types';
import type { GroupStatus, GroupSummary, StageSummary } from '@/engine/types';

function stage(
  stageId: string,
  status: StageSummary['status'],
  level: StageSummary['level'] = null,
): StageSummary {
  return {
    stageId,
    number: 0,
    status,
    answered: 0,
    correct: 0,
    fluentCount: null,
    countingCount: null,
    meanLatencyMs: null,
    level,
  };
}

function group(groupId: string, status: GroupStatus): GroupSummary {
  return { groupId, status };
}

function answer54(strategyId: AnswerRecord['strategyId']): AnswerRecord {
  return {
    itemId: '5.4',
    stageId: 's5',
    ladderSteps: [8],
    skillId: 'add.2digit',
    problem: { kind: 'arith', op: '+', a: 49, b: 26 },
    expected: 75,
    response: 75,
    correct: true,
    latencyMs: 5000,
    latencyValid: true,
    fluent: true,
    strategySetId: 'add.two-digit',
    strategyId,
  };
}

describe('recommend — LS §7 หนึ่งกรณีต่อแถว', () => {
  it('1. ด่าน 1 mid → 1', () => {
    const stages = [
      stage('s1', 'done', 'mid'),
      stage('s2', 'done', 'good'),
      stage('s3', 'done', 'good'),
      stage('s4', 'done', 'good'),
      stage('s5', 'skipped', 'skipped'),
    ];
    const groups = [group('5A', 'skipped'), group('5B', 'skipped'), group('5C', 'skipped')];
    expect(recommend(DX_ADD, stages, groups, [])).toEqual({
      kind: 'step',
      ladderStep: 1,
      ruleNo: 1,
    });
  });

  it('2. ด่าน 2 คล่อง 2 ข้อ (mid) → 2', () => {
    const stages = [
      stage('s1', 'done', 'good'),
      stage('s2', 'done', 'mid'),
      stage('s3', 'done', 'good'),
      stage('s4', 'done', 'good'),
      stage('s5', 'skipped', 'skipped'),
    ];
    const groups = [group('5A', 'skipped'), group('5B', 'skipped'), group('5C', 'skipped')];
    expect(recommend(DX_ADD, stages, groups, [])).toEqual({
      kind: 'step',
      ladderStep: 2,
      ruleNo: 2,
    });
  });

  it('3. ข้อ 3.4 เลือก count-fingers → ด่าน 3 mid → 3', () => {
    const stages = [
      stage('s1', 'done', 'good'),
      stage('s2', 'done', 'good'),
      stage('s3', 'done', 'mid'),
      stage('s4', 'done', 'good'),
      stage('s5', 'skipped', 'skipped'),
    ];
    const groups = [group('5A', 'skipped'), group('5B', 'skipped'), group('5C', 'skipped')];
    expect(recommend(DX_ADD, stages, groups, [])).toEqual({
      kind: 'step',
      ladderStep: 3,
      ruleNo: 3,
    });
  });

  it('4. ด่าน 4 นับ 2 ข้อ (mid) → 4', () => {
    const stages = [
      stage('s1', 'done', 'good'),
      stage('s2', 'done', 'good'),
      stage('s3', 'done', 'good'),
      stage('s4', 'done', 'mid'),
      stage('s5', 'skipped', 'skipped'),
    ];
    const groups = [group('5A', 'skipped'), group('5B', 'skipped'), group('5C', 'skipped')];
    expect(recommend(DX_ADD, stages, groups, [])).toEqual({
      kind: 'step',
      ladderStep: 4,
      ruleNo: 4,
    });
  });

  it('5a. 5.1 ถูกแต่ช้ากว่า 5000ms → กลุ่ม 5A fail → 5', () => {
    const stages = [
      stage('s1', 'done', 'good'),
      stage('s2', 'done', 'good'),
      stage('s3', 'done', 'good'),
      stage('s4', 'done', 'good'),
      stage('s5', 'done', null),
    ];
    const groups = [group('5A', 'fail'), group('5B', 'pass'), group('5C', 'pass')];
    expect(recommend(DX_ADD, stages, groups, [])).toEqual({
      kind: 'step',
      ladderStep: 5,
      ruleNo: 5,
    });
  });

  it('5b. ด่าน 5 ถูกข้าม → 5', () => {
    const stages = [
      stage('s1', 'done', 'good'),
      stage('s2', 'done', 'good'),
      stage('s3', 'done', 'good'),
      stage('s4', 'done', 'good'),
      stage('s5', 'skipped', 'skipped'),
    ];
    const groups = [group('5A', 'skipped'), group('5B', 'skipped'), group('5C', 'skipped')];
    expect(recommend(DX_ADD, stages, groups, [])).toEqual({
      kind: 'step',
      ladderStep: 5,
      ruleNo: 5,
    });
  });

  it('6. 5.3 เลือก count-by-one → กลุ่ม 5B fail → 6', () => {
    const stages = [
      stage('s1', 'done', 'good'),
      stage('s2', 'done', 'good'),
      stage('s3', 'done', 'good'),
      stage('s4', 'done', 'good'),
      stage('s5', 'done', null),
    ];
    const groups = [group('5A', 'pass'), group('5B', 'fail'), group('5C', 'pass')];
    expect(recommend(DX_ADD, stages, groups, [])).toEqual({
      kind: 'step',
      ladderStep: 6,
      ruleNo: 6,
    });
  });

  it('7. 5.4 ผิด → กลุ่ม 5C fail → 7', () => {
    const stages = [
      stage('s1', 'done', 'good'),
      stage('s2', 'done', 'good'),
      stage('s3', 'done', 'good'),
      stage('s4', 'done', 'good'),
      stage('s5', 'done', null),
    ];
    const groups = [group('5A', 'pass'), group('5B', 'pass'), group('5C', 'fail')];
    expect(recommend(DX_ADD, stages, groups, [])).toEqual({
      kind: 'step',
      ladderStep: 7,
      ruleNo: 7,
    });
  });

  it('8. 5.4 ผ่าน เลือก column (ไม่ใช่ round) → 8', () => {
    const stages = [
      stage('s1', 'done', 'good'),
      stage('s2', 'done', 'good'),
      stage('s3', 'done', 'good'),
      stage('s4', 'done', 'good'),
      stage('s5', 'done', null),
    ];
    const groups = [group('5A', 'pass'), group('5B', 'pass'), group('5C', 'pass')];
    expect(recommend(DX_ADD, stages, groups, [answer54('column')])).toEqual({
      kind: 'step',
      ladderStep: 8,
      ruleNo: 8,
    });
  });

  it('8b. 5.4 เลือก unsure (ไม่ใช่ round) → 8', () => {
    const stages = [
      stage('s1', 'done', 'good'),
      stage('s2', 'done', 'good'),
      stage('s3', 'done', 'good'),
      stage('s4', 'done', 'good'),
      stage('s5', 'done', null),
    ];
    const groups = [group('5A', 'pass'), group('5B', 'pass'), group('5C', 'pass')];
    expect(recommend(DX_ADD, stages, groups, [answer54('unsure')])).toEqual({
      kind: 'step',
      ladderStep: 8,
      ruleNo: 8,
    });
  });

  it('9. 5.4 เลือก round → 9', () => {
    const stages = [
      stage('s1', 'done', 'good'),
      stage('s2', 'done', 'good'),
      stage('s3', 'done', 'good'),
      stage('s4', 'done', 'good'),
      stage('s5', 'done', null),
    ];
    const groups = [group('5A', 'pass'), group('5B', 'pass'), group('5C', 'pass')];
    expect(recommend(DX_ADD, stages, groups, [answer54('round')])).toEqual({
      kind: 'step',
      ladderStep: 9,
      ruleNo: 9,
    });
  });
});

describe('recommend — หยุดกลางทาง (LS §7)', () => {
  it('หยุดในด่าน 1 → incomplete', () => {
    const stages = [
      stage('s1', 'incomplete'),
      stage('s2', 'not-reached'),
      stage('s3', 'not-reached'),
      stage('s4', 'not-reached'),
      stage('s5', 'not-reached'),
    ];
    expect(recommend(DX_ADD, stages, [], [])).toEqual({ kind: 'incomplete' });
  });

  it('ด่าน 1 mid แล้วหยุดในด่าน 2 → 1', () => {
    const stages = [
      stage('s1', 'done', 'mid'),
      stage('s2', 'incomplete'),
      stage('s3', 'not-reached'),
      stage('s4', 'not-reached'),
      stage('s5', 'not-reached'),
    ];
    expect(recommend(DX_ADD, stages, [], [])).toEqual({ kind: 'step', ladderStep: 1, ruleNo: 1 });
  });

  it('ด่าน 1–2 good หยุดในด่าน 3 → incomplete', () => {
    const stages = [
      stage('s1', 'done', 'good'),
      stage('s2', 'done', 'good'),
      stage('s3', 'incomplete'),
      stage('s4', 'not-reached'),
      stage('s5', 'not-reached'),
    ];
    expect(recommend(DX_ADD, stages, [], [])).toEqual({ kind: 'incomplete' });
  });

  it('ด่าน 1–4 good ด่าน 5 ตอบ 2 ข้อ → incomplete', () => {
    const stages = [
      stage('s1', 'done', 'good'),
      stage('s2', 'done', 'good'),
      stage('s3', 'done', 'good'),
      stage('s4', 'done', 'good'),
      stage('s5', 'incomplete'),
    ];
    const groups = [
      group('5A', 'not-evaluated'),
      group('5B', 'not-evaluated'),
      group('5C', 'not-evaluated'),
    ];
    expect(recommend(DX_ADD, stages, groups, [])).toEqual({ kind: 'incomplete' });
  });

  it('ด่าน 1 good ด่าน 2 low หยุดในด่าน 4 → 2', () => {
    const stages = [
      stage('s1', 'done', 'good'),
      stage('s2', 'done', 'low'),
      stage('s3', 'done', 'good'),
      stage('s4', 'incomplete'),
      stage('s5', 'not-reached'),
    ];
    expect(recommend(DX_ADD, stages, [], [])).toEqual({ kind: 'step', ladderStep: 2, ruleNo: 2 });
  });
});
