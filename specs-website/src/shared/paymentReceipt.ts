import type { PaymentDoc } from '../types/database';
import { formatCurrency } from './formatters';

const displayDate = (value: unknown): string => {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const safeFilenamePart = (value: string): string => value.replace(/[^a-z0-9_-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'payment';

export async function downloadPaymentReceipt(payment: PaymentDoc, studentName: string): Promise<void> {
  if (!payment.is_paid) throw new Error('Only paid payments have receipts');
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const total = Number(payment.price || 0) * Number(payment.quantity || 1);
  const paidDate = payment.date_paid && payment.date_paid !== new Date(0).toISOString() ? payment.date_paid : payment.$createdAt;
  const rows = [
    ['Student', studentName || 'Student'],
    ['Payment item', payment.item_name || 'Payment'],
    ['Quantity', String(payment.quantity || 1)],
    ['Amount', formatCurrency(Number(payment.price || 0))],
    ['Total', formatCurrency(total)],
    ['Payment date', displayDate(paidDate)],
    ['Payment method', payment.modal_paid || 'Collected by Staff'],
    ['Transaction ID', payment.$id],
    ['Status', 'PAID'],
  ];

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
  for (const [label, value] of rows) {
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
  pdf.save(`specs-receipt-${safeFilenamePart(payment.$id)}.pdf`);
}
