import { describe, expect, it } from 'vitest';
import { DX_ADD } from '@/content/diagnostics/DX-ADD';
import {
  createDiagnosticMachine,
  type Effect,
  type RunnerState,
} from '@/engine/diagnostic/machine';

const machine = createDiagnosticMachine(DX_ADD);

function submit(
  state: RunnerState,
  response: number,
  opts: { latencyMs?: number; latencyValid?: boolean; flashInterrupted?: boolean } = {},
) {
  return machine.transition(state, {
    type: 'SUBMIT',
    response,
    latencyMs: opts.latencyMs ?? 100,
    latencyValid: opts.latencyValid ?? true,
    flashInterrupted: opts.flashInterrupted ?? false,
  });
}

function driveThroughItem(
  state: RunnerState,
  response: number,
  strategyId?: string,
): { state: RunnerState; allEffects: Effect[] } {
  const allEffects: Effect[] = [];
  // ready -> show (if flash)
  if (state.phase.kind === 'item' && state.phase.step === 'ready') {
    const r = machine.transition(state, { type: 'READY_DONE' });
    state = r.state;
    allEffects.push(...r.effects);
    const r2 = machine.transition(state, { type: 'FLASH_END' });
    state = r2.state;
    allEffects.push(...r2.effects);
  }
  const r3 = submit(state, response);
  state = r3.state;
  allEffects.push(...r3.effects);

  const r4 = machine.transition(state, { type: 'ACK_DONE' });
  state = r4.state;
  allEffects.push(...r4.effects);

  if (state.phase.kind === 'strategy') {
    const r5 = machine.transition(state, {
      type: 'STRATEGY_PICK',
      strategyId: (strategyId ?? 'known') as never,
    });
    state = r5.state;
    allEffects.push(...r5.effects);
  }
  return { state, allEffects };
}

function start(): RunnerState {
  let state = machine.initial();
  state = machine.transition(state, { type: 'PARENT_CONTINUE' }).state;
  state = machine.transition(state, { type: 'KID_START' }).state;
  return state;
}

