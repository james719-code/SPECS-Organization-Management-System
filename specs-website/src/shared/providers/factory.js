/**
 * Provider Factory
 * Creates and manages provider instances based on configuration
 */

import { createAppwriteProviders } from './appwriteProvider.js';

// Check if using mock data (dev only)
const USE_MOCK_DATA = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Provider configuration from environment
const AUTH_PROVIDER = import.meta.env.VITE_AUTH_PROVIDER || 'appwrite';
const DB_PROVIDER = import.meta.env.VITE_DB_PROVIDER || 'appwrite';
const STORAGE_PROVIDER = import.meta.env.VITE_STORAGE_PROVIDER || 'appwrite';

// Cached provider instances
let _authProvider = null;
let _databaseProvider = null;
let _storageProvider = null;
let _initialized = false;

/**
 * Initialize providers based on configuration
 */
async function initializeProviders() {
    if (_initialized) return;

    // If using mock data in dev, use mock providers
    if (USE_MOCK_DATA) {
        const { mockApi } = await import('../mock/mockApiService.js');

        _authProvider = {
            getCurrentUser: () => mockApi.getCurrentUser(),
            login: (e, p) => mockApi.login(e, p),
            logout: () => mockApi.logout(),
            register: (e, p, n) => mockApi.register(e, p, n),
            sendPasswordRecovery: () => mockApi.sendPasswordResetEmail(),
            sendVerification: () => mockApi.sendVerificationEmail()
        };

        _databaseProvider = {
            listDocuments: (...args) => mockApi.listDocuments(...args),
            getDocument: (...args) => mockApi.getDocument(...args),
            createDocument: (...args) => mockApi.createDocument(...args),
            updateDocument: (...args) => mockApi.updateDocument(...args),
            deleteDocument: (...args) => mockApi.deleteDocument(...args)
        };

        _storageProvider = {
            listFiles: (...args) => mockApi.listFiles(...args),
            getFileView: (...args) => mockApi.getFileView(...args),
            getFilePreview: (...args) => mockApi.getFileView(...args),
            getFileDownload: (...args) => mockApi.getFileDownload(...args),
            createFile: (...args) => mockApi.createFile(...args),
            deleteFile: (...args) => mockApi.deleteFile(...args)
        };

        _initialized = true;
        console.log('[Providers] Using mock providers (dev mode)');
        return;
    }

    // Initialize real providers

    // Auth Provider
    if (AUTH_PROVIDER === 'appwrite') {
        const providers = createAppwriteProviders(
            import.meta.env.VITE_APPWRITE_ENDPOINT,
            import.meta.env.VITE_APPWRITE_PROJECT_ID
        );
        _authProvider = providers.auth;
    } else if (AUTH_PROVIDER === 'firebase') {
        const { createFirebaseProviders } = await import('./firebaseProvider.js');
        const providers = createFirebaseProviders({
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
        });
        _authProvider = providers.auth;
    }

    // Database Provider
    if (DB_PROVIDER === 'appwrite') {
        const providers = createAppwriteProviders(
            import.meta.env.VITE_APPWRITE_ENDPOINT,
            import.meta.env.VITE_APPWRITE_PROJECT_ID
        );
        _databaseProvider = providers.database;
    } else if (DB_PROVIDER === 'firebase') {
        const { createFirebaseProviders } = await import('./firebaseProvider.js');
        const providers = createFirebaseProviders({
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
        });
        _databaseProvider = providers.database;
    }

    // Storage Provider
    if (STORAGE_PROVIDER === 'appwrite') {
        const providers = createAppwriteProviders(
            import.meta.env.VITE_APPWRITE_ENDPOINT,
            import.meta.env.VITE_APPWRITE_PROJECT_ID
        );
        _storageProvider = providers.storage;
    } else if (STORAGE_PROVIDER === 'cloudflare-r2') {
        const { createCloudflareR2Provider } = await import('./cloudflareR2Provider.js');
        const providers = createCloudflareR2Provider({
            endpoint: import.meta.env.VITE_R2_ENDPOINT,
            bucketName: import.meta.env.VITE_R2_BUCKET_NAME,
            publicUrl: import.meta.env.VITE_R2_PUBLIC_URL
        });
        _storageProvider = providers.storage;
    }

    _initialized = true;
    console.log(`[Providers] Initialized - Auth: ${AUTH_PROVIDER}, DB: ${DB_PROVIDER}, Storage: ${STORAGE_PROVIDER}`);
}

/**
 * Get auth provider instance
 * @returns {Promise<IAuthProvider>}
 */
export async function getAuthProvider() {
    if (!_initialized) await initializeProviders();
    return _authProvider;
}

/**
 * Get database provider instance
 * @returns {Promise<IDatabaseProvider>}
 */
export async function getDatabaseProvider() {
    if (!_initialized) await initializeProviders();
    return _databaseProvider;
}

/**
 * Get storage provider instance
 * @returns {Promise<IStorageProvider>}
 */
export async function getStorageProvider() {
    if (!_initialized) await initializeProviders();
    return _storageProvider;
}

/**
 * Get all providers
 * @returns {Promise<{auth: IAuthProvider, database: IDatabaseProvider, storage: IStorageProvider}>}
 */
export async function getProviders() {
    if (!_initialized) await initializeProviders();
    return {
        auth: _authProvider,
        database: _databaseProvider,
        storage: _storageProvider
    };
}

/**
 * Check if using mock mode
 * @returns {boolean}
 */
export function isMockMode() {
    return USE_MOCK_DATA;
}

/**
 * Get current provider configuration
 * @returns {Object}
 */
export function getProviderConfig() {
    return {
        auth: USE_MOCK_DATA ? 'mock' : AUTH_PROVIDER,
        database: USE_MOCK_DATA ? 'mock' : DB_PROVIDER,
        storage: USE_MOCK_DATA ? 'mock' : STORAGE_PROVIDER,
        mockMode: USE_MOCK_DATA
    };
}
