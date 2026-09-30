// ตัวประทับเวลา event แบบเพิ่มขึ้นเคร่งครัด (ADR-0008 ข้อ 2): 1 ตัวต่อ session
export interface EventStamper {
  next(): string;
}

export function createEventStamper(now: () => number = () => Date.now()): EventStamper {
  let last = -Infinity;
  return {
    next() {
      last = Math.max(now(), last + 1);
      return new Date(last).toISOString();
    },
  };
}