describe('createDiagnosticMachine — ลำดับ phase', () => {
  it('เริ่มที่ parent-intro', () => {
    expect(machine.initial().phase.kind).toBe('parent-intro');
  });

  it('parent-intro -> kid-intro -> stage-intro(0)', () => {
    let state = machine.initial();
    state = machine.transition(state, { type: 'PARENT_CONTINUE' }).state;
    expect(state.phase.kind).toBe('kid-intro');
    const r = machine.transition(state, { type: 'KID_START' });
    expect(r.state.phase).toEqual({ kind: 'stage-intro', stage: 0, completed: null });
    expect(r.state.started).toBe(true);
    expect(r.effects).toEqual([
      {
        type: 'emit',
        event: {
          type: 'session.started',
          activityKind: 'diagnostic',
          activityVersion: 'DX-ADD v2',
        },
      },
    ]);
  });

  it('ข้อแฟลชได้ schedule(900, READY_DONE)', () => {
    const state = start();
    const r = machine.transition(state, { type: 'STAGE_GO' });
    expect(r.state.phase).toEqual({ kind: 'item', stage: 0, item: 0, step: 'ready' });
    expect(r.effects).toEqual([{ type: 'schedule', afterMs: 900, action: 'READY_DONE' }]);
  });

  it('ตอบครบ 20 ข้อ จบที่ kid-end พร้อม emit session.completed', () => {
    let state = start();
    state = machine.transition(state, { type: 'STAGE_GO' }).state;

    const allEffects: Effect[] = [];
    let itemCount = 0;
    while (state.phase.kind !== 'kid-end') {
      if (state.phase.kind === 'stage-intro') {
        const r = machine.transition(state, { type: 'STAGE_GO' });
        state = r.state;
        allEffects.push(...r.effects);
        continue;
      }
      const item = DX_ADD.stages[state.phase.kind === 'item' ? state.phase.stage : 0];
      const currentItem = state.phase.kind === 'item' ? item!.items[state.phase.item]! : undefined;
      const response = currentItem ? currentItem.expected : 0;
      const { state: nextState, allEffects: effects } = driveThroughItem(state, response, 'unsure');
      state = nextState;
      allEffects.push(...effects);
      itemCount += 1;
      if (itemCount > 25) throw new Error('loop safety');
    }

    expect(state.phase.kind).toBe('kid-end');
    expect(state.answers).toHaveLength(20);
    const completedEvent = allEffects.find(
      (e) => e.type === 'emit' && e.event.type === 'session.completed',
    );
    expect(completedEvent).toBeDefined();
  });

  it('ข้อที่ถามวิธีคิด emit หลัง STRATEGY_PICK เท่านั้น', () => {
    let state = start();
    state = machine.transition(state, { type: 'STAGE_GO' }).state;
    // ไปจนถึงด่าน 3 ข้อ 3.3 (index stage 2, item 2) ซึ่งถามวิธีคิด
    for (let i = 0; i < 4; i += 1) {
      const item = DX_ADD.stages[0]!.items[i]!;
      state = driveThroughItem(state, item.expected).state;
    }
    state = machine.transition(state, { type: 'STAGE_GO' }).state; // s2 intro -> item
    for (let i = 0; i < 4; i += 1) {
      const item = DX_ADD.stages[1]!.items[i]!;
      state = driveThroughItem(state, item.expected).state;
    }
    state = machine.transition(state, { type: 'STAGE_GO' }).state; // s3 intro -> item
    // 3.1, 3.2 ไม่ถาม
    state = driveThroughItem(state, DX_ADD.stages[2]!.items[0]!.expected).state;
    state = driveThroughItem(state, DX_ADD.stages[2]!.items[1]!.expected).state;
    // 3.3 ถามวิธีคิด — เดินเองทีละ action เพื่อตรวจ emit
    expect(state.phase).toEqual({ kind: 'item', stage: 2, item: 2, step: 'answering' });
    const item33 = DX_ADD.stages[2]!.items[2]!;
    const r1 = submit(state, item33.expected);
    expect(r1.effects.some((e) => e.type === 'emit')).toBe(false);
    state = r1.state;
    const r2 = machine.transition(state, { type: 'ACK_DONE' });
    expect(r2.effects).toEqual([]);
    state = r2.state;
    expect(state.phase.kind).toBe('strategy');
    const r3 = machine.transition(state, { type: 'STRATEGY_PICK', strategyId: 'doubles' as never });
    expect(r3.effects.some((e) => e.type === 'emit' && e.event.type === 'item.answered')).toBe(
      true,
    );
  });

  it('STRATEGY_PICK id นอกชุดไม่มีผล', () => {
    let state = start();
    state = machine.transition(state, { type: 'STAGE_GO' }).state;
    for (let i = 0; i < 4; i += 1) {
      state = driveThroughItem(state, DX_ADD.stages[0]!.items[i]!.expected).state;
    }
    state = machine.transition(state, { type: 'STAGE_GO' }).state;
    for (let i = 0; i < 4; i += 1) {
      state = driveThroughItem(state, DX_ADD.stages[1]!.items[i]!.expected).state;
    }
    state = machine.transition(state, { type: 'STAGE_GO' }).state;
    state = driveThroughItem(state, DX_ADD.stages[2]!.items[0]!.expected).state;
    state = driveThroughItem(state, DX_ADD.stages[2]!.items[1]!.expected).state;
    const item33 = DX_ADD.stages[2]!.items[2]!;
    state = submit(state, item33.expected).state;
    state = machine.transition(state, { type: 'ACK_DONE' }).state;
    expect(state.phase.kind).toBe('strategy');
    const r = machine.transition(state, {
      type: 'STRATEGY_PICK',
      strategyId: 'count-by-one' as never, // ไม่อยู่ในชุด add.single-digit
    });
    expect(r.state).toBe(state);
    expect(r.effects).toEqual([]);
  });

  it('SUBMIT ตอน ready/show ไม่มีผล', () => {
    let state = start();
    state = machine.transition(state, { type: 'STAGE_GO' }).state;
    expect(state.phase).toEqual({ kind: 'item', stage: 0, item: 0, step: 'ready' });
    const r = submit(state, 7);
    expect(r.state).toBe(state);
    expect(r.effects).toEqual([]);
  });

  it('ข้อความ ack หมุนตามลำดับโดยไม่ขึ้นกับถูก/ผิด', () => {
    let state = start();
    state = machine.transition(state, { type: 'STAGE_GO' }).state;
    // ตอบผิดข้อแรก
    state = machine.transition(state, { type: 'READY_DONE' }).state;
    state = machine.transition(state, { type: 'FLASH_END' }).state;
    const r = submit(state, 99);
    expect(r.state.phase).toMatchObject({ kind: 'ack', text: DX_ADD.texts.acks[0] });
  });
});

