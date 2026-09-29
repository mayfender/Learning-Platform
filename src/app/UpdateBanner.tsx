import { useRegisterSW } from 'virtual:pwa-register/react';
import { strings } from '@/app/strings';
import { Button } from '@/ui/Button';

export function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div role="status">
      <span>{strings.updateBanner.message}</span>
      <Button onClick={() => void updateServiceWorker(true)}>{strings.updateBanner.action}</Button>
    </div>
  );
}
