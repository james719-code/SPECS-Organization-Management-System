import { Client, Account, Databases, Storage, Query, ID, Functions } from "appwrite";
import { mockApi } from './mock/mockApiService.js';

const IS_DEV = import.meta.env.DEV;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const DEV_BYPASS = IS_DEV && USE_MOCK_DATA;

const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || 'dummy_project';

let client, account, databases, storage, functions;

if (DEV_BYPASS) {
    console.log('[DEV] Using mock Appwrite SDK');
    client = null;

    // Mock account object that delegates to mockApi
    account = {
        get: () => mockApi.getCurrentUser(),
        createEmailPasswordSession: (email, password) => mockApi.login(email, password),
        deleteSession: () => mockApi.logout(),
        createRecovery: (email, url) => mockApi.sendPasswordResetEmail(email),
        updateRecovery: (userId, secret, password) => Promise.resolve({ success: true }),
        create: (userId, email, password, name) => mockApi.register(email, password, name),
        createVerification: (url) => mockApi.sendVerificationEmail()
    };

    // Mock databases object that delegates to mockApi
    databases = {
        listDocuments: (dbId, collectionId, queries) => mockApi.listDocuments(dbId, collectionId, queries),
        getDocument: (dbId, collectionId, docId) => mockApi.getDocument(dbId, collectionId, docId),
        createDocument: (dbId, collectionId, docId, data, permissions) => mockApi.createDocument(dbId, collectionId, docId, data),
        updateDocument: (dbId, collectionId, docId, data) => mockApi.updateDocument(dbId, collectionId, docId, data),
        deleteDocument: (dbId, collectionId, docId) => mockApi.deleteDocument(dbId, collectionId, docId)
    };

    // Mock storage object that delegates to mockApi
    storage = {
        listFiles: (bucketId, queries) => mockApi.listFiles(bucketId, queries),
        getFile: (bucketId, fileId) => mockApi.getDocument('files', 'files', fileId),
        createFile: (bucketId, fileId, file, permissions) => mockApi.createFile(bucketId, fileId, file),
        deleteFile: (bucketId, fileId) => mockApi.deleteFile(bucketId, fileId),
        getFileView: (bucketId, fileId) => mockApi.getFileView(bucketId, fileId),
        getFileDownload: (bucketId, fileId) => mockApi.getFileDownload(bucketId, fileId)
    };

    // Mock functions object
    functions = {
        createExecution: (functionId, body, async) => Promise.resolve({
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
