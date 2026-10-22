import { assertString } from '../http.ts';
import { FirebaseAuthAdmin } from '../firebase/auth.ts';
import { FirestoreRestClient, matchesRef } from '../firebase/firestore.ts';
import type { ActionResult, AppConfig, JsonMap, AuthenticatedUser } from '../types.ts';

const env = (key: string, fallback: string) => Deno.env.get(key) || fallback;

export function appConfig(): AppConfig {
  return {
    collections: {
      accounts: env('COLLECTION_ID_ACCOUNTS', 'accounts'),
      students: env('COLLECTION_ID_STUDENTS', 'students'),
      officers: env('COLLECTION_ID_OFFICERS', 'officers'),
      admins: env('COLLECTION_ID_ADMINS', 'admins'),
      stories: env('COLLECTION_ID_STORIES', 'stories'),
    },
    teams: {
      students: Deno.env.get('TEAM_ID_STUDENTS') || undefined,
      officers: Deno.env.get('TEAM_ID_OFFICERS') || undefined,
      volunteers: Deno.env.get('TEAM_ID_VOLUNTEERS') || undefined,
    },
    teamCollection: env('FIREBASE_TEAM_COLLECTION', 'team_memberships'),
  };
}

export function refId(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (!value || typeof value !== 'object') return undefined;
  const object = value as JsonMap;
  for (const key of ['$id', 'id', 'legacyAppwriteId']) {
    if (typeof object[key] === 'string' && object[key]) return object[key] as string;
  }
  return undefined;
}

function studentSnapshot(student: JsonMap | null | undefined): JsonMap | null {
  if (!student) return null;
  return {
    id: student.$id || null,
    name: student.name || null,
    email: student.email || null,
    section: student.section || null,
    yearLevel: student.yearLevel ?? null,
    student_id: student.student_id ?? null,
    is_volunteer: student.is_volunteer ?? null,
    volunteer_request_status: student.volunteer_request_status || null,
  };
}

function officerSnapshot(officerId: string, position: unknown, student: JsonMap | null | undefined, pictureId?: unknown): JsonMap {
  const snapshot = studentSnapshot(student);
  return {
    id: officerId,
    position: position || null,
    displayName: snapshot?.name || null,
    email: snapshot?.email || null,
    pictureId: pictureId || null,
    studentId: snapshot?.id || null,
    students: snapshot,
  };
}

function accountId(payload: JsonMap): string {
  return assertString(payload.userId || payload.accountDocId || payload.account_id, 'account ID');
}

async function accountFor(store: FirestoreRestClient, config: AppConfig, uid: string): Promise<JsonMap> {
  return store.get(config.collections.accounts, uid);
}

async function studentForAccount(store: FirestoreRestClient, config: AppConfig, account: JsonMap): Promise<JsonMap | null> {
  const studentId = refId(account.students) || refId(account.studentId);
  if (!studentId) return null;
  try { return await store.get(config.collections.students, studentId); } catch { return null; }
}

async function accountForStudent(store: FirestoreRestClient, config: AppConfig, studentId: string): Promise<JsonMap | null> {
  const accounts = await store.list(config.collections.accounts);
  return accounts.find((account) => matchesRef(account.students, studentId) || refId(account.studentId) === studentId) || null;
}

