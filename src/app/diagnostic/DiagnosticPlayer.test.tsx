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
const wait450 = () => new Promise<void>((r) => setTimeout(r, 450));

async function startToExample(store: ProgressStore, strict = false) {
  const user = userEvent.setup();
  await renderPlayer(store, strict);
  await user.click(screen.getByText(DX_ADD.texts.parentIntro.button));
  await wait450(); // tap guard §3.3.1: คนจริงไม่แตะปุ่มถัดไปภายใน 400 ms
  await user.click(screen.getByText(DX_ADD.texts.kidIntro.button));
  await wait450();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] });
  fireClick(screen.getByText(DX_ADD.texts.stageGo));
}

// ผ่านหน้าตัวอย่างจนถึง "พร้อมนะ..." ของข้อ 1.1 (เลื่อนเวลาให้เดินจริง รวมกันแตะทะลุ 400 ms)
function passExample() {
  tick(450);
  fireClick(screen.getByText('3'));
  fireClick(screen.getByText(DX_ADD.texts.submit));
  tick(900);
  tick(1500);
  tick(150);
  fireClick(screen.getByText('5'));
  fireClick(screen.getByText(DX_ADD.texts.submit));
  tick(2000);
}

async function startToStage1(store: ProgressStore, strict = false) {
  await startToExample(store, strict);
  passExample();
}

describe('DiagnosticPlayer — หน้าตัวอย่าง (§14.1)', () => {
  const dots = () => document.querySelectorAll('[data-testid="ten-frame"] circle').length;

  it('ตัวอย่างค้าง 3 จุดนาน 10 วินาที พิมพ์ผิดแล้วช่องถูกล้าง พิมพ์ 3 จึงไปต่อ', async () => {
    const store = await setupLearner();
    await startToExample(store);
    expect(screen.getByText(DX_ADD.example!.texts.demo)).toBeInTheDocument();
    expect(dots()).toBe(3);
    tick(10000);
    expect(dots()).toBe(3);
    expect(screen.getByText('4')).not.toBeDisabled();

    tick(450);
    fireClick(screen.getByText('2'));
    fireClick(screen.getByText(DX_ADD.texts.submit));
    expect(screen.getByText(DX_ADD.example!.texts.demo)).toBeInTheDocument();
    expect(screen.getByText(DX_ADD.texts.answerPlaceholder)).toBeInTheDocument();
    expect(dots()).toBe(3);

    fireClick(screen.getByText('3'));
    fireClick(screen.getByText(DX_ADD.texts.submit));
    expect(screen.getByText(DX_ADD.texts.flash.ready)).toBeInTheDocument();
  });

  it('ลองเอง: พร้อมนะ 900 ms -> แฟลช 2 จุด 1500 ms -> ซ่อน -> ตอบ -> เฉลย 2000 ms -> ข้อ 1.1', async () => {
    const store = await setupLearner();
    await startToExample(store);
    tick(450);
    fireClick(screen.getByText('3'));
    fireClick(screen.getByText(DX_ADD.texts.submit));

    expect(screen.getByText(DX_ADD.texts.flash.ready)).toBeInTheDocument();
    expect(screen.getByText(DX_ADD.example!.texts.try)).toBeInTheDocument();
    expect(screen.getByText('5')).toBeDisabled();
    tick(899);
    expect(screen.getByText(DX_ADD.texts.flash.ready)).toBeInTheDocument();
    tick(1);
    expect(screen.getByText(DX_ADD.texts.flash.show)).toBeInTheDocument();
    expect(dots()).toBe(2);
    tick(1500 + 149);
    expect(screen.getByText(DX_ADD.texts.flash.show)).toBeInTheDocument();
    tick(1);
    expect(screen.getByText(DX_ADD.texts.flash.hidden)).toBeInTheDocument();
    expect(dots()).toBe(0);
    expect(screen.getByText(DX_ADD.example!.texts.try)).toBeInTheDocument();

    fireClick(screen.getByText('5'));
    fireClick(screen.getByText(DX_ADD.texts.submit));
    expect(screen.getByText(DX_ADD.example!.texts.reveal)).toBeInTheDocument();
    expect(dots()).toBe(2);
    tick(1999);
    expect(screen.getByText(DX_ADD.example!.texts.reveal)).toBeInTheDocument();
    tick(1);
    expect(screen.getByText(DX_ADD.texts.flash.ready)).toBeInTheDocument();
    expect(screen.queryByText(DX_ADD.example!.texts.reveal)).not.toBeInTheDocument();
  });

  it('reduced motion: จังหวะแฟลชของข้อลองเองเท่าเดิม (2 จุดค้าง 1500 ms)', async () => {
    const original: typeof window.matchMedia = window.matchMedia.bind(window);
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    try {
      const store = await setupLearner();
      await startToExample(store);
      tick(450);
      fireClick(screen.getByText('3'));
      fireClick(screen.getByText(DX_ADD.texts.submit));
      tick(900);
      expect(dots()).toBe(2);
      tick(1499);
      expect(screen.getByText(DX_ADD.texts.flash.show)).toBeInTheDocument();
      expect(dots()).toBe(2);
      tick(1);
      tick(150);
      expect(dots()).toBe(0);
      expect(screen.getByText(DX_ADD.texts.flash.hidden)).toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });

  it('ไม่มี event ของตัวอย่าง (StrictMode) มีแค่ session.started', async () => {
    const store = await setupLearner();
    await startToStage1(store, true);
    const events = await flushEvents(store);
    expect(events.map((e) => e.type)).toEqual(['session.started']);
  });

  it('ข้อ 1.1 หลังตัวอย่างได้ ack ตัวแรกและเริ่มจับเวลาหลังภาพซ่อน', async () => {
    const store = await setupLearner();
    await startToStage1(store);
    tick(900);
    tick(1500);
    tick(150);
    fireClick(screen.getByText('7'));
    fireClick(screen.getByText(DX_ADD.texts.submit));
    expect(screen.getByText(DX_ADD.texts.acks[0]!)).toBeInTheDocument();
    const events = await flushEvents(store);
    const answered = events.find((e) => e.type === 'item.answered');
    expect(answered?.type === 'item.answered' && answered.latencyMs).toBeLessThan(100);
  });
});

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
  fireClick(screen.getByRole('button', { name: digit }));
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

function clickAt(el: HTMLElement, x: number, y: number) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
  });
}

