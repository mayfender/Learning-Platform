import { describe, expect, it } from 'vitest';
import type { LessonAction } from '@/engine/lesson/machine';
import type { Run } from '@/engine/lesson/testHarness';
import {
  lesson,
  newRun,
  planFor,
  play,
  reviewPlan,
  toStored,
  type Policy,
} from '@/engine/lesson/testHarness';

const T = { latencyMs: 1200, latencyValid: true, flashInterrupted: false };
const submit = (response: number, extra: Partial<typeof T> = {}): LessonAction => ({
  type: 'SUBMIT',
  response,
  answeredAt: '2026-01-01T00:00:00.000Z',
  ...T,
  ...extra,
});
const fields = (gap: number, rest: number, total: number): LessonAction => ({
  type: 'SUBMIT_FIELDS',
  values: { gap, rest, total },
  answeredAt: '2026-01-01T00:00:00.000Z',
  ...T,
});

// ให้ c3 ช้า (5100 ms) เพื่อไม่ให้ข้าม A1/A2 (ทำครบส่วน A)
const noSkip: Policy = { latencyMs: (i) => (i.id === 'c3' ? 5100 : 1000) };

// พาเครื่องไปยังข้อ id ที่ต้องการ (ตอบถูกทุกข้อก่อนหน้า) แล้วหยุดที่ขั้น answering ของข้อนั้น
function runTo(itemId: string, policy: Policy = noSkip, plan = planFor()): Run {
  const run = newRun(plan);
  play(run, {
    ...policy,
    stopWhen: (r) =>
      r.phase.kind === 'item' && r.phase.item.id === itemId && r.phase.view.stage === 'answering',
  });
  return run;
}

// ผ่าน "พร้อมนะ..." และแฟลช ไปถึงขั้นตอบ
function flash(run: Run): void {
  run.fire();
  run.do({ type: 'FLASH_END' });
}

function itemPhase(run: Run) {
  if (run.phase.kind !== 'item') throw new Error(`phase = ${run.phase.kind}`);
  return run.phase;
}

describe('ครั้งที่ 1: ทำครบ (เช็คก่อน + A) ตอบถูกครั้งแรกทุกข้อ', () => {
  it('ได้ event 27 ตัวตามลำดับ และ 28 เมื่อกรอกบันทึกพ่อ 1 ครั้ง (AC17)', () => {
    const run = play(newRun(planFor()), noSkip);
    expect(run.phase.kind).toBe('sitting-end');
    expect(run.events).toHaveLength(27);
    const counts = run
      .types()
      .reduce<Record<string, number>>((m, t) => ({ ...m, [t]: (m[t] ?? 0) + 1 }), {});
    expect(counts).toEqual({
      'session.started': 1,
      'block.started': 2,
      'item.answered': 21,
      'block.completed': 2,
      'session.completed': 1,
    });
    expect(run.types()[0]).toBe('session.started');
    expect(run.types().at(-1)).toBe('session.completed');
    expect(run.of('block.started').map((b) => b.blockKind)).toEqual(['check', 'A']);
    expect(run.of('block.completed').map((b) => [b.blockKind, b.outcome])).toEqual([
      ['check', 'done'],
      ['A', 'passed'],
    ]);
    expect(run.of('session.started')[0]).toMatchObject({ activityKind: 'lesson', sitting: 1 });

    const withNote = play(newRun(planFor()), {
      ...noSkip,
      note: { fingers: 'some', mouth: 'none', note: 'ใช้นิ้วช่วยบางข้อ' },
    });
    expect(withNote.events).toHaveLength(28);
    const noted = withNote.of('parent.noted');
    expect(noted).toHaveLength(1);
    expect(noted[0]).toMatchObject({ blockKind: 'A', fingers: 'some', mouth: 'none' });
    // parent.noted อยู่ก่อน session.completed
    expect(withNote.types().slice(-2)).toEqual(['parent.noted', 'session.completed']);
  });

  it('ทุก item.answered มี blockId section mode และ blockId ตรงกับ block.started', () => {
    const run = play(newRun(planFor()), noSkip);
    const blockIds = new Set(run.of('block.started').map((b) => b.blockId));
    for (const a of run.of('item.answered')) {
      expect(a.blockId).toBeDefined();
      expect(blockIds.has(a.blockId!)).toBe(true);
      expect(a.section).toBeDefined();
      expect(a.mode).toBeDefined();
      expect(a.attemptNo).toBe(1);
    }
    const sections = run.of('item.answered').map((a) => a.section);
    expect(sections.filter((s) => s === 'c')).toHaveLength(6);
    expect(sections.filter((s) => s === 'A1')).toHaveLength(3);
    expect(sections.filter((s) => s === 'A2')).toHaveLength(6);
    expect(sections.filter((s) => s === 'A3')).toHaveLength(6);
  });

  it('ข้อที่ถามในหัวเห็นอะไร (A3) มี strategyId ในชุด add.mind-view และ strategyLatencyMs', () => {
    const run = play(newRun(planFor()), noSkip);
    const a3 = run.of('item.answered').filter((a) => a.section === 'A3');
    for (const a of a3) {
      expect(a.strategySetId).toBe('add.mind-view');
      expect(['see-box', 'see-number', 'count-fingers', 'count-in-head', 'unsure']).toContain(
        a.strategyId,
      );
      expect(a.strategyLatencyMs).toBe(900);
    }
    for (const a of run.of('item.answered').filter((x) => x.section !== 'A3')) {
      expect(a.strategyId).toBeUndefined();
    }
  });
});