async function teamMemberId(teamId: string, uid: string): Promise<string> {
  return `${teamId.replace(/[^a-zA-Z0-9_-]/g, '_')}__${uid.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

async function addTeamMember(store: FirestoreRestClient, config: AppConfig, teamId: string | undefined, account: JsonMap, email?: string) {
  if (!teamId) return;
  const uid = String(account.$id || '');
  if (!uid) return;
  const id = await teamMemberId(teamId, uid);
  await store.set(config.teamCollection, id, {
    teamId,
    userId: uid,
    email: email || null,
    roles: ['member'],
    updatedAt: new Date(),
  });
}

async function removeTeamMember(store: FirestoreRestClient, config: AppConfig, teamId: string | undefined, uid: string) {
  if (!teamId) return;
  try { await store.delete(config.teamCollection, await teamMemberId(teamId, uid)); } catch (error) {
    if (!String(error).includes('404')) throw error;
  }
}

async function removeFromAllTeams(store: FirestoreRestClient, config: AppConfig, uid: string) {
  await Promise.all([
    removeTeamMember(store, config, config.teams.students, uid),
    removeTeamMember(store, config, config.teams.officers, uid),
    removeTeamMember(store, config, config.teams.volunteers, uid),
  ]);
}

async function emailForAccount(store: FirestoreRestClient, config: AppConfig, account: JsonMap, student?: JsonMap | null): Promise<string | undefined> {
  const candidates = [
    account.email,
    (account.studentSnapshot as JsonMap | undefined)?.email,
    (account.students as JsonMap | undefined)?.email,
    (account.adminSnapshot as JsonMap | undefined)?.email,
    (account.admins as JsonMap | undefined)?.email,
    student?.email,
    (account.officerSnapshot as JsonMap | undefined)?.email,
  ];
  return candidates.find((value): value is string => typeof value === 'string' && value.trim().includes('@'))?.trim();
}

async function resetPassword(store: FirestoreRestClient, auth: FirebaseAuthAdmin, config: AppConfig, payload: JsonMap): Promise<ActionResult> {
  const uid = accountId(payload);
  const account = await accountFor(store, config, uid);
  const student = await studentForAccount(store, config, account);
  const email = await emailForAccount(store, config, account, student);
  if (!email) throw new Error('No email is associated with this account');
  const continueUrl = Deno.env.get('FIREBASE_PASSWORD_RESET_CONTINUE_URL') || Deno.env.get('PASSWORD_RESET_CONTINUE_URL');
  await auth.sendPasswordReset(email, continueUrl);
  return { success: true, message: 'Password reset email sent' };
}

async function roleAction(user: AuthenticatedUser, allowed: string[]) {
  if (!allowed.includes(user.role)) throw new Error(`Only ${allowed.join(' or ')} can perform this action`);
}

async function acceptStudent(store: FirestoreRestClient, auth: FirebaseAuthAdmin, config: AppConfig, payload: JsonMap): Promise<ActionResult> {
  const uid = accountId(payload);
  const account = await accountFor(store, config, uid);
  const updated = await store.update(config.collections.accounts, uid, { verified: true, updatedAt: new Date() });
  try { await auth.updateUser(uid, { emailVerified: true }); } catch { /* Auth may already be absent in a partial import. */ }
  await addTeamMember(store, config, config.teams.students, updated, await emailForAccount(store, config, account, await studentForAccount(store, config, account)));
  return { success: true, message: 'Student accepted successfully' };
}

async function bulkAccept(store: FirestoreRestClient, auth: FirebaseAuthAdmin, config: AppConfig, payload: JsonMap): Promise<ActionResult> {
  const ids = payload.userIds;
  if (!Array.isArray(ids) || ids.length === 0) throw new Error('Missing or invalid userIds array');
  if (ids.length > 50) throw new Error('Bulk accept is limited to 50 accounts per request');
  const failedIds: string[] = [];
  let successCount = 0;
  for (const value of ids) {
    try { await acceptStudent(store, auth, config, { userId: value }); successCount += 1; } catch { failedIds.push(String(value)); }
  }
  return { success: failedIds.length === 0, message: `Accepted ${successCount} of ${ids.length} students`, successCount, failedIds };
}

async function promoteOfficer(store: FirestoreRestClient, config: AppConfig, payload: JsonMap): Promise<ActionResult> {
  const uid = accountId(payload);
  const account = await accountFor(store, config, uid);
  if (account.type === 'officer') throw new Error('User is already an officer');
  if (!account.verified) throw new Error('Cannot promote unverified student');
  const student = await studentForAccount(store, config, account);
  const studentId = refId(account.students) || refId(account.studentId);
  if (!studentId) throw new Error('No student record linked to account');
  const officerId = uid;
  const studentProjection = studentSnapshot(student);
  const officerProjection = officerSnapshot(officerId, payload.position, student);
  await store.set(config.collections.officers, officerId, {
    students: studentId,
    studentId,
    accountUid: uid,
    displayName: student?.name || null,
    studentEmail: student?.email || null,
    studentNumber: student?.student_id || null,
    studentSnapshot: studentProjection,
    dataModelVersion: 2,
    snapshotUpdatedAt: new Date(),
    isSchedule: false,
    scheduleId: null,
    position: payload.position || null,
    email: student?.email || null,
    token_email: null,
  });
  const updated = await store.update(config.collections.accounts, uid, {
    type: 'officer',
    officers: officerId,
    officerId,
    studentId,
    displayName: student?.name || null,
    email: student?.email || null,
    studentSnapshot: studentProjection,
    officerSnapshot: officerProjection,
    dataModelVersion: 2,
    snapshotUpdatedAt: new Date(),
    updatedAt: new Date(),
  });
  const email = await emailForAccount(store, config, updated, student);
  await addTeamMember(store, config, config.teams.officers, updated, email);
  await removeTeamMember(store, config, config.teams.students, uid);
  return { success: true, message: 'User promoted to officer', officer_id: officerId };
}

async function demoteOfficer(store: FirestoreRestClient, config: AppConfig, payload: JsonMap): Promise<ActionResult> {
  const uid = accountId(payload);
  const account = await accountFor(store, config, uid);
  if (account.type !== 'officer') throw new Error('User is not an officer');
  const officerId = refId(account.officers) || refId(account.officerId);
  if (officerId) {
    try { await store.update(config.collections.officers, officerId, { students: null, studentId: null, studentSnapshot: null, accountUid: null }); } catch { /* already removed */ }
    try { await store.delete(config.collections.officers, officerId); } catch { /* already removed */ }
  }
  const updated = await store.update(config.collections.accounts, uid, { type: 'student', officers: null, officerId: null, officerSnapshot: null, updatedAt: new Date() });
  const student = await studentForAccount(store, config, updated);
  const email = await emailForAccount(store, config, updated, student);
  await removeTeamMember(store, config, config.teams.officers, uid);
  await addTeamMember(store, config, config.teams.students, updated, email);
  return { success: true, message: 'Officer demoted to student' };
}

async function deactivate(store: FirestoreRestClient, auth: FirebaseAuthAdmin, config: AppConfig, payload: JsonMap): Promise<ActionResult> {
  const uid = accountId(payload);
  const account = await accountFor(store, config, uid);
  if (account.type === 'admin') throw new Error('Cannot deactivate admin accounts');
  await auth.updateUser(uid, { disabled: true });
  await store.update(config.collections.accounts, uid, { deactivated: true, updatedAt: new Date() });
  await removeFromAllTeams(store, config, uid);
  return { success: true, message: 'Account blocked successfully' };
}

async function reactivate(store: FirestoreRestClient, auth: FirebaseAuthAdmin, config: AppConfig, payload: JsonMap): Promise<ActionResult> {
  const uid = accountId(payload);
  await auth.updateUser(uid, { disabled: false });
  const account = await store.update(config.collections.accounts, uid, { deactivated: false, updatedAt: new Date() });
  const student = await studentForAccount(store, config, account);
  const email = await emailForAccount(store, config, account, student);
  await addTeamMember(store, config, account.type === 'officer' ? config.teams.officers : config.teams.students, account, email);
  if (student?.is_volunteer) await addTeamMember(store, config, config.teams.volunteers, account, email);
  return { success: true, message: 'Account unblocked successfully' };
}

async function syncStudentSnapshot(user: AuthenticatedUser, store: FirestoreRestClient, config: AppConfig, payload: JsonMap): Promise<ActionResult> {
  const studentId = assertString(payload.studentId || payload.student_id, 'student ID');
  const student = await store.get(config.collections.students, studentId);
  const account = await accountForStudent(store, config, studentId);
  if (!account) throw new Error('No account is linked to this student profile');
  if (!['admin', 'officer'].includes(user.role) && String(account.$id) !== user.uid) {
    throw new Error('You can only synchronize your own student profile');
  }

  const projection = studentSnapshot(student);
  const timestamp = new Date();
  const accountPatch: JsonMap = {
    studentId,
    displayName: student.name || null,
    email: student.email || null,
    studentSnapshot: projection,
    dataModelVersion: 2,
    snapshotUpdatedAt: timestamp,
  };
  const officerId = refId(account.officers) || refId(account.officerId);
  if (officerId) {
    const officer = await store.get(config.collections.officers, officerId);
    const officerProjection = officerSnapshot(officerId, officer.position, student, officer.pictureId);
    await store.update(config.collections.officers, officerId, {
      studentId,
      displayName: student.name || null,
      studentEmail: student.email || null,
      studentNumber: student.student_id || null,
      studentSnapshot: projection,
      dataModelVersion: 2,
      snapshotUpdatedAt: timestamp,
    });
    accountPatch.officerSnapshot = officerProjection;
  }
  await store.update(config.collections.accounts, String(account.$id), accountPatch);
  return { success: true, message: 'Student profile projections synchronized' };
}

async function assignToOfficer(store: FirestoreRestClient, config: AppConfig, payload: JsonMap): Promise<ActionResult> {
  const studentId = assertString(payload.student_id, 'student_id');
  const student = await store.get(config.collections.students, studentId);
  const account = await accountForStudent(store, config, studentId);
  const officerId = refId(account) || crypto.randomUUID();
  const studentProjection = studentSnapshot(student);
  const officerProjection = officerSnapshot(officerId, payload.position, student);
  await store.set(config.collections.officers, officerId, {
    students: studentId,
    studentId,
    accountUid: account?.$id || null,
    displayName: student.name || null,
    studentEmail: student.email || null,
    studentNumber: student.student_id || null,
    studentSnapshot: studentProjection,
    dataModelVersion: 2,
    snapshotUpdatedAt: new Date(),
    isSchedule: false,
    scheduleId: null,
    position: payload.position || null,
    email: student.email || null,
  });
  if (account) {
    const updated = await store.update(config.collections.accounts, String(account.$id), {
      type: 'officer',
      officers: officerId,
      officerId,
      studentId,
      displayName: student.name || null,
      email: student.email || null,
      studentSnapshot: studentProjection,
      officerSnapshot: officerProjection,
      dataModelVersion: 2,
      snapshotUpdatedAt: new Date(),
    });
    await addTeamMember(store, config, config.teams.officers, updated, String(student.email || ''));
    await removeTeamMember(store, config, config.teams.students, String(account.$id));
  }
  return { success: true, message: 'Student assigned as officer', officer_id: officerId };
}

async function removeFromOfficer(store: FirestoreRestClient, config: AppConfig, payload: JsonMap): Promise<ActionResult> {
  const officerId = assertString(payload.officer_id, 'officer_id');
  const officer = await store.get(config.collections.officers, officerId);
  const studentId = refId(officer.students);
  if (studentId) {
    const account = await accountForStudent(store, config, studentId);
    if (account) {
      const updated = await store.update(config.collections.accounts, String(account.$id), { type: 'student', officers: null, officerId: null, officerSnapshot: null });
      await removeTeamMember(store, config, config.teams.officers, String(account.$id));
      await addTeamMember(store, config, config.teams.students, updated, String((await store.get(config.collections.students, studentId)).email || ''));
    }
  }
  await store.delete(config.collections.officers, officerId);
  return { success: true, message: 'Officer removed' };
}

async function volunteer(store: FirestoreRestClient, config: AppConfig, payload: JsonMap, approve: boolean): Promise<ActionResult> {
  const studentId = assertString(payload.student_id, 'student_id');
  await store.update(config.collections.students, studentId, approve
    ? { is_volunteer: true, volunteer_request_status: 'approved' }
    : { is_volunteer: false, volunteer_request_status: 'rejected' });
  await syncStudentSnapshot({ uid: 'system', role: 'admin' } as AuthenticatedUser, store, config, { studentId });
  if (approve) {
    const account = await accountForStudent(store, config, studentId);
    if (account) await addTeamMember(store, config, config.teams.volunteers, account, String((await store.get(config.collections.students, studentId)).email || ''));
  }
  return { success: true, message: approve ? 'Volunteer request approved' : 'Volunteer request rejected' };
}

async function volunteerBackout(store: FirestoreRestClient, config: AppConfig, payload: JsonMap, approve: boolean): Promise<ActionResult> {
  const studentId = assertString(payload.student_id, 'student_id');
  const student = await store.get(config.collections.students, studentId);
  await store.update(config.collections.students, studentId, approve
    ? { is_volunteer: false, volunteer_request_status: 'none' }
    : { is_volunteer: true, volunteer_request_status: 'approved' });
  await syncStudentSnapshot({ uid: 'system', role: 'admin' } as AuthenticatedUser, store, config, { studentId });
  if (approve) {
    const account = await accountForStudent(store, config, studentId);
    if (account) await removeTeamMember(store, config, config.teams.volunteers, String(account.$id));
  }
  return { success: true, message: approve ? 'Volunteer backout approved - removed from volunteer program' : 'Volunteer backout rejected - volunteer remains active' };
}

async function story(store: FirestoreRestClient, config: AppConfig, payload: JsonMap, userRole: string, approve: boolean): Promise<ActionResult> {
  const storyId = assertString(payload.story_id, 'story_id');
  if (approve) {
    await store.update(config.collections.stories, storyId, userRole === 'admin' ? { adminApproval: true, isAccepted: true } : { officerApproval: true });
    return { success: true, message: userRole === 'admin' ? 'Story approved and published' : 'Story approved by officer, awaiting admin approval' };
  }
  await store.delete(config.collections.stories, storyId);
  return { success: true, message: 'Story rejected and deleted' };
}

async function deleteAccount(store: FirestoreRestClient, auth: FirebaseAuthAdmin, config: AppConfig, payload: JsonMap, requesterUid: string, requesterRole: string): Promise<ActionResult> {
  const uid = accountId(payload);
  const selfDelete = uid === requesterUid;
  if (requesterRole !== 'admin' && !selfDelete) throw new Error('Only admins can delete other accounts');
  const account = await accountFor(store, config, uid);
  if (account.type === 'admin' && !selfDelete) throw new Error('Cannot delete admin accounts');
  const studentId = refId(account.students) || refId(account.studentId);
  const officerId = refId(account.officers) || refId(account.officerId);
  await removeFromAllTeams(store, config, uid);
  if (officerId) { try { await store.delete(config.collections.officers, officerId); } catch { /* absent */ } }
  if (studentId) { try { await store.delete(config.collections.students, studentId); } catch { /* absent */ } }
  await store.delete(config.collections.accounts, uid);
  try { await auth.deleteUser(uid); } catch { /* Auth may already be absent. */ }
  return { success: true, message: 'Account and all related data deleted successfully' };
}

export async function executeOfficerAction(user: AuthenticatedUser, action: string, payload: JsonMap): Promise<ActionResult> {
  const store = new FirestoreRestClient();
  const auth = new FirebaseAuthAdmin();
  const config = appConfig();
  if (action === 'sync_student_snapshot') return syncStudentSnapshot(user, store, config, payload);
  const adminOnly = ['accept_student', 'bulk_accept_students', 'promote_officer', 'demote_officer', 'deactivate_account', 'reactivate_account', 'reset_password', 'assign_to_officer', 'remove_from_officer'];
  const officerOrAdmin = ['approve_volunteer', 'reject_volunteer', 'approve_volunteer_backout', 'reject_volunteer_backout', 'approve_story', 'reject_story'];
  if (adminOnly.includes(action)) await roleAction(user, ['admin']);
  if (officerOrAdmin.includes(action)) await roleAction(user, ['officer', 'admin']);

  switch (action) {
    case 'accept_student': return acceptStudent(store, auth, config, payload);
    case 'bulk_accept_students': return bulkAccept(store, auth, config, payload);
    case 'promote_officer': return promoteOfficer(store, config, payload);
    case 'demote_officer': return demoteOfficer(store, config, payload);
    case 'deactivate_account': return deactivate(store, auth, config, payload);
    case 'reactivate_account': return reactivate(store, auth, config, payload);
    case 'reset_password': return resetPassword(store, auth, config, payload);
    case 'assign_to_officer': return assignToOfficer(store, config, payload);
    case 'remove_from_officer': return removeFromOfficer(store, config, payload);
    case 'approve_volunteer': return volunteer(store, config, payload, true);
    case 'reject_volunteer': return volunteer(store, config, payload, false);
    case 'approve_volunteer_backout': return volunteerBackout(store, config, payload, true);
    case 'reject_volunteer_backout': return volunteerBackout(store, config, payload, false);
    case 'approve_story': return story(store, config, payload, user.role, true);
    case 'reject_story': return story(store, config, payload, user.role, false);
    case 'delete_account': return deleteAccount(store, auth, config, payload, user.uid, user.role);
    default: throw new Error(`Unsupported admin action: ${action}`);
  }
}

export async function resolveRole(user: JsonMap): Promise<AuthenticatedUser> {
  const uid = String(user.user_id || user.sub || '');
  if (!uid) throw new Error('Firebase token has no user id');
  const store = new FirestoreRestClient();
  const config = appConfig();
  const staticAdmins = (Deno.env.get('ADMIN_USER_IDS') || '').split(',').map((value) => value.trim()).filter(Boolean);
  if (staticAdmins.includes(uid)) return { ...user, uid, role: 'admin' } as AuthenticatedUser;
  try {
    const account = await store.get(config.collections.accounts, uid);
    const role = typeof account.type === 'string' ? account.type : '';
    if (role) return { ...user, uid, role } as AuthenticatedUser;
  } catch { /* fallback below */ }
  try {
    await store.get(config.collections.admins, uid);
    return { ...user, uid, role: 'admin' } as AuthenticatedUser;
  } catch { /* no role found */ }
  throw new Error('Authenticated user has no application role');
}
