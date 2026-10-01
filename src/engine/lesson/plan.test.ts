import { describe, expect, it } from 'vitest';
import { deriveProgress } from '@/engine/lesson/progress';
import { blockSlot, buildBlock, completeBlock, planSitting } from '@/engine/lesson/plan';
import {
  ctx,
  lesson,
  newRun,
  planFor,
  play,
  playSitting,
  toStored,
  type Policy,
} from '@/engine/lesson/testHarness';
import { skills } from '@/content/skills';
import type { AppEvent } from '@/engine/types';

const day = (n: number) => Date.UTC(2026, 0, n);
// ให้ c3 และ c5 ช้า เพื่อทำครบส่วน A และ B (ไม่ข้าม)
const noSkip: Policy = {
  latencyMs: (i) => (i.id === 'c3' || i.id === 'c5' ? 9000 : 1000),
};

function sit(prior: AppEvent[], policy: Policy, n: number, seed = n) {
  return playSitting(prior, policy, { sessionId: `s${n}`, startMs: day(n), seed });
}

// A3 ผ่านแน่นอน/ไม่ผ่านตามต้องการ
const a3Fail: Policy = {
  latencyMs: (i) => (i.id === 'c3' || i.id === 'c5' ? 9000 : i.section === 'A3' ? 6000 : 1000),
};

describe('planSitting', () => {
  it('ครั้งที่ 1: เช็คก่อน แล้วส่วน A', () => {
    const plan = planFor();
    expect(plan.sitting).toBe(1);
    expect(plan.lessonComplete).toBe(false);
    expect(plan.queue).toEqual([
      { type: 'block', slot: blockSlot('check', 'main') },
      { type: 'block', slot: blockSlot('A', 'main', 0) },
    ]);
  });

  it('ครั้งที่ 2 (หลังผ่าน A): B → ฝึก bonds → ฝึก make-10 → ปริศนา', () => {
    const s1 = sit([], noSkip, 1);
    const plan = planFor(s1.stored);
    expect(plan.sitting).toBe(2);
    expect(
      plan.queue.map((q) =>
        q.type === 'block' ? [q.slot.kind, q.slot.variant, q.slot.skillId] : q,
      ),
    ).toEqual([
      ['B', 'main', undefined],
      ['practice', 'practice', 'add.bonds-10'],
      ['practice', 'practice', 'add.make-10'],
      ['challenge', 'challenge', undefined],
    ]);
  });

  it('ครั้งที่ 3: บทครบแล้ว', () => {
    const s1 = sit([], noSkip, 1);
    const s2 = sit(s1.stored, { mind: () => 'skip' }, 2);
    const plan = planFor([...s1.stored, ...s2.stored]);
    expect(plan.sitting).toBe(3);
    expect(plan.queue).toEqual([]);
    expect(plan.lessonComplete).toBe(true);
  });

  it('session ที่ไม่จบ (abandoned) ไม่นับเป็น 1 ครั้ง และ block ที่ไม่จบเริ่มใหม่ทั้ง block', () => {
    // เล่นถึงกลาง A2 แล้วหยุด
    const run = play(newRun(planFor()), {
      ...noSkip,
      stopWhen: (r) =>
        r.phase.kind === 'item' && r.phase.item.id === 'A2.3' && r.phase.view.stage === 'answering',
    });
    run.do({ type: 'STOP' });
    const stored = toStored(run.events, { sessionId: 's1', startMs: day(1) });
    const progress = deriveProgress(lesson, skills, stored);
    expect(progress.sitting).toBe(1);
    expect(progress.sittingsCompleted).toBe(0);
    expect(progress.check.done).toBe(true);
    expect(progress.A.next).toBe('main'); // A ไม่จบ → ยังต้องทำ
    // ข้อที่ตอบไปแล้วยังอยู่ใน run ของ A แต่ไม่มีผลต่อสถานะ
    const aRun = progress.runs.find((r) => r.kind === 'A')!;
    expect(aRun.answers.length).toBeGreaterThan(0);
    expect(aRun.completed).toBeUndefined();

    const plan = planSitting(ctx, progress, { seed: 9 });
    expect(plan.queue).toEqual([{ type: 'block', slot: blockSlot('A', 'main', 0) }]);

    // เล่นต่อ: ส่วน A เริ่มใหม่ทั้ง block (มี block.started ใหม่ และผลไม่ปนกับข้อเก่า)
    const again = play(newRun(plan), { mind: () => 'see-box' });
    const started = again.of('block.started');
    expect(started).toHaveLength(1);
    const completed = again.of('block.completed').find((b) => b.blockKind === 'A')!;
    expect(completed.metrics?.total).toBe(6);
    expect(completed.outcome).toBe('passed');
  });
});

