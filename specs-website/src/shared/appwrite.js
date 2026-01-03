import { Client, Account, Databases, Storage, Query, ID, Functions } from "appwrite";

const IS_DEV = import.meta.env.DEV;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const DEV_BYPASS = IS_DEV && USE_MOCK_DATA;

const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || 'dummy_project';

let client, account, databases, storage, functions;

if (DEV_BYPASS) {
    console.log('[DEV] Skipping Appwrite SDK initialization (mock mode)');
    client = null;
    account = {
        get: async () => { throw new Error('Use mock data'); },
        createEmailPasswordSession: async () => { throw new Error('Use mock data'); },
        deleteSession: async () => { throw new Error('Use mock data'); },
        createRecovery: async () => { throw new Error('Use mock data'); },
        updateRecovery: async () => { throw new Error('Use mock data'); }
    };
    databases = {
        listDocuments: async () => { throw new Error('Use mock data'); },
        getDocument: async () => { throw new Error('Use mock data'); },
        createDocument: async () => { throw new Error('Use mock data'); },
        updateDocument: async () => { throw new Error('Use mock data'); },
        deleteDocument: async () => { throw new Error('Use mock data'); }
    };
    storage = {
        listFiles: async () => { throw new Error('Use mock data'); },
        getFile: async () => { throw new Error('Use mock data'); },
        createFile: async () => { throw new Error('Use mock data'); },
        deleteFile: async () => { throw new Error('Use mock data'); },
        getFileView: () => '#',
        getFileDownload: () => '#'
    };
    functions = {
        createExecution: async () => { throw new Error('Use mock data'); }
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