function pressKey(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
}

// §3.3.1: input ภายใน 400 ms หลังการแตะที่เปลี่ยนหน้า ถูกทิ้งไม่ว่าตำแหน่งใด
describe('DiagnosticPlayer — tap-through guard (§3.3.1)', () => {
  async function toStage2Item() {
    const store = await setupLearner();
    await startToStage1(store);
    for (const d of ['7', '9', '6', '8']) answerFlashItem(d);
    return store;
  }

  it.each([150, 350])(
    'แตะที่ %i ms หลังเปลี่ยนหน้า ทั้งตำแหน่งเดิมและเยื้อง 40 px ถูกทิ้ง',
    async (ms) => {
      await toStage2Item();
      clickAt(screen.getByText(DX_ADD.texts.stageGo), 100, 300);
      tick(ms);
      clickAt(screen.getByText('1'), 100, 300);
      clickAt(screen.getByText('2'), 140, 300);
      expect(screen.getByText(DX_ADD.texts.answerPlaceholder)).toBeInTheDocument();
    },
  );

  it('คีย์บอร์ดภายใน 400 ms ถูกทิ้ง', async () => {
    await toStage2Item();
    clickAt(screen.getByText(DX_ADD.texts.stageGo), 100, 300);
    tick(200);
    pressKey('5');
    expect(screen.getByText(DX_ADD.texts.answerPlaceholder)).toBeInTheDocument();
    tick(250);
    pressKey('5');
    expect(screen.queryByText(DX_ADD.texts.answerPlaceholder)).not.toBeInTheDocument();
  });

  it('แตะที่ 450 ms รับตามปกติ', async () => {
    await toStage2Item();
    clickAt(screen.getByText(DX_ADD.texts.stageGo), 100, 300);
    tick(450);
    clickAt(screen.getByText('1'), 100, 300);
    expect(screen.queryByText(DX_ADD.texts.answerPlaceholder)).not.toBeInTheDocument();
  });
});

// เดินครบ 20 ข้อด้วยเวลาปลอม (เลื่อนเวลาให้เดินจริงทุกจังหวะ) ใช้ตรวจ log ทั้ง session
function playAllItems(strategyDelayMs = 0) {
  DX_ADD.stages.forEach((stage, stageIdx) => {
    if (stageIdx > 0) {
      tick(450);
      fireClick(screen.getByText(DX_ADD.texts.stageGo));
    }
    tick(450);
    for (const item of stage.items) {
      if (item.visual?.mode === 'flash') {
        tick(900);
        tick(1500);
        tick(150);
      }
      tick(450);
      for (const digit of String(item.expected))
        fireClick(screen.getByRole('button', { name: digit }));
      fireClick(screen.getByText(DX_ADD.texts.submit));
      tick(1000);
      if (item.strategySetId) {
        const set = DX_ADD.strategySets.find((x) => x.id === item.strategySetId)!;
        tick(strategyDelayMs + 450);
        fireClick(screen.getByText(set.options[0]!.label));
      }
    }
  });
}

