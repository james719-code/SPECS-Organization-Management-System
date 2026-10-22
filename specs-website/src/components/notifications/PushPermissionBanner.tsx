import React, { useState } from 'react';
import { BellRing, BellOff, X } from 'lucide-react';
import { usePush } from '../../shared/usePush';
import { useToast } from '../ui/Toast';

const DISMISS_KEY = 'specs_push_banner_dismissed';

const wasDismissed = (): boolean => {
  try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
};

/** Shown after sign-in until push notifications are on, because announcements, receipts and attendance notices rely on them. */
const PushPermissionBanner: React.FC = () => {
  const { addToast } = useToast();
  const { status, busy, enable } = usePush();
  const [dismissed, setDismissed] = useState(wasDismissed);

  if (dismissed || !['prompt', 'off', 'blocked'].includes(status)) return null;

  const blocked = status === 'blocked';

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* storage unavailable */ }
    setDismissed(true);
  };

  const turnOn = async () => {
    try {
      const result = await enable();
      if (result === 'enabled') addToast({ type: 'success', title: 'Notifications on', message: 'You will now get announcements, receipts and attendance updates on this device.' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Could not turn on notifications', message: error?.message || 'Please try again.' });
    }
  };

  return (
    <div
      role="alert"
      className={`mx-4 sm:mx-6 lg:mx-8 mt-4 flex flex-wrap items-center gap-3 rounded-xl border p-4 shadow-sm ${blocked
        ? 'border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/20'
        : 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20'}`}
    >
      {blocked
        ? <BellOff className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
        : <BellRing className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />}
      <div className="min-w-0 flex-1 text-left">
        <p className={`text-sm font-semibold ${blocked ? 'text-rose-800 dark:text-rose-300' : 'text-amber-800 dark:text-amber-300'}`}>
          {blocked ? 'Notifications are blocked for this site' : 'Turn on notifications to receive announcements'}
        </p>
        <p className={`text-xs ${blocked ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>
          {blocked
            ? 'Click the lock icon next to the address bar, set Notifications to Allow, then refresh this page.'
            : 'Announcements, payment receipts and attendance confirmations are sent as notifications. Enable them on this device so you do not miss any.'}
        </p>
      </div>
      {!blocked && (
        <button
          type="button"
          onClick={turnOn}
          disabled={busy}
          className="whitespace-nowrap rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-amber-700 disabled:opacity-50"
        >
          {busy ? 'Enabling…' : 'Enable notifications'}
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Remind me later"
        title="Remind me next time I sign in"
        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-black/5 dark:text-slate-400 dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default PushPermissionBanner;
