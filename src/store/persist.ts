import type { PersistResult } from '@/store/ProgressStore';

export async function requestPersistence(): Promise<PersistResult> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return 'unsupported';
  }
  if (await navigator.storage.persisted()) {
    return 'granted';
  }
  const granted = await navigator.storage.persist();
  return granted ? 'granted' : 'denied';
}
