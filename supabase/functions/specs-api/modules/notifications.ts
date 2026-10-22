import { assertString } from '../http.ts';
import { FirestoreRestClient } from '../firebase/firestore.ts';
import { appConfig, refId } from './officerManagement.ts';
import { sendPush } from './push.ts';
import type { ActionResult, AuthenticatedUser, JsonMap } from '../types.ts';

type Audience = 'all' | 'students' | 'officers' | 'specific';
type Priority = 'normal' | 'important' | 'urgent';
type MemberKind = 'general' | 'dues' | 'receipt' | 'attendance';

const COLLECTIONS: Record<Exclude<Audience, 'specific'>, string> = {
  all: 'notifications_all',
  students: 'notifications_students',
  officers: 'notifications_officers',
};

const cleanText = (value: unknown, field: string, maxLength: number): string => {
  const text = assertString(value, field).trim();
  if (!text) throw new Error(`${field} cannot be empty`);
  if (text.length > maxLength) throw new Error(`${field} exceeds the ${maxLength}-character limit`);
  return text;
};

const shortText = (value: unknown, maxLength: number): string => (typeof value === 'string' ? value.trim().slice(0, maxLength) : '');

function notificationId(): string {
  return crypto.randomUUID();
}

async function writeInChunks(store: FirestoreRestClient, collection: string, documents: Array<{ id: string; data: JsonMap }>) {
  for (let index = 0; index < documents.length; index += 20) {
    const chunk = documents.slice(index, index + 20);
    await Promise.all(chunk.map(({ id, data }) => store.set(collection, id, data)));
  }
}

function pushSuffix(pushed: { sent: number; failed: number }): string {
  return pushed.sent ? ` and pushed to ${pushed.sent} device${pushed.sent === 1 ? '' : 's'}` : '';
}

