import { Link, Navigate, useParams } from 'react-router';
import { useProgress } from '@/app/ProgressProvider';
import { DiagnosticPlayer } from '@/app/diagnostic/DiagnosticPlayer';
import { strings } from '@/app/strings';
import { diagnostics } from '@/content/registry';

export function Play() {
  const { activityId } = useParams();
  const { currentLearner } = useProgress();

  if (!currentLearner) {
    return <Navigate to="/" replace />;
  }

  const dx = activityId ? diagnostics[activityId] : undefined;
  if (!dx) {
    return (
      <div>
        <p>{strings.play.notFound}</p>
        <Link to="/">{strings.play.backHome}</Link>
      </div>
    );
  }

  return <DiagnosticPlayer key={dx.id} dx={dx} />;
}