describe('DiagnosticPlayer — ลำดับและเวลาของ event (§14.2, §14.3)', () => {
  it('ทำครบ 20 ข้อด้วยเวลาที่หยุดนิ่ง: at เพิ่มขึ้นเคร่งครัด และ session.completed เป็นตัวสุดท้าย', async () => {
    const store = await setupLearner();
    await startToStage1(store, true);
    playAllItems();
    tick(450);
    const events = await flushEvents(store);
    expect(events).toHaveLength(22);
    expect(events[0]!.type).toBe('session.started');
    expect(events.at(-1)!.type).toBe('session.completed');
    expect(events.at(-2)).toMatchObject({ type: 'item.answered', itemId: '5.4' });
    for (let i = 1; i < events.length; i += 1) {
      expect(events[i]!.at > events[i - 1]!.at).toBe(true);
    }
  });

  it('answeredAt ทุกข้อ, strategyLatencyMs เฉพาะข้อที่ถามวิธีคิด', async () => {
    const store = await setupLearner();
    await startToStage1(store);
    playAllItems();
    const events = await flushEvents(store);
    const answered = events.flatMap((e) => (e.type === 'item.answered' ? [e] : []));
    expect(answered).toHaveLength(20);
    const strategyIds = new Set(
      DX_ADD.stages.flatMap((st) => st.items.filter((i) => i.strategySetId).map((i) => i.id)),
    );
    for (const e of answered) {
      expect(typeof e.answeredAt).toBe('string');
      expect(e.answeredAt! <= e.at).toBe(true);
      expect(e.strategyLatencyMs !== undefined).toBe(strategyIds.has(e.itemId));
    }
  });

  it('strategyLatencyMs ~ เวลาที่หน้าเลือกวิธีคิดแสดง และ answeredAt ก่อน at อย่างน้อย ack + เวลาเลือก', async () => {
    const store = await setupLearner();
    await startToStage1(store);
    playAllItems(2300);
    const events = await flushEvents(store);
    const e = events.find((x) => x.type === 'item.answered' && x.itemId === '4.1');
    if (!e || e.type !== 'item.answered') throw new Error('ไม่พบ 4.1');
    // playAllItems รอ 450 ms ก่อนแตะ (เพื่อผ่าน tap guard) จึงรวม 2300 + 450
    expect(e.strategyLatencyMs!).toBeGreaterThanOrEqual(2700);
    expect(e.strategyLatencyMs!).toBeLessThanOrEqual(2800);
    expect(Date.parse(e.at) - Date.parse(e.answeredAt!)).toBeGreaterThanOrEqual(3300);
  });

  it('ซ่อนแท็บระหว่างหน้าเลือกวิธีคิด -> ไม่มี strategyLatencyMs', async () => {
    const store = await setupLearner();
    await startToStage1(store);
    // ทำจนถึงข้อ 3.3 แล้วซ่อนแท็บที่หน้าเลือกวิธีคิด
    for (let stageIdx = 0; stageIdx < 3; stageIdx += 1) {
      const stage = DX_ADD.stages[stageIdx]!;
      if (stageIdx > 0) {
        tick(450);
        fireClick(screen.getByText(DX_ADD.texts.stageGo));
      }
      tick(450);
      for (const [idx, item] of stage.items.entries()) {
        if (item.visual?.mode === 'flash') {
          tick(900);
          tick(1500);
          tick(150);
        }
        tick(450);
        for (const digit of String(item.expected))
          fireClick(screen.getByRole('button', { name: digit }));
        fireClick(screen.getByText(DX_ADD.texts.submit));
        tick(1000);
        if (item.strategySetId) {
          Object.defineProperty(document, 'visibilityState', {
            value: 'hidden',
            configurable: true,
          });
          act(() => {
            document.dispatchEvent(new Event('visibilitychange'));
          });
          Object.defineProperty(document, 'visibilityState', {
            value: 'visible',
            configurable: true,
          });
          const set = DX_ADD.strategySets.find((x) => x.id === item.strategySetId)!;
          tick(450);
          fireClick(screen.getByText(set.options[0]!.label));
          const events = await flushEvents(store);
          const e = events.find((x) => x.type === 'item.answered' && x.itemId === item.id);
          expect(e).toBeDefined();
          expect(e).not.toHaveProperty('strategyLatencyMs', expect.anything());
          expect(idx).toBe(2);
          return;
        }
      }
    }
  });
});