describe('เช็คก่อน: flow เงียบ', () => {
  it('c1: พร้อมนะ (900 ms) → แฟลช → ตอบ; ไม่มี feedback ใน phase; ack หมุนเวียนไม่ขึ้นกับถูกผิด', () => {
    const run = newRun(planFor());
    run.do({ type: 'START' });
    expect(run.phase.kind).toBe('block-intro');
    expect(run.phase.kind === 'block-intro' && run.phase.text).toBe(lesson.texts.intros.check);
    const effects = run.do({ type: 'BLOCK_GO' });
    expect(effects.filter((e) => e.type === 'schedule')).toEqual([
      { type: 'schedule', afterMs: 900, action: 'READY_DONE' },
    ]);
    expect(itemPhase(run).item.id).toBe('c1');
    expect(itemPhase(run).view.stage).toBe('ready');
    // ตอบระหว่าง ready/show ไม่ได้
    run.do(submit(3));
    expect(run.of('item.answered')).toHaveLength(0);
    run.fire();
    expect(itemPhase(run).view.stage).toBe('show');
    run.do({ type: 'FLASH_END' });
    expect(itemPhase(run).view.stage).toBe('answering');

    // ตอบผิด (7) → ack ไม่บอกถูกผิด แล้วไปข้อถัดไป และไม่มี feedback
    const eff = run.do(submit(7));
    expect(eff.find((e) => e.type === 'schedule')).toEqual({
      type: 'schedule',
      afterMs: 1000,
      action: 'ACK_DONE',
    });
    expect(itemPhase(run).view.stage).toBe('ack');
    expect(itemPhase(run).view.feedback).toBeNull();
    const ack1 = itemPhase(run).view.ackText;
    expect(lesson.texts.acks).toContain(ack1);
    run.fire();
    expect(itemPhase(run).item.id).toBe('c2');
    expect(run.of('item.answered')).toHaveLength(1);
    expect(run.of('item.answered')[0]).toMatchObject({
      itemId: 'c1',
      response: 7,
      expected: 3,
      correct: false,
      misconceptionId: 'L1',
      section: 'c',
      mode: 'fade',
      attemptNo: 1,
    });
  });

  it('ack หมุนตามลำดับข้อ ไม่ขึ้นกับถูกผิด', () => {
    const run = newRun(planFor());
    const acks: string[] = [];
    play(run, {
      response: (item) => (item.id === 'c2' ? 99 : undefined),
      stopWhen: (r) => {
        if (r.phase.kind === 'item' && r.phase.view.stage === 'ack') {
          const t = r.phase.view.ackText!;
          if (acks.length === 0 || acks.at(-1) !== `${r.phase.item.id}:${t}`)
            acks.push(`${r.phase.item.id}:${t}`);
        }
        return r.of('item.answered').length >= 6;
      },
    });
    expect(acks.slice(0, 4).map((x) => x.split(':')[1])).toEqual([
      lesson.texts.acks[0],
      lesson.texts.acks[1],
      lesson.texts.acks[2],
      lesson.texts.acks[0],
    ]);
  });

  it('c4–c6 เป็นโจทย์ตัวเลขทันที (ไม่มีแฟลช) และไม่ถามวิธีคิด', () => {
    const run = runTo('c4');
    const p = itemPhase(run);
    expect(p.item.flow).toBe('silent-text');
    expect(p.view.stage).toBe('answering');
    run.do(submit(13));
    run.fire();
    expect(itemPhase(run).item.id).toBe('c5');
    expect(run.of('item.answered').every((a) => a.strategyId === undefined)).toBe(true);
  });
});

describe('กฎข้ามจากเช็คก่อน (AC3)', () => {
  function startedBlock(policy: Policy, kind: 'A' | 'B'): ReturnType<typeof play> {
    // เล่นเช็คก่อน แล้วหยุดที่ข้อแรกของ block ที่ต้องการ
    return play(newRun(planFor()), {
      ...policy,
      stopWhen: (r) =>
        r.of('block.started').some((b) => b.blockKind === kind) &&
        r.phase.kind === 'item' &&
        r.phase.stepIdx === 0,
    });
  }

  it('(ก) c1–c3 ถูกหมด ≤ 5 วินาที → ไม่เห็น A1, A2 เห็น A3 เลย', () => {
    const run = startedBlock({ latencyMs: () => 5000 }, 'A');
    expect(itemPhase(run).item.id).toBe('A3.1');
    const started = run.of('block.started').find((b) => b.blockKind === 'A')!;
    expect(started.skipped).toEqual({
      itemIds: ['A1.1', 'A1.2', 'A1.3', 'A2.1', 'A2.2', 'A2.3', 'A2.4', 'A2.5', 'A2.6'],
      reason: 'check',
    });
  });

  it('(ข) c3 ช้า 5.1 วินาที → เห็น A1 และไม่มี skipped', () => {
    const run = startedBlock(noSkip, 'A');
    expect(itemPhase(run).item.id).toBe('A1.1');
    expect(run.of('block.started').find((b) => b.blockKind === 'A')!.skipped).toBeUndefined();
  });

  it('(ก2) c1–c3 ตอบผิดข้อเดียว → ไม่ข้าม', () => {
    const run = startedBlock(
      { latencyMs: () => 1000, response: (i) => (i.id === 'c2' ? 8 : undefined) },
      'A',
    );
    expect(itemPhase(run).item.id).toBe('A1.1');
  });

  it('(ก3) แท็บซ่อนและถูก = เร็ว → ข้าม', () => {
    const run = startedBlock({ latencyMs: () => 99999, latencyValid: () => false }, 'A');
    expect(itemPhase(run).item.id).toBe('A3.1');
  });

  it('(ค,ง) ส่วน B: c4–c6 ถูกหมด ≤ 8 วินาที → ไม่เห็น B1/B2 เห็น B3; c5 ผิด → เห็น B1 และ B2', () => {
    // ครั้งที่ 2 ต้องมี log ของครั้งที่ 1 ก่อน (เช็คก่อนที่ทำแล้วบอกการข้าม B)
    const first = play(newRun(planFor()), { latencyMs: () => 8000 });
    const stored = toStoredAll(first);
    const run = play(newRun(planFor(stored)), {
      stopWhen: (r) =>
        r.of('block.started').some((b) => b.blockKind === 'B') &&
        r.phase.kind === 'item' &&
        r.phase.stepIdx === 0,
    });
    expect(itemPhase(run).item.id).toBe('B3.1');
    const b = run.of('block.started').find((x) => x.blockKind === 'B')!;
    expect(b.skipped?.reason).toBe('check');
    expect(b.skipped?.itemIds).toEqual(['B1.1', 'B1.2', 'B1.3', 'B2.q1', 'B2.q2']);

    const firstBad = play(newRun(planFor()), {
      latencyMs: () => 8000,
      response: (i) => (i.id === 'c5' ? 15 : undefined),
    });
    const run2 = play(newRun(planFor(toStoredAll(firstBad))), {
      stopWhen: (r) =>
        r.of('block.started').some((x) => x.blockKind === 'B') &&
        r.phase.kind === 'item' &&
        r.phase.stepIdx === 0,
    });
    expect(itemPhase(run2).item.id).toBe('B1.1');
    expect(run2.of('block.started').find((x) => x.blockKind === 'B')!.skipped).toBeUndefined();
  });
});

function toStoredAll(run: Run) {
  return toStored(run.events, { sessionId: 's-prev' });
}

