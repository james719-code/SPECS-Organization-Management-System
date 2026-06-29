import { Client, Account, Databases, Storage, Query, ID, Functions } from "appwrite";
// @ts-ignore
import { mockApi } from './mock/mockApiService.js';

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

if (DEV_BYPASS) {
    console.log('[DEV] Using mock Appwrite SDK');
    client = null;

    account = {
        get: () => mockApi.getCurrentUser(),
        createEmailPasswordSession: (email: string, password: string) => mockApi.login(email, password),
        deleteSession: () => mockApi.logout(),
        createRecovery: (email: string, _url: string) => mockApi.sendPasswordResetEmail(email),
        updateRecovery: (_userId: string, _secret: string, _password: string) => Promise.resolve({ success: true }),
        create: (_userId: string, email: string, password: string, name: string) => mockApi.register(email, password, name),
        createVerification: (_url: string) => mockApi.sendVerificationEmail()
    };

    databases = {
        listDocuments: (dbId: string, collectionId: string, queries?: any[]) => mockApi.listDocuments(dbId, collectionId, queries),
        getDocument: (dbId: string, collectionId: string, docId: string) => mockApi.getDocument(dbId, collectionId, docId),
        createDocument: (dbId: string, collectionId: string, docId: string, data: any, _permissions?: any[]) => mockApi.createDocument(dbId, collectionId, docId, data),
        updateDocument: (dbId: string, collectionId: string, docId: string, data: any) => mockApi.updateDocument(dbId, collectionId, docId, data),
        deleteDocument: (dbId: string, collectionId: string, docId: string) => mockApi.deleteDocument(dbId, collectionId, docId)
    };

    storage = {
        listFiles: (bucketId: string, queries?: any[]) => mockApi.listFiles(bucketId, queries),
        getFile: (_bucketId: string, fileId: string) => mockApi.getDocument('files', 'files', fileId),
        createFile: (bucketId: string, fileId: string, file: any, _permissions?: any[]) => mockApi.createFile(bucketId, fileId, file),
        deleteFile: (bucketId: string, fileId: string) => mockApi.deleteFile(bucketId, fileId),
        getFileView: (bucketId: string, fileId: string) => mockApi.getFileView(bucketId, fileId),
        getFileDownload: (bucketId: string, fileId: string) => mockApi.getFileDownload(bucketId, fileId)
    };

    functions = {
        createExecution: (_functionId: string, _body: any, _async?: boolean) => Promise.resolve({
            $id: `execution-${Date.now()}`,
            status: 'completed',
            responseBody: JSON.stringify({ success: true })
        })
    };
} else {
    client = new Client()
        .setEndpoint(ENDPOINT)
        .setProject(PROJECT_ID);

    account = new Account(client);
    databases = new Databases(client);
    storage = new Storage(client);
    functions = new Functions(client);
}

export { client, account, databases, storage, Query, ID, functions };
