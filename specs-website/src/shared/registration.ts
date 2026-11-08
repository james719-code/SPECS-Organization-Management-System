import { account, databases, functions, ID } from './appwrite';
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS, COLLECTION_ID_STUDENTS, FUNCTION_ID } from './constants';

export interface RegistrationInput {
  name: string;
  username: string;
  email: string;
  password: string;
  student_id: string;
  yearLevel: number;
  section: string;
  address: string;
  consent: boolean;
}

export interface RegistrationResult { verificationSent: boolean }

export function authErrorMessage(error: any): string {
  if (error?.code === 'auth/too-many-requests') return 'Too many requests from this network. Please wait before trying again, or contact the registration organizer.';
  if (error?.code === 'auth/network-request-failed') return 'The connection was interrupted. Retry with the same email and password to finish registration.';
  if (['auth/invalid-credential', 'auth/wrong-password'].includes(error?.code)) return 'Invalid email or password. If you started registration earlier, use the same password or reset it.';
  return error?.message || 'Could not complete your request. Please try again.';
}

export async function registerStudent(input: RegistrationInput): Promise<RegistrationResult> {
  const email = input.email.trim().toLowerCase();
  const number = Number(input.student_id.trim());
  if (!/^[^@\s]+@parsu\.edu\.ph$/.test(email)) throw new Error('Registration requires your official PSU email (@parsu.edu.ph)');
  if (!/^\d{1,15}$/.test(input.student_id.trim()) || !Number.isSafeInteger(number) || number <= 0) throw new Error('Student ID must be a positive whole number of at most 15 digits.');
  if (!input.name.trim() || !input.username.trim() || !input.address.trim()) throw new Error('Name, username, and address are required.');
  if (!input.consent) throw new Error('Please consent to the Data Privacy terms.');
  if (input.password.length < 8) throw new Error('Password must be at least 8 characters long.');
  let registrationUid: string | undefined;
  try {
    const user = await account.create(ID.unique(), email, input.password, input.name.trim());
    registrationUid = user.$id;
    if (import.meta.env.VITE_AUTH_PROVIDER === 'firebase') {
      // Password stays with Firebase. The verified token determines ownership.
      const { password: _password, email: _email, ...payload } = input;
      const execution = await functions.createExecution(FUNCTION_ID || '', JSON.stringify({ action: 'complete_registration', payload }), { expectedUid: user.$id });
      const result = JSON.parse(execution.responseBody);
      if (!result.success) throw new Error(result.error || 'Registration could not be completed. Retry with the same email and password.');
    } else {
      await account.createEmailPasswordSession(email, input.password);
      await databases.createDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, user.$id, {
        name: input.name.trim(), email, student_id: number, yearLevel: input.yearLevel,
        section: input.section, address: input.address.trim(), is_volunteer: false,
      });
      await databases.createDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, user.$id, {
        username: input.username.trim(), type: 'student', students: user.$id, verified: false, deactivated: false,
      });
    }
    let verificationSent = false;
    try {
      await account.createVerification(`${window.location.origin}${import.meta.env.VITE_AUTH_PROVIDER === 'firebase' ? '/login?verified=1' : '/verify'}`, registrationUid);
      verificationSent = true;
    } catch { /* Report delivery failure without undoing the committed account. */ }
    return { verificationSent };
  } finally {
    // Never delete Auth/committed documents after a connection/delivery failure.
    // An authenticated retry resumes the same UID.
    try {
      if (registrationUid && (await account.get())?.$id === registrationUid) await account.deleteSession('current');
    } catch { /* a future login can recover */ }
  }
}

export function needsVerification(user: any, profile: { type: string; verified: boolean }): boolean {
  return profile.type !== 'admin' && (!profile.verified || user?.emailVerification !== true);
}
