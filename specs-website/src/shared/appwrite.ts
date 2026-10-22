/**
 * Compatibility facade for the existing UI.
 *
 * The filename is retained temporarily so the pages do not all need to change
 * at once. In Firebase mode it delegates auth/database to Firebase and storage
 * and privileged executions to the Supabase Edge Function.
 */
import { Client, Functions, Query, ID } from 'appwrite';
import { dataCache } from './cache.js';
import { globalLoadingTracker } from './pendingTracker.js';
import { createAppwriteProviders } from './providers/appwriteProvider.js';
import { createFirebaseProviders } from './providers/firebaseProvider.js';
import { createSupabaseStorageProvider } from './providers/supabaseStorageProvider.js';
import { FirebaseFunctionProvider } from './providers/firebaseFunctionProvider.js';

const IS_DEV = import.meta.env.DEV;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const DEV_BYPASS = IS_DEV && USE_MOCK_DATA;
const AUTH_PROVIDER = import.meta.env.VITE_AUTH_PROVIDER || 'appwrite';
const DB_PROVIDER = import.meta.env.VITE_DB_PROVIDER || 'appwrite';
const STORAGE_PROVIDER = import.meta.env.VITE_STORAGE_PROVIDER || 'appwrite';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const getMockApi = async () => {
    // @ts-ignore
    const { mockApi } = await import('./mock/mockApiService.js');
    return mockApi;
};

let client: Client | null = null;
let account: any;
let databases: any;
let storage: any;
let functions: any;

const appwriteProviders = AUTH_PROVIDER === 'appwrite' || DB_PROVIDER === 'appwrite' || STORAGE_PROVIDER === 'appwrite'
    ? createAppwriteProviders(
        (import.meta.env.VITE_APPWRITE_ENDPOINT as string) || 'https://cloud.appwrite.io/v1',
        (import.meta.env.VITE_APPWRITE_PROJECT_ID as string) || 'dummy_project'
    )
    : null;
const firebaseProviders = AUTH_PROVIDER === 'firebase' || DB_PROVIDER === 'firebase'
    ? createFirebaseProviders(firebaseConfig)
    : null;

