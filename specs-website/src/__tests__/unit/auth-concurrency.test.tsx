import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  account: { get: vi.fn(), create: vi.fn(), createEmailPasswordSession: vi.fn(), deleteSession: vi.fn(), createVerification: vi.fn(), subscribe: vi.fn() },
  databases: { getDocument: vi.fn(), createDocument: vi.fn(), deleteDocument: vi.fn() },
  ID: { unique: () => 'unique()' }, storage: {}, functions: { createExecution: vi.fn() },
}));
vi.mock('../../shared/appwrite.ts', () => mocks);

import { AuthProvider, useAuth } from '../../shared/AuthContext';
import SignupPage from '../../pages/SignupPage';
import PendingVerificationPage from '../../pages/PendingVerificationPage';
import { AuthGuard } from '../../guard/auth';
import { dataCache } from '../../shared/cache';
import { needsVerification, registerStudent } from '../../shared/registration';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
let auth: ReturnType<typeof useAuth>;
function CaptureAuth() { auth = useAuth(); return null; }
let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;
const profile = { $id: 'student-a', type: 'student', verified: true, deactivated: false };
const user = { $id: 'student-a', emailVerification: false };
const input = { name: 'Student A', username: 'student-a', email: 'student-a@parsu.edu.ph', password: 'password123', student_id: '202600001', yearLevel: 1, section: 'A', address: 'Town', consent: true };

beforeEach(() => {
  vi.clearAllMocks();
  for (const mock of [...Object.values(mocks.account), ...Object.values(mocks.databases), ...Object.values(mocks.functions)]) mock.mockReset();
  localStorage.clear(); sessionStorage.clear(); dataCache.clear();
  mocks.account.get.mockResolvedValue(null);
  mocks.account.deleteSession.mockResolvedValue(undefined);
  mocks.account.subscribe.mockResolvedValue(() => {});
  mocks.account.create.mockResolvedValue(user);
  mocks.account.createEmailPasswordSession.mockResolvedValue({ userId: 'student-a' });
  mocks.account.createVerification.mockResolvedValue(undefined);
  mocks.functions.createExecution.mockResolvedValue({ responseBody: JSON.stringify({ success: true }) });
  vi.stubEnv('VITE_AUTH_PROVIDER', 'firebase');
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.stubEnv('VITE_AUTH_PROVIDER', 'appwrite'); });

async function mount(page?: React.ReactNode) {
  await act(async () => root.render(<MemoryRouter><AuthProvider><CaptureAuth />{page}</AuthProvider></MemoryRouter>));
}

