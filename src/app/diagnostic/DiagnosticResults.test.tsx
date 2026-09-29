import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { DiagnosticResults } from '@/app/diagnostic/DiagnosticResults';
import { ProgressProvider } from '@/app/ProgressProvider';
import { DX_ADD } from '@/content/diagnostics/DX-ADD';
import { createDiagnosticMachine } from '@/engine/diagnostic/machine';
import type { AppEvent } from '@/engine/types';
import { createMemoryStore } from '@/store/MemoryStore';
import type { ProgressStore } from '@/store/ProgressStore';
import { newId } from '@/store/ids';

afterEach(() => cleanup());

interface RunResult {
  events: AppEvent[];
  sessionId: string;
}

function runSession(opts: { stopAfterItems?: number } = {}): RunResult {
  const machine = createDiagnosticMachine(DX_ADD);
  const sessionId = newId();
  const learnerId = 'l1';
  const events: AppEvent[] = [];
  let state = machine.initial();
  let answeredCount = 0;

  function apply(effects: ReturnType<typeof machine.transition>['effects']) {
    for (const effect of effects) {
      if (effect.type === 'emit') {
        events.push({
          ...effect.event,
          id: newId(),
          at: new Date(Date.now() + events.length).toISOString(),
          schemaVersion: 1,
          learnerId,
          sessionId,
          activityId: DX_ADD.id,
        });
      }
    }
  }

  function dispatch(action: Parameters<typeof machine.transition>[1]) {
    const { state: next, effects } = machine.transition(state, action);
    state = next;
    apply(effects);
  }

  dispatch({ type: 'PARENT_CONTINUE' });
  dispatch({ type: 'KID_START' });

  while (state.phase.kind !== 'kid-end' && state.phase.kind !== 'stopped') {
    const phase = state.phase;
    if (phase.kind === 'stage-intro') {
      dispatch({ type: 'STAGE_GO' });
      continue;
    }
    if (phase.kind === 'item') {
      if (phase.step === 'ready') {
        dispatch({ type: 'READY_DONE' });
        continue;
      }
      if (phase.step === 'show') {
        dispatch({ type: 'FLASH_END' });
        continue;
      }
      const item = DX_ADD.stages[phase.stage]!.items[phase.item]!;
      dispatch({
        type: 'SUBMIT',
        response: item.expected,
        latencyMs: 100,
        latencyValid: true,
        flashInterrupted: false,
      });
      continue;
    }
    if (phase.kind === 'ack') {
      dispatch({ type: 'ACK_DONE' });
      continue;
    }
    if (phase.kind === 'strategy') {
      dispatch({ type: 'STRATEGY_PICK', strategyId: 'unsure' as never });
      answeredCount += 1;
      if (opts.stopAfterItems !== undefined && answeredCount >= opts.stopAfterItems) {
        dispatch({ type: 'STOP' });
      }
      continue;
    }
    break;
  }

  return { events, sessionId };
}

async function renderResults(store: ProgressStore, sessionId: string) {
  render(
    <MemoryRouter initialEntries={[`/parent/results/${sessionId}`]}>
      <ProgressProvider createStoreForTest={() => Promise.resolve(store)}>
        <Routes>
          <Route path="/parent/results/:sessionId" element={<DiagnosticResults />} />
        </Routes>
      </ProgressProvider>
    </MemoryRouter>,
  );
}

describe('DiagnosticResults', () => {
  it('แสดง 8 ส่วนเมื่อทำครบ', async () => {
    const { events, sessionId } = runSession();
    const store = createMemoryStore();
    await store.addLearners([{ id: 'l1', nickname: 'ทดสอบ', createdAt: new Date().toISOString() }]);
    await store.appendEvents(events);
    await renderResults(store, sessionId);

    expect(await screen.findByText('ขั้นที่แนะนำ')).toBeInTheDocument();
    expect(screen.getByText('ผลรายด่าน')).toBeInTheDocument();
    expect(screen.getByText('บันไดการบวก')).toBeInTheDocument();
    expect(screen.getByText('ความเข้าใจผิดที่พบ')).toBeInTheDocument();
    expect(screen.getByText('รายละเอียดทุกข้อ')).toBeInTheDocument();
    expect(screen.getByText('คุยกันต่อ (Number Talks)')).toBeInTheDocument();
    expect(screen.getByText('ประวัติ')).toBeInTheDocument();
    expect(screen.getByText(DX_ADD.texts.results.retry)).toBeInTheDocument();
    // ปุ่มเดียว ไม่ซ้อน <button> ใน <a>
    expect(document.querySelector('a button')).toBeNull();
  });

  it('ซ่อนบันไดและ Number Talks เมื่อหยุดกลางทางและยังทำไม่ครบ', async () => {
    const { events, sessionId } = runSession({ stopAfterItems: 1 });
    const store = createMemoryStore();
    await store.addLearners([{ id: 'l1', nickname: 'ทดสอบ', createdAt: new Date().toISOString() }]);
    await store.appendEvents(events);
    await renderResults(store, sessionId);

    expect(await screen.findByText(DX_ADD.texts.results.incomplete)).toBeInTheDocument();
    expect(screen.queryByText('บันไดการบวก')).not.toBeInTheDocument();
    expect(screen.queryByText('คุยกันต่อ (Number Talks)')).not.toBeInTheDocument();
  });

  it('footnote เวลาแสดงเมื่อมีข้อที่ latencyValid เป็น false', async () => {
    const machine = createDiagnosticMachine(DX_ADD);
    const sessionId = newId();
    const events: AppEvent[] = [];
    let state = machine.initial();
    function apply(effects: ReturnType<typeof machine.transition>['effects']) {
      for (const effect of effects) {
        if (effect.type === 'emit') {
          events.push({
            ...effect.event,
            id: newId(),
            at: new Date(Date.now() + events.length).toISOString(),
            schemaVersion: 1,
            learnerId: 'l1',
            sessionId,
            activityId: DX_ADD.id,
          });
        }
      }
    }
    function dispatch(action: Parameters<typeof machine.transition>[1]) {
      const { state: next, effects } = machine.transition(state, action);
      state = next;
      apply(effects);
    }
    dispatch({ type: 'PARENT_CONTINUE' });
    dispatch({ type: 'KID_START' });
    dispatch({ type: 'STAGE_GO' });
    dispatch({ type: 'READY_DONE' });
    dispatch({ type: 'FLASH_END' });
    dispatch({
      type: 'SUBMIT',
      response: 7,
      latencyMs: 100,
      latencyValid: false,
      flashInterrupted: false,
    });
    dispatch({ type: 'STOP' });

    const store = createMemoryStore();
    await store.addLearners([{ id: 'l1', nickname: 'ทดสอบ', createdAt: new Date().toISOString() }]);
    await store.appendEvents(events);
    await renderResults(store, sessionId);

    await screen.findByText('รายละเอียดทุกข้อ');
    expect(screen.getByText(DX_ADD.texts.results.timeFootnote)).toBeInTheDocument();
  });
});
