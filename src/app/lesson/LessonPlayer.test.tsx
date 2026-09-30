import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { LessonPlayer } from '@/app/lesson/LessonPlayer';
import { ProgressProvider } from '@/app/ProgressProvider';
import { ADD_04 } from '@/content/lessons/ADD-04';
import type { AppEvent } from '@/engine/types';
import { createMemoryStore } from '@/store/MemoryStore';
import type { ProgressStore } from '@/store/ProgressStore';

const T = ADD_04.texts;

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

const click = (name: string) => fireClick(screen.getByRole('button', { name }));

async function setupLearner(events: AppEvent[] = []): Promise<ProgressStore> {
  const store = createMemoryStore();
  await store.addLearners([{ id: 'l1', nickname: 'ทดสอบ', createdAt: new Date().toISOString() }]);
  await store.setMeta('currentLearnerId', 'l1');
  if (events.length > 0) await store.appendEvents(events);
  return store;
}

async function renderPlayer(store: ProgressStore, strict: boolean) {
  const Wrap = strict
    ? StrictMode
    : ({ children }: { children: React.ReactNode }) => <>{children}</>;
  render(
    <Wrap>
      <MemoryRouter initialEntries={['/play/ADD-04']}>
        <ProgressProvider createStoreForTest={() => Promise.resolve(store)}>
          <Routes>
            <Route path="/" element={<p>หน้าหลัก</p>} />
            <Route path="/play/:activityId" element={<LessonPlayerRoute />} />
          </Routes>
        </ProgressProvider>
      </MemoryRouter>
    </Wrap>,
  );
  await screen.findByText(T.sittingIntro.button);
  // สลับเป็นตัวจับเวลาปลอมหลัง ProgressProvider พร้อมแล้ว (เหมือน DiagnosticPlayer.test)
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date', 'performance'] });
}

function LessonPlayerRoute() {
  return <LessonPlayer lesson={ADD_04} />;
}

const dots = () => document.querySelectorAll('[data-testid="ten-frame"] [data-dot]').length;
const rings = () =>
  [...document.querySelectorAll('[data-cell-highlight]')].map((r) =>
    Number(r.getAttribute('data-cell-highlight')),
  );

function typeAnswer(value: number) {
  for (const d of String(value)) click(d);
  click(T.submit);
}

// เช็คก่อนหนึ่งข้อ: ข้อแฟลช (c1–c3) ต้องรอ พร้อมนะ → ดู! → ซ่อน ก่อนตอบ
function answerFlashItem(value: number, expectDots: number) {
  expect(screen.getByText(T.flash.ready)).toBeInTheDocument();
  expect(dots()).toBe(0);
  tick(899);
  expect(screen.getByText(T.flash.ready)).toBeInTheDocument();
  tick(1);
  expect(screen.getByText(T.flash.show)).toBeInTheDocument();
  expect(dots()).toBe(expectDots);
  tick(1500 + 149);
  expect(screen.getByText(T.flash.show)).toBeInTheDocument();
  tick(1);
  expect(screen.getByText(T.flash.hiddenGap)).toBeInTheDocument();
  expect(dots()).toBe(0);
  typeAnswer(value);
  expect(T.acks.some((a) => screen.queryByText(a) !== null)).toBe(true);
  tick(1000);
}

function answerTextItem(value: number) {
  typeAnswer(value);
  tick(1000);
}

async function eventsOf(store: ProgressStore): Promise<AppEvent[]> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return store.listEvents();
}

