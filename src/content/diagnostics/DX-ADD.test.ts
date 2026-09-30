import { describe, expect, it } from 'vitest';
import { DX_ADD } from '@/content/diagnostics/DX-ADD';
import { classify } from '@/engine/diagnostic/classify';
import type { DiagnosticItem, StrategyId } from '@/engine/types';

// ตารางคาดหวังพิมพ์ใหม่จาก Lesson Spec โดยตรง (Tech Spec §8.1) ห้าม import จากไฟล์เนื้อหา

interface ExpectedItem {
  id: string;
  problem: { a: number; b: number } | { whole: number; part: number } | { count: number };
  expected: number;
  fluentMs?: number;
  strategySetId?: 'add.single-digit' | 'add.two-digit';
  ladderSteps: number[];
}

const expectedItems: ExpectedItem[] = [
  { id: '1.1', problem: { count: 7 }, expected: 7, ladderSteps: [1] },
  { id: '1.2', problem: { count: 9 }, expected: 9, ladderSteps: [1] },
  { id: '1.3', problem: { count: 6 }, expected: 6, ladderSteps: [1] },
  { id: '1.4', problem: { count: 8 }, expected: 8, ladderSteps: [1] },
  { id: '2.1', problem: { whole: 10, part: 7 }, expected: 3, fluentMs: 3000, ladderSteps: [2] },
  { id: '2.2', problem: { whole: 10, part: 4 }, expected: 6, fluentMs: 3000, ladderSteps: [2] },
  { id: '2.3', problem: { whole: 10, part: 8 }, expected: 2, fluentMs: 3000, ladderSteps: [2] },
  { id: '2.4', problem: { whole: 10, part: 3 }, expected: 7, fluentMs: 3000, ladderSteps: [2] },
  { id: '3.1', problem: { a: 6, b: 6 }, expected: 12, fluentMs: 3000, ladderSteps: [3] },
  { id: '3.2', problem: { a: 8, b: 8 }, expected: 16, fluentMs: 3000, ladderSteps: [3] },
  {
    id: '3.3',
    problem: { a: 6, b: 7 },
    expected: 13,
    fluentMs: 4000,
    strategySetId: 'add.single-digit',
    ladderSteps: [3],
  },
  {
    id: '3.4',
    problem: { a: 7, b: 8 },
    expected: 15,
    fluentMs: 4000,
    strategySetId: 'add.single-digit',
    ladderSteps: [3],
  },
  {
    id: '4.1',
    problem: { a: 8, b: 5 },
    expected: 13,
    fluentMs: 4000,
    strategySetId: 'add.single-digit',
    ladderSteps: [4],
  },
  {
    id: '4.2',
    problem: { a: 9, b: 6 },
    expected: 15,
    fluentMs: 4000,
    strategySetId: 'add.single-digit',
    ladderSteps: [4],
  },
  {
    id: '4.3',
    problem: { a: 7, b: 4 },
    expected: 11,
    fluentMs: 4000,
    strategySetId: 'add.single-digit',
    ladderSteps: [4],
  },
  {
    id: '4.4',
    problem: { a: 4, b: 9 },
    expected: 13,
    fluentMs: 4000,
    strategySetId: 'add.single-digit',
    ladderSteps: [4],
  },
  { id: '5.1', problem: { a: 47, b: 10 }, expected: 57, fluentMs: 5000, ladderSteps: [5] },
  { id: '5.2', problem: { a: 30, b: 40 }, expected: 70, fluentMs: 5000, ladderSteps: [5] },
  {
    id: '5.3',
    problem: { a: 38, b: 25 },
    expected: 63,
    fluentMs: 15000,
    strategySetId: 'add.two-digit',
    ladderSteps: [6, 7],
  },
  {
    id: '5.4',
    problem: { a: 49, b: 26 },
    expected: 75,
    fluentMs: 15000,
    strategySetId: 'add.two-digit',
    ladderSteps: [8],
  },
];

function findItem(id: string): DiagnosticItem {
  for (const stage of DX_ADD.stages) {
    const item = stage.items.find((it) => it.id === id);
    if (item) return item;
  }
  throw new Error(`ไม่พบข้อ ${id}`);
}

