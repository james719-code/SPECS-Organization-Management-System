import { importPKCS8, SignJWT } from 'npm:jose';

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function configuredProjectId(): string | null {
  const value = Deno.env.get('FIREBASE_PROJECT_ID')?.trim();
  return value || null;
}

function readServiceAccount(): ServiceAccount {
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) throw new Error('incomplete service account');
    const projectId = configuredProjectId();
    if (projectId && parsed.project_id !== projectId) {
      throw new Error('FIREBASE_PROJECT_ID does not match the service account project');
    }
    return parsed;
  } catch (error) {
    throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function firebaseProjectId(): string {
  return configuredProjectId() || readServiceAccount().project_id;
}

export async function firebaseAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - now > 60) return cachedToken.value;

  const serviceAccount = readServiceAccount();
  const key = await importPKCS8(serviceAccount.private_key, 'RS256');
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/cloud-platform' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(serviceAccount.client_email)
    .setSubject(serviceAccount.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!response.ok) throw new Error(`Firebase service-account token exchange failed: ${await response.text()}`);
  const data = await response.json() as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: now + Number(data.expires_in || 3600) };
  return data.access_token;
}