if (DEV_BYPASS) {
    console.log('[DEV] Using mock provider facade');
    account = {
        get: async () => (await getMockApi()).getCurrentUser(),
        createEmailPasswordSession: async (email: string, password: string) => (await getMockApi()).login(email, password),
        deleteSession: async (sessionId = 'current') => {
            void sessionId;
            const result = await (await getMockApi()).logout();
            dataCache.clear();
            return result;
        },
        createRecovery: async (email: string, _url: string) => (await getMockApi()).sendPasswordResetEmail(email),
        updateRecovery: async (userId: string, secret: string, password: string) => (await getMockApi()).confirmPasswordRecovery(userId, secret, password),
        create: async (_userId: string, email: string, password: string, name: string) => (await getMockApi()).register(email, password, name),
        createVerification: async (_url: string) => (await getMockApi()).sendVerificationEmail(),
        updateVerification: async (_userId: string, _secret: string) => Promise.resolve(),
        updatePassword: async (password: string, _oldPassword?: string) => (await getMockApi()).updatePassword(password)
    };
    databases = {
        listDocuments: (...args: any[]) => (getMockApi().then(api => api.listDocuments(...args))),
        getDocument: (...args: any[]) => (getMockApi().then(api => api.getDocument(...args))),
        createDocument: (...args: any[]) => (getMockApi().then(api => api.createDocument(...args.slice(0, 4)))),
        updateDocument: (...args: any[]) => (getMockApi().then(api => api.updateDocument(...args))),
        deleteDocument: (...args: any[]) => (getMockApi().then(api => api.deleteDocument(...args)))
    };
    storage = {
        listFiles: (...args: any[]) => getMockApi().then(api => api.listFiles(...args)),
        getFile: (_bucketId: string, fileId: string) => getMockApi().then(api => api.getDocument('files', 'files', fileId)),
        createFile: (...args: any[]) => getMockApi().then(api => api.createFile(...args.slice(0, 3))),
        deleteFile: (...args: any[]) => getMockApi().then(api => api.deleteFile(...args)),
        getFileView: (bucketId: string, fileId: string) => `https://mock-storage.local/buckets/${bucketId}/files/${fileId}/view`,
        getFilePreview: (bucketId: string, fileId: string) => `https://mock-storage.local/buckets/${bucketId}/files/${fileId}/preview`,
        getFileDownload: (bucketId: string, fileId: string) => `https://mock-storage.local/buckets/${bucketId}/files/${fileId}/download`
    };
    functions = {
        createExecution: async (_functionId: string, body: any) => {
            const parsed = typeof body === 'string' ? JSON.parse(body) : body;
            const mock = await getMockApi();
            if (parsed.action === 'promote_officer') await mock.updateAccountType(parsed.payload.userId, 'officer');
            if (parsed.action === 'demote_officer') await mock.updateAccountType(parsed.payload.userId, 'student');
            return { $id: `execution-${Date.now()}`, status: 'completed', responseBody: JSON.stringify({ success: true }) };
        }
    };
} else {
    if (appwriteProviders?.client) client = appwriteProviders.client;

    account = AUTH_PROVIDER === 'firebase' && firebaseProviders
        ? {
            get: () => firebaseProviders.auth.getCurrentUser(),
            createEmailPasswordSession: (email: string, password: string) => firebaseProviders.auth.login(email, password),
            deleteSession: () => firebaseProviders.auth.logout(),
            createRecovery: (email: string, url: string) => firebaseProviders.auth.sendPasswordRecovery(email, url),
            updateRecovery: (_userId: string, secret: string, password: string) => firebaseProviders.auth.confirmPasswordRecovery(secret, password),
            create: (_userId: string, email: string, password: string, name: string) => firebaseProviders.auth.register(email, password, name),
            createVerification: (url: string) => firebaseProviders.auth.sendVerification(url),
            updateVerification: (_userId: string, secret: string) => firebaseProviders.auth.confirmVerification(secret),
            updatePassword: async (password: string) => {
                const user = await firebaseProviders.auth.getCurrentUser();
                if (!user) throw new Error('No authenticated user');
                const { updatePassword } = await import('firebase/auth');
                const { getAuth } = await import('firebase/auth');
                const authInstance = getAuth();
                if (!authInstance.currentUser) throw new Error('No authenticated user');
                return updatePassword(authInstance.currentUser, password);
            }
        }
        : appwriteProviders?.auth;

    databases = DB_PROVIDER === 'firebase' && firebaseProviders
        ? {
            listDocuments: (dbId: string, collectionId: string, queries?: any[]) => firebaseProviders.database.listDocuments(dbId, collectionId, queries),
            getDocument: (dbId: string, collectionId: string, docId: string) => firebaseProviders.database.getDocument(dbId, collectionId, docId),
            createDocument: (dbId: string, collectionId: string, docId: string, data: any) => firebaseProviders.database.createDocument(dbId, collectionId, docId, data),
            updateDocument: (dbId: string, collectionId: string, docId: string, data: any) => firebaseProviders.database.updateDocument(dbId, collectionId, docId, data),
            deleteDocument: (dbId: string, collectionId: string, docId: string) => firebaseProviders.database.deleteDocument(dbId, collectionId, docId)
        }
        : appwriteProviders?.database;

    storage = STORAGE_PROVIDER === 'supabase-edge'
        ? createSupabaseStorageProvider({
            url: import.meta.env.VITE_SUPABASE_URL as string,
            anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
            functionUrl: import.meta.env.VITE_SUPABASE_FUNCTION_URL as string,
            firebaseConfig
        })
        : appwriteProviders?.storage;

    functions = AUTH_PROVIDER === 'firebase'
        ? new FirebaseFunctionProvider(
            (import.meta.env.VITE_SUPABASE_FUNCTION_URL as string) || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/specs-api`,
            firebaseConfig
        )
        : appwriteProviders ? new Functions(appwriteProviders.client) : null;
}

const trackedDatabases = new Proxy(databases, {
    get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === 'function' && ['createDocument', 'updateDocument', 'deleteDocument'].includes(prop as string)) {
            return async (...args: any[]) => {
                globalLoadingTracker.startRequest();
                try { return await value.apply(target, args); } finally { globalLoadingTracker.endRequest(); }
            };
        }
        return value;
    }
});

const trackedFunctions = new Proxy(functions, {
    get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === 'function' && prop === 'createExecution') {
            return async (...args: any[]) => {
                globalLoadingTracker.startRequest();
                try { return await value.apply(target, args); } finally { globalLoadingTracker.endRequest(); }
            };
        }
        return value;
    }
});

export { client, account, trackedDatabases as databases, storage, Query, ID, trackedFunctions as functions, firebaseConfig };