describe('A1 (guided-fill)', () => {
  it('แตะช่องว่างเติมทีละช่อง แตะช่องที่มีจุด/เติมแล้วไม่มีผล ตอบ 8 → L1 ไฮไลต์ช่องว่าง ตอบ 2 → ข้อความถูก', () => {
    const run = runTo('A1.1');
    let v = itemPhase(run).view;
    expect(v.added).toEqual([]);
    run.do({ type: 'TAP_CELL', index: 8 });
    expect(itemPhase(run).view.added).toEqual([8]);
    run.do({ type: 'TAP_CELL', index: 3 }); // ช่องที่มีจุด
    run.do({ type: 'TAP_CELL', index: 8 }); // เติมแล้ว
    expect(itemPhase(run).view.added).toEqual([8]);
    expect(itemPhase(run).view.manip.taps).toBe(1);

    run.do(submit(8));
    v = itemPhase(run).view;
    expect(v.stage).toBe('answering');
    expect(v.feedback).toMatchObject({
      kind: 'wrong',
      misconceptionId: 'L1',
      highlight: 'gap-cells',
    });
    expect(v.feedback!.texts).toEqual([lesson.texts.feedback.l1]);
    expect(v.attempts.gap).toBe(1);

    run.do(submit(2));
    v = itemPhase(run).view;
    expect(v.stage).toBe('feedback');
    expect(v.feedback!.kind).toBe('correct');
    expect(v.feedback!.texts).toEqual(['ใช่ ช่องว่าง 2 ช่อง 8 กับ 2 ได้ 10']);
    expect(v.added).toEqual([8, 9]);
    const evs = run.of('item.answered').filter((a) => a.itemId === 'A1.1');
    expect(evs.map((e) => [e.attemptNo, e.response, e.correct, e.stepId, e.revealed])).toEqual([
      [1, 8, false, 'gap', undefined],
      [2, 2, true, 'gap', undefined],
    ]);
    expect(evs[0]!.manip).toEqual({ taps: 1, drops: 0, rejected: 0 });
    run.do({ type: 'NEXT' });
    expect(itemPhase(run).item.id).toBe('A1.2');
  });

  it('A1.2 (6 จุด) ตอบ 5 → M5 ข้อความตาม LS', () => {
    const run = runTo('A1.2');
    run.do(submit(5));
    expect(itemPhase(run).view.feedback).toMatchObject({ misconceptionId: 'M5' });
    expect(itemPhase(run).view.feedback!.texts[0]).toBe(
      'ลองดูทีละแถว แถวบนเต็ม 5 แล้ว แถวล่างมีอีกกี่ช่อง',
    );
  });

  it('M4 และ MX ใช้ข้อความ P4/P5 (ส่วน A)', () => {
    const run = runTo('A1.1');
    run.do(submit(18));
    expect(itemPhase(run).view.feedback!.texts).toEqual([lesson.texts.feedback.m4]);
    run.do(submit(99));
    expect(itemPhase(run).view.feedback!.texts).toEqual([lesson.texts.feedback.mxA]);
  });

  it('ตอบผิดครบ 3 ครั้ง → เฉลยให้ (revealed: true ที่ครั้งที่ 3) เติมช่องว่างครบ', () => {
    const run = runTo('A1.1');
    run.do(submit(8));
    run.do(submit(8));
    expect(itemPhase(run).view.stage).toBe('answering');
    run.do(submit(8));
    const v = itemPhase(run).view;
    expect(v.stage).toBe('feedback');
    expect(v.feedback!.kind).toBe('revealed');
    expect(v.feedback!.texts).toEqual([
      lesson.texts.feedback.reveal,
      'ใช่ ช่องว่าง 2 ช่อง 8 กับ 2 ได้ 10',
    ]);
    expect(v.added).toEqual([8, 9]);
    const evs = run.of('item.answered').filter((a) => a.itemId === 'A1.1');
    expect(evs.map((e) => e.revealed)).toEqual([undefined, undefined, true]);
    expect(evs.map((e) => e.attemptNo)).toEqual([1, 2, 3]);
  });

  it('เปลี่ยนหน้าเฉลยแล้วตอบซ้ำไม่ได้ (action ผิด phase ไม่มีผล)', () => {
    const run = runTo('A1.1');
    run.do(submit(2));
    const before = run.events.length;
    run.do(submit(2));
    run.do({ type: 'TAP_CELL', index: 9 });
    expect(run.events.length).toBe(before);
  });
});

describe('A2 (teach-flash-gap)', () => {
  it('แฟลช 6 จุด → ตอบ 6 → เฉลย L1 ครั้งเดียวไม่ให้แก้; ตอบ 3/5 → M5; emit ตอน SUBMIT', () => {
    const run = runTo('A2.1');
    const before = run.events.length;
    run.do(submit(6));
    expect(run.events.length).toBe(before + 1);
    let v = itemPhase(run).view;
    expect(v.stage).toBe('feedback');
    expect(v.feedback).toMatchObject({
      kind: 'wrong',
      misconceptionId: 'L1',
      highlight: 'gap-cells',
    });
    expect(v.feedback!.texts).toEqual([lesson.texts.feedback.l1]);
    // ไม่ให้แก้: SUBMIT ซ้ำไม่มีผล
    run.do(submit(4));
    expect(run.events.length).toBe(before + 1);
    run.do({ type: 'NEXT' });
    expect(itemPhase(run).item.id).toBe('A2.2');

    const run2 = runTo('A2.1');
    run2.do(submit(5));
    v = itemPhase(run2).view;
    expect(v.feedback).toMatchObject({ misconceptionId: 'M5' });
    const evs = run2.of('item.answered').filter((a) => a.itemId === 'A2.1');
    expect(evs).toHaveLength(1);
    expect(evs[0]).toMatchObject({ response: 5, expected: 4, misconceptionId: 'M5', mode: 'fade' });
  });

  it('ตอบถูก → ข้อความถูกของ A1 (P2) ตรงตัวอักษร', () => {
    const run = runTo('A2.1');
    run.do(submit(4));
    expect(itemPhase(run).view.feedback).toMatchObject({ kind: 'correct' });
    expect(itemPhase(run).view.feedback!.texts).toEqual(['ใช่ ช่องว่าง 4 ช่อง 6 กับ 4 ได้ 10']);
  });
});

describe('A3 (mind-gap)', () => {
  it('ตอบแล้วถามในหัวเห็นอะไร; emit หลังเลือกเท่านั้น; เลือกนับนิ้วได้ข้อความ LS ตรงตัวอักษร', () => {
    const run = runTo('A3.1');
    expect(itemPhase(run).item.problem).toMatchObject({ missing: 'second', part: 7 });
    const before = run.events.length;
    run.do(submit(3));
    expect(run.events.length).toBe(before);
    expect(itemPhase(run).view.stage).toBe('mind');
    run.do({ type: 'STRATEGY_SKIP' }); // บังคับ ข้ามไม่ได้
    expect(itemPhase(run).view.stage).toBe('mind');
    run.do({ type: 'STRATEGY_PICK', strategyId: 'count-fingers', strategyLatencyMs: 2300 });
    expect(run.events.length).toBe(before + 1);
    const ev = run.of('item.answered').at(-1)!;
    expect(ev).toMatchObject({
      itemId: 'A3.1',
      correct: true,
      strategySetId: 'add.mind-view',
      strategyId: 'count-fingers',
      strategyLatencyMs: 2300,
      mode: 'mind',
    });
    const v = itemPhase(run).view;
    expect(v.stage).toBe('feedback');
    expect(v.feedback!.texts).toEqual([
      'ใช่ ช่องว่าง 3 ช่อง 7 กับ 3 ได้ 10',
      'นิ้วช่วยได้นะ ลองนึกภาพกล่อง 10 ช่องดูสิ ช่องว่างอยู่ตรงไหน',
    ]);
  });

  it('ตอบผิด → กล่อง n จุดพร้อมไฮไลต์ช่องว่างและ "ลองนึกกล่อง 10 ช่องที่มี {n} จุด"', () => {
    const run = runTo('A3.2'); // ? + 4 = 10
    run.do(submit(4)); // L1
    run.do({ type: 'STRATEGY_PICK', strategyId: 'see-box' });
    const v = itemPhase(run).view;
    expect(v.feedback).toMatchObject({
      kind: 'wrong',
      misconceptionId: 'L1',
      highlight: 'gap-cells',
    });
    expect(v.feedback!.texts).toEqual(['ลองนึกกล่อง 10 ช่องที่มี 4 จุด']);
    expect(run.of('item.answered').at(-1)).toMatchObject({ response: 4, misconceptionId: 'L1' });
  });

  it('ไม่รู้จักตัวเลือก → ไม่มีผล', () => {
    const run = runTo('A3.1');
    run.do(submit(3));
    run.do({ type: 'STRATEGY_PICK', strategyId: 'doubles' });
    expect(itemPhase(run).view.stage).toBe('mind');
  });

  it('ปิดแอปตอนอยู่หน้าเลือกวิธีคิด: ข้อที่ตอบแล้วยังไม่ถูกบันทึก (เหมือน DX-ADD D5)', () => {
    const run = runTo('A3.1');
    run.do(submit(3));
    const before = run.of('item.answered').length;
    run.do({ type: 'STOP' });
    expect(run.of('item.answered').length).toBe(before);
    expect(run.types().at(-1)).toBe('session.abandoned');
  });
});

