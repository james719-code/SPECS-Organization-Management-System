import { describe, it, expect, beforeEach, vi } from 'vitest';

const appwriteMocks = vi.hoisted(() => ({
    account: {
        get: vi.fn()
    },
    databases: {
        listDocuments: vi.fn(),
        getDocument: vi.fn(),
        createDocument: vi.fn(),
        updateDocument: vi.fn(),
        deleteDocument: vi.fn()
    },
    storage: {
        createFile: vi.fn(),
        deleteFile: vi.fn(),
        getFilePreview: vi.fn(() => 'preview-url')
    }
}));

vi.mock('../../shared/appwrite.js', () => appwriteMocks);

describe('API cache integration', () => {
    let api;
    let cachedApi;
    let dataCache;

    beforeEach(async () => {
        vi.clearAllMocks();
        localStorage.clear();

        const cacheModule = await import('../../shared/cache.js');
        dataCache = cacheModule.dataCache;
        dataCache.clear();
        dataCache.resetStats();

        const apiModule = await import('../../shared/api.js');
        api = apiModule.api;
        cachedApi = apiModule.cachedApi;
    });

    it('should reuse cached list reads', async () => {
        appwriteMocks.databases.listDocuments.mockResolvedValue({
            documents: [{ $id: 'event-1', event_name: 'Assembly' }],
            total: 1
        });

        const first = await cachedApi.events.list({ limit: 10 });
        const second = await cachedApi.events.list({ limit: 10 });

        expect(first.documents).toHaveLength(1);
        expect(second.documents).toHaveLength(1);
        expect(appwriteMocks.databases.listDocuments).toHaveBeenCalledTimes(1);
        expect(dataCache.getStats().savedApiCalls).toBeGreaterThan(0);
    });

    it('should dedupe concurrent cached reads', async () => {
        appwriteMocks.databases.listDocuments.mockResolvedValue({
            documents: [{ $id: 'student-1', username: 'Jane' }],
            total: 1
        });

        await Promise.all([
            cachedApi.users.listStudents({ limit: 10 }),
            cachedApi.users.listStudents({ limit: 10 })
        ]);

        expect(appwriteMocks.databases.listDocuments).toHaveBeenCalledTimes(1);
        expect(dataCache.getStats().deduped).toBe(1);
    });

    it('should invalidate affected tags after event mutations', async () => {
        appwriteMocks.databases.listDocuments.mockResolvedValue({
            documents: [{ $id: 'event-1', event_name: 'Assembly' }],
            total: 1
        });
        appwriteMocks.databases.createDocument.mockResolvedValue({ $id: 'event-2' });

        await cachedApi.events.list({ limit: 10 });
        await cachedApi.events.list({ limit: 10 });
        expect(appwriteMocks.databases.listDocuments).toHaveBeenCalledTimes(1);

        await api.events.create({ event_name: 'Workshop' });
        await cachedApi.events.list({ limit: 10 });

        expect(appwriteMocks.databases.listDocuments).toHaveBeenCalledTimes(2);
    });
});
