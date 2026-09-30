import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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

  it('data-dot อยู่ที่ทุก circle ของจุด (นับได้เท่ากับ circle)', () => {
    const { container } = render(<TenFrame mode="show" filled={7} />);
    expect(container.querySelectorAll('[data-dot]')).toHaveLength(7);
    expect(container.querySelectorAll('circle[data-dot]')).toHaveLength(7);
  });

  describe('v2: added / highlight / onCellTap', () => {
    const state = (c: HTMLElement, i: number) =>
      c.querySelector(`[data-cell-index="${i}"]`)?.getAttribute('data-cell-state');

    it('นับ [data-dot] = filled + added.length และ data-cell-state ถูก', () => {
      const { container } = render(<TenFrame mode="show" filled={8} added={[8, 9]} />);
      expect(container.querySelectorAll('[data-dot]')).toHaveLength(10);
      expect(state(container, 0)).toBe('dot');
      expect(state(container, 7)).toBe('dot');
      expect(state(container, 8)).toBe('added');
      expect(state(container, 9)).toBe('added');
    });

    it('ช่องว่างไม่มีจุด และ added วาดสีใหม่พร้อมขอบ', () => {
      const { container } = render(<TenFrame mode="show" filled={6} added={[7]} />);
      expect(state(container, 6)).toBe('empty');
      expect(container.querySelectorAll('[data-dot]')).toHaveLength(7);
      const addedDot = container.querySelector('[data-cell-index="7"] circle');
      expect(addedDot?.getAttribute('fill')).toBe('var(--color-dot-added)');
      expect(addedDot?.getAttribute('stroke')).toBe('var(--color-on-highlight)');
      expect(addedDot?.getAttribute('stroke-width')).toBe('2');
    });

    it('highlight วาดวงแหวนตามดัชนีและไม่ใช่ circle', () => {
      const { container } = render(
        <TenFrame mode="show" filled={8} added={[8, 9]} highlight={{ indices: [8, 9] }} />,
      );
      const rings = [...container.querySelectorAll('[data-highlight]')];
      expect(rings.map((r) => r.getAttribute('data-highlight'))).toEqual(['8', '9']);
      expect(rings.every((r) => r.tagName.toLowerCase() === 'rect')).toBe(true);
      expect(container.querySelectorAll('circle')).toHaveLength(10);
    });

    it('highlight pulse: มี animation; reduced motion: วงแหวนคงที่ (ไม่มี class)', () => {
      const a = render(
        <TenFrame mode="show" filled={8} highlight={{ indices: [8], pulse: true }} />,
      );
      expect(a.container.querySelector('[data-highlight]')?.getAttribute('class')).toBeTruthy();
      cleanup();
      mockMatchMedia(true);
      const b = render(
        <TenFrame mode="show" filled={8} highlight={{ indices: [8], pulse: true }} />,
      );
      expect(b.container.querySelector('[data-highlight]')?.getAttribute('class')).toBeNull();
    });

    it('interactive: onCellTap(index, state) ทุกช่อง รวมถึงคีย์บอร์ด', () => {
      const onCellTap = vi.fn();
      const { container } = render(
        <TenFrame mode="show" filled={8} added={[8]} interactive onCellTap={onCellTap} />,
      );
      const cell = (i: number) => container.querySelector(`[data-cell-index="${i}"]`)!;
      fireEvent.click(cell(9));
      fireEvent.click(cell(8));
      fireEvent.click(cell(0));
      fireEvent.keyDown(cell(9), { key: 'Enter' });
      fireEvent.keyDown(cell(9), { key: ' ' });
      expect(onCellTap.mock.calls).toEqual([
        [9, 'empty'],
        [8, 'added'],
        [0, 'dot'],
        [9, 'empty'],
        [9, 'empty'],
      ]);
      expect(cell(9).getAttribute('role')).toBe('button');
      expect(cell(9).getAttribute('aria-label')).toBe('ช่องที่ 10 ว่าง');
      expect(cell(8).getAttribute('aria-label')).toBe('ช่องที่ 9 เติมแล้ว');
      expect(cell(0).getAttribute('aria-label')).toBe('ช่องที่ 1 มีจุด');
      expect(cell(0).getAttribute('tabindex')).toBe('0');
    });

    it('พื้นที่แตะเป็น rect ไม่ใช่ circle (จำนวน circle = จำนวนจุด)', () => {
      const { container } = render(<TenFrame mode="show" filled={3} interactive />);
      expect(container.querySelectorAll('circle')).toHaveLength(3);
      expect(container.querySelectorAll('[data-cell-index] rect')).toHaveLength(10);
    });

    it('ไม่ interactive: ไม่เรียก onCellTap และยังเป็น role=img', () => {
      const onCellTap = vi.fn();
      const { container } = render(<TenFrame mode="show" filled={3} onCellTap={onCellTap} />);
      fireEvent.click(container.querySelector('[data-cell-index="5"]')!);
      expect(onCellTap).not.toHaveBeenCalled();
      expect(screen.getByRole('img')).toBeInTheDocument();
      expect(container.querySelector('[role="button"]')).toBeNull();
    });

    it('size="sm" + interactive throw', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<TenFrame mode="show" filled={3} interactive size="sm" />)).toThrow();
    });

    it('added ผิดเงื่อนไข throw (ต่ำกว่า filled, เกิน 9, ซ้ำ)', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<TenFrame mode="show" filled={8} added={[7]} />)).toThrow();
      expect(() => render(<TenFrame mode="show" filled={8} added={[10]} />)).toThrow();
      expect(() => render(<TenFrame mode="show" filled={8} added={[8, 8]} />)).toThrow();
    });

    it('flash พร้อม added: เห็นจุดรวมตอนแสดง แล้ว 0 จุดหลังซ่อน', () => {
      vi.useFakeTimers();
      const { container } = render(
        <TenFrame mode="flash" flashMs={1500} filled={5} added={[5, 6]} />,
      );
      expect(container.querySelectorAll('[data-dot]')).toHaveLength(7);
      tick(1650);
      expect(container.querySelectorAll('[data-dot]')).toHaveLength(0);
    });
  });
});
