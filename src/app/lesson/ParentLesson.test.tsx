import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ParentLesson } from '@/app/lesson/ParentLesson';
import { ProgressProvider } from '@/app/ProgressProvider';
import { ADD_04 } from '@/content/lessons/ADD-04';
import { playSitting, type Policy } from '@/engine/lesson/testHarness';
import { createMemoryStore } from '@/store/MemoryStore';
import type { ProgressStore } from '@/store/ProgressStore';
import type { AppEvent } from '@/engine/types';

afterEach(() => cleanup());

const G = ADD_04.parentGuide;

async function storeWith(events: AppEvent[]): Promise<ProgressStore> {
  const store = createMemoryStore();
  await store.addLearners([{ id: 'l1', nickname: 'ทดสอบ', createdAt: new Date().toISOString() }]);
  await store.setMeta('currentLearnerId', 'l1');
  await store.appendEvents(events);
  return store;
}

async function renderPage(store: ProgressStore) {
  render(
    <MemoryRouter initialEntries={['/parent/lesson/ADD-04']}>
      <ProgressProvider createStoreForTest={() => Promise.resolve(store)}>
        <Routes>
          <Route path="/parent/lesson/:lessonId" element={<ParentLesson />} />
        </Routes>
      </ProgressProvider>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: ADD_04.title, level: 1 });
}

// ครั้งที่ 1 ที่ข้าม A1/A2 (c1–c3 เร็ว) ตอบถูกหมด
const passA: Policy = { latencyMs: () => 1000, mind: () => 'see-box' };
// A3 ช้าทั้งหมด → ไม่ผ่านส่วน A → ธง talk-A
const failA: Policy = { latencyMs: (i) => (i.section === 'A3' ? 9000 : 1000) };

describe('ParentLesson (หน้าพ่อของบท)', () => {
  it('แสดงของจริงที่ต้องเตรียม Number Talks และคำถามต่อยอดตรงเนื้อหา (LS §4, §5, §7)', async () => {
    await renderPage(await storeWith([]));
    for (const item of G.materials.items) expect(screen.getByText(item)).toBeInTheDocument();
    expect(screen.getByText(G.numberTalks.problems)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(G.numberTalks.openingNote))).toBeInTheDocument();
    for (const q of G.numberTalks.openingQuestions) {
      expect(screen.getByText(new RegExp(`"${q}"`))).toBeInTheDocument();
    }
    for (const a of G.numberTalks.avoid) expect(screen.getByText(a)).toBeInTheDocument();
    expect(screen.getByText(G.challengeExtension.question)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(G.challengeExtension.answer))).toBeInTheDocument();
  });

  it('ตารางรายข้อ: 12 แถว เวลา 1 ตำแหน่ง วิธีคิด ความเข้าใจผิด; เลื่อนในกล่องตาราง', async () => {
    const s = playSitting(
      [],
      { ...passA, response: (i) => (i.id === 'A3.6' ? 19 : undefined) },
      { sessionId: 's1', startMs: Date.UTC(2026, 0, 1) },
    );
    await renderPage(await storeWith(s.stored));
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(12);
    const cells = (id: string) =>
      within(rows.find((r) => within(r).queryAllByText(id).length > 0)!).getAllByRole('cell');
    const a31 = cells('A3.1').map((c) => c.textContent);
    expect(a31).toContain('ถูก');
    expect(a31).toContain('1.0'); // latencyMs 1000 → วินาที 1 ตำแหน่ง
    expect(a31).toContain('เห็นกล่อง 10 ช่อง');
    const a36 = cells('A3.6').map((c) => c.textContent);
    expect(a36).toContain('ผิด (เฉลย 1)');
    expect(a36).toContain('M4');
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual(
      expect.arrayContaining([
        'ข้อ',
        'โจทย์',
        'ถูก/ผิด',
        'เวลา (วิ)',
        'ในหัวเห็นอะไร',
        'ความเข้าใจผิด',
      ]),
    );
    // ตารางเลื่อนแนวนอนในกล่องของตัวเอง ไม่ดันทั้งหน้า
    expect(table.parentElement?.className).toMatch(/tableWrap/);
  });

  it('ธง talk-A: มีปุ่ม "ทำแล้ว" 1 ปุ่ม กดแล้วบันทึก parent.noted resolvedFlag และปุ่มหาย', async () => {
    const user = userEvent.setup();
    const s = playSitting([], failA, { sessionId: 's1', startMs: Date.UTC(2026, 0, 1) });
    // A3 ไม่ผ่านแต่ในครั้งนี้พ่อยังไม่กด "ทำแล้ว" ที่หน้าคำแนะนำ (PARENT_CONTINUE): ตัด parent.noted ของธงออก
    const events = s.stored.filter(
      (e) => !(e.type === 'parent.noted' && e.resolvedFlag === 'talk-A'),
    );
    const store = await storeWith(events);
    await renderPage(store);
    const done = screen.getAllByRole('button', { name: 'ทำแล้ว' });
    expect(done).toHaveLength(1);
    await user.click(done[0]!);
    await waitFor(async () => {
      const noted = (await store.listEvents()).filter(
        (e) => e.type === 'parent.noted' && e.resolvedFlag === 'talk-A',
      );
      expect(noted).toHaveLength(1);
    });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'ทำแล้ว' })).toBeNull());
  });

  it('บันทึกของพ่อ: บันทึกได้เมื่อเลือกครบ; แก้ภายหลัง = event ใหม่ หน้าแสดงค่าล่าสุดค่าเดียว; โน้ต ≤ 200', async () => {
    const user = userEvent.setup();
    const s = playSitting([], passA, { sessionId: 's1', startMs: Date.UTC(2026, 0, 1) });
    const store = await storeWith(s.stored);
    await renderPage(store);

    const save = screen.getByRole('button', { name: 'บันทึก' });
    expect(save).toBeDisabled();
    const pick = async (group: string, option: string) =>
      user.click(
        within(screen.getByRole('radiogroup', { name: group })).getByRole('radio', {
          name: option,
        }),
      );
    await pick('ใช้นิ้ว', 'บางข้อ');
    expect(save).toBeDisabled();
    await pick('ขยับปากนับ', 'ไม่ใช้');
    expect(save).toBeEnabled();
    const box = screen.getByRole('textbox', { name: /โน้ต/ });
    await user.click(box);
    await user.paste('ก'.repeat(250));
    expect((box as HTMLTextAreaElement).value).toHaveLength(200);
    await user.clear(box);
    await user.type(box, 'โน้ตแรก');
    await user.click(save);
    await screen.findByText(/โน้ตแรก/);

    await pick('ใช้นิ้ว', 'เกือบทุกข้อ');
    await pick('ขยับปากนับ', 'บางข้อ');
    await user.type(screen.getByRole('textbox', { name: /โน้ต/ }), 'โน้ตใหม่');
    await user.click(screen.getByRole('button', { name: 'บันทึก' }));
    await screen.findByText(/โน้ตใหม่/);
    expect(screen.queryByText(/โน้ตแรก/)).toBeNull();

    const noted = (await store.listEvents()).filter((e) => e.type === 'parent.noted');
    expect(noted).toHaveLength(2);
    // เวลาเพิ่มขึ้นเคร่งครัดและไม่ต่ำกว่า event เดิม
    const all = (await store.listEvents()).map((e) => e.at).sort();
    expect(noted[1]!.at > noted[0]!.at).toBe(true);
    expect(noted[0]!.at >= all[0]!).toBe(true);
  });
});
