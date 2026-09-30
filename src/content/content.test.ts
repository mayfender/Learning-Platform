import { describe, expect, it } from 'vitest';
import { diagnostics, lessons } from '@/content/registry';
import { skills } from '@/content/skills';
import { formatExample, solve } from '@/engine/problem';
import type { Diagnostic, ExampleCheck } from '@/engine/types';

const skillIds = new Set(skills.map((s) => s.id));

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}

function checkDiagnostic(dx: Diagnostic): void {
  describe(`diagnostic ${dx.id}`, () => {
    const allItems = dx.stages.flatMap((s) => s.items.map((item) => ({ stage: s, item })));
    const strategySetById = new Map(dx.strategySets.map((s) => [s.id, s]));
    const misconceptionIds = new Set(dx.misconceptions.map((m) => m.id));

    it('id ข้อไม่ซ้ำ', () => {
      const ids = allItems.map((x) => x.item.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('solve(problem) === expected ทุกข้อ', () => {
      for (const { item } of allItems) {
        expect(solve(item.problem), item.id).toBe(item.expected);
      }
    });

    it('wrongAnswers ถูกต้องตามกติกา', () => {
      for (const { item } of allItems) {
        const responses = item.wrongAnswers.map((w) => w.response);
        expect(new Set(responses).size, `${item.id} ไม่ซ้ำกัน`).toBe(responses.length);
        for (const wrong of item.wrongAnswers) {
          expect(wrong.response, `${item.id} ไม่เท่ากับเฉลย`).not.toBe(item.expected);
          expect(wrong.response, `${item.id} >= 0`).toBeGreaterThanOrEqual(0);
          expect(
            misconceptionIds.has(wrong.misconceptionId),
            `${item.id} misconceptionId มีจริง`,
          ).toBe(true);
          if (wrong.byStrategy) {
            expect(
              item.strategySetId,
              `${item.id} มี byStrategy ต้องมี strategySetId`,
            ).toBeDefined();
            const set = item.strategySetId ? strategySetById.get(item.strategySetId) : undefined;
            const optionIds = new Set(set?.options.map((o) => o.id) ?? []);
            for (const [strategyId, misconceptionId] of Object.entries(wrong.byStrategy)) {
              expect(optionIds.has(strategyId as never), `${item.id} ${strategyId} อยู่ในชุด`).toBe(
                true,
              );
              expect(
                misconceptionIds.has(misconceptionId),
                `${item.id} ${strategyId} รหัสมีจริง`,
              ).toBe(true);
            }
          }
        }
      }
    });

    it('strategySetId, skillId, ladderSteps ถูกต้อง', () => {
      for (const { item } of allItems) {
        if (item.strategySetId) {
          expect(strategySetById.has(item.strategySetId), item.id).toBe(true);
        }
        expect(skillIds.has(item.skillId), `${item.id} skillId ${item.skillId}`).toBe(true);
        for (const step of item.ladderSteps) {
          expect(step).toBeGreaterThanOrEqual(1);
          expect(step).toBeLessThanOrEqual(9);
        }
      }
    });

    it('subitize: count 0-10 และมี visual ten-frame', () => {
      for (const { item } of allItems) {
        if (item.problem.kind === 'subitize') {
          expect(item.problem.count).toBeGreaterThanOrEqual(0);
          expect(item.problem.count).toBeLessThanOrEqual(10);
          expect(item.visual?.type).toBe('ten-frame');
        }
      }
    });

    it('recommendation: no เรียง 1..n, กฎสุดท้าย always, id ที่อ้างถึงมีจริง', () => {
      const rules = dx.recommendation;
      rules.forEach((r, i) => expect(r.no).toBe(i + 1));
      expect(rules[rules.length - 1]!.when.kind).toBe('always');

      const stageIds = new Set(dx.stages.map((s) => s.id));
      const groupIds = new Set(dx.stages.flatMap((s) => s.groups?.map((g) => g.id) ?? []));
      const itemIds = new Set(allItems.map((x) => x.item.id));

      for (const rule of rules) {
        const cond = rule.when;
        if (cond.kind === 'stage-not-good') {
          expect(stageIds.has(cond.stageId), `${rule.no} stageId`).toBe(true);
        } else if (cond.kind === 'group-not-pass') {
          expect(groupIds.has(cond.groupId), `${rule.no} groupId`).toBe(true);
          if (cond.orStageSkipped) {
            expect(stageIds.has(cond.orStageSkipped), `${rule.no} orStageSkipped`).toBe(true);
          }
        } else if (cond.kind === 'item-strategy-not') {
          expect(itemIds.has(cond.itemId), `${rule.no} itemId`).toBe(true);
          const item = allItems.find((x) => x.item.id === cond.itemId)?.item;
          const set = item?.strategySetId ? strategySetById.get(item.strategySetId) : undefined;
          expect(
            set?.options.some((o) => o.id === cond.strategyId),
            `${rule.no} strategyId อยู่ในชุดของข้อ`,
          ).toBe(true);
        }
      }

      for (const stage of dx.stages) {
        for (const group of stage.groups ?? []) {
          for (const itemId of group.itemIds) {
            expect(
              stage.items.some((it) => it.id === itemId),
              `${group.id} itemIds อยู่ในด่าน ${stage.id}`,
            ).toBe(true);
          }
        }
      }
    });

    it('ตัวอย่างวิธีคิด: sums-equal ผลรวมเท่ากัน, formatExample ตรง, ไม่ใบ้', () => {
      const arithPairsBySet = new Map<string, { a: number; b: number }[]>();
      for (const { item } of allItems) {
        if (item.strategySetId && item.problem.kind === 'arith') {
          const list = arithPairsBySet.get(item.strategySetId) ?? [];
          list.push({ a: item.problem.a, b: item.problem.b });
          arithPairsBySet.set(item.strategySetId, list);
        }
      }

      for (const set of dx.strategySets) {
        for (const option of set.options) {
          if (!option.example) continue;
          expect(formatExample.name).toBeDefined();
          if (option.example.check) {
            const check: ExampleCheck = option.example.check;
            expect(formatExample(check)).toBe(option.example.text);
            if (check.kind === 'sums-equal') {
              const sums = check.groups.map((g) => g.reduce((a, b) => a + b, 0));
              expect(new Set(sums).size, `${set.id}/${option.id} ผลรวมเท่ากันทุกกลุ่ม`).toBe(1);

              const firstGroupPair = check.groups[0];
              if (firstGroupPair && firstGroupPair.length === 2) {
                const pairs = arithPairsBySet.get(set.id) ?? [];
                for (const pair of pairs) {
                  expect(
                    sameSet(firstGroupPair, [pair.a, pair.b]),
                    `${set.id}/${option.id} ตัวอย่างไม่ใบ้โจทย์จริง`,
                  ).toBe(false);
                }
              }
            }
          }
        }
      }
    });

    it('numberTalks ครบขั้น 1-9', () => {
      const steps = dx.numberTalks.items.map((t) => t.ladderStep).sort((a, b) => a - b);
      expect(steps).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('texts.stageComplete มี {n} และ {m}', () => {
      expect(dx.texts.stageComplete).toContain('{n}');
      expect(dx.texts.stageComplete).toContain('{m}');
    });
  });
}

describe('content registry', () => {
  it('diagnostics และ lessons ทุกรายการมี id ตรงกับ key', () => {
    for (const [key, diagnostic] of Object.entries(diagnostics)) {
      expect(diagnostic.id).toBe(key);
    }
    for (const [key, lesson] of Object.entries(lessons)) {
      expect(lesson.id).toBe(key);
    }
  });

  for (const dx of Object.values(diagnostics)) {
    checkDiagnostic(dx);
  }
});
