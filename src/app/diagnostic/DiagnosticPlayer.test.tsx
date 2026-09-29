import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { DiagnosticPlayer } from '@/app/diagnostic/DiagnosticPlayer';
import { ProgressProvider } from '@/app/ProgressProvider';
import { DX_ADD } from '@/content/diagnostics/DX-ADD';
import { createMemoryStore } from '@/store/MemoryStore';
import type { ProgressStore } from '@/store/ProgressStore';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function tick(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function fireClick(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

async function renderPlayer(store: ProgressStore, strict = false) {
  const Wrap = strict
    ? StrictMode
    : ({ children }: { children: React.ReactNode }) => <>{children}</>;
  render(
    <Wrap>
      <MemoryRouter initialEntries={['/play/DX-ADD']}>
        <ProgressProvider createStoreForTest={() => Promise.resolve(store)}>
          <Routes>
            <Route path="/play/:activityId" element={<DiagnosticPlayer dx={DX_ADD} />} />
          </Routes>
        </ProgressProvider>
      </MemoryRouter>
    </Wrap>,
  );
  await screen.findByText(DX_ADD.texts.parentIntro.title);
}

async function setupLearner(): Promise<ProgressStore> {
  const store = createMemoryStore();
  await store.addLearners([{ id: 'l1', nickname: 'ทดสอบ', createdAt: new Date().toISOString() }]);
  await store.setMeta('currentLearnerId', 'l1');
  return store;
}

// เดินด้วยตัวจับเวลาจริงจนกว่า ProgressProvider จะพร้อม แล้วสลับเป็นตัวจับเวลาปลอมก่อนกด "ไปเลย"
// (ซึ่งเป็นจุดที่เริ่ม schedule ตัวจับเวลาของด่าน 1) เพื่อไม่ให้ timer จริงค้างอยู่คนละคิวกับ fake timer
async function startToStage1(store: ProgressStore, strict = false) {
  const user = userEvent.setup();
  await renderPlayer(store, strict);
  await user.click(screen.getByText(DX_ADD.texts.parentIntro.button));
  await user.click(screen.getByText(DX_ADD.texts.kidIntro.button));
  vi.useFakeTimers();
  fireClick(screen.getByText(DX_ADD.texts.stageGo));
}

describe('DiagnosticPlayer — ด่าน 1 แฟลช', () => {
  it('พร้อมนะ... -> ดู! -> ซ่อนแล้ว! กี่จุดนะ? ตามเวลาที่กำหนด', async () => {
    const store = await setupLearner();
    await startToStage1(store);

    expect(screen.getByText(DX_ADD.texts.flash.ready)).toBeInTheDocument();
    expect(screen.getByText('7')).toBeDisabled();

    tick(899);
    expect(screen.getByText(DX_ADD.texts.flash.ready)).toBeInTheDocument();

    tick(1);
    expect(screen.getByText(DX_ADD.texts.flash.show)).toBeInTheDocument();
    expect(screen.getByText('7')).toBeDisabled();

    tick(1500 + 149);
    expect(screen.getByText(DX_ADD.texts.flash.show)).toBeInTheDocument();

    tick(1);
    expect(screen.getByText(DX_ADD.texts.flash.hidden)).toBeInTheDocument();
    expect(screen.getByText('7')).not.toBeDisabled();
  });

  it('ack หายหลัง 1000ms', async () => {
    const store = await setupLearner();
    await startToStage1(store);
    tick(900);
    tick(1500);
    tick(150);

    fireClick(screen.getByText('7'));
    fireClick(screen.getByText(DX_ADD.texts.submit));
    expect(screen.getByText(DX_ADD.texts.acks[0]!)).toBeInTheDocument();
    tick(999);
    expect(screen.getByText(DX_ADD.texts.acks[0]!)).toBeInTheDocument();
    tick(1);
    expect(screen.queryByText(DX_ADD.texts.acks[0]!)).not.toBeInTheDocument();
  });
});

describe('DiagnosticPlayer — จับเวลาเงียบ', () => {
  it('ซ่อนแท็บระหว่างตอบ -> latencyValid: false ใน event', async () => {
    const store = await setupLearner();
    await startToStage1(store);
    tick(900);
    tick(1500);
    tick(150);

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

    fireClick(screen.getByText('7'));
    fireClick(screen.getByText(DX_ADD.texts.submit));

    vi.useRealTimers();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const events = await store.listEvents();
    const answered = events.find((e) => e.type === 'item.answered');
    expect(answered).toBeDefined();
    if (answered && answered.type === 'item.answered') {
      expect(answered.latencyValid).toBe(false);
    }
  });
});

async function flushEvents(store: ProgressStore) {
  vi.useRealTimers();
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return store.listEvents();
}

function answerFlashItem(digit: string, hideTab = false) {
  tick(900);
  tick(1500);
  tick(150);
  if (hideTab) {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  }
  fireClick(screen.getByText(digit));
  fireClick(screen.getByText(DX_ADD.texts.submit));
  tick(1000);
}

describe('DiagnosticPlayer — effect ต้องเกิดครั้งเดียว (StrictMode)', () => {
  it('ตอบ 2 ข้อ -> session.started 1, item.answered 2 ข้อละ 1', async () => {
    const store = await setupLearner();
    await startToStage1(store, true);
    answerFlashItem('7');
    answerFlashItem('9');
    const events = await flushEvents(store);
    expect(events.filter((e) => e.type === 'session.started')).toHaveLength(1);
    const answered = events.filter((e) => e.type === 'item.answered');
    expect(answered.map((e) => e.type === 'item.answered' && e.itemId)).toEqual(['1.1', '1.2']);
  });

  it('เวลาที่ถูก invalidate ของข้อหนึ่งไม่ค้างไปข้อถัดไป', async () => {
    const store = await setupLearner();
    await startToStage1(store);
    answerFlashItem('7', true);
    answerFlashItem('9');
    const events = await flushEvents(store);
    const valid = events.flatMap((e) => (e.type === 'item.answered' ? [e.latencyValid] : []));
    expect(valid).toEqual([false, true]);
  });
});
