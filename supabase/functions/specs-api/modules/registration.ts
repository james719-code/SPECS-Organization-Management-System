import { FirestoreRestClient, type FirestoreTransaction } from '../firebase/firestore.ts';
import type { AppConfig, AuthenticatedUser, FirebaseClaims, JsonMap } from '../types.ts';

export const STUDENT_NUMBER_COLLECTION = 'student_numbers';

export function studentNumber(value: unknown): number {
  const text = String(value ?? '').trim();
  const number = Number(text);
  if (!/^\d{1,15}$/.test(text) || !Number.isSafeInteger(number) || number <= 0) {
    throw new Error('Student ID must be a positive whole number of at most 15 digits');
  }
  return number;
}

function text(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`${label} is required (maximum ${max} characters)`);
  return value.trim();
}

function profileFields(payload: JsonMap): JsonMap {
  const yearLevel = Number(payload.yearLevel);
  if (![1, 2, 3, 4].includes(yearLevel)) throw new Error('Invalid year level');
  if (!['A', 'B'].includes(String(payload.section))) throw new Error('Invalid section');
  return {
    name: text(payload.name, 'Full name', 150),
    student_id: studentNumber(payload.student_id),
    yearLevel,
    section: payload.section,
    address: text(payload.address, 'Address', 500),
  };
}

function snapshot(id: string, student: JsonMap): JsonMap {
  return Object.fromEntries(['name', 'email', 'student_id', 'yearLevel', 'section', 'is_volunteer', 'volunteer_request_status']
    .filter((key) => student[key] !== undefined).map((key) => [key, student[key]]).concat([['id', id], ['$id', id]]));
}

async function reserveNumber(tx: FirestoreTransaction, number: number, id: string): Promise<void> {
  const reservation = await tx.get(STUDENT_NUMBER_COLLECTION, String(number));
  if (reservation && reservation.studentId !== id) throw new Error('Student ID is already registered');
}

async function checkLegacyNumber(store: FirestoreRestClient, students: string, number: number, id: string): Promise<void> {
  // Keep legacy discovery outside the write transaction: empty transactional
  // queries can lock a collection range and serialize a registration burst.
  // All new registrations/number changes must atomically own the reservation,
  // which also protects against an edit racing this legacy lookup.
  const page = await store.queryPage(students, 2, undefined, [{ field: 'student_id', value: number }]);
  const existing = page.documents as JsonMap[];
  if (existing.some((student) => student.$id !== id)) throw new Error('Student ID is already registered');
}

export async function completeRegistration(claims: FirebaseClaims, payload: JsonMap, config: AppConfig, store = new FirestoreRestClient()): Promise<JsonMap> {
  const uid = text(claims.user_id || claims.sub, 'Authenticated user', 128);
  const email = text(claims.email, 'University email', 254).toLowerCase();
  if (!/^[^@\s]+@parsu\.edu\.ph$/.test(email)) throw new Error('Registration requires your official PSU email (@parsu.edu.ph)');
  if (payload.consent !== true) throw new Error('Privacy consent is required');
  const profile = profileFields(payload);
  const username = text(payload.username, 'Username', 40);
  await checkLegacyNumber(store, config.collections.students, profile.student_id as number, uid);
  return store.runTransaction(async (tx) => {
    const account = await tx.get(config.collections.accounts, uid);
    // A lost commit response can safely be retried without resetting approvals
    // or overwriting an existing profile with a second form submission.
    if (account) return { success: true, alreadyComplete: true };
    const partialStudent = await tx.get(config.collections.students, uid);
    await reserveNumber(tx, profile.student_id as number, uid);
    const now = new Date();
    const student: JsonMap = { ...profile, email, is_volunteer: false, createdAt: partialStudent?.createdAt || now, updatedAt: now };
    tx.set(STUDENT_NUMBER_COLLECTION, String(profile.student_id), { studentId: uid });
    tx.set(config.collections.students, uid, student);
    tx.set(config.collections.accounts, uid, {
      username, type: 'student', students: uid, studentId: uid,
      verified: false, deactivated: false, displayName: student.name, email,
      studentSnapshot: snapshot(uid, student), dataModelVersion: 2,
      snapshotUpdatedAt: now, createdAt: now, updatedAt: now,
    });
    return { success: true, alreadyComplete: false };
  });
}

export async function updateStudentProfile(user: AuthenticatedUser, payload: JsonMap, config: AppConfig, store = new FirestoreRestClient()): Promise<JsonMap> {
  const id = text(payload.studentId, 'Student profile', 128);
  const data = payload.data as JsonMap;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Profile data is required');
  const fields = ['name', 'student_id', 'yearLevel', 'section', 'address', 'email'];
  if (Object.keys(data).some((key) => !fields.includes(key))) throw new Error('Invalid profile field');
  if ('student_id' in data) await checkLegacyNumber(store, config.collections.students, studentNumber(data.student_id), id);
  return store.runTransaction(async (tx) => {
    const account = await tx.get(config.collections.accounts, user.uid);
    if (user.role !== 'admin' && user.role !== 'officer' && id !== user.uid && account?.studentId !== id && account?.students !== id) throw new Error('Permission denied for this student profile');
    const existing = await tx.get(config.collections.students, id);
    if (!existing) throw new Error('Student profile not found');
    const updated: JsonMap = { ...existing, ...data };
    // Validate supplied fields without requiring optional legacy profile
    // fields to have been populated by an older registration flow.
    updated.student_id = studentNumber(updated.student_id);
    if ('name' in data) updated.name = text(data.name, 'Full name', 150);
    if ('address' in data && (typeof data.address !== 'string' || data.address.length > 500)) throw new Error('Invalid address');
    if ('yearLevel' in data && data.yearLevel !== null && ![1, 2, 3, 4].includes(Number(data.yearLevel))) throw new Error('Invalid year level');
    if ('section' in data && data.section !== null && !['A', 'B'].includes(String(data.section))) throw new Error('Invalid section');
    if ('email' in data && user.role !== 'admin' && user.role !== 'officer') throw new Error('Only officers can change a profile email');
    if ('email' in data && data.email !== null) updated.email = text(data.email, 'Email', 254).toLowerCase();
    const number = updated.student_id as number;
    await reserveNumber(tx, number, id);
    const oldNumber = studentNumber(existing.student_id);
    const previous = oldNumber !== number ? await tx.get(STUDENT_NUMBER_COLLECTION, String(oldNumber)) : null;
    updated.updatedAt = new Date();
    // All reads precede all writes; a concurrent signup/update competes for
    // the same reservation and is retried by Firestore before committing.
    if (previous?.studentId === id) tx.delete(STUDENT_NUMBER_COLLECTION, String(oldNumber));
    tx.set(STUDENT_NUMBER_COLLECTION, String(number), { studentId: id });
    tx.set(config.collections.students, id, updated);
    return { success: true, student: updated };
  });
}
