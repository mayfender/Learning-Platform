import { describe, expect, it } from 'vitest';
import { createEventStamper } from '@/store/stamp';

describe('createEventStamper', () => {
  it('นาฬิกาปลอมคืนเวลาเดิม 3 ครั้ง ได้ t, t+1, t+2 ms', () => {
    const t = Date.parse('2026-01-01T00:00:00.000Z');
    const stamper = createEventStamper(() => t);
    expect([stamper.next(), stamper.next(), stamper.next()]).toEqual([
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.001Z',
      '2026-01-01T00:00:00.002Z',
    ]);
  });

  it('นาฬิกาถอยหลังไม่ทำให้ at ถอย', () => {
    const times = [1000, 500, 200, 5000];
    let i = 0;
    const stamper = createEventStamper(() => times[i++]!);
    const out = [stamper.next(), stamper.next(), stamper.next(), stamper.next()];
    expect(out).toEqual([
      new Date(1000).toISOString(),
      new Date(1001).toISOString(),
      new Date(1002).toISOString(),
      new Date(5000).toISOString(),
    ]);
  });
});
