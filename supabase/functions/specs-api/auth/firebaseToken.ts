import { createRemoteJWKSet, jwtVerify } from 'npm:jose';
import { firebaseProjectId } from '../firebase/serviceAccount.ts';
import type { AuthenticatedUser, FirebaseClaims } from '../types.ts';

const jwks = createRemoteJWKSet(new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
));

export async function requireFirebaseUser(request: Request): Promise<FirebaseClaims> {
  const projectId = firebaseProjectId();
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) throw new Error('Missing Firebase ID token');

  let verified;
  try {
    verified = await jwtVerify(token, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
    if (code.startsWith('ERR_JWT_') || code.startsWith('ERR_JWS_')) {
      throw new Error('Invalid Firebase ID token');
    }
    throw error;
  }
  return verified.payload as FirebaseClaims;
}

export function uidFromClaims(claims: FirebaseClaims): string {
  const uid = claims.user_id ?? claims.sub;
  if (!uid) throw new Error('Firebase token has no user id');
  return uid;
}

export async function requireFirebaseRole(request: Request, roles: string[]): Promise<AuthenticatedUser> {
  const claims = await requireFirebaseUser(request);
  const uid = uidFromClaims(claims);
  const role = typeof claims.role === 'string' ? claims.role : '';
  if (!roles.includes(role)) throw new Error('Insufficient role');
  return { ...claims, uid, role };
}
