import { firebaseAccessToken, firebaseProjectId } from './serviceAccount.ts';

function apiKey(): string {
  const key = Deno.env.get('FIREBASE_WEB_API_KEY');
  if (!key) throw new Error('FIREBASE_WEB_API_KEY is not configured');
  return key;
}

async function identityRequest(operation: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${operation}?key=${encodeURIComponent(apiKey())}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(`Firebase Auth ${response.status}: ${JSON.stringify(data.error || data)}`);
  return data;
}

async function adminIdentityRequest(operation: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const token = await firebaseAccessToken();
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(firebaseProjectId())}/${operation}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(`Firebase Auth admin ${response.status}: ${JSON.stringify(data.error || data)}`);
  return data;
}

export class FirebaseAuthAdmin {
  async updateUser(uid: string, patch: { disabled?: boolean; emailVerified?: boolean }): Promise<void> {
    const body: Record<string, unknown> = { localId: uid };
    if (typeof patch.disabled === 'boolean') body.disableUser = patch.disabled;
    if (typeof patch.emailVerified === 'boolean') body.emailVerified = patch.emailVerified;
    await adminIdentityRequest('accounts:update', body);
  }

  async sendPasswordReset(email: string, continueUrl?: string): Promise<void> {
    await identityRequest('accounts:sendOobCode', {
      requestType: 'PASSWORD_RESET',
      email,
      ...(continueUrl ? { continueUrl } : {}),
    });
  }

  async deleteUser(uid: string): Promise<void> {
    await adminIdentityRequest('accounts:delete', { localId: uid });
  }

  projectId(): string { return firebaseProjectId(); }
}
