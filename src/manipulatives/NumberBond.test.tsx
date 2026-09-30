import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NumberBond } from '@/manipulatives/NumberBond';

afterEach(cleanup);

const slots = (c: HTMLElement) =>
  [...c.querySelectorAll('[data-slot]')].map((g) => [
    g.getAttribute('data-slot'),
    g.textContent,
    g.querySelector('circle')?.getAttribute('stroke-dasharray') ? 'dashed' : 'solid',
  ]);

describe('NumberBond', () => {
  it('ทุก slot: ตัวเลข, ? (วงประ), null (ไม่วาด)', () => {
    const { container } = render(<NumberBond mode="show" whole={10} parts={[8, '?']} />);
    expect(slots(container)).toEqual([
      ['whole', '10', 'solid'],
      ['part-a', '8', 'solid'],
      ['part-b', '?', 'dashed'],
    ]);
    cleanup();
    const r = render(<NumberBond mode="show" whole={null} parts={[8, null]} />);
    expect(slots(r.container)).toEqual([['part-a', '8', 'solid']]);
    expect(r.container.querySelectorAll('line')).toHaveLength(0);
  });

  it('เปลี่ยนค่าทีละตัวเมื่อผู้เรียกส่งค่าใหม่', () => {
    const { container, rerender } = render(<NumberBond mode="show" whole={10} parts={[8, '?']} />);
    rerender(<NumberBond mode="show" whole={10} parts={[8, 1]} />);
    expect(slots(container)[2]).toEqual(['part-b', '1', 'solid']);
    rerender(<NumberBond mode="show" whole={10} parts={[8, 2]} />);
    expect(slots(container)[2]).toEqual(['part-b', '2', 'solid']);
  });

  it('aria-label ตามสเปก: ? อ่านว่ายังไม่รู้, null ไม่กล่าวถึง', () => {
    render(<NumberBond mode="show" whole={10} parts={[8, '?']} />);
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      'แยกเลข ทั้งหมด 10 ส่วนที่หนึ่ง 8 ส่วนที่สอง ยังไม่รู้',
    );
    cleanup();
    render(<NumberBond mode="show" whole={null} parts={[8, null]} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'แยกเลข ส่วนที่หนึ่ง 8');
  });

  it('highlight วาดวงแหวนที่ช่องนั้นช่องเดียว', () => {
    const { container } = render(
      <NumberBond mode="show" whole={10} parts={[8, 2]} highlight="part-b" />,
    );
    const rings = container.querySelectorAll('[data-highlight]');
    expect(rings).toHaveLength(1);
    expect(rings[0]?.getAttribute('data-highlight')).toBe('part-b');
  });

  it('hidden ไม่มีวงกลมหรือตัวเลข', () => {
    const { container } = render(<NumberBond mode="hidden" whole={10} parts={[8, 2]} />);
    expect(container.querySelectorAll('circle')).toHaveLength(0);
    expect(container.textContent).toBe('');
  });

  it('mode="flash" throw', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(<NumberBond mode={'flash' as unknown as 'show'} whole={10} parts={[8, 2]} />),
    ).toThrow();
  });
});
