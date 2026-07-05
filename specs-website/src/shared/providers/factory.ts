/**
 * Provider Factory
 * Creates and manages provider instances based on configuration
 */

import { createAppwriteProviders } from './appwriteProvider.js';
import { IAuthProvider, IDatabaseProvider, IStorageProvider } from './interface.js';

// Check if using mock data (dev only)
const USE_MOCK_DATA = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Provider configuration from environment
const AUTH_PROVIDER = import.meta.env.VITE_AUTH_PROVIDER || 'appwrite';
const DB_PROVIDER = import.meta.env.VITE_DB_PROVIDER || 'appwrite';
const STORAGE_PROVIDER = import.meta.env.VITE_STORAGE_PROVIDER || 'appwrite';

// Cached provider instances
let _authProvider: any = null;
let _databaseProvider: any = null;
let _storageProvider: any = null;
let _initialized = false;

/**
 * Initialize providers based on configuration
 */
async function initializeProviders(): Promise<void> {
    if (_initialized) return;

    // If using mock data in dev, use mock providers
    if (USE_MOCK_DATA) {
        const { mockApi } = await import('../mock/mockApiService.js');

        _authProvider = {
            getCurrentUser: () => mockApi.getCurrentUser(),
            login: (e: string, p: string) => mockApi.login(e, p),
            logout: () => mockApi.logout(),
            register: (e: string, p: string, n: string) => mockApi.register(e, p, n),
            sendPasswordRecovery: (email: string, redirectUrl: string) => mockApi.sendPasswordResetEmail(email, redirectUrl),
            confirmPasswordRecovery: (userId: string, secret: string, password: string) => mockApi.confirmPasswordRecovery ? mockApi.confirmPasswordRecovery(userId, secret, password) : Promise.resolve(true),
            sendVerification: () => mockApi.sendVerificationEmail()
        };

        _databaseProvider = {
            listDocuments: (...args: any[]) => (mockApi as any).listDocuments(...args),
            getDocument: (...args: any[]) => (mockApi as any).getDocument(...args),
            createDocument: (...args: any[]) => (mockApi as any).createDocument(...args),
            updateDocument: (...args: any[]) => (mockApi as any).updateDocument(...args),
            deleteDocument: (...args: any[]) => (mockApi as any).deleteDocument(...args)
        };

        _storageProvider = {
            listFiles: (...args: any[]) => (mockApi as any).listFiles(...args),
            getFileView: (...args: any[]) => (mockApi as any).getFileView(...args),
            getFilePreview: (...args: any[]) => (mockApi as any).getFileView(...args),
            getFileDownload: (...args: any[]) => (mockApi as any).getFileDownload(...args),
            createFile: (...args: any[]) => (mockApi as any).createFile(...args),
            deleteFile: (...args: any[]) => (mockApi as any).deleteFile(...args)
        };

        _initialized = true;
        console.log('[Providers] Using mock providers (dev mode)');
        return;
    }

    // Initialize real providers

    // Auth Provider
    if (AUTH_PROVIDER === 'appwrite') {
        const providers = createAppwriteProviders(
            import.meta.env.VITE_APPWRITE_ENDPOINT as string,
            import.meta.env.VITE_APPWRITE_PROJECT_ID as string
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
            import.meta.env.VITE_APPWRITE_ENDPOINT as string,
            import.meta.env.VITE_APPWRITE_PROJECT_ID as string
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
            import.meta.env.VITE_APPWRITE_ENDPOINT as string,
            import.meta.env.VITE_APPWRITE_PROJECT_ID as string
        );
        _storageProvider = providers.storage;
    } else if (STORAGE_PROVIDER === 'cloudflare-r2') {
        const { createCloudflareR2Provider } = await import('./cloudflareR2Provider.js');
        const providers = createCloudflareR2Provider({
            endpoint: import.meta.env.VITE_R2_ENDPOINT as string,
            bucketName: import.meta.env.VITE_R2_BUCKET_NAME as string,
            publicUrl: import.meta.env.VITE_R2_PUBLIC_URL as string
        });
        _storageProvider = providers.storage;
    }

    _initialized = true;
    console.log(`[Providers] Initialized - Auth: ${AUTH_PROVIDER}, DB: ${DB_PROVIDER}, Storage: ${STORAGE_PROVIDER}`);
}

/**
 * Get auth provider instance
 */
export async function getAuthProvider(): Promise<IAuthProvider> {
    if (!_initialized) await initializeProviders();
    return _authProvider;
}

/**
 * Get database provider instance
 */
export async function getDatabaseProvider(): Promise<IDatabaseProvider> {
    if (!_initialized) await initializeProviders();
    return _databaseProvider;
}

/**
 * Get storage provider instance
 */
export async function getStorageProvider(): Promise<IStorageProvider> {
    if (!_initialized) await initializeProviders();
    return _storageProvider;
}

/**
 * Get all providers
 */
export async function getProviders(): Promise<{ auth: IAuthProvider; database: IDatabaseProvider; storage: IStorageProvider }> {
    if (!_initialized) await initializeProviders();
    return {
        auth: _authProvider,
        database: _databaseProvider,
        storage: _storageProvider
    };
}

/**
 * Check if using mock mode
 */
export function isMockMode(): boolean {
    return USE_MOCK_DATA;
}

/**
 * Get current provider configuration
 */
export function getProviderConfig() {
    return {
        auth: USE_MOCK_DATA ? 'mock' : AUTH_PROVIDER,
        database: USE_MOCK_DATA ? 'mock' : DB_PROVIDER,
        storage: USE_MOCK_DATA ? 'mock' : STORAGE_PROVIDER,
        mockMode: USE_MOCK_DATA
    };
}