describe('ส่วน A: ผ่าน/ไม่ผ่านและกฎ', () => {
  it('จบส่วน A ผ่าน: ข้อสรุปกฎ A แล้วจบ block (rule phase)', () => {
    const run = runTo('A3.6');
    run.do(submit(1));
    run.do({ type: 'STRATEGY_PICK', strategyId: 'see-box' });
    run.do({ type: 'NEXT' });
    expect(run.phase).toEqual({ kind: 'rule', which: 'A', text: lesson.texts.rules.A });
    run.do({ type: 'NEXT' });
    expect(run.phase.kind).toBe('handover');
    expect(run.of('block.completed').at(-1)).toMatchObject({ blockKind: 'A', outcome: 'passed' });
  });
});

describe('ส่วน B', () => {
  // ทำครั้งที่ 1 ให้ผ่าน A แล้วเปิดครั้งที่ 2
  function sitting2(policy: Policy = {}, stopWhen?: (r: Run) => boolean): Run {
    const first = play(newRun(planFor()), {
      latencyMs: (i) => (i.id === 'c3' || i.id === 'c5' ? 9000 : 1000),
    });
    return play(newRun(planFor(toStoredAll(first))), {
      ...policy,
      ...(stopWhen ? { stopWhen } : {}),
    });
  }
  const at =
    (id: string, stage = 'answering') =>
    (r: Run) =>
      r.phase.kind === 'item' && r.phase.item.id === id && r.phase.view.stage === stage;

  it('B1: 3 ขั้นโผล่ทีละขั้น; ย้ายจุด 2 ครั้ง (8+5) จุดในกอง 5→4→3; กล่องเต็มแล้วถาม "เหลือ"', () => {
    const run = sitting2({}, at('B1.1'));
    expect(itemPhase(run).view.sub).toBe('gap');
    run.do(submit(2)); // ขั้น 1 ถูก
    let v = itemPhase(run).view;
    expect(v.sub).toBe('move');
    // ระหว่างย้าย ตอบเลขไม่ได้
    const n0 = run.events.length;
    run.do(submit(3));
    expect(run.events.length).toBe(n0);
    run.do({ type: 'MOVE_DOT', cellIndex: 3 }); // ต่ำกว่า boxDots(8) ไม่ใช่ช่องว่าง
    expect(itemPhase(run).view.added).toEqual([]);
    run.do({ type: 'MOVE_REJECTED', why: 'outside' });
    run.do({ type: 'MOVE_DOT', cellIndex: 8 });
    v = itemPhase(run).view;
    expect(v.added).toEqual([8]);
    expect(v.sub).toBe('move');
    run.do({ type: 'MOVE_DOT', cellIndex: 8 }); // ซ้ำช่อง
    expect(itemPhase(run).view.added).toEqual([8]);
    run.do({ type: 'MOVE_DOT', cellIndex: 9 });
    v = itemPhase(run).view;
    expect(v.added).toEqual([8, 9]);
    expect(v.sub).toBe('rest');
    expect(v.manip).toEqual({ taps: 0, drops: 2, rejected: 1 });

    // M7 ที่ขั้น เหลือ (ตอบ 5 = กองเดิม)
    run.do(submit(5));
    v = itemPhase(run).view;
    expect(v.feedback).toMatchObject({ misconceptionId: 'M7', highlight: 'pile-rest' });
    expect(v.feedback!.texts).toEqual([
      'ในกองยังมี 5 จุดหรือเปล่า ตอนนี้ย้ายไป 2 แล้ว เหลือกี่จุด',
    ]);
    run.do(submit(3));
    expect(itemPhase(run).view.sub).toBe('total');

    // ขั้น 3: 15 → M7, 3 → M6, 13 → ถูก
    run.do(submit(15));
    expect(itemPhase(run).view.feedback).toMatchObject({ misconceptionId: 'M7' });
    expect(itemPhase(run).view.feedback!.texts[0]).toBe(
      'ในกองยังมี 5 จุดหรือเปล่า ตอนนี้ย้ายไป 2 แล้ว เหลือกี่จุด',
    );
    run.do(submit(3));
    expect(itemPhase(run).view.feedback).toMatchObject({ misconceptionId: 'M6' });
    expect(itemPhase(run).view.feedback!.texts[0]).toBe(
      'นั่นคือส่วนที่เหลือ อย่าลืมกล่องที่เต็ม 10 แล้ว',
    );
    run.do(submit(13));
    v = itemPhase(run).view;
    expect(v.stage).toBe('feedback');
    expect(v.feedback!.texts).toEqual(['8 ขาด 2 ก็เอา 2 จาก 5 มาเติม เหลือ 3 10 กับ 3 ได้ 13']);

    const evs = run.of('item.answered').filter((a) => a.itemId === 'B1.1');
    expect(evs.map((e) => [e.stepId, e.attemptNo, e.response, e.expected, e.correct])).toEqual([
      ['gap', 1, 2, 2, true],
      ['rest', 1, 5, 3, false],
      ['rest', 2, 3, 3, true],
      ['total', 1, 15, 13, false],
      ['total', 2, 3, 13, false],
      ['total', 3, 13, 13, true],
    ]);
    run.do({ type: 'NEXT' });
    expect(itemPhase(run).item.id).toBe('B1.2');
  });

  it('B1 ตอบผิดครบ 3 ครั้งที่ขั้น 1 → revealed แล้วไปขั้นย้ายจุด', () => {
    const run = sitting2({}, at('B1.1'));
    run.do(submit(8)); // L1
    run.do(submit(8));
    run.do(submit(8));
    let v = itemPhase(run).view;
    expect(v.stage).toBe('feedback');
    expect(v.feedback!.kind).toBe('revealed');
    expect(v.added).toEqual([8, 9]);
    run.do({ type: 'NEXT' });
    v = itemPhase(run).view;
    expect(v.stage).toBe('answering');
    expect(v.sub).toBe('rest'); // ย้ายให้ครบแล้ว ถามเหลือต่อ
    const evs = run.of('item.answered').filter((a) => a.itemId === 'B1.1');
    expect(evs.at(-1)).toMatchObject({ stepId: 'gap', attemptNo: 3, revealed: true });
  });

  it('B2: เห็น 2 แบบ ย้ายจนเต็ม ตอบ 2 ข้อ แล้วข้อสรุปกฎ B2', () => {
    const run = sitting2({}, (r) => r.phase.kind === 'compare');
    if (run.phase.kind !== 'compare') throw new Error();
    let view = run.phase.view;
    expect(view.boards.map((b) => [b.boxDots, b.pileDots])).toEqual([
      [4, 9],
      [9, 4],
    ]);
    expect(view.stage).toBe('move');
    for (let i = 4; i < 10; i += 1) run.do({ type: 'MOVE_DOT', cellIndex: i, board: 0 });
    expect(view.stage).toBe('move');
    run.do({ type: 'MOVE_DOT', cellIndex: 9, board: 1 });
    if (run.phase.kind !== 'compare') throw new Error();
    view = run.phase.view;
    expect(view.stage).toBe('q1');
    expect(view.boards.map((b) => b.moved.length)).toEqual([6, 1]);
    expect(view.question?.text).toBe('ทั้งสองแบบได้เท่ากันไหม');
    const opt = (value: number): LessonAction => ({
      type: 'OPTION_PICK',
      value,
      ...T,
      answeredAt: '2026-01-01T00:00:00.000Z',
    });
    run.do(opt(2)); // ผิด แก้ได้
    run.do(opt(1));
    if (run.phase.kind !== 'compare') throw new Error();
    expect(run.phase.view.stage).toBe('q2');
    run.do(opt(9));
    if (run.phase.kind !== 'compare') throw new Error();
    expect(run.phase.view.stage).toBe('rule');
    expect(run.phase.view.ruleText).toBe('เริ่มจากตัวที่ใกล้ 10 กว่า จะย้ายน้อยกว่า');
    const b2 = run.of('item.answered').filter((a) => a.section === 'B2');
    expect(b2.map((e) => [e.itemId, e.stepId, e.attemptNo, e.response, e.correct])).toEqual([
      ['B2.q1', 'q1', 1, 2, false],
      ['B2.q1', 'q1', 2, 1, true],
      ['B2.q2', 'q2', 1, 9, true],
    ]);
    expect(b2[0]!.problem).toEqual({ kind: 'arith', op: '+', a: 4, b: 9 });
    expect(b2[0]!.manip).toEqual({ taps: 0, drops: 7, rejected: 0 });
    run.do({ type: 'NEXT' });
    expect(itemPhase(run).item.id).toBe('B3.1');
  });

  it('B3 ข้อ 1–3 ตอบ 3 ช่อง แต่ละช่องจัดประเภทแยก (8+6 ตอบ 2, 6, 14 → เหลือ M7)', () => {
    const run = sitting2({}, at('B3.1'));
    // SUBMIT ช่องเดียวใช้ไม่ได้กับข้อ 3 ช่อง
    const n = run.events.length;
    run.do(submit(14));
    expect(run.events.length).toBe(n);
    run.do(fields(2, 6, 14));
    const ev = run.of('item.answered').at(-1)!;
    expect(ev).toMatchObject({ itemId: 'B3.1', response: 14, expected: 14, correct: true });
    expect(ev.subAnswers).toEqual([
      { stepId: 'gap', response: 2, expected: 2, correct: true },
      { stepId: 'rest', response: 6, expected: 4, correct: false, misconceptionId: 'M7' },
    ]);
    const v = itemPhase(run).view;
    expect(v.stage).toBe('feedback');
    expect(v.feedback).toMatchObject({ kind: 'wrong', misconceptionId: 'M7' });
    expect(v.feedback!.texts).toEqual([
      'ในกองยังมี 6 จุดหรือเปล่า ตอนนี้ย้ายไป 2 แล้ว เหลือกี่จุด',
    ]);
  });

  it('B3 ถูกทุกช่อง → ข้อความ P3 (ใช้ข้อความถูกของ B1); ข้อ 4–6 ช่องเดียวไม่มี subAnswers', () => {
    const run = sitting2({}, at('B3.1'));
    run.do(fields(2, 4, 14));
    expect(itemPhase(run).view.feedback!.texts).toEqual([
      '8 ขาด 2 ก็เอา 2 จาก 6 มาเติม เหลือ 4 10 กับ 4 ได้ 14',
    ]);
    run.do({ type: 'NEXT' });
    flash(run);
    run.do(fields(1, 4, 14));
    run.do({ type: 'NEXT' });
    flash(run);
    run.do(fields(2, 5, 15));
    expect(itemPhase(run).view.feedback!.texts[0]).toBe(
      '8 ขาด 2 ก็เอา 2 จาก 7 มาเติม เหลือ 5 10 กับ 5 ได้ 15',
    );
    run.do({ type: 'NEXT' });
    expect(itemPhase(run).item.id).toBe('B3.4');
    flash(run);
    run.do(submit(15));
    const ev = run.of('item.answered').at(-1)!;
    expect(ev.itemId).toBe('B3.4');
    expect(ev.subAnswers).toBeUndefined();
    expect(itemPhase(run).view.feedback!.texts[0]).toBe(
      '9 ขาด 1 ก็เอา 1 จาก 6 มาเติม เหลือ 5 10 กับ 5 ได้ 15',
    );
  });

  it('B3 ช่องแรกที่ผิดกำหนดข้อความ (ขาด → เหลือ → ผลรวม)', () => {
    const run = sitting2({}, at('B3.1'));
    run.do(fields(8, 6, 99)); // ขาด L1, เหลือ M7, รวม MX
    expect(itemPhase(run).view.feedback).toMatchObject({ misconceptionId: 'L1' });
    expect(itemPhase(run).view.feedback!.texts).toEqual([lesson.texts.feedback.l1]);
  });

  it('B4: ตอบ → ในหัวเห็นอะไร → หน้าเฉลยเสมอ (8+3: กองเหลือ 1) ข้อความ P3; จบส่วนมี tell-parent และข้อสรุปกฎ B', () => {
    const run = sitting2({}, at('B4.1'));
    run.do(submit(11));
    expect(itemPhase(run).view.stage).toBe('mind');
    run.do({ type: 'STRATEGY_PICK', strategyId: 'see-box' });
    const v = itemPhase(run).view;
    expect(v.stage).toBe('feedback');
    expect(v.feedback!.texts).toEqual(['8 ขาด 2 ก็เอา 2 จาก 3 มาเติม เหลือ 1 10 กับ 1 ได้ 11']);
    expect(run.of('item.answered').at(-1)).toMatchObject({ itemId: 'B4.1', strategyId: 'see-box' });

    // จบ B4 → tell-parent → rule B
    const end = play(run, { stopWhen: (r) => r.phase.kind === 'tell-parent' });
    expect(end.phase).toEqual({
      kind: 'tell-parent',
      text: 'เล่าให้พ่อฟัง 1 ข้อ ว่าทำยังไง (ไม่ใช้จอ)',
    });
    end.do({ type: 'NEXT' });
    expect(end.phase).toEqual({
      kind: 'rule',
      which: 'B',
      text: 'ขาดเท่าไรถึงสิบ เอามาจากอีกตัว เหลือเท่าไรก็บวกกับสิบ',
    });
  });

  it('B4 ตอบผิด: ข้อความของรหัสแล้วตามด้วย P3 และเลือกนับนิ้วได้ข้อความนิ้วต่อท้าย', () => {
    const run = sitting2({}, at('B4.1'));
    run.do(submit(1)); // M6
    run.do({ type: 'STRATEGY_PICK', strategyId: 'count-fingers' });
    expect(itemPhase(run).view.feedback!.texts).toEqual([
      lesson.texts.feedback.m6,
      '8 ขาด 2 ก็เอา 2 จาก 3 มาเติม เหลือ 1 10 กับ 1 ได้ 11',
      lesson.texts.feedback.fingers,
    ]);
  });

  it('B4 ชนกัน M5/M7 (9+7 ตอบ 17): เลือก see-box → M7 มิฉะนั้น M5 (จัดประเภทหลังได้คำตอบ mind view)', () => {
    for (const [mind, expected] of [
      ['see-box', 'M7'],
      ['see-number', 'M5'],
    ] as const) {
      const run = sitting2({}, at('B4.2'));
      run.do(submit(17));
      run.do({ type: 'STRATEGY_PICK', strategyId: mind });
      expect(run.of('item.answered').at(-1)!.misconceptionId).toBe(expected);
    }
  });
});

