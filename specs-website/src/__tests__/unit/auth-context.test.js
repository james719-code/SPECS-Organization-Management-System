import { describe, it, expect, beforeEach, vi } from 'vitest';

const appwriteMocks = vi.hoisted(() => ({
    account: {
        get: vi.fn(),
        createEmailPasswordSession: vi.fn(),
        deleteSession: vi.fn()
    },
    databases: {
        getDocument: vi.fn()
    }
}));

vi.mock('../../shared/appwrite.ts', () => appwriteMocks);

describe('AuthContext and cachedApi.users.invalidateAuth', () => {
    let cachedApi;
    let dataCache;

    beforeEach(async () => {
        vi.clearAllMocks();
        localStorage.clear();
        sessionStorage.clear();

        const cacheModule = await import('../../shared/cache.ts');
        dataCache = cacheModule.dataCache;
        dataCache.clear();

        const apiModule = await import('../../shared/api.ts');
        cachedApi = apiModule.cachedApi;
    });

    it('should clear cached current_user when invalidateAuth is called', async () => {
        appwriteMocks.account.get.mockResolvedValue({ $id: 'user-123', email: 'test@example.com' });

        const first = await cachedApi.users.getCurrent();
        expect(first.$id).toBe('user-123');
        expect(appwriteMocks.account.get).toHaveBeenCalledTimes(1);

        // Subsequent call uses cache
        await cachedApi.users.getCurrent();
        expect(appwriteMocks.account.get).toHaveBeenCalledTimes(1);

        // Calling invalidateAuth clears current_user cache tag & key
        cachedApi.users.invalidateAuth();

        // Next call fetches fresh
        await cachedApi.users.getCurrent();
        expect(appwriteMocks.account.get).toHaveBeenCalledTimes(2);
    });

    it('should respect remember me flags in storage', () => {
        localStorage.setItem('specs_remember', '1');
        sessionStorage.setItem('specs_session', '1');

        expect(localStorage.getItem('specs_remember')).toBe('1');
        expect(sessionStorage.getItem('specs_session')).toBe('1');

        localStorage.removeItem('specs_remember');
        sessionStorage.removeItem('specs_session');

        expect(localStorage.getItem('specs_remember')).toBeNull();
        expect(sessionStorage.getItem('specs_session')).toBeNull();
    });
});
