import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useLongPress } from '@/ui/useLongPress';

function TestButton({ onLongPress }: { onLongPress: () => void }) {
  const handlers = useLongPress(onLongPress, { ms: 2000 });
  return (
    <button {...handlers} data-testid="target">
      target
    </button>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

function pointerDown(el: Element, x = 0, y = 0) {
  fireEvent.pointerDown(el, { clientX: x, clientY: y });
}

describe('useLongPress', () => {
  it('ไม่ทำงานถ้าปล่อยก่อนครบเวลา (1999ms)', () => {
    const onLongPress = vi.fn();
    render(<TestButton onLongPress={onLongPress} />);
    const el = screen.getByTestId('target');
    pointerDown(el);
    vi.advanceTimersByTime(1999);
    fireEvent.pointerUp(el);
    vi.advanceTimersByTime(10);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('ทำงานเมื่อกดค้างครบ 2000ms', () => {
    const onLongPress = vi.fn();
    render(<TestButton onLongPress={onLongPress} />);
    const el = screen.getByTestId('target');
    pointerDown(el);
    vi.advanceTimersByTime(2000);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('ยกเลิกถ้าเลื่อนเกิน 10px', () => {
    const onLongPress = vi.fn();
    render(<TestButton onLongPress={onLongPress} />);
    const el = screen.getByTestId('target');
    pointerDown(el, 0, 0);
    fireEvent.pointerMove(el, { clientX: 20, clientY: 0 });
    vi.advanceTimersByTime(2000);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('แตะสั้นไม่มีผลอะไร', () => {
    const onLongPress = vi.fn();
    render(<TestButton onLongPress={onLongPress} />);
    const el = screen.getByTestId('target');
    pointerDown(el);
    fireEvent.pointerUp(el);
    vi.advanceTimersByTime(2000);
    expect(onLongPress).not.toHaveBeenCalled();
  });
});