describe('AC12: ผ่าน/ไม่ผ่าน/ทำซ้ำ (ส่วน A)', () => {
  it('(ก) A3 ถูก 5 เร็ว 4 → passed', () => {
    const s1 = sit(
      [],
      {
        latencyMs: (i) => (i.id === 'c3' ? 9000 : i.id === 'A3.5' ? 6000 : 1000),
        response: (i) => (i.id === 'A3.6' ? 5 : undefined),
      },
      1,
    );
    const done = s1.run.of('block.completed').find((b) => b.blockKind === 'A')!;
    expect(done.outcome).toBe('passed');
    expect(done.metrics).toMatchObject({ correct: 5, fastCount: 4 });
    expect(done.flags).toBeUndefined();
  });

  it('(ข) A3 ถูก 5 เร็ว 3 → not-passed: A2 ซ้ำ 6 ข้อชุดใหม่ → หน้าพ่อ Number Talks → จบครั้ง', () => {
    const s1 = sit(
      [],
      {
        latencyMs: (i) => (i.id === 'c3' ? 9000 : i.id === 'A3.4' || i.id === 'A3.5' ? 6000 : 1000),
        response: (i) => (i.id === 'A3.6' ? 5 : undefined),
      },
      1,
    );
    const run = s1.run;
    const completed = run.of('block.completed');
    expect(completed.map((b) => [b.blockKind, b.round, b.outcome])).toEqual([
      ['check', 0, 'done'],
      ['A', 0, 'not-passed'],
      ['A', 1, 'done'],
    ]);
    expect(completed[1]!.flags).toEqual(['talk-A']);
    expect(completed[1]!.metrics).toMatchObject({ correct: 5, fastCount: 3 });

    // A2 ซ้ำ 6 ข้อ ชุดใหม่: มี 4 และ 9 ลำดับต่างจากเดิม
    const retry = run.of('item.answered').filter((a) => a.itemId.startsWith('A2.r1.'));
    expect(retry).toHaveLength(6);
    const parts = retry.map((a) => (a.problem.kind === 'missing-part' ? a.problem.part : 0));
    expect(new Set(parts).size).toBe(6);
    expect(parts).toContain(4);
    expect(parts).toContain(9);
    expect(parts).not.toEqual([6, 2, 8, 3, 1, 7]);
    expect(run.of('block.started').map((b) => [b.blockKind, b.round])).toEqual([
      ['check', 0],
      ['A', 0],
      ['A', 1],
    ]);
    expect(typeof run.of('block.started')[2]!.seed).toBe('number');

    // หน้าพ่อ "Number Talks ถาดไข่" แล้วจบครั้ง — ไม่มีส่วน B / ฝึก / ปริศนา ในครั้งนี้
    const notes = run.of('parent.noted');
    expect(notes).toEqual([{ type: 'parent.noted', resolvedFlag: 'talk-A' }]);
    expect(run.types().at(-1)).toBe('session.completed');
    expect(run.of('block.started').some((b) => b.blockKind === 'B')).toBe(false);
    const summary = run.of('session.completed')[0]!.summary;
    expect(summary).toMatchObject({ kind: 'lesson', sitting: 1, flags: ['talk-A'] });

    // ครั้งถัดไปเริ่มด้วย A3 ชุดใหม่ (variant a3-retry, round 2) แล้วต่อ B
    const plan = planFor(s1.stored, 2);
    expect(plan.sitting).toBe(2);
    const kinds = plan.queue.map((q) =>
      q.type === 'block' ? `${q.slot.kind}:${q.slot.variant}:${q.slot.round}` : q.reason,
    );
    expect(kinds.slice(0, 2)).toEqual(['A:a3-retry:2', 'B:main:0']);
  });

  it('A3 ซ้ำผ่าน → ไป B ต่อในครั้งเดียวกัน; A3 ซ้ำใช้เลขใหม่ (มี 1 และ 2) ลำดับต่างจากเดิม', () => {
    const s1 = sit([], a3Fail, 1);
    const s2 = sit(s1.stored, { mind: () => 'skip' }, 2);
    const started = s2.run.of('block.started').map((b) => [b.blockKind, b.round]);
    expect(started.slice(0, 2)).toEqual([
      ['A', 2],
      ['B', 0],
    ]);
    const a3r = s2.run.of('item.answered').filter((a) => a.section === 'A3');
    expect(a3r).toHaveLength(6);
    const parts = a3r.map((a) => (a.problem.kind === 'missing-part' ? a.problem.part : 0));
    expect(parts).toContain(1);
    expect(parts).toContain(2);
    expect(parts).not.toEqual([7, 4, 8, 3, 6, 9]);
    expect(s2.run.of('block.completed')[0]).toMatchObject({
      blockKind: 'A',
      round: 2,
      outcome: 'passed',
    });
    const progress = deriveProgress(lesson, skills, [...s1.stored, ...s2.stored]);
    expect(progress.A.status).toBe('passed');
    expect(progress.B.status).toBe('passed');
  });

  it('A3 ซ้ำไม่ผ่าน → stalled-A + แจ้งพ่อ แต่เปิด B ให้เล่นต่อ (พ่อกด "ทำแล้ว")', () => {
    const s1 = sit([], a3Fail, 1);
    const s2 = sit(
      s1.stored,
      { latencyMs: (i) => (i.section === 'A3' || i.id === 'c5' ? 6000 : 1000), mind: () => 'skip' },
      2,
    );
    const done = s2.run.of('block.completed');
    expect(done[0]).toMatchObject({
      blockKind: 'A',
      round: 2,
      outcome: 'not-passed',
      flags: ['stalled-A'],
    });
    expect(s2.run.of('parent.noted').map((n) => n.resolvedFlag)).toContain('stalled-A');
    expect(s2.run.of('block.started').some((b) => b.blockKind === 'B')).toBe(true);
    const progress = deriveProgress(lesson, skills, [...s1.stored, ...s2.stored]);
    expect(progress.A.status).toBe('stalled');
    expect(progress.pendingFlags).toEqual([]); // ทั้ง talk-A และ stalled-A ถูกพ่อกด "ทำแล้ว"
  });

  it('ปิดแอประหว่างหน้า Number Talks: talk-A ค้าง → ครั้งถัดไปเจอหน้าคำแนะนำแล้ว A3 ซ้ำ (ไม่ใช่หน้าคำแนะนำอย่างเดียว)', () => {
    const run = play(newRun(planFor()), {
      ...a3Fail,
      stopWhen: (r) => r.phase.kind === 'parent-instruction',
    });
    expect(run.phase).toEqual({ kind: 'parent-instruction', reason: 'talk-A' });
    run.do({ type: 'STOP' });
    const stored = toStored(run.events, { sessionId: 's1', startMs: day(1) });
    const progress = deriveProgress(lesson, skills, stored);
    // A2 ซ้ำจบแล้ว → ครั้งที่ 1 เสร็จ (นับจาก block ไม่ต้องรอ session.completed)
    expect(progress.sitting).toBe(2);
    expect(progress.pendingFlags).toEqual(['talk-A']);
    const plan = planSitting(ctx, progress, { seed: 3 });
    expect(queueOf(plan).slice(0, 2)).toEqual(['talk-A', 'A:a3-retry:2']);
  });
});