const peso = (value: number) => `PHP ${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Display name and title of an account, from its stored snapshots. */
function describeAccount(account: JsonMap | null, fallbackName: string): { name: string; title: string } {
  if (!account) return { name: fallbackName, title: '' };
  const student = (account.studentSnapshot || account.students) as JsonMap | undefined;
  const officer = account.officerSnapshot as JsonMap | undefined;
  const admin = (account.adminSnapshot || account.admins) as JsonMap | undefined;
  const name = [account.displayName, officer?.displayName, student?.name, admin?.fullName, admin?.name, account.username]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0) || fallbackName;
  let title = '';
  if (account.type === 'admin') title = 'Administrator';
  else if (account.type === 'officer') title = typeof officer?.position === 'string' && officer.position ? officer.position : 'Officer';
  return { name: name.trim(), title };
}

/** Who is sending, resolved server-side from the caller's own account so it cannot be spoofed. */
async function senderFor(store: FirestoreRestClient, user: AuthenticatedUser): Promise<{ name: string; title: string }> {
  const fallback = user.role === 'admin' ? 'Administrator' : 'SPECS Officer';
  try {
    return describeAccount(await store.get(appConfig().collections.accounts, user.uid), fallback);
  } catch {
    return { name: fallback, title: user.role === 'admin' ? 'Administrator' : '' };
  }
}

function cleanMeta(raw: unknown): JsonMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const meta: JsonMap = {};
  for (const [key, value] of Object.entries(raw as JsonMap).slice(0, 12)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,29}$/.test(key)) continue;
    if (typeof value === 'string') meta[key] = value.trim().slice(0, 200);
    else if (typeof value === 'number' && Number.isFinite(value)) meta[key] = value;
  }
  return meta;
}

async function publishDirect(store: FirestoreRestClient, base: JsonMap, userIds: string[]): Promise<ActionResult> {
  const config = appConfig();
  const documents: Array<{ id: string; data: JsonMap }> = [];
  const eligible: string[] = [];
  for (const recipientUid of userIds) {
    const account = await store.get(config.collections.accounts, recipientUid);
    if (account.deactivated === true || account.verified !== true) continue;
    eligible.push(recipientUid);
    documents.push({ id: `${recipientUid}__${notificationId()}`, data: { ...base, recipientUid } });
  }
  if (!documents.length) throw new Error('No eligible recipients were found');
  await writeInChunks(store, 'notifications_direct', documents);
  const pushed = await sendPush({ audience: 'specific', userIds: eligible }, {
    title: base.title as string, body: base.body as string, priority: base.priority as string, link: base.link as string | null,
  });
  return { success: true, message: `Notification published to ${documents.length} recipient${documents.length === 1 ? '' : 's'}${pushSuffix(pushed)}`, pushed: pushed.sent };
}

export async function publishNotification(user: AuthenticatedUser, payload: JsonMap): Promise<ActionResult> {
  if (user.role !== 'admin') throw new Error('Only administrators can publish notifications');

  const audience = assertString(payload.audience, 'audience') as Audience;
  if (!['all', 'students', 'officers', 'specific'].includes(audience)) throw new Error('Invalid notification audience');
  const priority = (typeof payload.priority === 'string' ? payload.priority : 'normal') as Priority;
  if (!['normal', 'important', 'urgent'].includes(priority)) throw new Error('Invalid notification priority');

  const title = cleanText(payload.title, 'title', 160);
  const body = cleanText(payload.body, 'body', 5000);
  const link = typeof payload.link === 'string' && payload.link.trim() ? payload.link.trim().slice(0, 500) : null;
  const expiresAt = typeof payload.expiresAt === 'string' && payload.expiresAt.trim() ? payload.expiresAt.trim() : null;
  if (expiresAt && Number.isNaN(Date.parse(expiresAt))) throw new Error('expiresAt must be an ISO date');

  const store = new FirestoreRestClient();
  const sender = await senderFor(store, user);
  const base: JsonMap = {
    title,
    body,
    audience,
    priority,
    link,
    kind: 'announcement',
    createdAt: new Date().toISOString(),
    expiresAt,
    createdByUid: user.uid,
    senderName: sender.name,
    senderTitle: sender.title,
  };

  if (audience !== 'specific') {
    await store.set(COLLECTIONS[audience], notificationId(), base);
    const pushed = await sendPush({ audience }, { title, body, priority, link });
    return { success: true, message: `Notification published in-app${pushSuffix(pushed)}`, pushed: pushed.sent };
  }

  const ids = payload.userIds;
  if (!Array.isArray(ids) || ids.length === 0) throw new Error('userIds is required for specific notifications');
  const userIds = [...new Set(ids.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim()))];
  if (userIds.length > 100) throw new Error('Specific notifications are limited to 100 recipients');
  return publishDirect(store, base, userIds);
}

/** Payment receipt notice. Every figure comes from the stored payment record, not from the caller. */
async function receiptDetails(store: FirestoreRestClient, recipientUid: string, account: JsonMap, payload: JsonMap, sender: { name: string }) {
  const paymentId = assertString((cleanMeta(payload.meta) as JsonMap).paymentId, 'meta.paymentId');
  const payment = await store.get(Deno.env.get('COLLECTION_ID_PAYMENTS') || 'payments', paymentId);
  if (payment.is_paid !== true) throw new Error('This payment is not marked as paid');

  const accountIds = [refId(account.students), refId(account.studentId), refId((account.studentSnapshot as JsonMap | undefined)?.id), recipientUid].filter(Boolean);
  const paymentStudent = refId(payment.students) || refId(payment.studentId) || refId((payment.studentSnapshot as JsonMap | undefined)?.id);
  if (paymentStudent && !accountIds.includes(paymentStudent)) throw new Error('This payment does not belong to the recipient');

  const quantity = Math.max(1, Number(payment.quantity) || 1);
  const unit = Number(payment.price) || 0;
  const total = unit * quantity;
  const item = shortText(payment.item_name, 120) || 'Payment';
  const receiptNo = paymentId.slice(-8).toUpperCase();
  const verifiedBy = shortText(payment.verified_by_name, 120) || sender.name;
  const paidAt = typeof payment.date_paid === 'string' && !Number.isNaN(Date.parse(payment.date_paid)) && Date.parse(payment.date_paid) > 0
    ? payment.date_paid : new Date().toISOString();
  return {
    title: `Payment received: ${item}`.slice(0, 100),
    body: `We received your payment of ${peso(total)} for ${item}${quantity > 1 ? ` (x${quantity})` : ''}. Receipt no. ${receiptNo}. Verified by ${verifiedBy}.`,
    meta: {
      paymentId, receiptNo, item, quantity, amount: unit, total, paidAt, verifiedBy,
      method: shortText(payment.modal_paid, 40) || 'Collected by staff',
      activity: shortText(payment.activity, 120),
    } as JsonMap,
  };
}

/**
 * One-to-one notice to a single member: payment receipts, attendance confirmations and dues reminders.
 * Officers may send these (they record attendance and payments), but the shape is deliberately narrow:
 * one recipient, normal priority, short text, in-app links only. Receipt and attendance text and figures
 * are composed here; the sender is always the authenticated caller.
 */
export async function notifyMember(user: AuthenticatedUser, payload: JsonMap): Promise<ActionResult> {
  if (user.role !== 'admin' && user.role !== 'officer') throw new Error('Only officers and administrators can notify members');
  const recipient = assertString(payload.userId, 'userId');
  const kind = (typeof payload.kind === 'string' ? payload.kind : 'general') as MemberKind;
  if (!['general', 'dues', 'receipt', 'attendance'].includes(kind)) throw new Error('Invalid notification kind');

  const store = new FirestoreRestClient();
  const account = await store.get(appConfig().collections.accounts, recipient);
  const sender = await senderFor(store, user);
  const recipientName = describeAccount(account, 'Member').name;
  const ownPage = `/dashboard/${typeof account.type === 'string' && account.type ? account.type : 'student'}/announcements`;

  let title: string;
  let body: string;
  let meta: JsonMap = {};
  let link: string | null = typeof payload.link === 'string' && payload.link.trim() ? payload.link.trim().slice(0, 200) : null;

  if (kind === 'receipt') {
    const details = await receiptDetails(store, recipient, account, payload, sender);
    ({ title, body } = details);
    meta = { ...details.meta, studentName: recipientName };
    link = ownPage;
  } else if (kind === 'attendance') {
    const input = cleanMeta(payload.meta);
    const event = shortText(input.event, 120) || 'an event';
    const label = shortText(input.label, 80);
    title = `Attendance recorded: ${event}`.slice(0, 100);
    body = `You were marked present for ${event}${label && label !== event ? ` (${label})` : ''}. Recorded by ${sender.name}.`;
    meta = { event, label, status: 'Present', recordedBy: sender.name, studentName: recipientName };
    link = ownPage;
  } else {
    title = cleanText(payload.title, 'title', 100);
    body = cleanText(payload.body, 'body', 500);
    meta = cleanMeta(payload.meta);
  }
  if (link && (!link.startsWith('/') || link.startsWith('//'))) throw new Error('Invalid link: only in-app paths are allowed');

  const base: JsonMap = {
    title,
    body,
    audience: 'specific',
    priority: 'normal',
    link,
    kind,
    meta,
    createdAt: new Date().toISOString(),
    expiresAt: null,
    createdByUid: user.uid,
    senderName: sender.name,
    senderTitle: sender.title,
  };
  return publishDirect(store, base, [recipient]);
}