describe.each([false, true])('LessonPlayer ครั้งที่ 1 (StrictMode = %s)', (strict) => {
  it('เช็คก่อน (ถูกและเร็ว → ข้าม A1/A2) → A3 6 ข้อ → กฎ A → ส่งเครื่อง → ข้ามบันทึกพ่อ: 18 event ไม่ซ้ำ', async () => {
    const store = await setupLearner();
    await renderPlayer(store, strict);
    click(T.sittingIntro.button);
    tick(450);
    expect(screen.getByText(T.intros.check)).toBeInTheDocument();
    click(T.go);

    // c1–c3: แฟลช 7, 9, 4 จุด
    answerFlashItem(3, 7);
    answerFlashItem(1, 9);
    answerFlashItem(6, 4);
    // c4–c6: โจทย์ตัวเลข ไม่มีภาพ
    expect(screen.getByText('8 + 5 = ?')).toBeInTheDocument();
    expect(dots()).toBe(0);
    answerTextItem(13);
    answerTextItem(16);
    answerTextItem(11);

    // จบเช็คก่อน (ข้าม A1/A2) → หน้าเปิดส่วน A
    expect(screen.getByText(T.intros.A)).toBeInTheDocument();
    tick(450);
    click(T.go);

    // A3: ตอบ (เลข) → เลือกในหัวเห็นอะไร → ต่อไป
    for (const expected of [3, 6, 2, 7, 4, 1]) {
      tick(450);
      typeAnswer(expected);
      expect(screen.getByText(T.questions.mindView)).toBeInTheDocument();
      tick(450);
      click('เห็นกล่อง 10 ช่อง');
      tick(450);
      click(T.next);
    }
    // ข้อสรุปกฎ A → หน้าส่งเครื่อง → บันทึกของพ่อ
    expect(screen.getByText(T.rules.A)).toBeInTheDocument();
    tick(450);
    click(T.next);
    expect(screen.getByText(T.handover)).toBeInTheDocument();
    tick(450);
    click(T.next);
    expect(screen.getByText(T.parentNote.title)).toBeInTheDocument();
    click(T.parentNote.skip);

    const events = await eventsOf(store);
    expect(events).toHaveLength(18);
    expect(new Set(events.map((e) => e.id)).size).toBe(18);
    expect(events[0]?.type).toBe('session.started');
    expect(events.at(-1)?.type).toBe('session.completed');
    const answered = events.filter((e) => e.type === 'item.answered');
    expect(answered).toHaveLength(12);
    expect(events.filter((e) => e.type === 'block.completed').map((e) => e.type)).toHaveLength(2);
    // at เพิ่มขึ้นเคร่งครัด (ADR-0008)
    const ats = events.map((e) => e.at);
    expect([...ats].sort()).toEqual(ats);
    expect(new Set(ats).size).toBe(ats.length);
    expect(screen.getByText('หน้าหลัก')).toBeInTheDocument();
  });

  it('A1: แตะช่องนับขึ้นในแยกเลข ตอบผิด L1 ไฮไลต์ 2 ช่อง แล้วตอบถูก (ไม่ซ้ำ event)', async () => {
    const store = await setupLearner();
    await renderPlayer(store, strict);
    click(T.sittingIntro.button);
    tick(450);
    click(T.go);
    // c1 ตอบผิด → ไม่ข้าม A1
    answerFlashItem(7, 7);
    answerFlashItem(1, 9);
    answerFlashItem(6, 4);
    answerTextItem(13);
    answerTextItem(16);
    answerTextItem(11);
    tick(450);
    click(T.go);

    // A1.1: กล่อง 8 จุด
    tick(450);
    expect(screen.getByText(T.questions.a1)).toBeInTheDocument();
    expect(dots()).toBe(8);
    const cell = (i: number) => document.querySelector(`[data-cell-index="${i}"]`)!;
    expect(cell(8).getAttribute('data-cell-state')).toBe('empty');
    fireClick(cell(8) as HTMLElement);
    expect(cell(8).getAttribute('data-cell-state')).toBe('added');
    expect(dots()).toBe(9);
    // แตะช่องที่มีจุดแล้วไม่มีผล
    fireClick(cell(0) as HTMLElement);
    expect(dots()).toBe(9);
    expect(screen.getByRole('img', { name: 'แยกเลข ทั้งหมด 10 ส่วนที่หนึ่ง 8 ส่วนที่สอง 1' }));

    typeAnswer(8); // L1
    expect(screen.getByText(T.feedback.l1)).toBeInTheDocument();
    expect(rings()).toEqual([8, 9]);
    tick(450);
    typeAnswer(2);
    expect(screen.getByText('ใช่ ช่องว่าง 2 ช่อง 8 กับ 2 ได้ 10')).toBeInTheDocument();
    expect(cell(9).getAttribute('data-cell-state')).toBe('added');
    expect(dots()).toBe(10);

    const events = await eventsOf(store);
    const a11 = events.filter((e) => e.type === 'item.answered' && e.itemId === 'A1.1');
    expect(a11).toHaveLength(2);
    expect(a11.map((e) => e.type === 'item.answered' && e.attemptNo)).toEqual([1, 2]);
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
  });
});

describe('LessonPlayer ครั้งที่ 2 ในรอบที่ 1', () => {
  it('ครั้งที่เหลือแต่ส่วน B ไม่เริ่ม session และไม่บันทึกอะไร', async () => {
    // ครั้งที่ 1 ผ่านครบ (สร้างจากการเล่นจริงผ่าน machine ด้วย testHarness)
    const { playSitting } = await import('@/engine/lesson/testHarness');
    const s1 = playSitting([], { latencyMs: () => 1000 }, { sessionId: 's1', startMs: 0 });
    const store = await setupLearner(s1.stored);
    const before = (await store.listEvents()).length;
    render(
      <MemoryRouter initialEntries={['/play/ADD-04']}>
        <ProgressProvider createStoreForTest={() => Promise.resolve(store)}>
          <Routes>
            <Route path="/play/:activityId" element={<LessonPlayerRoute />} />
          </Routes>
        </ProgressProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('ส่วนถัดไปของบทนี้ยังไม่เปิดให้เล่นในเวอร์ชันนี้')).toBeTruthy();
    expect(screen.queryByText(T.sittingIntro.button)).toBeNull();
    expect((await store.listEvents()).length).toBe(before);
  });
});