const queueOf = (plan: ReturnType<typeof planFor>): string[] =>
  plan.queue.map((q) =>
    q.type === 'block' ? `${q.slot.kind}:${q.slot.variant}:${q.slot.round}` : q.reason,
  );

// เล่นครั้งของรอบ 1: เหมือน restrictPlan ใน LessonPlayer (ตัดส่วนที่ยังไม่เปิดให้เล่นออก)
function sitRound1(prior: AppEvent[], policy: Policy, n: number) {
  const plan = planFor(prior, n);
  const restricted = {
    ...plan,
    queue: plan.queue.filter(
      (q) => q.type === 'instruction' || q.slot.kind === 'check' || q.slot.kind === 'A',
    ),
  };
  const run = play(newRun(restricted), policy);
  return { run, stored: toStored(run.events, { sessionId: `s${n}`, startMs: day(n) }) };
}

describe('ครั้งปัจจุบันนับจาก block (Must-3 / §17 ข้อ 15)', () => {
  const a3Ok: Policy = { latencyMs: (i) => (i.id === 'c3' || i.id === 'c5' ? 9000 : 1000) };
  const a3Bad: Policy = { latencyMs: (i) => (i.section === 'A3' || i.id === 'c5' ? 6000 : 1000) };

  it('A ผ่านทันที: ครั้งที่ 1 เสร็จ → ครั้งที่ 2 เริ่มที่ B', () => {
    const s1 = sitRound1([], a3Ok, 1);
    const progress = deriveProgress(lesson, skills, s1.stored);
    expect(progress.sitting).toBe(2);
    expect(queueOf(planFor(s1.stored))[0]).toBe('B:main:0');
  });

  it('A ไม่ผ่าน: ครั้งถัดไปคือครั้งที่ 2 เริ่มที่ A3 ซ้ำ แล้วต่อ B (รอบ 2 ไม่ข้าม A3 ซ้ำ)', () => {
    const s1 = sitRound1([], a3Fail, 1);
    expect(deriveProgress(lesson, skills, s1.stored).sitting).toBe(2);
    expect(queueOf(planFor(s1.stored)).slice(0, 2)).toEqual(['A:a3-retry:2', 'B:main:0']);
  });

  it('ครั้งที่ 2 ของรอบ 1 มีแค่ A3 ซ้ำ ผ่านแล้วจบ session: ยังเป็นครั้งที่ 2 และรอบ 2 วาง B ตามหลัง', () => {
    const s1 = sitRound1([], a3Fail, 1);
    const s2 = sitRound1(s1.stored, { latencyMs: () => 1000 }, 2);
    expect(s2.run.of('block.completed').map((b) => [b.blockKind, b.round, b.outcome])).toEqual([
      ['A', 2, 'passed'],
    ]);
    expect(s2.run.types().at(-1)).toBe('session.completed');
    const progress = deriveProgress(lesson, skills, [...s1.stored, ...s2.stored]);
    expect(progress.sittingsCompleted).toBe(2); // นับ session ไว้แสดงหน้าพ่อ
    expect(progress.sitting).toBe(2); // แต่ครั้งปัจจุบันยังเป็น 2 (B ยังไม่ได้เล่น)
    expect(progress.A.status).toBe('passed');
    const plan = planFor([...s1.stored, ...s2.stored]);
    expect(plan.sitting).toBe(2);
    expect(queueOf(plan)).toEqual([
      'B:main:0',
      'practice:practice:0',
      'practice:practice:0',
      'challenge:challenge:0',
    ]);
  });

  it('A3 ซ้ำไม่ผ่าน → stalled-A และครั้งปัจจุบันยัง 2 เปิด B ให้เล่น', () => {
    const s1 = sitRound1([], a3Fail, 1);
    const s2 = sitRound1(s1.stored, a3Bad, 2);
    expect(s2.run.of('block.completed')[0]).toMatchObject({ outcome: 'not-passed' });
    const all = [...s1.stored, ...s2.stored];
    const progress = deriveProgress(lesson, skills, all);
    expect(progress.A.status).toBe('stalled');
    expect(progress.sitting).toBe(2);
    expect(queueOf(planFor(all))[0]).toBe('B:main:0');
  });

  it('เล่นครบทุกครั้ง (A ไม่ผ่านก่อน): ครั้งปัจจุบัน 3 = มากกว่าจำนวนครั้งของบท และบทครบ', () => {
    const s1 = sit([], a3Fail, 1);
    const s2 = sit(s1.stored, { mind: () => 'skip' }, 2);
    const progress = deriveProgress(lesson, skills, [...s1.stored, ...s2.stored]);
    expect(progress.sitting).toBe(3);
    expect(progress.challengeDone).toBe(true);
    expect(planFor([...s1.stored, ...s2.stored]).lessonComplete).toBe(true);
  });

  it('ปิดแอปกลางทาง: กลางส่วน A ของครั้งที่ 1 ยังเป็นครั้งที่ 1', () => {
    const run = play(newRun(planFor()), {
      stopWhen: (r) => r.events.filter((e) => e.type === 'item.answered').length >= 10,
    });
    run.do({ type: 'STOP' });
    const stored = toStored(run.events, { sessionId: 's1', startMs: day(1) });
    expect(deriveProgress(lesson, skills, stored).sitting).toBe(1);
  });

  it('ปิดแอปหลัง A3 ซ้ำผ่านแต่ก่อนจบ session: ครั้งที่ 2 และ A ไม่ต้องทำซ้ำ', () => {
    const s1 = sitRound1([], a3Fail, 1);
    const run = play(newRun(planFor(s1.stored, 2)), {
      latencyMs: () => 1000,
      stopWhen: (r) => r.of('block.completed').length >= 1,
    });
    run.do({ type: 'STOP' });
    const stored = toStored(run.events, { sessionId: 's2', startMs: day(2) });
    const progress = deriveProgress(lesson, skills, [...s1.stored, ...stored]);
    expect(progress.A.status).toBe('passed');
    expect(progress.sitting).toBe(2);
    expect(queueOf(planFor([...s1.stored, ...stored]))[0]).toBe('B:main:0');
  });

  it('ปิดแอประหว่าง A3 ซ้ำ (ยังไม่จบ block): ครั้งที่ 2 เริ่ม A3 ซ้ำใหม่', () => {
    const s1 = sitRound1([], a3Fail, 1);
    const run = play(newRun(planFor(s1.stored, 2)), {
      stopWhen: (r) => r.events.filter((e) => e.type === 'item.answered').length >= 2,
    });
    run.do({ type: 'STOP' });
    const stored = toStored(run.events, { sessionId: 's2', startMs: day(2) });
    const all = [...s1.stored, ...stored];
    expect(deriveProgress(lesson, skills, all).sitting).toBe(2);
    expect(queueOf(planFor(all))[0]).toBe('A:a3-retry:2');
  });

  it('พ่อกด "ต่อไป" (PARENT_CONTINUE) แล้วปิดครั้ง: ครั้งถัดไปได้หน้าคำแนะนำ + A3 ซ้ำ ไม่ใช่หน้าคำแนะนำอย่างเดียว', () => {
    const run = play(newRun(planFor()), {
      ...a3Fail,
      stopWhen: (r) => r.phase.kind === 'parent-instruction',
    });
    run.do({ type: 'PARENT_CONTINUE' });
    play(run, a3Fail);
    expect(run.types().at(-1)).toBe('session.completed');
    const stored = toStored(run.events, { sessionId: 's1', startMs: day(1) });
    const progress = deriveProgress(lesson, skills, stored);
    expect(progress.pendingFlags).toEqual(['talk-A']);
    expect(progress.sitting).toBe(2);
    expect(queueOf(planFor(stored)).slice(0, 3)).toEqual(['talk-A', 'A:a3-retry:2', 'B:main:0']);
  });
});

