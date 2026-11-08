import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => {
  globalThis.Deno = { env: { get: (key) => process.env[key] } };
  return { updateUser: vi.fn() };
});
vi.mock('../../../../supabase/functions/specs-api/firebase/serviceAccount.ts', () => ({
  firebaseProjectId: () => 'demo-specs-auth', firebaseAccessToken: async () => 'owner',
}));
vi.mock('../../../../supabase/functions/specs-api/firebase/auth.ts', () => ({
  FirebaseAuthAdmin: class { updateUser = authMock.updateUser; },
}));

import { FirestoreRestClient } from '../../../../supabase/functions/specs-api/firebase/firestore.ts';
import { completeRegistration, updateStudentProfile } from '../../../../supabase/functions/specs-api/modules/registration.ts';
import { executeOfficerAction, resolveRole } from '../../../../supabase/functions/specs-api/modules/officerManagement.ts';

const config = { collections: { accounts: 'accounts', students: 'students', officers: 'officers', admins: 'admins', stories: 'stories' }, teams: {}, teamCollection: 'team_memberships' };
const store = new FirestoreRestClient();
const claims = (uid, verified = false) => ({ sub: uid, email: `${uid}@parsu.edu.ph`, email_verified: verified });
const input = (number) => ({ name: 'Student', username: 'student', student_id: String(number), yearLevel: 1, section: 'A', address: 'Town', consent: true });
const emulator = process.env.FIRESTORE_EMULATOR_HOST;
const base = `http://${emulator}/v1/projects/demo-specs-auth/databases/(default)/documents`;

