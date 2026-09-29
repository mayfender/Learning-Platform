import { describe, expect, it } from 'vitest';
import { createSilentTimer } from '@/engine/timing';

function fakeClock(start = 0) {
  let now = start;
  return { now: () => now, advance: (ms: number) => (now += ms) };
}

describe('createSilentTimer', () => {
  it('วัดเวลาได้ถูกต้อง', () => {
    const clock = fakeClock();
    const timer = createSilentTimer(clock.now);
    timer.start();
    clock.advance(1234);
    expect(timer.stop()).toEqual({ latencyMs: 1234, latencyValid: true });
  });

  it('invalidate ทำให้ latencyValid เป็น false', () => {
    const clock = fakeClock();
    const timer = createSilentTimer(clock.now);
    timer.start();
    clock.advance(500);
    timer.invalidate();
    expect(timer.stop()).toEqual({ latencyMs: 500, latencyValid: false });
  });

  it('start ซ้ำ = เริ่มใหม่และล้าง invalid เดิม', () => {
    const clock = fakeClock();
    const timer = createSilentTimer(clock.now);
    timer.start();
    clock.advance(100);
    timer.invalidate();
    timer.start();
    clock.advance(300);
    expect(timer.stop()).toEqual({ latencyMs: 300, latencyValid: true });
  });
});