describe('AC12: ส่วน B', () => {
  // ครั้งที่ 1 ผ่าน A (ไม่ข้าม B1/B2) แล้วเล่นครั้งที่ 2 ด้วยนโยบายที่ต้องการ
  function b(policy: Policy, prior?: AppEvent[]) {
    const s1 = prior ? { stored: prior } : sit([], noSkip, 1);
    const s2 = sit(s1.stored, { mind: () => 'skip', ...policy }, 2);
    return { s1, s2, all: [...s1.stored, ...s2.stored] };
  }

  it('B4 ถูกตามเกณฑ์ → passed ไม่มีธง; ฝึกให้คล่อง 2 รอบและปริศนาตามหลัง', () => {
    const { s2 } = b({});
    expect(s2.run.of('block.completed')[0]).toMatchObject({ blockKind: 'B', outcome: 'passed' });
    expect(s2.run.of('block.completed')[0]!.flags).toBeUndefined();
    expect(s2.run.of('block.completed').map((x) => x.blockKind)).toEqual([
      'B',
      'practice',
      'practice',
      'challenge',
    ]);
  });

  it('(ค) B4 ถูก 4 เวลาเฉลี่ยลด ≥ 20% เทียบ B3 ข้อ 4–6 และไม่มี L1/M6/M7 → passed-trend และนัดทบทวนที่กล่อง 1', () => {
    const { s2, all } = b({
      latencyMs: (i) => (i.section === 'B3' ? 10000 : i.section === 'B4' ? 6000 : 1000),
      response: (i) => (i.id === 'B4.5' ? 99 : i.id === 'B4.6' ? i.expected - 1 : undefined),
    });
    expect(s2.run.of('block.completed')[0]).toMatchObject({
      blockKind: 'B',
      outcome: 'passed-trend',
    });
    // ผ่านแบบกำลังไปได้ดีแล้วไปฝึกต่อ
    expect(s2.run.of('block.completed').map((x) => x.blockKind)).toContain('practice');
    expect(deriveProgress(lesson, skills, all).B.status).toBe('passed-trend');
  });

  it('(ง) M7 ≥ 2 ข้อใน B3+B4 → ธง tray-B1 หน้าพ่อ "ทำ B1 ด้วยของจริง" ก่อนไปต่อ (ไม่ว่าผ่านหรือไม่)', () => {
    const run = play(newRun(planFor(sit([], noSkip, 1).stored)), {
      response: (i, kind) => {
        if (i.problem.kind !== 'arith') return undefined;
        if (i.id === 'B3.1' && kind === 'rest') return Math.min(i.problem.a, i.problem.b); // M7 ช่องเหลือ
        if (i.id === 'B4.1') return 10 + Math.max(i.problem.a, i.problem.b); // M7
        return undefined;
      },
      mind: () => 'skip',
      stopWhen: (r) => r.phase.kind === 'parent-instruction',
    });
    expect(run.phase).toEqual({ kind: 'parent-instruction', reason: 'tray-B1' });
    const done = run.of('block.completed').at(-1)!;
    expect(done).toMatchObject({ blockKind: 'B', flags: ['tray-B1'] });
    expect(run.of('block.started').map((x) => x.blockKind)).toEqual(['B']); // ยังไม่ไปฝึก
    run.do({ type: 'PARENT_DONE' });
    expect(run.of('parent.noted').at(-1)).toEqual({
      type: 'parent.noted',
      resolvedFlag: 'tray-B1',
    });
    // แล้วไปฝึกต่อ (B ผ่าน: B4 ตอบผิด 1 ข้อ ที่เหลือถูกและเร็ว)
    expect(run.phase.kind).toBe('item');
    expect(run.of('block.started').map((x) => x.blockKind)).toEqual(['B', 'practice']);
  });

  it('M7 เพียง 1 ข้อ ไม่ธง', () => {
    const { s2 } = b({
      response: (i) =>
        i.id === 'B4.1' && i.problem.kind === 'arith'
          ? 10 + Math.max(i.problem.a, i.problem.b)
          : undefined,
    });
    expect(s2.run.of('parent.noted').filter((n) => n.resolvedFlag === 'tray-B1')).toHaveLength(0);
    expect(s2.run.of('block.completed')[0]!.flags).toBeUndefined();
  });

  it('(จ) B ไม่ผ่านซ้ำครบ 2 รอบ → ย้อนไป A3 ชุดใหม่ + stalled-B และไม่ไปฝึก/ปริศนา', () => {
    const slow: Policy = {
      latencyMs: (i) => (i.section === 'B3' || i.section === 'B4' ? 9500 : 1000),
      mind: () => 'skip',
    };
    const { s2, all } = b(slow);
    const blocks = s2.run
      .of('block.completed')
      .map((x) => [x.blockKind, x.round, x.outcome, x.flags]);
    expect(blocks).toEqual([
      ['B', 0, 'not-passed', undefined],
      ['B', 1, 'not-passed', undefined],
      ['B', 2, 'not-passed', ['stalled-B']],
      ['A', 3, 'done', undefined],
    ]);
    // ชุดตัวเลขของรอบซ้ำเป็นข้อ B3.r{n}.* / B4.r{n}.* และมี fields 3 ช่อง 3 ข้อแรก
    const r1 = s2.run.of('item.answered').filter((a) => a.itemId.startsWith('B3.r1.'));
    expect(r1).toHaveLength(6);
    expect(r1.slice(0, 3).every((a) => a.subAnswers?.length === 2)).toBe(true);
    expect(r1.slice(3).every((a) => a.subAnswers === undefined)).toBe(true);
    expect(s2.run.of('item.answered').some((a) => a.itemId.startsWith('B4.r2.'))).toBe(true);
    // A3 ทบทวน 6 ข้อ (หลังรอบ B สุดท้าย) แล้วหน้าพ่อ stalled-B
    expect(s2.run.of('item.answered').filter((a) => a.itemId.startsWith('A3.m3.'))).toHaveLength(6);
    expect(s2.run.of('block.started').some((x) => x.blockKind === 'practice')).toBe(false);
    expect(s2.run.of('block.started').some((x) => x.blockKind === 'challenge')).toBe(false);
    expect(s2.run.of('parent.noted').map((n) => n.resolvedFlag)).toContain('stalled-B');

    const progress = deriveProgress(lesson, skills, all);
    expect(progress.B.status).toBe('stalled');
    expect(progress.B.next).toBeNull();

    // ครั้งถัดไป B ไม่เปิดเอง; พ่อกด "เริ่มส่วน B ใหม่" แล้ว B เปิดอีกครั้งพร้อมฝึก/ปริศนา
    const idle = planFor(all, 3);
    expect(idle.queue).toEqual([]);
    const restart: AppEvent = {
      type: 'parent.noted',
      blockKind: 'B',
      resolvedFlag: 'restart-B',
      id: 'restart',
      at: new Date(day(4)).toISOString(),
      schemaVersion: 1,
      learnerId: 'l1',
      sessionId: 'parent-page',
      activityId: 'ADD-04',
    };
    const reopened = planFor([...all, restart], 3);
    expect(reopened.queue.map((q) => (q.type === 'block' ? q.slot.kind : q.reason))).toEqual([
      'B',
      'practice',
      'practice',
      'challenge',
    ]);
  });

  it('B ไม่ผ่านรอบแรก แต่ผ่านรอบซ้ำ → ต่อด้วยฝึกให้คล่องและปริศนา', () => {
    const { s2 } = b({
      latencyMs: (i) =>
        (i.section === 'B3' || i.section === 'B4') && !i.id.includes('.r') ? 9500 : 1000,
    });
    const blocks = s2.run.of('block.completed').map((x) => [x.blockKind, x.round, x.outcome]);
    expect(blocks).toEqual([
      ['B', 0, 'not-passed'],
      ['B', 1, 'passed'],
      ['practice', 0, 'done'],
      ['practice', 0, 'done'],
      ['challenge', 0, 'done'],
    ]);
  });
});