function token(uid, verified = true) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ ...claims(uid, verified), user_id: uid, aud: 'demo-specs-auth', iss: 'https://securetoken.google.com/demo-specs-auth', iat: now, exp: now + 3600, firebase: { sign_in_provider: 'password' } })}.`;
}

describe.skipIf(!emulator)('Registration against the real local Firestore emulator', () => {
  beforeEach(async () => {
    const response = await fetch(`http://${emulator}/emulator/v1/projects/demo-specs-auth/databases/(default)/documents`, { method: 'DELETE' });
    expect(response.ok).toBe(true);
  });

  it('commits 300 different student registrations concurrently', async () => {
    const results = await Promise.allSettled(Array.from({ length: 300 }, (_, i) => completeRegistration(claims(`student-${i}`), input(202600000 + i), config)));
    expect(results.filter((result) => result.status === 'rejected')).toEqual([]);
    expect(await store.list('accounts')).toHaveLength(300);
    expect(await store.list('students')).toHaveLength(300);
    expect(await store.list('student_numbers')).toHaveLength(300);
  }, 120_000);

  it('permits exactly one concurrent claim for the same student number', async () => {
    const results = await Promise.allSettled(Array.from({ length: 4 }, (_, i) => completeRegistration(claims(`student-${i}`), input(202600001), config)));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await store.list('accounts')).toHaveLength(1);
    expect(await store.list('students')).toHaveLength(1);
    expect(await store.list('student_numbers')).toHaveLength(1);
  }, 120_000);

  it('resumes partial legacy signup and preserves approval on a lost-response retry', async () => {
    await store.set('students', 'student-a', { name: 'Partial', student_id: 202600001 });
    await completeRegistration(claims('student-a'), input(202600001), config);
    await store.update('accounts', 'student-a', { verified: true });
    expect(await completeRegistration(claims('student-a'), input(202600002), config)).toMatchObject({ alreadyComplete: true });
    expect((await store.get('accounts', 'student-a')).verified).toBe(true);
    expect((await store.get('students', 'student-a')).student_id).toBe(202600001);
    expect(await store.list('student_numbers')).toHaveLength(1);
  });

  it('rolls back all documents if completion fails before commit, then allows retry', async () => {
    const failedStore = { queryPage: (...args) => store.queryPage(...args), runTransaction: (work) => store.runTransaction(async (tx) => { await work(tx); throw new Error('simulated connection failure'); }) };
    await expect(completeRegistration(claims('student-a'), input(202600001), config, failedStore)).rejects.toThrow('simulated');
    expect(await store.list('accounts')).toHaveLength(0);
    expect(await store.list('students')).toHaveLength(0);
    expect(await store.list('student_numbers')).toHaveLength(0);
    await expect(completeRegistration(claims('student-a'), input(202600001), config)).resolves.toMatchObject({ success: true });
  });

  it('rejects duplicate numbers in imported profiles without a reservation', async () => {
    await store.set('students', 'legacy-id', { student_id: 202600001 });
    await expect(completeRegistration(claims('student-a'), input(202600001), config)).rejects.toThrow('already registered');
    expect(await store.list('accounts')).toHaveLength(0);
  });

  it('checks uniqueness on profile edits and releases the old reservation', async () => {
    await completeRegistration(claims('student-a'), input(202600001), config);
    await completeRegistration(claims('student-b'), input(202600002), config);
    const user = { ...claims('student-a', true), uid: 'student-a', role: 'student' };
    await expect(updateStudentProfile(user, { studentId: 'student-a', data: { student_id: 202600002 } }, config)).rejects.toThrow('already registered');
    await updateStudentProfile(user, { studentId: 'student-a', data: { student_id: 202600003 } }, config);
    await expect(completeRegistration(claims('student-c'), input(202600001), config)).resolves.toMatchObject({ success: true });
    await expect(updateStudentProfile(user, { studentId: 'student-b', data: { name: 'Tampered' } }, config)).rejects.toThrow('Permission denied');
  });

  it('ignores spoofed ownership/roles and rejects non-university identities', async () => {
    await expect(completeRegistration({ sub: 'external', email: 'external@example.org' }, input(202600001), config)).rejects.toThrow('official PSU email');
    await completeRegistration(claims('student-a'), { ...input(202600001), studentId: 'victim', type: 'admin', verified: true }, config);
    expect(await store.get('accounts', 'student-a')).toMatchObject({ studentId: 'student-a', type: 'student', verified: false });
  });

  it('denies crafted client account creation and direct edits to another profile or student number', async () => {
    await completeRegistration(claims('victim'), input(202600001), config);
    const create = await fetch(`${base}/accounts/attacker`, { method: 'PATCH', headers: { Authorization: `Bearer ${token('attacker')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { studentId: { stringValue: 'victim' }, type: { stringValue: 'student' }, verified: { booleanValue: false }, deactivated: { booleanValue: false } } }) });
    expect(create.status).toBe(403);
    const edit = await fetch(`${base}/students/victim?updateMask.fieldPaths=name`, { method: 'PATCH', headers: { Authorization: `Bearer ${token('attacker')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { name: { stringValue: 'Tampered' } } }) });
    expect(edit.status).toBe(403);
    await store.update('accounts', 'victim', { verified: true });
    const number = await fetch(`${base}/students/victim?updateMask.fieldPaths=student_id`, { method: 'PATCH', headers: { Authorization: `Bearer ${token('victim')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { student_id: { integerValue: '202600002' } } }) });
    expect(number.status).toBe(403);
  });

  it('requires approval AND email verification in rules and protected backend role checks', async () => {
    await completeRegistration(claims('student-a'), input(202600001), config);
    await store.set('files', 'private-file', { name: 'Private' });
    for (const [approved, emailVerified] of [[false, true], [true, false], [true, true]]) {
      await store.update('accounts', 'student-a', { verified: approved });
      const response = await fetch(`${base}/files/private-file`, { headers: { Authorization: `Bearer ${token('student-a', emailVerified)}` } });
      expect(response.status).toBe(approved && emailVerified ? 200 : 403);
      if (approved && emailVerified) await expect(resolveRole(claims('student-a', emailVerified))).resolves.toMatchObject({ role: 'student' });
      else await expect(resolveRole(claims('student-a', emailVerified))).rejects.toThrow('verification and officer approval');
    }
    await store.update('accounts', 'student-a', { deactivated: true });
    await expect(resolveRole(claims('student-a', true))).rejects.toThrow('deactivated');
  });

  it('account approval does not mark email ownership verified', async () => {
    await completeRegistration(claims('student-a'), input(202600001), config);
    await executeOfficerAction({ uid: 'admin', role: 'admin' }, 'accept_student', { userId: 'student-a' });
    expect((await store.get('accounts', 'student-a')).verified).toBe(true);
    // The mock deliberately has no network implementation: acceptance must
    // not call Firebase Auth to assert ownership on the student's behalf.
    expect(authMock.updateUser).not.toHaveBeenCalled();
  });

  it('keeps concurrent account patches and supports explicit notification-read upserts', async () => {
    await completeRegistration(claims('student-a'), input(202600001), config);
    await Promise.all([
      store.update('accounts', 'student-a', { verified: true }),
      store.update('accounts', 'student-a', { deactivated: true }),
    ]);
    expect(await store.get('accounts', 'student-a')).toMatchObject({ verified: true, deactivated: true });
    await store.update('notification_reads', 'student-a__notice', { userUid: 'student-a', notificationId: 'notice' }, { upsert: true });
    await store.update('notification_reads', 'student-a__notice', { deletedAt: 'fixture-time' }, { upsert: true });
    expect(await store.get('notification_reads', 'student-a__notice')).toMatchObject({ userUid: 'student-a', deletedAt: 'fixture-time' });
  });
});
