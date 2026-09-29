import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Play } from '@/app/routes/Play';

afterEach(() => cleanup());

// AC12: UpdateBanner ห้าม render ในหน้า Play
describe('Play', () => {
  it('แสดง "ไม่พบกิจกรรมนี้" และไม่มี UpdateBanner', () => {
    render(
      <MemoryRouter>
        <Play />
      </MemoryRouter>,
    );
    expect(screen.getByText('ไม่พบกิจกรรมนี้')).toBeInTheDocument();
    expect(screen.queryByText('มีเวอร์ชันใหม่')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
