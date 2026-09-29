import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { TenFrame } from '@/manipulatives/TenFrame';

function tick(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  mockMatchMedia(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('TenFrame', () => {
  it('จำนวนจุด = filled และเติมตามลำดับ index', () => {
    const { container } = render(<TenFrame mode="show" filled={3} colorMode="single" />);
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(3);
  });

  it('single ทุกจุดสีเดียว', () => {
    const { container } = render(<TenFrame mode="show" filled={10} colorMode="single" />);
    const circles = [...container.querySelectorAll('circle')];
    const fills = new Set(circles.map((c) => c.getAttribute('fill')));
    expect(fills.size).toBe(1);
    expect([...fills][0]).toBe('var(--color-dot-single)');
  });

  it('split-5 แบ่งสี 2 กลุ่ม', () => {
    const { container } = render(<TenFrame mode="show" filled={10} colorMode="split-5" />);
    const circles = [...container.querySelectorAll('circle')];
    const fills = circles.map((c) => c.getAttribute('fill'));
    expect(fills.slice(0, 5).every((f) => f === 'var(--color-group-a)')).toBe(true);
    expect(fills.slice(5, 10).every((f) => f === 'var(--color-group-b)')).toBe(true);
  });

  it('hidden ไม่มีจุด', () => {
    const { container } = render(<TenFrame mode="hidden" filled={7} />);
    expect(container.querySelectorAll('circle')).toHaveLength(0);
  });

  it('label ไม่มีจำนวนจุด', () => {
    render(<TenFrame mode="show" filled={7} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'ตาราง 10 ช่อง');
  });

  it('flash ปกติ: ซ่อนที่ 1500ms, onFlashEnd ที่ 1650ms ครั้งเดียว', () => {
    vi.useFakeTimers();
    const onFlashEnd = vi.fn();
    const { container } = render(
      <TenFrame
        mode="flash"
        flashMs={1500}
        onFlashEnd={onFlashEnd}
        filled={7}
        colorMode="single"
      />,
    );
    tick(1499);
    expect(container.querySelector('[data-visible="false"]')).toBeNull();
    expect(onFlashEnd).not.toHaveBeenCalled();

    tick(1);
    expect(onFlashEnd).not.toHaveBeenCalled();

    tick(149);
    expect(onFlashEnd).not.toHaveBeenCalled();

    tick(1);
    expect(onFlashEnd).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-visible="false"]')).not.toBeNull();

    tick(1000);
    expect(onFlashEnd).toHaveBeenCalledTimes(1);
  });

  it('reduced motion: ซ่อนและ onFlashEnd พร้อมกันที่ 1500ms', () => {
    mockMatchMedia(true);
    vi.useFakeTimers();
    const onFlashEnd = vi.fn();
    const { container } = render(
      <TenFrame
        mode="flash"
        flashMs={1500}
        onFlashEnd={onFlashEnd}
        filled={7}
        colorMode="single"
      />,
    );
    tick(1499);
    expect(onFlashEnd).not.toHaveBeenCalled();
    tick(1);
    expect(onFlashEnd).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-visible="false"]')).not.toBeNull();
  });

  it('unmount ก่อนหมดเวลาไม่เรียก onFlashEnd', () => {
    vi.useFakeTimers();
    const onFlashEnd = vi.fn();
    const { unmount } = render(
      <TenFrame
        mode="flash"
        flashMs={1500}
        onFlashEnd={onFlashEnd}
        filled={7}
        colorMode="single"
      />,
    );
    tick(500);
    unmount();
    tick(5000);
    expect(onFlashEnd).not.toHaveBeenCalled();
  });

  it('hidden แล้วเปลี่ยนเป็น flash (ไม่เปลี่ยน key) ต้องเห็น filled จุดจนถึง flashMs แล้วซ่อนและเรียก onFlashEnd', () => {
    vi.useFakeTimers();
    const onFlashEnd = vi.fn();
    const { container, rerender } = render(
      <TenFrame mode="hidden" filled={7} colorMode="single" />,
    );
    expect(container.querySelectorAll('circle')).toHaveLength(0);
    rerender(
      <TenFrame
        mode="flash"
        flashMs={1500}
        onFlashEnd={onFlashEnd}
        filled={7}
        colorMode="single"
      />,
    );
    tick(0);
    expect(container.querySelectorAll('circle')).toHaveLength(7);
    tick(1499);
    expect(container.querySelectorAll('circle')).toHaveLength(7);
    tick(151);
    expect(container.querySelectorAll('circle')).toHaveLength(0);
    expect(onFlashEnd).toHaveBeenCalledTimes(1);
  });

  it('flash ปกติ: มีจุดครบตอนแสดง (data-visible=true)', () => {
    vi.useFakeTimers();
    const { container } = render(
      <TenFrame mode="flash" flashMs={1500} filled={9} colorMode="single" />,
    );
    expect(container.querySelector('[data-visible="true"]')).not.toBeNull();
    expect(container.querySelectorAll('circle')).toHaveLength(9);
  });
});
