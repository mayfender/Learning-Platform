import { compareEvents } from '@/store/eventOrder';
import type { AppEvent } from '@/engine/types';
import type { Outbox } from '@/store/outbox';
import type { ProgressStore } from '@/store/ProgressStore';

// event ของบทเรียนหนึ่งบทของผู้เรียนหนึ่งคน รวมที่ยังรอ outbox เขียน (ไม่ซ้ำ id) เรียงด้วย compareEvents (ADR-0008)
export async function loadLessonEvents(
  store: ProgressStore,
  outbox: Outbox,
  learnerId: string,
  activityId: string,
): Promise<AppEvent[]> {
  const stored = await store.listEvents({ learnerId, activityId });
  const byId = new Map<string, AppEvent>();
  for (const e of stored) byId.set(e.id, e);
  for (const e of outbox.pending()) {
    if (e.learnerId === learnerId && e.activityId === activityId) byId.set(e.id, e);
  }
  return [...byId.values()].sort(compareEvents);
}
