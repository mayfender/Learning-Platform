import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgressProvider } from '@/app/ProgressProvider';
import { createMemoryStore } from '@/store/MemoryStore';
import { Home } from '@/app/routes/Home';

afterEach(() => cleanup());

async function renderHome() {
  render(
    <ProgressProvider createStoreForTest={() => Promise.resolve(createMemoryStore())}>
      <Home />
    </ProgressProvider>,
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
});
