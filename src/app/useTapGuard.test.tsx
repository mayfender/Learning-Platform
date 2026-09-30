import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TAP_GUARD_MS, useTapGuard } from '@/app/useTapGuard';

function Harness({ onA, onB }: { onA: () => void; onB: () => void }) {
  const { tapDispatch, guardPointer } = useTapGuard();
  return (
    <div onClickCapture={guardPointer}>
      <button onClick={() => tapDispatch(() => onA(), undefined)}>A</button>
      <button onClick={() => onB()}>B</button>
      <dialog open>
        <button onClick={() => onB()}>ในกล่อง</button>
      </dialog>
    </div>
  );
}

describe('useTapGuard (กันแตะทะลุ 400 ms)', () => {
  let now = 1000;
  beforeEach(() => {
    now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('ค่ากันแตะ = 400 ms', () => {
    expect(TAP_GUARD_MS).toBe(400);
  });

  it('แตะที่เปลี่ยนหน้าแล้ว pointer ที่เข้ามาใน 400 ms ถูกทิ้ง และหลังจากนั้นผ่าน', () => {
    const onA = vi.fn();
    const onB = vi.fn();
    render(<Harness onA={onA} onB={onB} />);
    fireEvent.click(screen.getByText('A'));
    expect(onA).toHaveBeenCalledTimes(1);

    now = 1399;
    fireEvent.click(screen.getByText('B'));
    expect(onB).not.toHaveBeenCalled();

    now = 1400;
    fireEvent.click(screen.getByText('B'));
    expect(onB).toHaveBeenCalledTimes(1);
  });

  it('ปุ่มในกล่องยืนยัน (dialog) ของพ่อไม่อยู่ใต้กฎ', () => {
    const onB = vi.fn();
    render(<Harness onA={() => {}} onB={onB} />);
    fireEvent.click(screen.getByText('A'));
    now = 1100;
    fireEvent.click(screen.getByText('ในกล่อง'));
    expect(onB).toHaveBeenCalledTimes(1);
  });

  it('คีย์บอร์ด (ตัวเลข Enter Backspace) ใน 400 ms ถูกตัดก่อนถึงตัวฟังอื่น; ปุ่มอื่นผ่าน', () => {
    const listener = vi.fn();
    window.addEventListener('keydown', listener);
    render(<Harness onA={() => {}} onB={() => {}} />);
    fireEvent.click(screen.getByText('A'));
    now = 1100;
    fireEvent.keyDown(window, { key: '5' });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(listener).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'a' });
    expect(listener).toHaveBeenCalledTimes(1);
    now = 1500;
    fireEvent.keyDown(window, { key: '5' });
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener('keydown', listener);
  });
});
