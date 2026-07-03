import { Client, Account, Databases, Storage, Query, ID, Functions } from "appwrite";
import { dataCache } from './cache.js';

const IS_DEV = import.meta.env.DEV;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const DEV_BYPASS = IS_DEV && USE_MOCK_DATA;

const ENDPOINT = (import.meta.env.VITE_APPWRITE_ENDPOINT as string) || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = (import.meta.env.VITE_APPWRITE_PROJECT_ID as string) || 'dummy_project';

let client: Client | null = null;
let account: any;
let databases: any;
let storage: any;
let functions: any;

const getMockApi = async () => {
    // @ts-ignore
    const { mockApi } = await import('./mock/mockApiService.js');
    return mockApi;
};

if (DEV_BYPASS) {
    console.log('[DEV] Using mock Appwrite SDK');
    client = null;

    account = {
        get: async () => (await getMockApi()).getCurrentUser(),
        createEmailPasswordSession: async (email: string, password: string) => (await getMockApi()).login(email, password),
        deleteSession: async (sessionId = 'current') => {
            const mock = await getMockApi();
            const res = await mock.logout(sessionId);
            dataCache.clear();
            return res;
        },
        createRecovery: async (email: string, _url: string) => (await getMockApi()).sendPasswordResetEmail(email),
        updateRecovery: async (userId: string, secret: string, password: string) => (await getMockApi()).confirmPasswordRecovery(userId, secret, password),
        create: async (_userId: string, email: string, password: string, name: string) => (await getMockApi()).register(email, password, name),
        createVerification: async (_url: string) => (await getMockApi()).sendVerificationEmail()
    };

    databases = {
        listDocuments: async (dbId: string, collectionId: string, queries?: any[]) => (await getMockApi()).listDocuments(dbId, collectionId, queries),
        getDocument: async (dbId: string, collectionId: string, docId: string) => (await getMockApi()).getDocument(dbId, collectionId, docId),
        createDocument: async (dbId: string, collectionId: string, docId: string, data: any, _permissions?: any[]) => (await getMockApi()).createDocument(dbId, collectionId, docId, data),
        updateDocument: async (dbId: string, collectionId: string, docId: string, data: any) => (await getMockApi()).updateDocument(dbId, collectionId, docId, data),
        deleteDocument: async (dbId: string, collectionId: string, docId: string) => (await getMockApi()).deleteDocument(dbId, collectionId, docId)
    };

    storage = {
        listFiles: async (bucketId: string, queries?: any[]) => (await getMockApi()).listFiles(bucketId, queries),
        getFile: async (_bucketId: string, fileId: string) => (await getMockApi()).getDocument('files', 'files', fileId),
        createFile: async (bucketId: string, fileId: string, file: any, _permissions?: any[]) => (await getMockApi()).createFile(bucketId, fileId, file),
        deleteFile: async (bucketId: string, fileId: string) => (await getMockApi()).deleteFile(bucketId, fileId),
        getFileView: (bucketId: string, fileId: string) => `https://mock-storage.local/buckets/${bucketId}/files/${fileId}/view`,
        getFileDownload: (bucketId: string, fileId: string) => `https://mock-storage.local/buckets/${bucketId}/files/${fileId}/download`
    };

    functions = {
        createExecution: async (_functionId: string, body: any, _async?: boolean) => {
            try {
                const parsed = typeof body === 'string' ? JSON.parse(body) : body;
                const { action, payload } = parsed;
                const mock = await getMockApi();
                if (action === 'promote_officer') {
                    await mock.updateAccountType(payload.userId, 'officer');
                    return {
                        $id: `execution-${Date.now()}`,
                        status: 'completed',
                        responseBody: JSON.stringify({ success: true })
                    };
                } else if (action === 'demote_officer') {
                    await mock.updateAccountType(payload.userId, 'student');
                    return {
                        $id: `execution-${Date.now()}`,
                        status: 'completed',
                        responseBody: JSON.stringify({ success: true })
                    };
                } else if (action === 'send_email') {
                    console.log('%c[MOCK EMAIL SENT]', 'color: #0d6b66; font-weight: bold; font-size: 13px;', {
                        to: payload.to,
                        subject: payload.subject,
                        html: payload.html,
                        bodyPreview: payload.body ? (payload.body.length > 300 ? payload.body.substring(0, 300) + '...' : payload.body) : ''
                    });
                    return {
                        $id: `execution-${Date.now()}`,
                        status: 'completed',
                        responseBody: JSON.stringify({ success: true, message: 'Mock email logged successfully' })
                    };
                }
            } catch (e) {
                console.error('[Mock Functions] Failed to simulate execution:', e);
            }
            return {
                $id: `execution-${Date.now()}`,
                status: 'completed',
                responseBody: JSON.stringify({ success: true })
            };
        }
    };
} else {
    client = new Client()
        .setEndpoint(ENDPOINT)
        .setProject(PROJECT_ID);

    const rawAccount = new Account(client);
    account = new Proxy(rawAccount, {
        get(target, prop, receiver) {
            if (prop === 'deleteSession') {
                return async (sessionId = 'current') => {
                    const res = await target.deleteSession(sessionId);
                    dataCache.clear();
                    return res;
                };
            }
            return Reflect.get(target, prop, receiver);
        }
    });
    databases = new Databases(client);
    storage = new Storage(client);
    functions = new Functions(client);
}

import { globalLoadingTracker } from './pendingTracker.js';

const trackedDatabases = new Proxy(databases, {
    get(target, prop, receiver) {
        const val = Reflect.get(target, prop, receiver);
        if (typeof val === 'function' && ['createDocument', 'updateDocument', 'deleteDocument'].includes(prop as string)) {
            return async (...args: any[]) => {
                globalLoadingTracker.startRequest();
                try {
                    return await val.apply(target, args);
                } finally {
                    globalLoadingTracker.endRequest();
                }
            };
        }
        return val;
    }
});

const trackedFunctions = new Proxy(functions, {
    get(target, prop, receiver) {
        const val = Reflect.get(target, prop, receiver);
        if (typeof val === 'function' && prop === 'createExecution') {
            return async (...args: any[]) => {
                globalLoadingTracker.startRequest();
                try {
                    return await val.apply(target, args);
                } finally {
                    globalLoadingTracker.endRequest();
                }
            };
        }
        return val;
    }
});

export { client, account, trackedDatabases as databases, storage, Query, ID, trackedFunctions as functions };