describe('DX-ADD: 20 ข้อตรงกับ Lesson Spec', () => {
  it('มี 20 ข้อ', () => {
    const all = DX_ADD.stages.flatMap((s) => s.items);
    expect(all).toHaveLength(20);
  });

  it.each(expectedItems)('ข้อ $id', (expected) => {
    const item = findItem(expected.id);
    expect(item.expected).toBe(expected.expected);
    expect(item.fluentMs).toBe(expected.fluentMs);
    expect(item.strategySetId).toBe(expected.strategySetId);
    expect([...item.ladderSteps]).toEqual(expected.ladderSteps);
    if ('a' in expected.problem) {
      expect(item.problem).toMatchObject({
        kind: 'arith',
        op: '+',
        a: expected.problem.a,
        b: expected.problem.b,
      });
    } else if ('whole' in expected.problem) {
      expect(item.problem).toMatchObject({
        kind: 'missing-part',
        whole: expected.problem.whole,
        part: expected.problem.part,
      });
    } else {
      expect(item.problem).toMatchObject({ kind: 'subitize', count: expected.problem.count });
    }
  });

  it('ด่าน 1: readyMs 900, flashMs 1500, colorMode single', () => {
    for (const item of DX_ADD.stages[0]!.items) {
      expect(item.visual).toEqual({
        type: 'ten-frame',
        mode: 'flash',
        readyMs: 900,
        flashMs: 1500,
        colorMode: 'single',
      });
    }
  });

  it('skipIf ของ s5', () => {
    expect(DX_ADD.stages.find((s) => s.id === 's5')?.skipIf).toEqual({
      stageId: 's4',
      correctAtMost: 1,
    });
  });

  it('version', () => {
    expect(DX_ADD.version).toBe('DX-ADD v2');
  });
});

type Strategy = StrategyId | undefined;

const classifyCases: [string, number, Strategy, string][] = [
  // ด่าน 1
  ['1.1', 6, undefined, 'M1'],
  ['1.1', 8, undefined, 'M1'],
  ['1.1', 5, undefined, 'M2'],
  ['1.1', 3, undefined, 'M3'],
  ['1.2', 8, undefined, 'M1'],
  ['1.2', 10, undefined, 'M1'],
  ['1.2', 5, undefined, 'M2'],
  ['1.2', 1, undefined, 'M3'],
  ['1.3', 7, undefined, 'M1'],
  ['1.3', 5, undefined, 'M2'],
  ['1.3', 4, undefined, 'M3'],
  ['1.4', 7, undefined, 'M1'],
  ['1.4', 9, undefined, 'M1'],
  ['1.4', 5, undefined, 'M2'],
  ['1.4', 2, undefined, 'M3'],
  // ด่าน 2
  ['2.1', 2, undefined, 'M5'],
  ['2.1', 4, undefined, 'M5'],
  ['2.1', 17, undefined, 'M4'],
  ['2.2', 5, undefined, 'M5'],
  ['2.2', 7, undefined, 'M5'],
  ['2.2', 14, undefined, 'M4'],
  ['2.3', 1, undefined, 'M5'],
  ['2.3', 3, undefined, 'M5'],
  ['2.3', 18, undefined, 'M4'],
  ['2.4', 6, undefined, 'M5'],
  ['2.4', 8, undefined, 'M5'],
  ['2.4', 13, undefined, 'M4'],
  // ด่าน 3
  ['3.1', 11, undefined, 'M5'],
  ['3.1', 13, undefined, 'M5'],
  ['3.1', 2, undefined, 'M6'],
  ['3.2', 15, undefined, 'M5'],
  ['3.2', 17, undefined, 'M5'],
  ['3.2', 6, undefined, 'M6'],
  ['3.3', 12, 'doubles', 'M8'],
  ['3.3', 12, 'make-ten', 'M5'],
  ['3.3', 12, undefined, 'M5'],
  ['3.3', 14, 'doubles', 'M8'],
  ['3.3', 14, 'count-on', 'M5'],
  ['3.3', 3, undefined, 'M6'],
  ['3.4', 14, 'doubles', 'M8'],
  ['3.4', 14, 'known', 'M5'],
  ['3.4', 16, 'doubles', 'M8'],
  ['3.4', 16, undefined, 'M5'],
  ['3.4', 5, undefined, 'M6'],
  // ด่าน 4
  ['4.1', 12, undefined, 'M5'],
  ['4.1', 14, undefined, 'M5'],
  ['4.1', 3, undefined, 'M6'],
  ['4.1', 15, 'doubles', 'M7'],
  ['4.1', 18, undefined, 'M7'],
  ['4.2', 14, undefined, 'M5'],
  ['4.2', 16, 'make-ten', 'M7'],
  ['4.2', 16, 'count-on', 'M5'],
  ['4.2', 16, undefined, 'M5'],
  ['4.2', 19, undefined, 'M7'],
  ['4.2', 5, undefined, 'M6'],
  ['4.3', 10, undefined, 'M5'],
  ['4.3', 12, undefined, 'M5'],
  ['4.3', 1, undefined, 'M6'],
  ['4.3', 14, undefined, 'M7'],
  ['4.3', 17, undefined, 'M7'],
  ['4.4', 12, undefined, 'M5'],
  ['4.4', 14, 'make-ten', 'M7'],
  ['4.4', 14, 'count-fingers', 'M5'],
  ['4.4', 14, undefined, 'M5'],
  ['4.4', 19, undefined, 'M7'],
  ['4.4', 3, undefined, 'M6'],
  // ด่าน 5
  ['5.1', 48, undefined, 'M9'],
  ['5.1', 56, undefined, 'M5'],
  ['5.1', 58, undefined, 'M5'],
  ['5.2', 7, undefined, 'M9'],
  ['5.2', 69, undefined, 'M5'],
  ['5.2', 71, undefined, 'M5'],
  ['5.3', 53, undefined, 'M10'],
  ['5.3', 513, undefined, 'M11'],
  ['5.3', 62, undefined, 'M5'],
  ['5.3', 64, undefined, 'M5'],
  ['5.4', 65, undefined, 'M10'],
  ['5.4', 615, undefined, 'M11'],
  ['5.4', 74, 'round', 'M12'],
  ['5.4', 76, 'round', 'M12'],
  ['5.4', 76, 'column', 'M5'],
  ['5.4', 74, undefined, 'M5'],
];

