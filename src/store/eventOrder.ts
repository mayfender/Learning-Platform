import type { AppEvent } from '@/engine/types';

// ลำดับชนิด event เมื่อ `at` เท่ากัน (ADR-0008 ข้อ 3)
const TYPE_ORDER: Record<AppEvent['type'], number> = {
  'session.started': 0,
  'block.started': 1,
  'item.answered': 2,
  'strategy.reported': 2,
  'block.completed': 3,
  'parent.noted': 3,
  'session.completed': 4,
  'session.abandoned': 4,
};

function typeOrder(type: string): number {
  return TYPE_ORDER[type as AppEvent['type']] ?? 2;
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ตัวเรียง event กลาง: at (สตริง ISO) แล้วลำดับชนิด แล้ว id — ทุกที่ที่เรียง event ต้องใช้ตัวนี้
export function compareEvents(a: AppEvent, b: AppEvent): number {
  return (
    compareStrings(a.at, b.at) ||
    typeOrder(a.type) - typeOrder(b.type) ||
    compareStrings(a.id, b.id)
  );
}