describe('รอบฝึก (practice) และรอบทบทวน (review)', () => {
  it('ถามในหัวเห็นอะไรเฉพาะข้อสุดท้าย (ข้ามได้); จบรอบมีข้อความจบรอบและไม่มีเวลา/คะแนน', () => {
    const run = newRun(reviewPlan(['add.bonds-10']));
    let mindAsked = 0;
    const items: string[] = [];
    play(run, {
      mind: () => 'skip',
      stopWhen: (r) => {
        if (r.phase.kind === 'item' && r.phase.view.stage === 'mind') {
          mindAsked += 1;
          expect(r.phase.view.mind).toBe('optional');
          items.push(r.phase.item.id);
        }
        return false;
      },
    });
    expect(mindAsked).toBe(1);
    expect(items).toEqual(['review.4']);
    const answered = run.of('item.answered');
    expect(answered).toHaveLength(4);
    expect(answered.slice(0, 3).every((a) => a.strategyId === undefined)).toBe(true);
    expect(answered[3]!.strategyId).toBeUndefined(); // ข้าม
    expect(run.of('block.started')[0]).toMatchObject({
      blockKind: 'review',
      skillId: 'add.bonds-10',
    });
    expect(run.of('block.completed')[0]).toMatchObject({
      blockKind: 'review',
      outcome: 'done',
      level: 'automatic',
    });
    expect(run.types().at(-1)).toBe('session.completed');
    // รอบทบทวนนอกบทไม่มีหน้าส่งเครื่อง และ session.started ไม่มี sitting
    expect(run.of('session.started')[0]!.sitting).toBeUndefined();
  });

  it('เลือกในหัวเห็นอะไรข้อสุดท้ายได้ (บันทึก strategyId)', () => {
    const run = newRun(reviewPlan(['add.make-10']));
    play(run, { mind: () => 'see-number' });
    const last = run.of('item.answered').at(-1)!;
    expect(last).toMatchObject({ strategyId: 'see-number', strategySetId: 'add.mind-view' });
  });

  it('รอบ review 2 ทักษะทำต่อกัน bonds ก่อน make-ten', () => {
    const run = newRun(reviewPlan(['add.make-10', 'add.bonds-10']));
    play(run, { mind: () => 'skip' });
    expect(run.of('block.started').map((b) => b.skillId)).toEqual(['add.bonds-10', 'add.make-10']);
  });

  it('จบรอบแสดงข้อความ round-end จาก roundSummary (ไม่มีข้อมูลครั้งก่อน → ทำครบ 4 ข้อ)', () => {
    const run = newRun(reviewPlan(['add.bonds-10']));
    play(run, { mind: () => 'skip', stopWhen: (r) => r.phase.kind === 'round-end' });
    expect(run.phase).toEqual({ kind: 'round-end', text: 'วันนี้ทำครบ 4 ข้อ' });
  });
});

