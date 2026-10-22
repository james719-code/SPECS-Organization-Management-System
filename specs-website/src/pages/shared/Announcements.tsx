import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Check, Download, ExternalLink, Loader2, Megaphone, Printer, Receipt, Wallet } from 'lucide-react';
import { cachedApi, api, CacheTags } from '../../shared/api';
import { dataCache } from '../../shared/cache.js';
import { formatCurrency, formatRelativeTime } from '../../shared/formatters';
import { downloadReceiptPdf, printReceipt, receiptFromNotification } from '../../shared/paymentReceipt';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import type { NotificationDoc } from '../../types/database';

type Filter = 'all' | 'unread' | 'announcement' | 'receipt' | 'attendance';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'announcement', label: 'Announcements' },
  { id: 'receipt', label: 'Receipts' },
  { id: 'attendance', label: 'Attendance' },
];

const SENDER_FALLBACK = 'SPECS Organization';

const kindOf = (item: NotificationDoc): 'announcement' | 'receipt' | 'attendance' | 'dues' =>
  item.kind === 'receipt' || item.kind === 'attendance' || item.kind === 'dues' ? item.kind : 'announcement';

const KIND_STYLE = {
  announcement: { icon: Megaphone, label: 'Announcement', bubble: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300', bar: 'bg-teal-500' },
  receipt: { icon: Receipt, label: 'Payment receipt', bubble: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300', bar: 'bg-emerald-500' },
  attendance: { icon: CalendarCheck, label: 'Attendance', bubble: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300', bar: 'bg-sky-500' },
  dues: { icon: Wallet, label: 'Dues notice', bubble: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300', bar: 'bg-amber-500' },
} as const;

const PRIORITY_BADGE: Record<string, string> = {
  urgent: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900',
  important: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
};

const AUDIENCE_LABEL: Record<string, string> = { all: 'Everyone', students: 'Students', officers: 'Officers', specific: 'Just you' };

const sentAt = (item: NotificationDoc): string => item.createdAt || item.$createdAt;

const fullDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const dayGroup = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Earlier';
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.floor((startOfToday.getTime() - new Date(date).setHours(0, 0, 0, 0)) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return 'This week';
  return 'Earlier';
};

const Field: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
    <dd className="mt-0.5 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{value || '—'}</dd>
  </div>
);

const Announcements: React.FC = () => {
  const { addToast } = useToast();
  const [items, setItems] = useState<NotificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [marking, setMarking] = useState(false);
  const [busyReceipt, setBusyReceipt] = useState<string | null>(null);

  const load = async () => {
    try {
      dataCache.invalidateTags([CacheTags.NOTIFICATIONS]);
      setItems(await cachedApi.notifications.listForCurrentUser());
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to load announcements.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const unreadCount = useMemo(() => items.filter(item => !item.readAt).length, [items]);
  const countFor = (id: Filter): number => {
    if (id === 'all') return items.length;
    if (id === 'unread') return unreadCount;
    return items.filter(item => (id === 'announcement' ? ['announcement', 'dues'].includes(kindOf(item)) : kindOf(item) === id)).length;
  };

  const visible = useMemo(() => items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !item.readAt;
    if (filter === 'announcement') return ['announcement', 'dues'].includes(kindOf(item));
    return kindOf(item) === filter;
  }), [items, filter]);

  const groups = useMemo(() => {
    const order = ['Today', 'Yesterday', 'This week', 'Earlier'];
    const map = new Map<string, NotificationDoc[]>();
    visible.forEach(item => {
      const key = dayGroup(sentAt(item));
      map.set(key, [...(map.get(key) || []), item]);
    });
    return order.filter(key => map.has(key)).map(key => ({ key, entries: map.get(key) as NotificationDoc[] }));
  }, [visible]);

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

  const onPrint = (item: NotificationDoc) => {
    void markRead(item);
    printReceipt(receiptFromNotification(item.meta || {}, item.senderName));
  };

  const onDownload = async (item: NotificationDoc) => {
    setBusyReceipt(item.$id);
    try {
      void markRead(item);
      await downloadReceiptPdf(receiptFromNotification(item.meta || {}, item.senderName));
    } catch (err: any) {
      addToast({ type: 'error', title: 'Receipt Failed', message: err?.message || 'Unable to generate the receipt.' });
    } finally {
      setBusyReceipt(null);
    }
  };

  const renderDetails = (item: NotificationDoc) => {
    const kind = kindOf(item);
    const meta = item.meta || {};
    if (kind === 'receipt') {
      return (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/10">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <Field label="Receipt no." value={meta.receiptNo} />
            <Field label="Item" value={`${meta.item || 'Payment'}${Number(meta.quantity) > 1 ? ` x${meta.quantity}` : ''}`} />
            <Field label="Total paid" value={formatCurrency(Number(meta.total || 0))} />
            <Field label="Method" value={meta.method} />
            <Field label="Date paid" value={meta.paidAt ? fullDate(String(meta.paidAt)) : undefined} />
            <Field label="Verified by" value={meta.verifiedBy || item.senderName} />
            <Field label="Student" value={meta.studentName} />
            <Field label="Status" value={<span className="text-emerald-600 dark:text-emerald-400">PAID</span>} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => onPrint(item)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d6b66] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0b5c58]">
              <Printer className="h-3.5 w-3.5" /> Print receipt
            </button>
            <button type="button" onClick={() => void onDownload(item)} disabled={busyReceipt === item.$id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
              {busyReceipt === item.$id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Download PDF
            </button>
          </div>
        </div>
      );
    }
    if (kind === 'attendance') {
      return (
        <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/50 p-4 dark:border-sky-900/40 dark:bg-sky-950/10">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <Field label="Event / session" value={meta.event} />
            <Field label="Attendance label" value={meta.label} />
            <Field label="Status" value={<span className="text-sky-600 dark:text-sky-400">{meta.status || 'Present'}</span>} />
            <Field label="Time recorded" value={fullDate(sentAt(item))} />
            <Field label="Scanned / recorded by" value={meta.recordedBy || item.senderName} />
          </dl>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Announcements</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Announcements, payment receipts and attendance confirmations, newest first.</p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={!unreadCount || marking}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#0d6b66] transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-teal-400 dark:hover:bg-slate-800"
        >
          {marking ? 'Marking…' : `Mark all read${unreadCount ? ` (${unreadCount})` : ''}`}
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter announcements">
        {FILTERS.map(option => {
          const active = filter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(option.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${active
                ? 'border-[#0d6b66] bg-[#0d6b66] text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'}`}
            >
              {option.label}
              <span className={`rounded-full px-1.5 text-[10px] ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{countFor(option.id)}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading announcements…</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-8 w-8 text-slate-400" />}
          title={filter === 'unread' ? 'No unread notifications' : 'Nothing here yet'}
          description={filter === 'unread' ? 'You are all caught up.' : 'New announcements, receipts and attendance confirmations will show up here.'}
        />
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <section key={group.key} className="space-y-3">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{group.key}</h2>
              <ul className="space-y-3">
                {group.entries.map(item => {
                  const kind = kindOf(item);
                  const style = KIND_STYLE[kind];
                  const Icon = style.icon;
                  const sender = item.senderName || SENDER_FALLBACK;
                  const unread = !item.readAt;
                  return (
                    <li
                      key={item.$id}
                      onClick={() => void markRead(item)}
                      className={`relative overflow-hidden rounded-2xl border p-5 pl-6 shadow-xs transition-colors ${unread
                        ? 'cursor-pointer border-teal-200 bg-white dark:border-teal-900 dark:bg-slate-900'
                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
                    >
                      <span className={`absolute inset-y-0 left-0 w-1 ${style.bar} ${unread ? '' : 'opacity-40'}`} aria-hidden="true" />
                      <div className="flex items-start gap-4">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.bubble}`}><Icon className="h-5 w-5" /></span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{item.title}</h3>
                            {unread && <span className="rounded-full bg-teal-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">New</span>}
                            {PRIORITY_BADGE[item.priority] && (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${PRIORITY_BADGE[item.priority]}`}>{item.priority}</span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-200">{sender[0]}</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-200">{sender}</span>
                              {item.senderTitle && <span>· {item.senderTitle}</span>}
                            </span>
                            <span aria-hidden="true">·</span>
                            <time dateTime={sentAt(item)} title={fullDate(sentAt(item))}>{fullDate(sentAt(item))} ({formatRelativeTime(sentAt(item))})</time>
                            <span aria-hidden="true">·</span>
                            <span>{style.label} · {AUDIENCE_LABEL[item.audience] || 'Everyone'}</span>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.body}</p>
                          {renderDetails(item)}
                          {item.link && kind !== 'receipt' && kind !== 'attendance' && (
                            <a
                              href={item.link}
                              onClick={() => void markRead(item)}
                              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0d6b66] hover:underline dark:text-teal-400"
                            >
                              Open link <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        {item.readAt && <Check className="h-4 w-4 shrink-0 text-emerald-500" aria-label="Read" />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default Announcements;
