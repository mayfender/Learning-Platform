import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ProgressProvider } from '@/app/ProgressProvider';
import { createMemoryStore } from '@/store/MemoryStore';
import { Play } from '@/app/routes/Play';

afterEach(() => cleanup());

async function renderPlay(activityId: string, learnerId?: string) {
  const store = createMemoryStore();
  if (learnerId) {
    await store.addLearners([
      { id: learnerId, nickname: 'ทดสอบ', createdAt: new Date().toISOString() },
    ]);
    await store.setMeta('currentLearnerId', learnerId);
  }
  render(
    <MemoryRouter initialEntries={[`/play/${activityId}`]}>
      <ProgressProvider createStoreForTest={() => Promise.resolve(store)}>
        <Routes>
          <Route path="/play/:activityId" element={<Play />} />
        </Routes>
      </ProgressProvider>
    </MemoryRouter>,
  );
}

// AC12: UpdateBanner ห้าม render ในหน้า Play
describe('Play', () => {
  it('แสดง "ไม่พบกิจกรรมนี้" และไม่มี UpdateBanner เมื่อไม่พบกิจกรรม', async () => {
    await renderPlay('NOT-EXIST', 'l1');
    expect(await screen.findByText('ไม่พบกิจกรรมนี้')).toBeInTheDocument();
    expect(screen.queryByText('มีเวอร์ชันใหม่')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('ไม่มีผู้เรียน -> กลับหน้าหลัก (ไม่พัง)', async () => {
    await renderPlay('DX-ADD');
    // ไม่มี Route "/" ในเทสต์นี้ แค่ตรวจว่า redirect ไม่ทำให้พัง และไม่เห็นหน้า Play
    expect(screen.queryByText('ไม่พบกิจกรรมนี้')).not.toBeInTheDocument();
  });
});
