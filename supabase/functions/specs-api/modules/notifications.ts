import { assertString } from '../http.ts';
import { FirestoreRestClient } from '../firebase/firestore.ts';
import { appConfig } from './officerManagement.ts';
import { sendPush } from './push.ts';
import type { ActionResult, AuthenticatedUser, JsonMap } from '../types.ts';

type Audience = 'all' | 'students' | 'officers' | 'specific';
type Priority = 'normal' | 'important' | 'urgent';

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

  const base: JsonMap = {
    title,
    body,
    audience,
    priority,
    link,
    createdAt: new Date().toISOString(),
    expiresAt,
    createdByUid: user.uid,
  };
  const store = new FirestoreRestClient();

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

/**
 * One-to-one notice to a single member, e.g. "attendance recorded" or a dues reminder.
 * Officers may send these (they record attendance and payments), but the shape is
 * deliberately narrow: one recipient, normal priority, short text, internal links only.
 */
export async function notifyMember(user: AuthenticatedUser, payload: JsonMap): Promise<ActionResult> {
  if (user.role !== 'admin' && user.role !== 'officer') throw new Error('Only officers and administrators can notify members');
  const recipient = assertString(payload.userId, 'userId');
  const title = cleanText(payload.title, 'title', 100);
  const body = cleanText(payload.body, 'body', 500);
  const link = typeof payload.link === 'string' && payload.link.trim() ? payload.link.trim().slice(0, 200) : null;
  if (link && (!link.startsWith('/') || link.startsWith('//'))) throw new Error('Invalid link: only in-app paths are allowed');

  const base: JsonMap = {
    title,
    body,
    audience: 'specific',
    priority: 'normal',
    link,
    createdAt: new Date().toISOString(),
    expiresAt: null,
    createdByUid: user.uid,
  };
  return publishDirect(new FirestoreRestClient(), base, [recipient]);
}