describe('Authentication concurrency and recovery', () => {
  it('does not authenticate again when an old profile lookup finishes after logout', async () => {
    const pending = deferred<any>();
    mocks.account.get.mockResolvedValue(user);
    mocks.databases.getDocument.mockReturnValue(pending.promise);
    await mount();
    await act(async () => auth.logout());
    await act(async () => pending.resolve(profile));
    expect(auth.status).toBe('unauthenticated'); expect(auth.user).toBeNull();
  });

  it('signs out after a pending sign-in finishes, preventing the SDK from restoring it', async () => {
    await mount();
    const signIn = deferred<any>();
    mocks.account.createEmailPasswordSession.mockReturnValue(signIn.promise);
    mocks.account.get.mockResolvedValue(user);
    mocks.databases.getDocument.mockResolvedValue(profile);
    const login = auth.login(input.email, input.password).catch((error) => error);
    let logout!: Promise<void>;
    await act(async () => { logout = auth.logout(); });
    expect(mocks.account.deleteSession).not.toHaveBeenCalled();
    await act(async () => { signIn.resolve({ userId: 'student-a' }); await login; await logout; });
    expect(mocks.account.deleteSession).toHaveBeenCalledTimes(1);
    expect(auth.status).toBe('unauthenticated');
  });

  it('a tab with an empty session flag never deletes another tab session', async () => {
    localStorage.setItem('specs_remember', '0');
    mocks.account.get.mockResolvedValue(user); mocks.databases.getDocument.mockResolvedValue(profile);
    await mount();
    expect(mocks.account.deleteSession).not.toHaveBeenCalled();
    expect(auth.status).toBe('authenticated');
  });

  it('rejects a login if Firebase changes users while its profile request is pending', async () => {
    await mount();
    const pending = deferred<any>();
    mocks.account.get.mockResolvedValue(user);
    mocks.databases.getDocument.mockReturnValue(pending.promise);
    const login = auth.login(input.email, input.password).catch((error) => error);
    await act(async () => { await Promise.resolve(); });
    mocks.account.get.mockResolvedValue({ $id: 'student-b' });
    let error: any;
    await act(async () => { pending.resolve(profile); error = await login; });
    expect(error.message).toContain('session changed');
    expect(auth.status).toBe('unauthenticated');
  });

  it('forwards Remember me to the provider and rejects duplicate login submissions', async () => {
    await mount();
    const pending = deferred<any>();
    mocks.account.createEmailPasswordSession.mockReturnValue(pending.promise);
    mocks.account.get.mockResolvedValue(user); mocks.databases.getDocument.mockResolvedValue(profile);
    const first = auth.login(' STUDENT-A@PARSU.EDU.PH ', input.password, true);
    await expect(auth.login(input.email, input.password)).rejects.toThrow('already in progress');
    await act(async () => { pending.resolve({ userId: 'student-a' }); await first; });
    expect(mocks.account.createEmailPasswordSession).toHaveBeenCalledWith(input.email, input.password, true);
  });

  it('directs incomplete Auth users to resume registration without deleting their session', async () => {
    await mount();
    mocks.account.get.mockResolvedValue(user);
    mocks.databases.getDocument.mockRejectedValue({ code: 404, message: 'Document not found' });
    await act(async () => { await expect(auth.login(input.email, input.password)).rejects.toMatchObject({ code: 'REGISTRATION_INCOMPLETE' }); });
    expect(mocks.account.deleteSession).not.toHaveBeenCalled();
  });

  it('uses a fresh profile and refreshes Firebase email verification when requested', async () => {
    mocks.account.get.mockResolvedValue(user); mocks.databases.getDocument.mockResolvedValue(profile);
    await mount();
    mocks.account.get.mockResolvedValue({ ...user, emailVerification: true });
    await act(async () => auth.refreshAuth());
    expect(mocks.account.get).toHaveBeenLastCalledWith(true);
    expect(auth.user.emailVerification).toBe(true);
  });

  it('does not expose a dashboard when membership is approved but email is unverified', async () => {
    mocks.account.get.mockResolvedValue(user); mocks.databases.getDocument.mockResolvedValue(profile);
    await mount(<AuthGuard><div>Protected dashboard</div></AuthGuard>);
    expect(container.textContent).not.toContain('Protected dashboard');
    expect(needsVerification(user, profile)).toBe(true);
    expect(needsVerification({ ...user, emailVerification: true }, profile)).toBe(false);
  });

  it('resends email with a cooldown and reports a sending failure', async () => {
    mocks.account.get.mockResolvedValue(user); mocks.databases.getDocument.mockResolvedValue(profile);
    await mount(<PendingVerificationPage />);
    mocks.account.createVerification.mockRejectedValueOnce({ code: 'auth/too-many-requests' });
    const button = () => [...container.querySelectorAll('button')].find((entry) => /Resend verification/.test(entry.textContent || ''))!;
    await act(async () => fireEvent.click(button()));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Too many requests');
    await act(async () => fireEvent.click(button()));
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Verification email sent');
    expect(mocks.account.createVerification).toHaveBeenCalledTimes(2);
    expect([...container.querySelectorAll('button')].find((entry) => /wait a minute/.test(entry.textContent || ''))?.disabled).toBe(true);
  });
});

describe('Signup commit and email delivery', () => {
  it('calls one protected completion operation and keeps the password out of its payload', async () => {
    expect(await registerStudent(input)).toEqual({ verificationSent: true });
    expect(mocks.databases.createDocument).not.toHaveBeenCalled();
    expect(mocks.databases.deleteDocument).not.toHaveBeenCalled();
    const body = JSON.parse(mocks.functions.createExecution.mock.calls[0][1]);
    expect(body.action).toBe('complete_registration');
    expect(body.payload.password).toBeUndefined(); expect(body.payload.email).toBeUndefined();
    expect(mocks.functions.createExecution.mock.calls[0][2]).toEqual({ expectedUid: user.$id });
  });

  it('allows retry after a failed completion without deleting Auth/profile records', async () => {
    mocks.functions.createExecution.mockRejectedValueOnce(new Error('Connection interrupted'));
    await expect(registerStudent(input)).rejects.toThrow('Connection interrupted');
    expect(mocks.databases.deleteDocument).not.toHaveBeenCalled();
    await expect(registerStudent(input)).resolves.toEqual({ verificationSent: true });
  });

  it('does not claim an email was sent when email delivery fails', async () => {
    await mount(<SignupPage theme="light" toggleTheme={() => {}} />);
    const fields = { 'John Doe': input.name, johndoe: input.username, 'jdoe123@parsu.edu.ph': input.email, '202312345': input.student_id, 'Barangay, Municipality, Province': input.address, 'Min 8 chars': input.password, 'Repeat password': input.password };
    for (const [placeholder, value] of Object.entries(fields)) await act(async () => fireEvent.change(container.querySelector(`input[placeholder="${placeholder}"]`)!, { target: { value } }));
    await act(async () => fireEvent.click(container.querySelector('input[type="checkbox"]')!));
    mocks.account.createVerification.mockRejectedValue(new Error('email rejected'));
    await act(async () => fireEvent.submit(container.querySelector('form')!));
    expect(container.textContent).toContain('Registration Successful');
    expect(container.textContent).toContain('could not be sent');
    expect(container.textContent).not.toContain('A verification link has been sent');
  });
});