describe('ปริศนา (challenge)', () => {
  function toChallenge(policy: Policy = {}): Run {
    // สร้าง log ที่ B ผ่านแล้ว แล้วเล่นครั้งที่ 2 จนถึงปริศนา
    const s1 = play(newRun(planFor()), {
      latencyMs: (i) => (i.id === 'c3' || i.id === 'c5' ? 9000 : 1000),
    });
    const run = newRun(planFor(toStoredAll(s1)));
    play(run, {
      ...policy,
      stopWhen: (r) => r.phase.kind === 'block-intro' && r.phase.slot.variant === 'challenge',
    });
    return run;
  }

  it('จับคู่ได้เฉพาะผลรวม 10; ขอคำใบ้ 3 ขั้นตรงข้อความ LS; จับครบ 4 คู่แล้วถามใบที่เหลือ; ดูเฉลย', () => {
    const run = toChallenge();
    expect(run.phase).toMatchObject({ kind: 'block-intro', text: lesson.texts.intros.challenge });
    run.do({ type: 'BLOCK_GO' });
    run.do({ type: 'CHALLENGE_TRY' });
    if (run.phase.kind !== 'challenge') throw new Error();
    run.do({ type: 'CHALLENGE_PAIR', a: 1, b: 8 });
    run.do({ type: 'CHALLENGE_PAIR', a: 5, b: 5 });
    if (run.phase.kind !== 'challenge') throw new Error();
    expect(run.phase.view.pairs).toEqual([]);
    expect(run.phase.view.rejected).toBe(2);
    for (const [i, hint] of lesson.challenge.hints.entries()) {
      run.do({ type: 'CHALLENGE_HINT' });
      if (run.phase.kind !== 'challenge') throw new Error();
      expect(run.phase.view.hint).toBe(hint);
      expect(run.phase.view.hintsUsed).toBe(i + 1);
    }
    run.do({ type: 'CHALLENGE_HINT' });
    if (run.phase.kind !== 'challenge') throw new Error();
    expect(run.phase.view.hintsUsed).toBe(3);
    run.do({ type: 'CHALLENGE_PAIR', a: 1, b: 9 });
    run.do({ type: 'CHALLENGE_PAIR', a: 9, b: 1 }); // ใช้แล้ว
    run.do({ type: 'CHALLENGE_PAIR', a: 2, b: 8 });
    run.do({ type: 'CHALLENGE_PAIR', a: 3, b: 7 });
    if (run.phase.kind !== 'challenge') throw new Error();
    expect(run.phase.view.step).toBe('play');
    run.do({ type: 'CHALLENGE_PAIR', a: 6, b: 4 });
    if (run.phase.kind !== 'challenge') throw new Error();
    expect(run.phase.view.step).toBe('ask');
    expect(run.phase.view.pairs).toEqual([
      [1, 9],
      [2, 8],
      [3, 7],
      [4, 6],
    ]);
    run.do({ type: 'CHALLENGE_REVEAL' }); // ต้องเลือกใบที่เหลือก่อน
    if (run.phase.kind !== 'challenge') throw new Error();
    expect(run.phase.view.step).toBe('ask');
    run.do({ type: 'CHALLENGE_PICK', card: 3 }); // ผิดใบ ไม่มีผล
    run.do({ type: 'CHALLENGE_PICK', card: 5 });
    run.do({ type: 'CHALLENGE_REVEAL' });
    if (run.phase.kind !== 'challenge') throw new Error();
    expect(run.phase.view.step).toBe('reveal');
    run.do({ type: 'NEXT' });
    const done = run.of('block.completed').at(-1)!;
    expect(done).toMatchObject({ blockKind: 'challenge', outcome: 'done' });
    expect(done.detail).toEqual({
      pairs: 4,
      leftover: 5,
      hintsUsed: 3,
      restarts: 0,
      revealed: true,
    });
  });

  it('"ไว้ก่อน" ข้ามและบันทึก skipReason manual; เริ่มใหม่ล้างคู่', () => {
    const run = toChallenge({ challenge: 'later' });
    run.do({ type: 'BLOCK_GO' });
    run.do({ type: 'CHALLENGE_TRY' });
    run.do({ type: 'CHALLENGE_PAIR', a: 1, b: 9 });
    run.do({ type: 'CHALLENGE_RESTART' });
    if (run.phase.kind !== 'challenge') throw new Error();
    expect(run.phase.view.pairs).toEqual([]);
    expect(run.phase.view.restarts).toBe(1);

    const run2 = toChallenge();
    run2.do({ type: 'BLOCK_GO' });
    run2.do({ type: 'CHALLENGE_LATER' });
    expect(run2.of('block.completed').at(-1)).toMatchObject({
      blockKind: 'challenge',
      outcome: 'skipped',
      skipReason: 'manual',
    });
  });
});

