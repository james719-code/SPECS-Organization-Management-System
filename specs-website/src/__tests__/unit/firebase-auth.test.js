import { beforeEach, describe, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({
  setPersistence: vi.fn(), signInWithEmailAndPassword: vi.fn(), createUserWithEmailAndPassword: vi.fn(), updateProfile: vi.fn(), reload: vi.fn(), sendEmailVerification: vi.fn(),
  indexedDBLocalPersistence: { type: 'LOCAL' }, browserSessionPersistence: { type: 'SESSION' },
}));
vi.mock('firebase/auth', () => sdk);
const firestore = vi.hoisted(() => ({ doc: vi.fn(), getDoc: vi.fn(), getDocFromServer: vi.fn() }));
vi.mock('firebase/firestore', () => firestore);
import { FirebaseAuthProvider, FirebaseDatabaseProvider } from '../../shared/providers/firebaseProvider';

let provider;
let user;
beforeEach(() => {
  for (const entry of Object.values(sdk)) if (typeof entry?.mockReset === 'function') entry.mockReset();
  user = { uid: 'student-a', email: 'student-a@parsu.edu.ph', displayName: '', emailVerified: false, getIdToken: vi.fn() };
  provider = new FirebaseAuthProvider({});
  provider.auth = { currentUser: user, authStateReady: vi.fn().mockResolvedValue(undefined) };
  sdk.signInWithEmailAndPassword.mockResolvedValue({ user });
  sdk.createUserWithEmailAndPassword.mockResolvedValue({ user });
});

describe('Firebase auth persistence and interrupted registrations', () => {
  it.each([false, true])('selects actual SDK persistence for Remember me = %s', async (remember) => {
    await provider.login(' STUDENT-A@PARSU.EDU.PH ', 'password', remember);
    expect(sdk.setPersistence).toHaveBeenCalledWith(provider.auth, remember ? sdk.indexedDBLocalPersistence : sdk.browserSessionPersistence);
    expect(sdk.signInWithEmailAndPassword).toHaveBeenCalledWith(provider.auth, 'student-a@parsu.edu.ph', 'password');
  });

  it('proves the password before resuming a pre-existing Auth account', async () => {
    sdk.createUserWithEmailAndPassword.mockRejectedValue({ code: 'auth/email-already-in-use' });
    await expect(provider.register(user.email, 'original-password', 'Student')).resolves.toMatchObject({ $id: 'student-a' });
    expect(sdk.signInWithEmailAndPassword).toHaveBeenCalledWith(provider.auth, user.email, 'original-password');
  });

  it('does not recover a different account with an incorrect password', async () => {
    sdk.createUserWithEmailAndPassword.mockRejectedValue({ code: 'auth/email-already-in-use' });
    sdk.signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid-credential' });
    await expect(provider.register(user.email, 'wrong-password', 'Student')).rejects.toMatchObject({ code: 'auth/invalid-credential' });
    expect(sdk.updateProfile).not.toHaveBeenCalled();
  });

  it('continues the canonical registration if optional Auth display-name update fails', async () => {
    sdk.updateProfile.mockRejectedValue(new Error('network failure'));
    await expect(provider.register(user.email, 'password', 'Student')).resolves.toMatchObject({ $id: 'student-a' });
  });

  it('reloads email verification and refreshes the token before checking dashboard access', async () => {
    sdk.reload.mockImplementation(async () => { user.emailVerified = true; });
    expect(await provider.getCurrentUser(true)).toMatchObject({ emailVerification: true });
    expect(user.getIdToken).toHaveBeenCalledWith(true);
  });

  it('uses the server role rather than an offline cached account for a fresh auth lookup', async () => {
    const database = new FirebaseDatabaseProvider({});
    database.db = {};
    firestore.getDoc.mockResolvedValue({ id: 'student-a', exists: () => true, data: () => ({ type: 'admin' }) });
    firestore.getDocFromServer.mockResolvedValue({ id: 'student-a', exists: () => true, data: () => ({ type: 'student' }) });
    expect(await database.getDocument('db', 'accounts', 'student-a', { fresh: true })).toMatchObject({ type: 'student' });
    expect(firestore.getDoc).not.toHaveBeenCalled();
  });

  it('does not send a verification email for a different user after a session switch', async () => {
    provider.auth.currentUser = { uid: 'student-b' };
    await expect(provider.sendVerification('https://example.test/login', 'student-a')).rejects.toThrow('session changed');
    expect(sdk.sendEmailVerification).not.toHaveBeenCalled();
  });
});
