import type { JsonMap } from '../types.ts';

export function referenceId(value: unknown): string | null {
  if (typeof value === 'string' && value) return value;
  if (value && typeof value === 'object') {
    const ref = value as JsonMap;
    return typeof ref.$id === 'string' ? ref.$id : typeof ref.id === 'string' ? ref.id : null;
  }
  return null;
}

export function linkedStudent(account: JsonMap): string | null {
  return referenceId(account.studentId) || referenceId(account.students);
}

export const staffRole = (role: string): boolean => role === 'admin' || role === 'officer';

export async function assetKey(bucket: string, fileId: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([bucket, fileId])));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}