describe('พ่อข้ามส่วน และ STOP', () => {
  it('SKIP_BLOCK ระหว่างส่วน A → block.completed skipped/manual แล้วจบครั้ง', () => {
    const run = runTo('A1.1');
    run.do({ type: 'SKIP_BLOCK' });
    expect(run.of('block.completed').at(-1)).toMatchObject({
      blockKind: 'A',
      outcome: 'skipped',
      skipReason: 'manual',
    });
    expect(run.phase.kind).toBe('handover');
  });

  it('SKIP_BLOCK ใช้ไม่ได้กับเช็คก่อน', () => {
    const run = newRun(planFor());
    play(run, { stopWhen: (r) => r.phase.kind === 'item' && r.phase.item.id === 'c1' });
    const n = run.events.length;
    run.do({ type: 'SKIP_BLOCK' });
    expect(run.events.length).toBe(n);
    expect(run.phase.kind).toBe('item');
  });

  it('STOP ก่อนเริ่ม → ไม่มี event; หลังเริ่ม → session.abandoned และ block ที่ค้างไม่มี block.completed', () => {
    const idle = newRun(planFor());
    idle.do({ type: 'STOP' });
    expect(idle.events).toHaveLength(0);
    expect(idle.phase.kind).toBe('stopped');

    const run = runTo('A1.2');
    const started = run.of('block.started').length;
    run.do({ type: 'STOP' });
    expect(run.types().at(-1)).toBe('session.abandoned');
    expect(run.of('block.started')).toHaveLength(started);
    expect(run.of('block.completed').map((b) => b.blockKind)).toEqual(['check']); // A ไม่จบ
    const abandoned = run.of('session.abandoned')[0]!;
    expect(abandoned.summary).toMatchObject({ kind: 'lesson', sitting: 1 });
    // หยุดแล้ว action อื่นไม่มีผล
    const n = run.events.length;
    run.do(submit(4));
    run.do({ type: 'STOP' });
    expect(run.events.length).toBe(n);
  });

  it('STOP ได้ทุก phase ก่อนจบครั้ง', () => {
    const phases = new Set<string>();
    const run = newRun(planFor());
    // เล่นทีละ action และ STOP จำลองในสำเนา state ของทุก phase ที่ผ่าน
    play(run, {
      ...noSkip,
      stopWhen: (r) => {
        if (!phases.has(r.phase.kind)) {
          phases.add(r.phase.kind);
          const { state, effects } = r.machine.transition(r.state, { type: 'STOP' });
          expect(state.phase.kind).toBe('stopped');
          const abandoned = effects.filter(
            (e) => e.type === 'emit' && e.event.type === 'session.abandoned',
          );
          expect(abandoned).toHaveLength(r.state.started ? 1 : 0);
        }
        return false;
      },
    });
    expect(phases.size).toBeGreaterThanOrEqual(6);
  });
});

describe('ความบริสุทธิ์และ emit ครั้งเดียว', () => {
  it('transition ไม่แก้ state เดิม (เรียกซ้ำด้วย input เดียวกันได้ผลเท่ากัน — StrictMode)', () => {
    const run = runTo('A3.1');
    const state = run.state;
    const frozen = structuredClone(state);
    const a = run.machine.transition(state, submit(3));
    const b = run.machine.transition(state, submit(3));
    expect(state).toEqual(frozen);
    expect(a).toEqual(b);
  });

  it('ทุก SUBMIT ที่รับได้ emit item.answered พอดี 1 ตัว (ข้อที่ไม่ถามในหัว)', () => {
    const run = play(newRun(planFor()), noSkip);
    const perItem = new Map<string, number>();
    for (const a of run.of('item.answered'))
      perItem.set(a.itemId, (perItem.get(a.itemId) ?? 0) + 1);
    for (const [id, n] of perItem) expect(n, id).toBe(1);
  });

  it('action ผิด phase ไม่มีผล', () => {
    const run = newRun(planFor());
    const before = run.state;
    run.do({ type: 'NEXT' });
    run.do(submit(3));
    run.do({ type: 'BLOCK_GO' });
    run.do({ type: 'STRATEGY_PICK', strategyId: 'see-box' });
    expect(run.state).toBe(before);
    expect(run.events).toHaveLength(0);
  });
});

