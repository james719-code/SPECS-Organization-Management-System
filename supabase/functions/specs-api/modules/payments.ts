import { FirestoreRestClient, type FirestoreTransaction } from '../firebase/firestore.ts';
import { referenceId, staffRole } from './access.ts';
import type { AuthenticatedUser, JsonMap } from '../types.ts';

const collection = (name: string) => Deno.env.get(`COLLECTION_ID_${name.toUpperCase()}`) || name;
const paymentFields = ['item_name', 'price', 'quantity', 'is_event', 'events', 'activity', 'students', 'studentId', 'is_outside_bscs', 'non_bscs_name', 'date_paid', 'is_paid', 'modal_paid'];

function identifier(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,254}$/.test(value)) throw new Error('Invalid payment ID');
  return value;
}

function validate(data: JsonMap): void {
  if (typeof data.item_name !== 'string' || !data.item_name.trim() || data.item_name.length > 200) throw new Error('Payment item name is required');
  if (typeof data.price !== 'number' || !Number.isFinite(data.price) || data.price < 0) throw new Error('Invalid payment price');
  if (typeof data.quantity !== 'number' || !Number.isSafeInteger(data.quantity) || data.quantity < 1) throw new Error('Invalid payment quantity');
  if (!Number.isSafeInteger(Math.round(data.price * data.quantity * 100))) throw new Error('Payment amount is too large');
  if (data.modal_paid != null && !['cash', 'gcash'].includes(String(data.modal_paid))) throw new Error('Invalid payment method');
  if (data.is_event === true && !referenceId(data.events)) throw new Error('Payment event is required');
  if (data.is_outside_bscs === true && (typeof data.non_bscs_name !== 'string' || !data.non_bscs_name.trim())) throw new Error('Payer name is required');
}

function revenueFor(id: string, payment: JsonMap, payer: string, user: AuthenticatedUser): JsonMap {
  return {
    paymentId: id,
    name: `${payment.item_name} (Paid by ${payer.trim()})${payment.is_outside_bscs ? ' [Outside Civilian]' : ''}`,
    isEvent: payment.is_event === true,
    event: payment.is_event ? referenceId(payment.events) : null,
    eventId: payment.is_event ? referenceId(payment.events) : null,
    activity: payment.activity || null, quantity: payment.quantity, price: payment.price,
    amount: Math.round(Number(payment.price) * Number(payment.quantity) * 100) / 100,
    date_earned: payment.date_paid, recorder: user.uid, createdAt: new Date(), updatedAt: new Date(),
  };
}

async function linkedRevenue(tx: FirestoreTransaction, id: string, payment: JsonMap): Promise<{ id: string; document: JsonMap | null }> {
  const revenueId = payment.revenueId ? identifier(payment.revenueId) : `payment__${id}`;
  const document = await tx.get(collection('revenue'), revenueId);
  if (document && document.paymentId !== id) throw new Error('Revenue reference does not belong to this payment');
  return { id: revenueId, document };
}

