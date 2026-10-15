const USE_FIREBASE = import.meta.env.VITE_DB_PROVIDER === 'firebase';
const migrateId = (value: string | undefined, fallback: string, aliases: Record<string, string> = {}) => {
  const resolved = value || fallback;
  return (USE_FIREBASE ? aliases[resolved] || resolved : resolved) as string;
};

export const DATABASE_ID = (USE_FIREBASE ? '(default)' : (import.meta.env.VITE_DATABASE_ID || '(default)')) as string;

export const COLLECTION_ID_ACCOUNTS = migrateId(import.meta.env.VITE_COLLECTION_ID_ACCOUNTS, 'accounts', { '6858feff002fb157e032': 'accounts' });
export const COLLECTION_ID_STUDENTS = migrateId(import.meta.env.VITE_COLLECTION_ID_STUDENTS, 'students', { '6885e221000f3e6a5033': 'students' });
export const COLLECTION_ID_OFFICERS = migrateId(import.meta.env.VITE_COLLECTION_ID_OFFICERS, 'officers');
export const COLLECTION_ID_ADMINS = migrateId(import.meta.env.VITE_COLLECTION_ID_ADMINS, 'admins');

export const COLLECTION_ID_EVENTS = migrateId(import.meta.env.VITE_COLLECTION_ID_EVENTS, 'events', { '6859026800232b07755d': 'events' });
export const COLLECTION_ID_ATTENDANCE = migrateId(import.meta.env.VITE_COLLECTION_ID_ATTENDANCE, 'attendance');

export const COLLECTION_ID_PAYMENTS = migrateId(import.meta.env.VITE_COLLECTION_ID_PAYMENTS, 'payments', { '6885e333002bfa41803b': 'payments' });
export const COLLECTION_ID_EXPENSES = migrateId(import.meta.env.VITE_COLLECTION_ID_EXPENSES, 'expenses', { '685a5c8700349613807e': 'expenses' });
export const COLLECTION_ID_REVENUE = migrateId(import.meta.env.VITE_COLLECTION_ID_REVENUE, 'revenue', { '685a5c7b000cb98504a2': 'revenue' });
export const COLLECTION_ID_STARTING_BALANCES = migrateId(import.meta.env.VITE_COLLECTION_ID_STARTING_BALANCES, 'starting_balances');

export const COLLECTION_ID_STORIES = migrateId(import.meta.env.VITE_COLLECTION_ID_STORIES, 'stories');
export const COLLECTION_ID_FILES = migrateId(import.meta.env.VITE_COLLECTION_ID_FILES, 'files', { '6859013f00315545756c': 'files' });
export const COLLECTION_ID_TASKS = (import.meta.env.VITE_COLLECTION_ID_TASKS || 'tasks') as string;
export const COLLECTION_ID_SIGNATORIES = (import.meta.env.VITE_COLLECTION_ID_SIGNATORIES || 'signatories') as string;
export const COLLECTION_ID_EVENT_NON_ORG = (import.meta.env.VITE_COLLECTION_ID_EVENT_NON_ORG || 'event_non_org') as string;

export const COLLECTION_ID_NOTIFICATIONS_ALL = 'notifications_all';
export const COLLECTION_ID_NOTIFICATIONS_STUDENTS = 'notifications_students';
export const COLLECTION_ID_NOTIFICATIONS_OFFICERS = 'notifications_officers';
export const COLLECTION_ID_NOTIFICATIONS_DIRECT = 'notifications_direct';
export const COLLECTION_ID_NOTIFICATION_READS = 'notification_reads';

export const BUCKET_ID_RESUMES = migrateId(import.meta.env.VITE_BUCKET_ID_RESUMES, 'resumes');
export const BUCKET_ID_SCHEDULES = migrateId(import.meta.env.VITE_BUCKET_ID_SCHEDULES, 'specs-schedule', { '68579d3c0030b9e663d8': 'specs-schedule' });
export const BUCKET_ID_EVENT_IMAGES = migrateId(import.meta.env.VITE_BUCKET_ID_EVENT_IMAGES, 'specs-events', { '6858d7a6001372e6c719': 'specs-events' });
export const BUCKET_ID_PUBLIC_FILES = migrateId(import.meta.env.VITE_BUCKET_PUBLIC_FILES, 'specs-public-files', { '68d9352f0018e745fd3a': 'specs-public-files' });
export const BUCKET_ID_UPLOADS = migrateId(import.meta.env.VITE_BUCKET_ID_UPLOADS, 'specs-files', { '68588dde001a7619bc44': 'specs-files' });
export const BUCKET_ID_PICTURES = migrateId(import.meta.env.VITE_BUCKET_ID_PICTURES, 'specs-picture', { '688643030009e8bbf324': 'specs-picture' });
export const BUCKET_ID_HIGHLIGHT_IMAGES = migrateId(import.meta.env.VITE_BUCKET_ID_HIGHLIGHT_IMAGES, 'specs-highlights', { '68fd9e87001e8e745fd3a': 'specs-highlights', '68fd9e87001fad8811cc': 'specs-highlights' });

export const FUNCTION_ID = import.meta.env.VITE_FUNCTION_ID as string;
export const EMAIL_FUNCTION_ID = import.meta.env.VITE_EMAIL_FUNCTION_ID as string;

export const TEAM_ID_STUDENTS = import.meta.env.VITE_TEAM_ID_STUDENTS as string;
export const TEAM_ID_OFFICERS = import.meta.env.VITE_TEAM_ID_OFFICERS as string;
