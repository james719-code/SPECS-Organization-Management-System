import type { PaymentDoc } from '../types/database';
import { formatCurrency } from './formatters';

/** Everything a receipt shows. Built from a payment record or from a receipt notification. */
export interface ReceiptData {
  receiptNo: string;
  transactionId: string;
  studentName: string;
  item: string;
  quantity: number;
  amount: number;
  total: number;
  paidAt: string;
  method: string;
  verifiedBy: string;
}

const displayDateTime = (value: unknown): string => {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const safeFilenamePart = (value: string): string => value.replace(/[^a-z0-9_-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'payment';

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

export function receiptFromPayment(payment: PaymentDoc, studentName: string): ReceiptData {
  const paidAt = payment.date_paid && payment.date_paid !== new Date(0).toISOString() ? payment.date_paid : payment.$createdAt;
  const quantity = Number(payment.quantity || 1);
  const amount = Number(payment.price || 0);
  return {
    receiptNo: payment.$id.slice(-8).toUpperCase(),
    transactionId: payment.$id,
    studentName: studentName || 'Student',
    item: payment.item_name || 'Payment',
    quantity,
    amount,
    total: amount * quantity,
    paidAt,
    method: payment.modal_paid || 'Collected by staff',
    verifiedBy: payment.verified_by_name || '—',
  };
}

/** Receipt details stored on a "receipt" notification (written by the Edge Function from the payment record). */
export function receiptFromNotification(meta: Record<string, any>, senderName?: string | null): ReceiptData {
  return {
    receiptNo: String(meta.receiptNo || ''),
    transactionId: String(meta.paymentId || ''),
    studentName: String(meta.studentName || 'Student'),
    item: String(meta.item || 'Payment'),
    quantity: Number(meta.quantity || 1),
    amount: Number(meta.amount || 0),
    total: Number(meta.total || 0),
    paidAt: String(meta.paidAt || ''),
    method: String(meta.method || 'Collected by staff'),
    verifiedBy: String(meta.verifiedBy || senderName || '—'),
  };
}

const receiptRows = (receipt: ReceiptData): Array<[string, string]> => [
  ['Receipt no.', receipt.receiptNo || '—'],
  ['Student', receipt.studentName],
  ['Payment item', receipt.item],
  ['Quantity', String(receipt.quantity)],
  ['Amount', formatCurrency(receipt.amount)],
  ['Total', formatCurrency(receipt.total)],
  ['Payment date', displayDateTime(receipt.paidAt)],
  ['Payment method', receipt.method],
  ['Verified by', receipt.verifiedBy],
  ['Transaction ID', receipt.transactionId],
  ['Status', 'PAID'],
];

export async function downloadReceiptPdf(receipt: ReceiptData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });

  pdf.setTextColor(13, 107, 102);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SPECS Organization', 20, 24);
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(14);
  pdf.text('Official Payment Receipt', 20, 34);
  pdf.setDrawColor(226, 232, 240);
  pdf.line(20, 40, 190, 40);

  let y = 53;
  pdf.setFontSize(10);
  for (const [label, value] of receiptRows(receipt)) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 116, 139);
    pdf.text(label, 20, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(15, 23, 42);
    const wrapped = pdf.splitTextToSize(value, 115) as string[];
    pdf.text(wrapped, 75, y);
    y += Math.max(8, wrapped.length * 5);
  }

  pdf.setDrawColor(226, 232, 240);
  pdf.line(20, y + 4, 190, y + 4);
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Keep this receipt for your records. Generated from the SPECS payment ledger.', 20, y + 14);
  pdf.save(`specs-receipt-${safeFilenamePart(receipt.transactionId || receipt.receiptNo)}.pdf`);
}

/** Print one receipt through the browser's print dialog, using a hidden frame so no popup is needed. */
export function printReceipt(receipt: ReceiptData): void {
  const rows = receiptRows(receipt)
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${escapeHtml(receipt.receiptNo)}</title>
<style>
  @page { size: A5; margin: 14mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; }
  h1 { color: #0d6b66; font-size: 20px; margin: 0; }
  h2 { font-size: 14px; margin: 4px 0 14px; font-weight: 600; }
  .rule { border-top: 1px solid #e2e8f0; margin: 12px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; color: #64748b; font-weight: 700; padding: 6px 12px 6px 0; width: 34%; vertical-align: top; }
  td { padding: 6px 0; word-break: break-word; }
  .paid { display: inline-block; border: 2px solid #059669; color: #059669; padding: 2px 10px; font-weight: 800; letter-spacing: 2px; }
  .foot { color: #64748b; font-size: 10px; margin-top: 14px; }
</style></head><body>
  <h1>SPECS Organization</h1><h2>Official Payment Receipt</h2><div class="rule"></div>
  <table>${rows}</table><div class="rule"></div>
  <span class="paid">PAID</span>
  <p class="foot">Keep this receipt for your records. Generated from the SPECS payment ledger.</p>
</body></html>`;

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const cleanup = () => setTimeout(() => frame.remove(), 1000);
  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) return cleanup();
    win.onafterprint = cleanup;
    win.focus();
    win.print();
  };
  frame.srcdoc = html;
}

export async function downloadPaymentReceipt(payment: PaymentDoc, studentName: string): Promise<void> {
  if (!payment.is_paid) throw new Error('Only paid payments have receipts');
  await downloadReceiptPdf(receiptFromPayment(payment, studentName));
}