describe('พ่อข้ามส่วน', () => {
  it('ข้าม A ด้วยมือ → สถานะ skipped และครั้งถัดไปไม่ทำ A ซ้ำ', () => {
    const run = play(newRun(planFor()), {
      ...noSkip,
      stopWhen: (r) => r.phase.kind === 'item' && r.phase.item.id === 'A1.1',
    });
    run.do({ type: 'SKIP_BLOCK' });
    play(run);
    const stored = toStored(run.events, { sessionId: 's1', startMs: day(1) });
    const progress = deriveProgress(lesson, skills, stored);
    expect(progress.A).toMatchObject({ status: 'skipped', next: null });
    expect(progress.sitting).toBe(2);
    expect(planFor(stored).queue[0]).toEqual({ type: 'block', slot: blockSlot('B', 'main', 0) });
  });
});

describe('completeBlock / buildBlock', () => {
  it('ข้ามด้วยมือ: outcome skipped, skipReason manual, ไม่มีธงและไม่แทรกคิว', () => {
    for (const slot of [
      blockSlot('A', 'main'),
      blockSlot('B', 'main'),
      blockSlot('challenge', 'challenge'),
    ]) {
      expect(completeBlock(ctx, slot, [], { skippedManual: true })).toEqual({
        outcome: 'skipped',
        skipReason: 'manual',
        flags: [],
        prepend: [],
        truncate: false,
      });
    }
  });

  it('รอบฝึก: outcome done + ระดับคล่อง', () => {
    const slot = blockSlot('practice', 'practice', 0, 'add.bonds-10');
    const items = buildBlock(ctx, slot, planFor().progress, 5).steps.flatMap((s) =>
      s.kind === 'item' ? [s.item] : [],
    );
    expect(items).toHaveLength(4);
    const answers = items.map((it, i) => ({
      type: 'item.answered' as const,
      itemId: it.id,
      skillId: it.skillId,
      problem: it.problem,
      expected: it.expected,
      response: it.expected,
      correct: true,
      latencyMs: 2000 + i,
      latencyValid: true,
      fluent: null,
      attemptNo: 1,
    }));
    expect(completeBlock(ctx, slot, answers)).toMatchObject({
      outcome: 'done',
      level: 'automatic',
    });
  });

  it('buildBlock ของ generator: seed เดียวกันได้ชุดเดิม; รอบฝึกไม่ซ้ำข้อของรอบก่อน', () => {
    const slot = blockSlot('practice', 'practice', 0, 'add.make-10');
    const p = planFor().progress;
    expect(buildBlock(ctx, slot, p, 7)).toEqual(buildBlock(ctx, slot, p, 7));
  });

  it('รอบฝึกรอบที่ 2 หลีกเลี่ยงข้อของรอบก่อน (จาก log)', () => {
    const s1 = sit([], noSkip, 1);
    const s2 = sit(s1.stored, { mind: () => 'skip' }, 2);
    const prevBonds = s2.run
      .of('item.answered')
      .filter((a) => a.section === 'practice' && a.skillId === 'add.bonds-10');
    expect(prevBonds).toHaveLength(4);
    // สร้างรอบทบทวนใหม่จากความก้าวหน้าที่มี lastRounds แล้วตรวจไม่ซ้ำ (n, รูปแบบ)
    const progress = deriveProgress(lesson, skills, [...s1.stored, ...s2.stored]);
    for (let seed = 1; seed <= 30; seed += 1) {
      const items = buildBlock(
        ctx,
        blockSlot('review', 'review', 0, 'add.bonds-10'),
        progress,
        seed,
      ).steps.flatMap((s) => (s.kind === 'item' ? [s.item] : []));
      for (const it of items) {
        if (it.problem.kind !== 'missing-part') continue;
        const form =
          it.flow === 'silent-flash-gap'
            ? 'flash'
            : it.problem.missing === 'first'
              ? 'gap-first'
              : 'gap-second';
        for (const prev of prevBonds) {
          if (prev.problem.kind !== 'missing-part') continue;
          const prevForm =
            prev.mode === 'fade'
              ? 'flash'
              : prev.problem.missing === 'first'
                ? 'gap-first'
                : 'gap-second';
          expect(!(prev.problem.part === it.problem.part && prevForm === form)).toBe(true);
        }
      }
    }
  });

  it('เช็คก่อนที่ทำแล้วบอกการข้าม: A1/A2 หายไปจากขั้นของ block A และ skipped บันทึก id ครบ', () => {
    const first = play(newRun(planFor()), {
      latencyMs: () => 1000,
      stopWhen: (r) => r.of('block.completed').length >= 1,
    });
    const stored = toStored(first.events, { sessionId: 's1', startMs: day(1) });
    const progress = deriveProgress(lesson, skills, stored);
    expect(progress.check).toEqual({ done: true, skipA12: true, skipB12: true });
    const planned = buildBlock(ctx, blockSlot('A', 'main'), progress, 1);
    expect(
      planned.steps
        .filter((s) => s.kind === 'item')
        .map((s) => (s.kind === 'item' ? s.item.id : '')),
    ).toEqual(['A3.1', 'A3.2', 'A3.3', 'A3.4', 'A3.5', 'A3.6']);
    expect(planned.skipped?.reason).toBe('check');
    expect(planned.skipped?.itemIds).toHaveLength(9);
  });
});

