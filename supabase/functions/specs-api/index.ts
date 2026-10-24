import { errorStatus, asPayload, corsHeaders, jsonResponse } from './http.ts';
import { requireFirebaseUser } from './auth/firebaseToken.ts';
import { executeOfficerAction, resolveRole } from './modules/officerManagement.ts';
import { publicAsset, storageAction } from './modules/storage.ts';
import { dismissNotifications, notifyMember, publishNotification } from './modules/notifications.ts';
import { registerPushToken, unregisterPushToken } from './modules/push.ts';
import type { JsonMap } from './types.ts';

async function route(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname.endsWith('/asset')) return publicAsset(request, url);
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const body = await request.json() as JsonMap;
  const action = typeof body.action === 'string' ? body.action : '';
  if (!action) throw new Error('action is required');

  const claims = await requireFirebaseUser(request);
  const user = await resolveRole(claims);
  const payload = asPayload(body);

  if (action === 'storage') return jsonResponse(await storageAction(user, { ...payload, action: payload.action || 'download' }));
  if (action === 'publish_notification') return jsonResponse(await publishNotification(user, payload));
  if (action === 'notify_member') return jsonResponse(await notifyMember(user, payload));
  if (action === 'dismiss_notifications') return jsonResponse(await dismissNotifications(user, payload));
  if (action === 'register_push_token') return jsonResponse(await registerPushToken(user, payload));
  if (action === 'unregister_push_token') return jsonResponse(await unregisterPushToken(user, payload));
  if (action === 'admin') {
    const nestedAction = typeof payload.action === 'string' ? payload.action : '';
    if (!nestedAction) throw new Error('admin action is required');
    return jsonResponse(await executeOfficerAction(user, nestedAction, (payload.payload || payload) as JsonMap));
  }
  return jsonResponse(await executeOfficerAction(user, action, payload));
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    return await route(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    return jsonResponse({ success: false, error: message }, errorStatus(error));
  }
});
