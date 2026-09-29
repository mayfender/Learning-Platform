import { Link } from 'react-router';
import { strings } from '@/app/strings';

// M0: content/registry.ts ยังว่าง จึงไม่พบกิจกรรมเสมอ (§5.2)
export function Play() {
  return (
    <div>
      <p>{strings.play.notFound}</p>
      <Link to="/">{strings.play.backHome}</Link>
    </div>
  );
}
