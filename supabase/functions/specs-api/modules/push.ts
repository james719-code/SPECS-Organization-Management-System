import { assertString } from '../http.ts';
import { FirestoreRestClient } from '../firebase/firestore.ts';
import { firebaseAccessToken, firebaseProjectId } from '../firebase/serviceAccount.ts';
import { appConfig } from './officerManagement.ts';
import type { ActionResult, AuthenticatedUser, JsonMap } from '../types.ts';

const TOKEN_COLLECTION = 'push_tokens';
const MAX_BROADCAST_TOKENS = 2000;
const SEND_CONCURRENCY = 25;

export type PushTarget =
  | { audience: 'all' | 'students' | 'officers' }
  | { audience: 'specific'; userIds: string[] };

export type PushMessage = {
  title: string;
  body: string;
  priority: string;
  link: string | null;
};

async function tokenId(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function registerPushToken(user: AuthenticatedUser, payload: JsonMap): Promise<ActionResult> {
  const token = assertString(payload.token, 'token').trim();
  if (token.length < 20 || token.length > 4096) throw new Error('Invalid push token');

  const store = new FirestoreRestClient();
  const account = await store.get(appConfig().collections.accounts, user.uid);
  if (account.deactivated === true || account.verified !== true) throw new Error('This account cannot receive push notifications');

  const userAgent = typeof payload.userAgent === 'string' ? payload.userAgent.slice(0, 200) : '';
  await store.set(TOKEN_COLLECTION, await tokenId(token), {
    uid: user.uid,
    role: user.role,
    token,
    userAgent,
    updatedAt: new Date().toISOString(),
  });
  return { success: true, message: 'Push notifications enabled' };
}

export async function unregisterPushToken(user: AuthenticatedUser, payload: JsonMap): Promise<ActionResult> {
  const token = assertString(payload.token, 'token').trim();
  const store = new FirestoreRestClient();
  const id = await tokenId(token);
  try {
    const existing = await store.get(TOKEN_COLLECTION, id);
    if (existing.uid === user.uid) await store.delete(TOKEN_COLLECTION, id);
  } catch (error) {
    if (!String(error).includes('404')) throw error;
  }
  return { success: true, message: 'Push notifications disabled' };
}

async function tokensFor(store: FirestoreRestClient, target: PushTarget): Promise<JsonMap[]> {
  if (target.audience === 'specific') {
    const pages = await Promise.all(target.userIds.map((uid) => store.queryPage(TOKEN_COLLECTION, 20, undefined, [{ field: 'uid', value: uid }])));
    return pages.flatMap((page) => page.documents as JsonMap[]);
  }
  const all = await store.list(TOKEN_COLLECTION);
  const matching = all.filter((entry) => {
    if (target.audience === 'all') return true;
    if (target.audience === 'students') return entry.role === 'student';
    return entry.role === 'officer' || entry.role === 'admin';
  });
  return matching.slice(0, MAX_BROADCAST_TOKENS);
}

async function sendOne(accessToken: string, projectId: string, entry: JsonMap, message: PushMessage): Promise<'sent' | 'stale' | 'failed'> {
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token: entry.token,
        // Data-only so the service worker renders the notification and can decide
        // between a system notification and an in-page toast.
        data: { title: message.title, body: message.body.slice(0, 500), priority: message.priority, link: message.link || '' },
        webpush: { headers: { Urgency: message.priority === 'urgent' ? 'high' : 'normal', TTL: '86400' } },
      },
    }),
  });
  if (response.ok) return 'sent';
  const text = await response.text();
  if (response.status === 404 || text.includes('UNREGISTERED')) return 'stale';
  console.warn(`FCM send failed (${response.status}): ${text.slice(0, 300)}`);
  return 'failed';
}

/** Best-effort delivery: the in-app notification is already stored, so failures here never fail the publish. */
export async function sendPush(target: PushTarget, message: PushMessage): Promise<{ sent: number; failed: number }> {
  const counts = { sent: 0, failed: 0 };
  try {
    const store = new FirestoreRestClient();
    const tokens = await tokensFor(store, target);
    if (!tokens.length) return counts;
    const accessToken = await firebaseAccessToken();
    const projectId = firebaseProjectId();

    for (let index = 0; index < tokens.length; index += SEND_CONCURRENCY) {
      const chunk = tokens.slice(index, index + SEND_CONCURRENCY);
      const results = await Promise.all(chunk.map(async (entry) => {
        try { return await sendOne(accessToken, projectId, entry, message); } catch { return 'failed' as const; }
      }));
      await Promise.all(results.map(async (result, position) => {
        if (result === 'sent') counts.sent += 1;
        else counts.failed += 1;
        if (result === 'stale') await store.delete(TOKEN_COLLECTION, chunk[position].$id as string).catch(() => {});
      }));
    }
  } catch (error) {
    console.warn('Push delivery failed', error);
  }
  return counts;
}
