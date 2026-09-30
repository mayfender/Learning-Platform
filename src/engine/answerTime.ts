import type { AppEvent } from '@/engine/types';

type ItemAnsweredEvent = Extract<AppEvent, { type: 'item.answered' }>;

// เวลาที่ลูกกด "ตอบ" — event เก่าไม่มี answeredAt ใช้ `at` แทน (ข้อที่ถามวิธีคิดคลาดประมาณ 1–3 วินาที)
export function answerTime(e: ItemAnsweredEvent): string {
  return e.answeredAt ?? e.at;
}
