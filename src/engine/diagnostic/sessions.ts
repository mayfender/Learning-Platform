import type { AppEvent, ItemAnsweredEvent, SessionSummary } from '@/engine/types';

export interface SessionView {
  sessionId: string;
  activityId: string;
  activityVersion: string;
  startedAt: string;
  endedAt?: string;
  status: 'complete' | 'abandoned' | 'open';
  summary?: SessionSummary;
  items: ItemAnsweredEvent[];
}

export function groupSessions(events: readonly AppEvent[]): SessionView[] {
  const bySession = new Map<string, AppEvent[]>();
  for (const event of events) {
    const list = bySession.get(event.sessionId) ?? [];
    list.push(event);
    bySession.set(event.sessionId, list);
  }

  const views: SessionView[] = [];
  for (const [sessionId, sessionEvents] of bySession) {
    const sorted = [...sessionEvents].sort((a, b) => a.at.localeCompare(b.at));
    const started = sorted.find((e) => e.type === 'session.started');
    const completed = sorted.find((e) => e.type === 'session.completed');
    const abandoned = sorted.find((e) => e.type === 'session.abandoned');
    const ended = completed ?? abandoned;
    const items = sorted.filter(
      (e): e is Extract<AppEvent, { type: 'item.answered' }> => e.type === 'item.answered',
    );
    const activityId = sorted[0]?.activityId ?? '';
    const activityVersion =
      (started && 'activityVersion' in started ? started.activityVersion : undefined) ??
      (ended && 'activityVersion' in ended ? ended.activityVersion : undefined) ??
      '';

    views.push({
      sessionId,
      activityId,
      activityVersion,
      startedAt: started?.at ?? sorted[0]?.at ?? '',
      endedAt: ended?.at,
      status: completed ? 'complete' : abandoned ? 'abandoned' : 'open',
      summary: ended && 'summary' in ended ? ended.summary : undefined,
      items,
    });
  }

  views.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return views;
}
