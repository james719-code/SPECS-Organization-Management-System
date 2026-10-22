import React, { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, Loader2, Megaphone } from 'lucide-react';
import { cachedApi, api, CacheTags } from '../../shared/api';
import { dataCache } from '../../shared/cache.js';
import { formatDateTime } from '../../shared/formatters';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import type { NotificationDoc } from '../../types/database';

type Filter = 'all' | 'unread';

const priorityStyles: Record<string, string> = {
  urgent: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900',
  important: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
};

const Announcements: React.FC = () => {
  const { addToast } = useToast();
  const [items, setItems] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [marking, setMarking] = useState(false);

  const load = async (fresh = false) => {
    try {
      if (fresh) dataCache.invalidateTags([CacheTags.NOTIFICATIONS]);
      setItems(await cachedApi.notifications.listForCurrentUser());
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to load announcements.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const unreadCount = useMemo(() => items.filter(item => !item.readAt).length, [items]);
  const visible = useMemo(() => (filter === 'unread' ? items.filter(item => !item.readAt) : items), [items, filter]);

  const markRead = async (item: NotificationDoc) => {
    if (item.readAt) return;
    try {
      await api.notifications.markRead(item.$id);
      setItems(current => current.map(entry => entry.$id === item.$id ? { ...entry, readAt: new Date().toISOString() } : entry));
    } catch (err) {
      console.warn('[Announcements] Failed to mark read', err);
    }
  };

  const markAllRead = async () => {
    setMarking(true);
    try {
      await api.notifications.markAllRead();
      const readAt = new Date().toISOString();
      setItems(current => current.map(entry => ({ ...entry, readAt: entry.readAt || readAt })));
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to mark announcements as read.' });
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Announcements</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Updates and notices from the organization.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900">
            {(['all', 'unread'] as Filter[]).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`rounded-md px-3 py-1.5 capitalize transition-colors ${filter === option ? 'bg-[#0d6b66] text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
              >
                {option}{option === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={!unreadCount || marking}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#0d6b66] transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-teal-400 dark:hover:bg-slate-800"
          >
            {marking ? 'Marking…' : 'Mark all read'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading announcements…</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-8 w-8" />}
          title={filter === 'unread' ? 'No unread announcements' : 'No announcements yet'}
          description={filter === 'unread' ? 'You are all caught up.' : 'New announcements from the organization will show up here.'}
        />
      ) : (
        <ul className="space-y-3">
          {visible.map(item => (
            <li
              key={item.$id}
              onClick={() => void markRead(item)}
              className={`rounded-2xl border p-5 shadow-xs transition-colors ${item.readAt ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900' : 'cursor-pointer border-teal-200 bg-teal-50/40 dark:border-teal-900 dark:bg-teal-950/20'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {!item.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-teal-500" aria-label="Unread" />}
                  <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">{item.title}</h2>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {priorityStyles[item.priority] && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${priorityStyles[item.priority]}`}>{item.priority}</span>
                  )}
                  {item.readAt && <Check className="h-4 w-4 text-emerald-500" aria-label="Read" />}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.body}</p>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
                <span>{formatDateTime(item.createdAt || item.$createdAt)}</span>
                {item.link && (
                  <a
                    href={item.link}
                    onClick={() => void markRead(item)}
                    className="inline-flex items-center gap-1 font-semibold text-[#0d6b66] hover:underline dark:text-teal-400"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Announcements;
