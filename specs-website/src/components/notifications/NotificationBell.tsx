import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, BellRing, Check, ExternalLink, Loader2 } from 'lucide-react';
import { cachedApi, api, CacheTags } from '../../shared/api';
import { account } from '../../shared/appwrite';
import { dataCache } from '../../shared/cache.js';
import { disablePush, enablePush, getPushStatus, onForegroundPush, syncPush, type PushStatus } from '../../shared/pushNotifications';
import { useToast } from '../ui/Toast';
import type { NotificationDoc } from '../../types/database';

const NotificationBell: React.FC = () => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // /dashboard/<role>/... -> that role's announcements page (admins publish from their own page).
  const role = pathname.split('/')[2];
  const announcementsPath = ['student', 'officer', 'admin'].includes(role) ? `/dashboard/${role}/announcements` : null;
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushStatus>(() => getPushStatus());
  const [pushBusy, setPushBusy] = useState(false);

  const load = async () => {
    try { setNotifications(await cachedApi.notifications.listForCurrentUser()); }
    catch (error) { console.warn('[NotificationBell] Failed to load notifications', error); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  // Keep the push token fresh after sign-in (never prompts), and surface pushes that arrive while the site is open.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await account.get();
        if (user?.$id) await syncPush(user.$id);
      } catch { /* signed out or push unavailable */ }
      if (!cancelled) setPushStatus(getPushStatus());
    })();
    const stop = onForegroundPush((message) => {
      addToast({ type: message.priority === 'urgent' ? 'warning' : 'info', title: message.title, message: message.body, duration: 8000 });
      dataCache.invalidateTags([CacheTags.NOTIFICATIONS]);
      void load();
    });
    return () => { cancelled = true; stop(); };
  }, []);

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushStatus === 'enabled') {
        setPushStatus(await disablePush());
      } else {
        const user = await account.get();
        const status = await enablePush(user.$id);
        setPushStatus(status);
        if (status === 'enabled') addToast({ type: 'success', title: 'Push enabled', message: 'You will get alerts even when this tab is closed.' });
        if (status === 'blocked') addToast({ type: 'warning', title: 'Notifications blocked', message: 'Allow notifications for this site in your browser settings.' });
      }
    } catch (error: any) {
      console.warn('[NotificationBell] Push toggle failed', error);
      addToast({ type: 'error', title: 'Push notifications', message: error?.message || 'Could not update push notifications.' });
      setPushStatus(getPushStatus());
    } finally { setPushBusy(false); }
  };

  const unread = useMemo(() => notifications.filter((notification) => !notification.readAt), [notifications]);

  const markRead = async (notification: NotificationDoc) => {
    if (notification.readAt) return;
    try {
      await api.notifications.markRead(notification.$id);
      setNotifications((current) => current.map((item) => item.$id === notification.$id ? { ...item, readAt: new Date().toISOString() } : item));
    } catch (error) { console.warn('[NotificationBell] Failed to mark notification read', error); }
  };

  const markAllRead = async () => {
    if (!unread.length) return;
    setMarking(true);
    try {
      await api.notifications.markAllRead();
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
    } catch (error) { console.warn('[NotificationBell] Failed to mark all read', error); }
    finally { setMarking(false); }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <Bell className="h-4.5 w-4.5" />
        {unread.length > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-4 text-white">{unread.length > 99 ? '99+' : unread.length}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(90vw,24rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h3>
              <p className="text-[11px] text-slate-400">{unread.length ? `${unread.length} unread` : 'All caught up'}</p>
            </div>
            <button type="button" onClick={markAllRead} disabled={!unread.length || marking} className="text-[11px] font-semibold text-[#0d6b66] disabled:opacity-40 dark:text-teal-400">
              {marking ? 'Marking…' : 'Mark all read'}
            </button>
          </div>
          {pushStatus !== 'unavailable' && (
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
              <BellRing className="h-4 w-4 shrink-0 text-[#0d6b66] dark:text-teal-400" />
              <p className="min-w-0 flex-1 text-[11px] leading-snug text-slate-600 dark:text-slate-300">
                {pushStatus === 'enabled' && 'Push alerts are on for this device.'}
                {pushStatus === 'blocked' && 'Notifications are blocked for this site. Click the lock icon next to the address bar, set Notifications to Allow, then refresh the page.'}
                {(pushStatus === 'prompt' || pushStatus === 'off') && 'Get alerts on this device even when the tab is closed.'}
              </p>
              {pushStatus !== 'blocked' && (
                <button type="button" onClick={togglePush} disabled={pushBusy} className="shrink-0 rounded-lg bg-[#0d6b66] px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50 dark:bg-teal-600">
                  {pushBusy ? '…' : pushStatus === 'enabled' ? 'Turn off' : 'Enable'}
                </button>
              )}
            </div>
          )}
          <div className="max-h-[min(65vh,28rem)] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-xs text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading notifications…</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-slate-400">No notifications yet.</div>
            ) : notifications.map((notification) => (
              <button
                type="button"
                key={notification.$id}
                onClick={() => { void markRead(notification); if (notification.link) window.location.assign(notification.link); }}
                className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70 ${notification.readAt ? '' : 'bg-teal-50/50 dark:bg-teal-950/20'}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? 'bg-slate-300' : notification.priority === 'urgent' ? 'bg-rose-500' : notification.priority === 'important' ? 'bg-amber-500' : 'bg-teal-500'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100"><span className="truncate">{notification.title}</span>{notification.link && <ExternalLink className="h-3 w-3 shrink-0" />}</span>
                    <span className="mt-1 block whitespace-pre-wrap text-xs leading-relaxed text-slate-600 dark:text-slate-300">{notification.body}</span>
                    <span className="mt-1.5 block text-[10px] text-slate-400">{new Date(notification.createdAt || notification.$createdAt).toLocaleString()}</span>
                  </span>
                  {notification.readAt && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                </div>
              </button>
            ))}
          </div>
          {announcementsPath && (
            <button
              type="button"
              onClick={() => { setOpen(false); navigate(announcementsPath); }}
              className="block w-full border-t border-slate-100 px-4 py-2.5 text-center text-xs font-semibold text-[#0d6b66] hover:bg-slate-50 dark:border-slate-800 dark:text-teal-400 dark:hover:bg-slate-800/70"
            >
              View all announcements
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
