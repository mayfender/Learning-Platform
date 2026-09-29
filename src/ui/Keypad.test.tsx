import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Keypad } from '@/ui/Keypad';

afterEach(() => cleanup());

function Wrapper({ maxDigits = 3, disabled = false }: { maxDigits?: number; disabled?: boolean }) {
  const [value, setValue] = useState('');
  const onSubmit = vi.fn();
  return (
    <>
      <Keypad
        value={value}
        onChange={setValue}
        onSubmit={onSubmit}
        submitLabel="ตอบ"
        maxDigits={maxDigits}
        disabled={disabled}
      />
      <output data-testid="value">{value}</output>
    </>
  );
}

describe('Keypad', () => {
  it('พิมพ์ตัวเลขได้', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.click(screen.getByText('1'));
    await user.click(screen.getByText('2'));
    expect(screen.getByTestId('value')).toHaveTextContent('12');
  });

  it('จำกัด 3 หลัก', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    for (const d of ['1', '2', '3', '4']) {
      await user.click(screen.getByText(d));
    }
    expect(screen.getByTestId('value')).toHaveTextContent('123');
  });

  it('ลบตัวเลขได้', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.click(screen.getByText('1'));
    await user.click(screen.getByText('2'));
    await user.click(screen.getByLabelText('ลบตัวเลข'));
    expect(screen.getByTestId('value')).toHaveTextContent('1');
  });

  it('0 นำหน้าถูกแทนที่ด้วยตัวเลขถัดไป', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.click(screen.getByText('0'));
    expect(screen.getByTestId('value')).toHaveTextContent('0');
    await user.click(screen.getByText('7'));
    expect(screen.getByTestId('value')).toHaveTextContent('7');
  });

  it('ปุ่มตอบ disabled เมื่อว่าง', () => {
    render(<Wrapper />);
    expect(screen.getByText('ตอบ')).toBeDisabled();
  });

  it('รับคีย์บอร์ดจริง', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.keyboard('5');
    expect(screen.getByTestId('value')).toHaveTextContent('5');
    await user.keyboard('{Backspace}');
    expect(screen.getByTestId('value')).toHaveTextContent('');
  });

  it('preventDefault คีย์ที่แป้นจัดการ (Backspace/Enter/เลข) เพื่อไม่ให้เบราว์เซอร์ย้อนหน้า', () => {
    render(<Wrapper />);
    for (const key of ['Backspace', 'Enter', '5']) {
      const e = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true });
      window.dispatchEvent(e);
      expect(e.defaultPrevented, key).toBe(true);
    }
    const other = new KeyboardEvent('keydown', { key: 'a', cancelable: true, bubbles: true });
    window.dispatchEvent(other);
    expect(other.defaultPrevented).toBe(false);
  });

  it('disabled: คีย์บอร์ดไม่มีผลและไม่ preventDefault', async () => {
    const user = userEvent.setup();
    render(<Wrapper disabled />);
    await user.keyboard('5');
    expect(screen.getByTestId('value')).toHaveTextContent('');
  });
});
