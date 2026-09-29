import { Link } from 'react-router';
import { diagnostics } from '@/content/registry';
import type { SessionView } from '@/engine/diagnostic/sessions';
import styles from '@/app/diagnostic/HistoryList.module.css';

export interface HistoryListProps {
  sessions: readonly SessionView[];
  currentSessionId?: string;
}

function sessionLabel(session: SessionView): string {
  const dx = diagnostics[session.activityId];
  if (session.summary && session.summary.recommendation.kind === 'step') {
    const step = session.summary.recommendation.ladderStep;
    return `ขั้นที่ ${step}`;
  }
  if (!dx) return 'ยังทำไม่ครบ';
  return 'ยังทำไม่ครบ';
}

export function HistoryList({ sessions, currentSessionId }: HistoryListProps) {
  if (sessions.length === 0) return null;
  return (
    <ul className={styles.list}>
      {sessions.map((session) => (
        <li key={session.sessionId} className={styles.item}>
          <Link to={`/parent/results/${session.sessionId}`}>
            {new Date(session.startedAt).toLocaleString('th-TH', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}{' '}
            — {sessionLabel(session)}
            {session.sessionId === currentSessionId && ' (ครั้งนี้)'}
          </Link>
        </li>
      ))}
    </ul>
  );
}