export async function paymentAction(user: AuthenticatedUser, payload: JsonMap, store = new FirestoreRestClient()): Promise<JsonMap> {
  if (!staffRole(user.role)) throw new Error('Permission denied: only officers and administrators can manage payments');
  const id = identifier(payload.paymentId);
  const operation = String(payload.operation || '');
  if (operation === 'legacy_candidates') {
    if (user.role !== 'admin') throw new Error('Permission denied: only administrators can reconcile legacy payments');
    const payment = await store.get(collection('payments'), id);
    const page = await store.queryPage(collection('revenue'), 100, typeof payload.cursor === 'string' ? payload.cursor : undefined,
      [{ field: 'price', value: payment.price }, { field: 'quantity', value: payment.quantity }]);
    const documents = (page.documents as JsonMap[]).filter((entry) => !entry.paymentId);
    const labels = new Map<string, string>();
    const eventIds = [...new Set(documents.map((entry) => referenceId(entry.eventId) || referenceId(entry.event)).filter((id): id is string => Boolean(id)))];
    await Promise.all(eventIds.map(async (eventId) => {
      try { labels.set(eventId, String((await store.get(collection('events'), eventId)).event_name || 'Event')); }
      catch (error) { if (!String(error).includes('Firestore 404:')) throw error; labels.set(eventId, 'Archived event'); }
    }));
    for (const entry of documents) {
      const eventId = referenceId(entry.eventId) || referenceId(entry.event);
      entry.eventLabel = eventId ? labels.get(eventId) : null;
    }
    return { success: true, documents, nextCursor: page.nextCursor };
  }
  const supplied = payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data) ? payload.data as JsonMap : {};
  const data = Object.fromEntries(paymentFields.filter((key) => supplied[key] !== undefined).map((key) => [key, supplied[key]]));
  return store.runTransaction(async (tx) => {
    const existing = await tx.get(collection('payments'), id);
    if (operation === 'link_revenue') {
      if (user.role !== 'admin') throw new Error('Permission denied: only administrators can reconcile legacy payments');
      if (!existing || existing.is_paid !== true || existing.revenueId) throw new Error('Only unlinked legacy paid payments can be reconciled');
      const revenueId = identifier(payload.revenueId);
      const revenue = await tx.get(collection('revenue'), revenueId);
      if (!revenue || revenue.paymentId) throw new Error('Revenue is missing or already linked to a payment');
      if (Number(revenue.price) !== Number(existing.price) || Number(revenue.quantity) !== Number(existing.quantity)) throw new Error('Payment and revenue amounts must match');
      const paymentEvent = referenceId(existing.events) || referenceId(existing.eventId);
      const revenueEvent = referenceId(revenue.event) || referenceId(revenue.eventId);
      if (paymentEvent !== revenueEvent) throw new Error('Payment and revenue events must match');
      tx.set(collection('payments'), id, { ...existing, revenueId, updatedAt: new Date() });
      tx.set(collection('revenue'), revenueId, { ...revenue, paymentId: id, updatedAt: new Date() });
      return { success: true, payment: { ...existing, revenueId } };
    }
    if (operation === 'delete') {
      if (!existing) return { success: true };
      const revenue = await linkedRevenue(tx, id, existing);
      if (existing.is_paid === true && !existing.revenueId && !revenue.document) {
        throw new Error('This legacy paid payment has no revenue reference. An administrator must reconcile its revenue before deletion.');
      }
      if (revenue.document) tx.delete(collection('revenue'), revenue.id);
      tx.delete(collection('payments'), id);
      return { success: true };
    }
    if (!['create', 'mark_paid', 'update'].includes(operation)) throw new Error('Unsupported payment operation');
    if (operation === 'create' && existing) return { success: true, payment: existing };
    if (operation !== 'create' && !existing) throw new Error('Payment not found');
    if (operation === 'mark_paid' && existing?.is_paid === true) return { success: true, payment: existing };
    if (operation === 'update' && data.is_paid !== undefined && data.is_paid !== existing?.is_paid) throw new Error('Use payment confirmation to change payment status');
    const payment: JsonMap = operation === 'mark_paid'
      ? { ...existing, modal_paid: data.modal_paid ?? null, is_paid: true, date_paid: new Date().toISOString() }
      : { ...existing, ...data, is_paid: operation === 'update' ? existing?.is_paid === true : data.is_paid === true };
    validate(payment);
    const studentId = referenceId(payment.studentId) || referenceId(payment.students);
    const student = studentId ? await tx.get(collection('students'), studentId) : null;
    if (studentId && !student) throw new Error('Student profile not found');
    if (!studentId && payment.is_outside_bscs !== true) throw new Error('Payment student is required');
    const account = await tx.get(collection('accounts'), user.uid);
    const eventId = payment.is_event ? referenceId(payment.events) : null;
    const event = eventId ? await tx.get(collection('events'), eventId) : null;
    if (eventId && !event) throw new Error('Payment event not found');
    const payer = String(student?.name || payment.non_bscs_name || 'Student');
    const now = new Date();
    Object.assign(payment, {
      studentId, students: studentId,
      studentSnapshot: student ? { id: studentId, $id: studentId, name: student.name || null } : null,
      eventId, eventSnapshot: event ? { id: eventId, event_name: event.event_name || null } : null,
      amount: Math.round(Number(payment.price) * Number(payment.quantity) * 100) / 100,
      createdAt: existing?.createdAt || now, updatedAt: now,
    });
    if (payment.is_paid === true) {
      const revenue = await linkedRevenue(tx, id, payment);
      if (operation === 'update' && !payment.revenueId && !revenue.document) throw new Error('An administrator must reconcile this legacy payment revenue before editing');
      const paidAt = payment.date_paid instanceof Date ? payment.date_paid.getTime() : typeof payment.date_paid === 'string' ? Date.parse(payment.date_paid) : NaN;
      if (!Number.isFinite(paidAt) || paidAt <= 0) throw new Error('Invalid payment date');
      payment.date_paid = new Date(paidAt).toISOString();
      if (operation !== 'update') {
        payment.officers = user.role === 'officer' ? referenceId(account?.officerId) || referenceId(account?.officers) || user.uid : null;
        payment.verified_by_name = String(account?.displayName || (account?.studentSnapshot as JsonMap)?.name || (account?.adminSnapshot as JsonMap)?.fullName || account?.username || user.role);
      }
      payment.revenueId = revenue.id;
      // The deterministic record ID and transaction make retries and competing
      // confirmations refer to exactly the same payment/revenue pair.
      if (!revenue.document || operation === 'update') tx.set(collection('revenue'), revenue.id, {
        ...revenue.document, ...revenueFor(id, payment, payer, user),
        createdAt: revenue.document?.createdAt || now, recorder: revenue.document?.recorder || user.uid,
      });
    }
    tx.set(collection('payments'), id, payment);
    return { success: true, payment: { ...payment, $id: id } };
  });
}
