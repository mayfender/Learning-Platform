import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ProgressProvider } from '@/app/ProgressProvider';
import { createMemoryStore } from '@/store/MemoryStore';
import { Home } from '@/app/routes/Home';
import { playSitting } from '@/engine/lesson/testHarness';

afterEach(() => cleanup());

async function renderHome() {
  render(
    <MemoryRouter>
      <ProgressProvider createStoreForTest={() => Promise.resolve(createMemoryStore())}>
        <Home />
      </ProgressProvider>
    </MemoryRouter>,
  );
  await screen.findByText('ยินดีต้อนรับ');
}

describe('Home', () => {
  it('สร้างผู้เรียนใหม่แล้วเห็นคำทักทาย', async () => {
    const user = userEvent.setup();
    await renderHome();
    const input = screen.getByLabelText('ชื่อเล่นของลูก');
    await user.type(input, 'ทดสอบ');
    await user.click(screen.getByRole('button', { name: 'เริ่มใช้งาน' }));
    expect(await screen.findByText('สวัสดี ทดสอบ')).toBeInTheDocument();
  });

  it('ปุ่มกดไม่ได้เมื่อชื่อเล่นว่าง', async () => {
    await renderHome();
    const button = screen.getByRole('button', { name: 'เริ่มใช้งาน' });
    expect(button).toBeDisabled();
  });

  it('การ์ดบทเรียน: ครั้งที่ 1 ก่อนเริ่ม, ครั้งที่ 2 หลังจบครั้งที่ 1, อยู่ก่อนการ์ด DX-ADD, ไม่มีการ์ดทบทวน/ท่องซ้ำ', async () => {
    const store = createMemoryStore();
    await store.addLearners([{ id: 'l1', nickname: 'ทดสอบ', createdAt: new Date().toISOString() }]);
    await store.setMeta('currentLearnerId', 'l1');
    const view = () =>
      render(
        <MemoryRouter>
          <ProgressProvider createStoreForTest={() => Promise.resolve(store)}>
            <Home />
          </ProgressProvider>
        </MemoryRouter>,
      );
    view();
    const card = await screen.findByRole('link', { name: /ช่องว่างและเติมให้เต็มสิบ/ });
    await waitFor(() => expect(card).toHaveTextContent('ครั้งที่ 1'));
    const links = screen.getAllByRole('link').map((l) => l.textContent ?? '');
    expect(links[0]).toContain('ช่องว่างและเติมให้เต็มสิบ');
    expect(links.some((t) => t.includes('ภารกิจสำรวจการบวก'))).toBe(true);
    expect(screen.queryByText('ทบทวนวันนี้')).toBeNull();
    expect(screen.queryByText('ท่องซ้ำ 2 นาที')).toBeNull();
    cleanup();

    const s1 = playSitting([], { latencyMs: () => 1000 }, { sessionId: 's1', startMs: 0 });
    await store.appendEvents(s1.stored);
    view();
    const card2 = await screen.findByRole('link', { name: /ช่องว่างและเติมให้เต็มสิบ/ });
    await waitFor(() => expect(card2).toHaveTextContent('ครั้งที่ 2'));
  });
});
