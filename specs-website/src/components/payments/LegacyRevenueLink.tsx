import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../shared/api';
import { formatCurrency } from '../../shared/formatters';
import type { PaymentDoc } from '../../types/database';

export default function LegacyRevenueLink({ payment, onClose, onLinked }: { payment: PaymentDoc; onClose: () => void; onLinked: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const linking = useRef(false);
  useEffect(() => {
    let active = true;
    setBusy(true); setSelected(''); setError('');
    api.payments.legacyRevenueCandidates(payment.$id, cursor).then((result) => {
      if (active) { setRows(result.documents); setNextCursor(result.nextCursor); }
    }).catch((failure) => { if (active) setError(failure.message); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [payment.$id, cursor]);
  const link = async () => {
    if (!selected || busy || linking.current) return;
    linking.current = true;
    setBusy(true); setError('');
    try { await api.payments.linkLegacyRevenue(payment.$id, selected); onLinked(); }
    catch (failure: any) { setError(failure.message); setBusy(false); linking.current = false; }
  };
  return createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div role="dialog" aria-modal="true" aria-labelledby="legacy-revenue-title" className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
      <h2 id="legacy-revenue-title" className="text-lg font-bold dark:text-white">Match the original revenue entry</h2>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">This older payment for {payment.item_name} ({formatCurrency(payment.price * payment.quantity)}) has no saved revenue link. Select the exact original entry by its payer, activity, and date. Linking saves that relationship; it does not delete anything.</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      <label htmlFor="legacy-revenue" className="mt-4 block text-sm font-semibold dark:text-white">Original revenue entry</label>
      <select id="legacy-revenue" value={selected} disabled={busy} onChange={(event) => setSelected(event.target.value)} className="mt-2 w-full rounded-lg border p-3 dark:bg-slate-950 dark:text-white">
        <option value="">{busy ? 'Loading...' : rows.length ? 'Select the matching entry' : 'No unlinked entries on this page'}</option>
        {rows.map((row) => <option key={row.$id} value={row.$id}>{row.name} · {row.activity || row.eventLabel || 'General'} · {row.date_earned ? new Date(row.date_earned).toLocaleString() : 'No date'} · Ref {row.$id.slice(-8).toUpperCase()}</option>)}
      </select>
      <div className="mt-3 flex gap-3 text-sm">
        {cursor && <button type="button" disabled={busy} onClick={() => setCursor(undefined)}>First page</button>}
        {nextCursor && <button type="button" disabled={busy} onClick={() => setCursor(nextCursor)}>More entries</button>}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border px-4 py-2 dark:text-white">Cancel</button>
        <button type="button" onClick={link} disabled={busy || !selected} className="rounded-lg bg-[#0d6b66] px-4 py-2 text-white disabled:opacity-50">Link entry</button>
      </div>
    </div>
  </div>, document.body);
}
