import { webcrypto } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => {
  globalThis.Deno = { env: { get: (key) => process.env[key] || ({ SUPABASE_URL: 'https://storage.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture', STORAGE_ALLOWED_BUCKETS: 'specs-events,specs-highlights,private-files' })[key] } };
  return { remove: vi.fn(), list: vi.fn(), createSignedUploadUrl: vi.fn(), createSignedUrl: vi.fn() };
});
vi.mock('npm:@supabase/supabase-js@2', () => ({ createClient: () => ({ storage: { from: () => storage } }) }));
vi.mock('../../../../supabase/functions/specs-api/firebase/serviceAccount.ts', () => ({ firebaseProjectId: () => 'demo-specs-auth', firebaseAccessToken: async () => 'owner' }));
import { FirestoreRestClient } from '../../../../supabase/functions/specs-api/firebase/firestore.ts';
import { paymentAction } from '../../../../supabase/functions/specs-api/modules/payments.ts';
import { storyAction } from '../../../../supabase/functions/specs-api/modules/stories.ts';
import { storageAction } from '../../../../supabase/functions/specs-api/modules/storage.ts';
const config = { collections: { accounts: 'accounts', students: 'students', officers: 'officers', admins: 'admins', stories: 'stories' }, teams: {}, teamCollection: 'team_memberships' };
const store = new FirestoreRestClient();
const host = process.env.FIRESTORE_EMULATOR_HOST;
const base = `http://${host}/v1/projects/demo-specs-auth/databases/(default)/documents`;
const admin = { uid: 'admin', role: 'admin' };
const officer = { uid: 'officer', role: 'officer' };
const student = { uid: 'student-a', role: 'student' };
const due = (extra = {}) => ({ item_name: 'Membership', price: 100, quantity: 1, students: 'student-a', is_event: false, is_outside_bscs: false, is_paid: false, date_paid: new Date(0).toISOString(), ...extra });
const draft = (extra = {}) => ({ title: 'A story', post_description: 'Summary', post_details: 'Story content', students: 'student-a', ...extra });
function token(uid) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: uid, user_id: uid, email: `${uid}@parsu.edu.ph`, email_verified: true, aud: 'demo-specs-auth', iss: 'https://securetoken.google.com/demo-specs-auth', iat: now, exp: now + 3600, firebase: { sign_in_provider: 'password' } })}.`;
}
const read = (path, uid = 'student-a') => fetch(`${base}/${path}`, { headers: { Authorization: `Bearer ${token(uid)}` } });
const confirm = (paymentId, user = officer) => paymentAction(user, { operation: 'mark_paid', paymentId, data: { modal_paid: 'cash' } });

describe.skipIf(!host)('Repository safety with local Firestore and simulated Storage', () => {
  beforeEach(async () => {
    vi.stubGlobal('crypto', webcrypto);
    const response = await fetch(`http://${host}/emulator/v1/projects/demo-specs-auth/databases/(default)/documents`, { method: 'DELETE' });
    expect(response.ok).toBe(true);
    for (const [uid, role] of [['admin', 'admin'], ['officer', 'officer'], ['student-a', 'student'], ['student-b', 'student']]) {
      await store.set('accounts', uid, { type: role, verified: true, deactivated: false, studentId: uid, username: uid });
      await store.set('students', uid, { name: uid, address: 'Private address', is_volunteer: uid === 'student-a' });
    }
    storage.list.mockResolvedValue({ data: [], error: null });
    storage.remove.mockResolvedValue({ error: null });
    storage.createSignedUploadUrl.mockResolvedValue({ data: { token: 'fixture' }, error: null });
    storage.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.invalid/signed' }, error: null });
  });

  it('restricts profiles and ledgers to their student while permitting staff access and scoped queries', async () => {
    await store.set('payments', 'own', due({ studentId: 'student-a' }));
    await store.set('payments', 'other', due({ studentId: 'student-b', students: 'student-b' }));
    await store.set('attendance', 'own', { studentId: 'student-a' });
    await store.set('attendance', 'other', { students: 'student-b' });
    await store.set('revenue', 'finance', { price: 100 });
    for (const path of ['students/student-b', 'payments/other', 'attendance/other', 'revenue/finance']) expect((await read(path)).status, path).toBe(403);
    for (const path of ['students/student-a', 'payments/own', 'attendance/own']) expect((await read(path)).status, path).toBe(200);
    expect((await read('students/student-b', 'officer')).status).toBe(200);
    const query = await fetch(`${base}:runQuery`, { method: 'POST', headers: { Authorization: `Bearer ${token('student-a')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'payments' }], where: { fieldFilter: { field: { fieldPath: 'studentId' }, op: 'EQUAL', value: { stringValue: 'student-a' } } } } }) });
    expect(query.status).toBe(200);
    expect((await query.json()).filter((row) => row.document)).toHaveLength(1);
  });

  it('competing confirmations and retries create exactly one revenue record', async () => {
    await paymentAction(officer, { operation: 'create', paymentId: 'due-a', data: due() });
    const results = await Promise.allSettled(Array.from({ length: 4 }, () => confirm('due-a')));
    expect(results.filter((result) => result.status === 'rejected')).toEqual([]);
    await confirm('due-a');
    expect(await store.list('revenue')).toHaveLength(1);
    expect(await store.get('payments', 'due-a')).toMatchObject({ is_paid: true, revenueId: 'payment__due-a', verified_by_name: 'officer' });
  }, 60000);

  it('keeps imported student IDs readable only by their linked account', async () => {
    await store.update('accounts', 'student-a', { studentId: 'legacy-profile', students: 'legacy-profile' });
    await store.set('students', 'legacy-profile', { name: 'Imported member' });
    await store.set('payments', 'legacy-own', { students: 'legacy-profile', price: 100 });
    expect((await read('students/legacy-profile')).status).toBe(200);
    expect((await read('payments/legacy-own')).status).toBe(200);
    expect((await read('payments/legacy-own', 'student-b')).status).toBe(403);
  });

  it('updates paid payment details and their exact revenue together', async () => {
    await paymentAction(officer, { operation: 'create', paymentId: 'due-a', data: due() }); await confirm('due-a');
    await paymentAction(admin, { operation: 'update', paymentId: 'due-a', data: { item_name: 'Corrected fee', price: 150, quantity: 2 } });
    expect(await store.get('payments', 'due-a')).toMatchObject({ price: 150, quantity: 2, amount: 300, verified_by_name: 'officer' });
    expect(await store.get('revenue', 'payment__due-a')).toMatchObject({ price: 150, quantity: 2, amount: 300, recorder: 'officer' });
    const storedPayment = await (await read('payments/due-a', 'officer')).json();
    expect(storedPayment.fields.createdAt.timestampValue).toBeTruthy();
    const storedRevenue = await (await read('revenue/payment__due-a', 'officer')).json();
    expect(storedRevenue.fields.createdAt.timestampValue).toBeTruthy();
  });

  it('leaves neither a paid flag nor revenue after a failed transaction', async () => {
    await paymentAction(officer, { operation: 'create', paymentId: 'due-a', data: due() });
    const failed = { runTransaction: (work) => store.runTransaction(async (tx) => { await work(tx); throw new Error('simulated commit failure'); }) };
    await expect(paymentAction(officer, { operation: 'mark_paid', paymentId: 'due-a' }, failed)).rejects.toThrow('simulated');
    expect((await store.get('payments', 'due-a')).is_paid).toBe(false);
    expect(await store.list('revenue')).toHaveLength(0);
    await confirm('due-a');
    expect(await store.list('revenue')).toHaveLength(1);
  });

  it('deletes only the revenue bound to the selected payment despite identical labels and amounts', async () => {
    for (const id of ['due-a', 'due-b']) { await paymentAction(admin, { operation: 'create', paymentId: id, data: due() }); await confirm(id); }
    await paymentAction(admin, { operation: 'delete', paymentId: 'due-a' });
    expect(await store.list('revenue')).toHaveLength(1);
    expect(await store.get('revenue', 'payment__due-b')).toMatchObject({ paymentId: 'due-b' });
    await expect(store.get('payments', 'due-a')).rejects.toThrow('404');
  });

  it('creates outside collections and revenue atomically, and ignores forged payment figures on confirmation', async () => {
    await paymentAction(admin, { operation: 'create', paymentId: 'outside', data: due({ students: null, is_outside_bscs: true, non_bscs_name: 'Visitor', is_paid: true, date_paid: new Date().toISOString() }) });
    expect(await store.list('revenue')).toHaveLength(1);
    await paymentAction(officer, { operation: 'create', paymentId: 'due-a', data: due() });
    await paymentAction(officer, { operation: 'mark_paid', paymentId: 'due-a', data: { price: 999999, verified_by_name: 'Someone else' } });
    expect(await store.get('revenue', 'payment__due-a')).toMatchObject({ price: 100, amount: 100 });
    await expect(paymentAction(student, { operation: 'delete', paymentId: 'due-a' })).rejects.toThrow('Permission denied');
  });

  it('preserves ambiguous legacy revenue until an administrator explicitly reconciles it', async () => {
    await store.set('payments', 'legacy', due({ is_paid: true }));
    await store.set('revenue', 'original', { name: 'Old payment', price: 100, quantity: 1 });
    await store.set('revenue', 'unrelated', { name: 'Same price', price: 100, quantity: 1 });
    await expect(paymentAction(admin, { operation: 'delete', paymentId: 'legacy' })).rejects.toThrow('reconcile');
    await paymentAction(admin, { operation: 'link_revenue', paymentId: 'legacy', revenueId: 'original' });
    await paymentAction(admin, { operation: 'delete', paymentId: 'legacy' });
    expect(await store.list('revenue')).toHaveLength(1);
    expect((await store.get('revenue', 'unrelated')).name).toBe('Same price');
  });

  it('cannot link one legacy revenue to two payments concurrently', async () => {
    for (const id of ['legacy-a', 'legacy-b']) await store.set('payments', id, due({ is_paid: true }));
    await store.set('revenue', 'original', { name: 'Original collection', price: 100, quantity: 1 });
    const results = await Promise.allSettled(['legacy-a', 'legacy-b'].map((paymentId) => paymentAction(admin, { operation: 'link_revenue', paymentId, revenueId: 'original' })));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((await store.list('payments')).filter((row) => row.revenueId)).toHaveLength(1);
  }, 60000);

  it('shows legacy candidates with event labels and rejects an incorrect event match', async () => {
    await store.set('events', 'event-a', { event_name: 'Event A' });
    await store.set('events', 'event-b', { event_name: 'Event B' });
    await store.set('payments', 'legacy', due({ is_paid: true, is_event: true, events: 'event-a' }));
    await store.set('revenue', 'original', { name: 'Old collection', price: 100, quantity: 1, event: 'event-a' });
    await store.set('revenue', 'other-event', { name: 'Different event', price: 100, quantity: 1, event: 'event-b' });
    const candidates = await paymentAction(admin, { operation: 'legacy_candidates', paymentId: 'legacy' });
    expect(candidates.documents.find((row) => row.$id === 'original').eventLabel).toBe('Event A');
    await expect(paymentAction(admin, { operation: 'link_revenue', paymentId: 'legacy', revenueId: 'other-event' })).rejects.toThrow('events must match');
    expect(await store.get('revenue', 'other-event')).not.toHaveProperty('paymentId');
  });

  it('rejects direct staff writes to payment-linked revenue and payment status', async () => {
    await paymentAction(admin, { operation: 'create', paymentId: 'due-a', data: due() }); await confirm('due-a');
    const revenue = await fetch(`${base}/revenue/payment__due-a`, { method: 'DELETE', headers: { Authorization: `Bearer ${token('officer')}` } });
    expect(revenue.status).toBe(403);
    const payment = await fetch(`${base}/payments/due-a?updateMask.fieldPaths=is_paid`, { method: 'PATCH', headers: { Authorization: `Bearer ${token('officer')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { is_paid: { booleanValue: false } } }) });
    expect(payment.status).toBe(403);
  });

  it('volunteers manage their own drafts but cannot forge authorship or approval', async () => {
    const result = await storyAction(student, { operation: 'create', storyId: 'draft', data: draft({ students: 'student-b', isAccepted: true, adminApproval: true }) }, config);
    expect(result.story).toMatchObject({ students: 'student-a', isAccepted: false, adminApproval: false });
    expect(result.story.authorSnapshot).not.toHaveProperty('email');
    expect((await read('stories/draft')).status).toBe(200);
    expect((await read('stories/draft', 'student-b')).status).toBe(403);
    await expect(storyAction({ uid: 'student-b', role: 'student' }, { operation: 'create', storyId: 'forbidden', data: draft() }, config)).rejects.toThrow('volunteers');
    const own = await fetch(`${base}:runQuery`, { method: 'POST', headers: { Authorization: `Bearer ${token('student-a')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'stories' }], where: { fieldFilter: { field: { fieldPath: 'students' }, op: 'EQUAL', value: { stringValue: 'student-a' } } } } }) });
    expect(own.status).toBe(200);
    await store.update('students', 'student-b', { is_volunteer: true });
    await expect(storyAction({ uid: 'student-b', role: 'student' }, { operation: 'create', storyId: 'draft', data: draft() }, config)).rejects.toThrow('another author');
  });

  it('requires admin publication, rejects stale reviews, and resets approvals on edits', async () => {
    await storyAction(student, { operation: 'create', storyId: 'draft', data: draft() }, config);
    const direct = await fetch(`${base}/stories/draft?updateMask.fieldPaths=isAccepted`, { method: 'PATCH', headers: { Authorization: `Bearer ${token('officer')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { isAccepted: { booleanValue: true } } }) });
    expect(direct.status).toBe(403);
    await storyAction(officer, { operation: 'approve', storyId: 'draft', expectedRevision: 1 }, config);
    expect((await store.get('stories', 'draft')).isAccepted).toBe(false);
    await storyAction(student, { operation: 'update', storyId: 'draft', data: { post_details: 'Changed before admin review' } }, config);
    await expect(storyAction(admin, { operation: 'approve', storyId: 'draft', expectedRevision: 1 }, config)).rejects.toThrow('changed');
    await storyAction(officer, { operation: 'approve', storyId: 'draft', expectedRevision: 2 }, config);
    await storyAction(admin, { operation: 'approve', storyId: 'draft', expectedRevision: 2 }, config);
    expect((await fetch(`${base}/stories/draft`)).status).toBe(200);
    await storyAction(student, { operation: 'update', storyId: 'draft', data: { post_details: 'Revised content', isAccepted: true } }, config);
    expect(await store.get('stories', 'draft')).toMatchObject({ isAccepted: false, officerApproval: false, adminApproval: false });
  });

  it('records upload ownership and blocks cross-user deletion, private reads, and legacy folder takeover', async () => {
    await storageAction(student, { action: 'upload', bucket: 'specs-highlights', path: 'cover-a/photo.webp' }, store);
    await expect(storageAction({ uid: 'student-b', role: 'student' }, { action: 'delete', bucket: 'specs-highlights', path: 'cover-a/photo.webp' }, store)).rejects.toThrow('does not belong');
    expect(storage.remove).not.toHaveBeenCalled();
    await storageAction(student, { action: 'delete', bucket: 'specs-highlights', path: 'cover-a' }, store);
    expect(storage.remove).toHaveBeenCalledWith(['cover-a/photo.webp']);
    await expect(storageAction(student, { action: 'download', bucket: 'private-files', path: 'someone-else/file.pdf' }, store)).rejects.toThrow('does not belong');
    await expect(storageAction(student, { action: 'upload', bucket: 'specs-events', path: 'event-a/photo.webp' }, store)).rejects.toThrow('story covers');
    storage.list.mockResolvedValue({ data: [{ name: 'legacy.jpg' }], error: null });
    await expect(storageAction(student, { action: 'upload', bucket: 'specs-highlights', path: 'legacy/new.jpg' }, store)).rejects.toThrow('already exists');
  });

  it('does not let another volunteer claim a reserved file ID even before upload completes', async () => {
    await store.update('students', 'student-b', { is_volunteer: true });
    await storageAction(student, { action: 'upload', bucket: 'specs-highlights', path: 'reserved/photo.webp' }, store);
    await expect(storageAction({ uid: 'student-b', role: 'student' }, { action: 'upload', bucket: 'specs-highlights', path: 'reserved/replacement.webp' }, store)).rejects.toThrow('reserved');
    expect(storage.createSignedUploadUrl).toHaveBeenCalledTimes(1);
  });
});