describe('createDiagnosticMachine — กฎข้ามด่าน 5', () => {
  function completeStagesUpTo3(state: RunnerState): RunnerState {
    state = machine.transition(state, { type: 'STAGE_GO' }).state;
    for (let i = 0; i < 4; i += 1) {
      state = driveThroughItem(state, DX_ADD.stages[0]!.items[i]!.expected).state;
    }
    state = machine.transition(state, { type: 'STAGE_GO' }).state;
    for (let i = 0; i < 4; i += 1) {
      state = driveThroughItem(state, DX_ADD.stages[1]!.items[i]!.expected).state;
    }
    state = machine.transition(state, { type: 'STAGE_GO' }).state;
    for (let i = 0; i < 4; i += 1) {
      state = driveThroughItem(state, DX_ADD.stages[2]!.items[i]!.expected, 'known').state;
    }
    return state;
  }

  it('ด่าน 4 ถูก 0 ข้อ → ข้ามด่าน 5 ไป kid-end ทันที', () => {
    let state = completeStagesUpTo3(state0());
    state = machine.transition(state, { type: 'STAGE_GO' }).state; // s4 intro
    for (let i = 0; i < 4; i += 1) {
      state = driveThroughItem(state, -1, 'known').state; // ตอบผิดทุกข้อ
    }
    expect(state.phase.kind).toBe('kid-end');
    expect(state.skippedStageIds).toEqual(['s5']);
  });

  it('ด่าน 4 ถูก 1 ข้อ → ข้ามด่าน 5', () => {
    let state = completeStagesUpTo3(state0());
    state = machine.transition(state, { type: 'STAGE_GO' }).state;
    const items = DX_ADD.stages[3]!.items;
    state = driveThroughItem(state, items[0]!.expected, 'known').state;
    for (let i = 1; i < 4; i += 1) {
      state = driveThroughItem(state, -1, 'known').state;
    }
    expect(state.phase.kind).toBe('kid-end');
    expect(state.skippedStageIds).toEqual(['s5']);
  });

  it('ด่าน 4 ถูก 2 ข้อ → ไม่ข้าม เห็น stage-intro s5 พร้อม completed ถูกต้อง', () => {
    let state = completeStagesUpTo3(state0());
    state = machine.transition(state, { type: 'STAGE_GO' }).state;
    const items = DX_ADD.stages[3]!.items;
    state = driveThroughItem(state, items[0]!.expected, 'known').state;
    state = driveThroughItem(state, items[1]!.expected, 'known').state;
    state = driveThroughItem(state, -1, 'known').state;
    state = driveThroughItem(state, -1, 'known').state;
    expect(state.phase).toEqual({
      kind: 'stage-intro',
      stage: 4,
      completed: { n: 4, m: 1 },
    });
    expect(state.skippedStageIds).toEqual([]);
  });
});

describe('createDiagnosticMachine — STOP', () => {
  it('STOP ก่อนเริ่มไม่มี event', () => {
    const state = machine.initial();
    const r = machine.transition(state, { type: 'STOP' });
    expect(r.state.phase).toEqual({ kind: 'stopped' });
    expect(r.effects).toEqual([]);
  });

  it('STOP ระหว่าง strategy ทิ้ง pending และ emit abandoned', () => {
    let state = start();
    state = machine.transition(state, { type: 'STAGE_GO' }).state;
    for (let i = 0; i < 4; i += 1) {
      state = driveThroughItem(state, DX_ADD.stages[0]!.items[i]!.expected).state;
    }
    state = machine.transition(state, { type: 'STAGE_GO' }).state;
    for (let i = 0; i < 4; i += 1) {
      state = driveThroughItem(state, DX_ADD.stages[1]!.items[i]!.expected).state;
    }
    state = machine.transition(state, { type: 'STAGE_GO' }).state;
    state = driveThroughItem(state, DX_ADD.stages[2]!.items[0]!.expected).state;
    state = driveThroughItem(state, DX_ADD.stages[2]!.items[1]!.expected).state;
    const item33 = DX_ADD.stages[2]!.items[2]!;
    state = submit(state, item33.expected).state;
    state = machine.transition(state, { type: 'ACK_DONE' }).state;
    expect(state.phase.kind).toBe('strategy');

    const r = machine.transition(state, { type: 'STOP' });
    expect(r.state.phase).toEqual({ kind: 'stopped' });
    expect(r.state.pending).toBeNull();
    const abandonedEvent = r.effects.find(
      (e) => e.type === 'emit' && e.event.type === 'session.abandoned',
    );
    expect(abandonedEvent).toBeDefined();
  });
});

function state0(): RunnerState {
  return start();
}