// ข้อทั้งหมดของบทถูกเล่นครบได้ (ไม่มี phase ค้าง) ทั้ง 2 ครั้ง
describe('เล่นครบ 2 ครั้ง (ไม่ข้าม)', () => {
  it('ครั้งที่ 2: B1–B4 → ฝึกให้คล่อง 2 รอบ → ปริศนา; block ตามลำดับ', () => {
    const s1 = play(newRun(planFor()), {
      latencyMs: (i) => (i.id === 'c3' || i.id === 'c5' ? 9000 : 1000),
    });
    const s2 = play(newRun(planFor(toStoredAll(s1))), { mind: () => 'skip' });
    expect(s2.phase.kind).toBe('sitting-end');
    expect(s2.of('block.started').map((b) => [b.blockKind, b.skillId])).toEqual([
      ['B', undefined],
      ['practice', 'add.bonds-10'],
      ['practice', 'add.make-10'],
      ['challenge', undefined],
    ]);
    expect(s2.of('block.completed').map((b) => [b.blockKind, b.outcome])).toEqual([
      ['B', 'passed'],
      ['practice', 'done'],
      ['practice', 'done'],
      ['challenge', 'done'],
    ]);
    expect(s2.of('session.started')[0]).toMatchObject({ sitting: 2 });
    const sections = s2.of('item.answered').map((a) => a.section);
    for (const sec of ['B1', 'B2', 'B3', 'B4', 'practice']) expect(sections).toContain(sec);
    // B1 3 ข้อ x 3 ขั้น = 9, B2 2, B3 6, B4 6, practice 8
    expect(sections.filter((s) => s === 'B1')).toHaveLength(9);
    expect(sections.filter((s) => s === 'B2')).toHaveLength(2);
    expect(sections.filter((s) => s === 'B3')).toHaveLength(6);
    expect(sections.filter((s) => s === 'B4')).toHaveLength(6);
    expect(sections.filter((s) => s === 'practice')).toHaveLength(8);
    // ครั้งที่ 3 ไม่มีอะไรเหลือ
    const s3 = planFor([
      ...toStoredAll(s1),
      ...toStored(s2.events, { sessionId: 's2', startMs: Date.UTC(2026, 0, 2) }),
    ]);
    expect(s3.queue).toEqual([]);
    expect(s3.lessonComplete).toBe(true);
  });
});

// ตรวจข้อความว่าไม่มีคำต้องห้ามในหน้าเงียบ (ไม่มี "ถูก/ผิด/เวลา/คะแนน" ใน phase ของ block เช็คก่อน)
describe('flow เงียบไม่ให้ข้อมูลถูก/ผิด', () => {
  it('phase ของ block เช็คก่อนทั้งหมดไม่มี feedback และไม่มีข้อความนอกจากข้อความ ack', () => {
    const run = newRun(planFor());
    play(run, {
      response: () => 99,
      stopWhen: (r) => {
        if (r.phase.kind === 'item') {
          expect(r.phase.view.feedback).toBeNull();
          if (r.phase.view.ackText) expect(lesson.texts.acks).toContain(r.phase.view.ackText);
        }
        return r.of('block.completed').length >= 1;
      },
    });
  });
});

// หน้าพ่อแนะนำ: ไปต่อโดยไม่ปิดธง (พ่อกด "ทำแล้ว" ที่หน้าพ่อของบทภายหลัง — Tech Spec §5.7)
describe('parent-instruction: PARENT_CONTINUE', () => {
  const a3Fail: Policy = {
    latencyMs: (i) => (i.id === 'c3' ? 5100 : i.section === 'A3' ? 9000 : 1000),
  };

  it('ไปต่อโดยไม่ emit parent.noted และธง talk-A ยังค้างในความก้าวหน้า', () => {
    const run = play(newRun(planFor()), {
      ...a3Fail,
      stopWhen: (r) => r.phase.kind === 'parent-instruction',
    });
    expect(run.phase).toEqual({ kind: 'parent-instruction', reason: 'talk-A' });
    const before = run.events.length;
    run.do({ type: 'PARENT_CONTINUE' });
    expect(run.events).toHaveLength(before);
    expect(run.of('parent.noted')).toHaveLength(0);
    expect(run.phase.kind).toBe('handover');
    expect(run.state.progress.pendingFlags).toContain('talk-A');
  });

  it('ใช้ PARENT_CONTINUE นอกหน้าคำแนะนำไม่มีผล', () => {
    const run = newRun(planFor());
    const before = run.state;
    run.do({ type: 'PARENT_CONTINUE' });
    expect(run.state).toBe(before);
  });
});

describe('หน้าเปิดส่วนก่อน A2 ซ้ำ', () => {
  it('A ไม่ผ่านแล้วมีหน้า "ไปเลย" คั่นก่อน A2 ซ้ำ และยังไม่ emit block.started ของรอบซ้ำ', () => {
    const run = play(newRun(planFor()), {
      latencyMs: (i) => (i.id === 'c3' ? 5100 : i.section === 'A3' ? 9000 : 1000),
      stopWhen: (r) => r.phase.kind === 'block-intro' && r.phase.slot.variant === 'a2-retry',
    });
    expect(run.phase).toMatchObject({ kind: 'block-intro', text: lesson.texts.intros.A });
    expect(run.of('block.started').map((b) => [b.blockKind, b.round])).toEqual([
      ['check', 0],
      ['A', 0],
    ]);
    run.do({ type: 'BLOCK_GO' });
    expect(run.of('block.started').at(-1)).toMatchObject({ blockKind: 'A', round: 1 });
  });
});

describe('หน้าเปิดส่วนของ A3 ชุดใหม่ที่เริ่มครั้งถัดไป', () => {
  it('ครั้งที่ 2 ที่ค้าง A3 ซ้ำ เริ่มด้วยหน้า "ไปเลย" ของส่วน A ก่อนข้อ A3', () => {
    const a3Fail: Policy = {
      latencyMs: (i) => (i.id === 'c3' ? 5100 : i.section === 'A3' ? 9000 : 1000),
      // พ่อกด "ทำแล้ว" (PARENT_DONE) ที่หน้าคำแนะนำเดิม
    };
    const s1 = toStored(play(newRun(planFor()), a3Fail).events, {
      sessionId: 's1',
      startMs: Date.UTC(2026, 0, 1),
    });
    const run = newRun(planFor(s1, 2));
    run.do({ type: 'START' });
    expect(run.phase.kind).toBe('block-intro');
    expect(run.phase.kind === 'block-intro' && run.phase.text).toBe(lesson.texts.intros.A);
    run.do({ type: 'BLOCK_GO' });
    expect(run.phase.kind).toBe('item');
    // จบ A3 ชุดใหม่แล้วแสดงข้อสรุปกฎ A ก่อนปิดส่วน
    play(run, { stopWhen: (r) => r.phase.kind === 'rule' });
    expect(run.phase).toMatchObject({ kind: 'rule', which: 'A', text: lesson.texts.rules.A });
    expect(run.of('block.completed').filter((b) => b.blockKind === 'A')).toHaveLength(0);
    run.do({ type: 'NEXT' });
    expect(run.of('block.completed').filter((b) => b.blockKind === 'A')).toHaveLength(1);
  });
});
