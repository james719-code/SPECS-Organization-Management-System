import { useCallback, useEffect, useState } from 'react';
import { account } from './appwrite';
import { disablePush, enablePush, getPushStatus, syncPush, type PushStatus } from './pushNotifications';

const STATUS_EVENT = 'specs-push-status';
let syncedUid: string | null = null;
let syncing: Promise<void> | null = null;

/** Once per signed-in user per page load: silently refresh the stored token. Never prompts. */
function syncOnce(): Promise<void> {
  if (syncing) return syncing;
  syncing = (async () => {
    try {
      const user = await account.get();
      if (user?.$id && user.$id !== syncedUid) {
        syncedUid = user.$id;
        await syncPush(user.$id);
      }
    } catch { /* signed out, or push unavailable */ }
    window.dispatchEvent(new Event(STATUS_EVENT));
  })().finally(() => { syncing = null; });
  return syncing;
}

/** Shared push state for the bell and the sign-in banner, kept in step through a window event. */
export function usePush() {
  const [status, setStatus] = useState<PushStatus>(() => getPushStatus());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const refresh = () => setStatus(getPushStatus());
    window.addEventListener(STATUS_EVENT, refresh);
    void syncOnce();
    return () => window.removeEventListener(STATUS_EVENT, refresh);
  }, []);

  const run = useCallback(async (action: () => Promise<PushStatus>): Promise<PushStatus> => {
    setBusy(true);
    try {
      return await action();
    } finally {
      setBusy(false);
      window.dispatchEvent(new Event(STATUS_EVENT));
    }
  }, []);

  const enable = useCallback(() => run(async () => {
    const user = await account.get();
    return enablePush(user.$id);
  }), [run]);

  const disable = useCallback(() => run(() => disablePush()), [run]);

  return { status, busy, enable, disable };
}
