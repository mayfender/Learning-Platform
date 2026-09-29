import { groupSessions, type SessionView } from '@/engine/diagnostic/sessions';
import type { AppEvent } from '@/engine/types';
import type { Outbox } from '@/store/outbox';
import type { EventQuery, ProgressStore } from '@/store/ProgressStore';

export async function loadDiagnosticSessions(
  store: ProgressStore,
  outbox: Outbox,
  filter: EventQuery = {},
): Promise<SessionView[]> {
  const stored = await store.listEvents(filter);
  const pending = outbox
    .pending()
    .filter(
      (e) =>
        (!filter.learnerId || e.learnerId === filter.learnerId) &&
        (!filter.activityId || e.activityId === filter.activityId) &&
        (!filter.sessionId || e.sessionId === filter.sessionId),
    );
  const byId = new Map<string, AppEvent>();
  for (const e of stored) byId.set(e.id, e);
  for (const e of pending) byId.set(e.id, e);
  return groupSessions([...byId.values()]);
}