describe('DX-ADD: classify ตรงกับ Lesson Spec §4', () => {
  it.each(classifyCases)('ข้อ %s ตอบ %i วิธีคิด %s -> %s', (id, response, strategyId, expected) => {
    const item = findItem(id);
    const result = classify(item, response, strategyId);
    expect(result.correct).toBe(false);
    expect(result.misconceptionId).toBe(expected);
  });

  it('คำตอบที่ไม่อยู่ในตาราง -> MX', () => {
    const item = findItem('3.3');
    expect(classify(item, 99).misconceptionId).toBe('MX');
  });

  it('คำตอบถูก -> ไม่มีรหัส ทุกวิธีคิด', () => {
    const item = findItem('3.3');
    const strategies: Strategy[] = [undefined, 'doubles', 'make-ten', 'count-on', 'unsure'];
    for (const strategyId of strategies) {
      const result = classify(item, 13, strategyId);
      expect(result.correct).toBe(true);
      expect(result.misconceptionId).toBeUndefined();
    }
  });
});

describe('DX-ADD: หน้าตัวอย่าง (Lesson Spec §8.2.1)', () => {
  const example = DX_ADD.example!;
  const realCounts = DX_ADD.stages[0]!.items.map((it) =>
    it.problem.kind === 'subitize' ? it.problem.count : -1,
  );

  it('ค่าตรง Lesson Spec: ตัวอย่าง 3 จุดรับเฉพาะ 3, ลองเอง 2 จุด 900/1500/2000 ms', () => {
    expect(example.demo).toEqual({ count: 3, acceptOnly: 3 });
    expect(example.try).toEqual({ count: 2, readyMs: 900, flashMs: 1500, revealMs: 2000 });
  });

  it('จำนวนจุดของตัวอย่างไม่ตรงกับข้อ 1.1-1.4', () => {
    expect(realCounts).toEqual([7, 9, 6, 8]);
    expect(realCounts).not.toContain(example.demo.count);
    expect(realCounts).not.toContain(example.try.count);
  });

  it('readyMs/flashMs ตรงกับข้อจริง', () => {
    const visual = DX_ADD.stages[0]!.items[0]!.visual!;
    expect(example.try.readyMs).toBe(visual.readyMs);
    expect(example.try.flashMs).toBe(visual.flashMs);
  });

  it('ข้อความตรงตัวอักษร และประโยคเฉลยมีเลขเท่ากับจำนวนจุดของข้อลองเอง', () => {
    expect(example.texts.demo).toBe('ตัวอย่าง: ดูจุดทั้งหมดในกล่อง มีกี่จุด พิมพ์ตัวเลขแล้วกด ตอบ');
    expect(example.texts.try).toBe('ลองดูอีกที คราวนี้ภาพจะหายไป พิมพ์ว่าเห็นกี่จุด');
    expect(example.texts.reveal).toBe('มี 2 จุด ต่อไปเป็นข้อจริงแล้ว');
    expect(example.texts.reveal).toContain(String(example.try.count));
  });

  it('version ยังเป็น DX-ADD v2', () => {
    expect(DX_ADD.version).toBe('DX-ADD v2');
  });
});
