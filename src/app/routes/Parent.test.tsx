import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ProgressProvider } from '@/app/ProgressProvider';
import { createMemoryStore } from '@/store/MemoryStore';
import { Parent } from '@/app/routes/Parent';
import type { ProgressStore } from '@/store/ProgressStore';

afterEach(() => cleanup());

function failingStoreFactory(): () => Promise<ProgressStore> {
  return async () => {
    throw new Error('IndexedDB ใช้ไม่ได้ (private mode)');
  };
}

describe('Parent', () => {
  it('แสดงคำเตือน memory-fallback เมื่อเปิด store ปกติไม่ได้', async () => {
    render(
      <MemoryRouter>
        <ProgressProvider createStoreForTest={failingStoreFactory()}>
          <Parent />
        </ProgressProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByText('บันทึกลงเครื่องไม่ได้ ข้อมูลจะหายเมื่อปิดแอป'),
    ).toBeInTheDocument();
  });

  it('import ไฟล์ไม่ใช่ของแอปแสดง error ที่ถูกต้อง', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProgressProvider createStoreForTest={() => Promise.resolve(createMemoryStore())}>
          <Parent />
        </ProgressProvider>
      </MemoryRouter>,
    );
    await screen.findByText('หน้าสำหรับพ่อ');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([JSON.stringify({ app: 'other-app' })], 'bad.json', {
      type: 'application/json',
    });
    await user.upload(input, file);
    await waitFor(() => expect(screen.getByText('ไฟล์นี้ไม่ใช่ไฟล์ของแอปนี้')).toBeInTheDocument());
  });

  it('เตือนยังไม่ได้สำรองข้อมูลเกิน 7 วัน เมื่อมี event และไม่เคย export', async () => {
    const store = createMemoryStore();
    await store.appendEvents([
      {
        id: 'e1',
        at: '2026-01-01T00:00:00.000Z',
        schemaVersion: 1,
        learnerId: 'l1',
        sessionId: 's1',
        activityId: 'DX-ADD',
        type: 'session.started',
        activityKind: 'diagnostic' as const,
        activityVersion: 'DX-ADD v2',
      },
    ]);
    render(
      <MemoryRouter>
        <ProgressProvider createStoreForTest={() => Promise.resolve(store)}>
          <Parent />
        </ProgressProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('ยังไม่ได้สำรองข้อมูลเกิน 7 วัน')).toBeInTheDocument();
  });
});