describe('deriveProgress', () => {
  it('event ของบทอื่นไม่ปน และ log ว่างได้ค่าเริ่มต้น', () => {
    const empty = deriveProgress(lesson, skills, []);
    expect(empty.sitting).toBe(1);
    expect(empty.A.next).toBe('main');
    expect(empty.check.done).toBe(false);
    const s1 = sit([], noSkip, 1);
    const foreign = s1.stored.map((e) => ({ ...e, activityId: 'OTHER' }));
    expect(deriveProgress(lesson, skills, foreign).sitting).toBe(1);
    expect(deriveProgress(lesson, skills, foreign).check.done).toBe(false);
  });

  it('บันทึกพ่อล่าสุดต่อส่วน และ session ทบทวน/ท่องซ้ำ (ไม่มี sitting) ไม่นับเป็นครั้ง', () => {
    const s1 = sit([], { ...noSkip, note: { fingers: 'most', mouth: 'some', note: 'x' } }, 1);
    const stored = [...s1.stored];
    const progress = deriveProgress(lesson, skills, stored);
    expect(progress.notes.A).toEqual({ fingers: 'most', mouth: 'some', note: 'x' });
    // session แบบไม่มี sitting ที่จบแล้ว ไม่เพิ่มจำนวนครั้ง
    const review = toStored(
      [
        { type: 'session.started', activityKind: 'lesson', activityVersion: lesson.version },
        {
          type: 'session.completed',
          activityVersion: lesson.version,
          summary: { kind: 'lesson', sitting: 1, blocks: [], flags: [] },
        },
      ],
      { sessionId: 'rev', startMs: day(3) },
    );
    expect(deriveProgress(lesson, skills, [...stored, ...review]).sittingsCompleted).toBe(1);
  });
});
