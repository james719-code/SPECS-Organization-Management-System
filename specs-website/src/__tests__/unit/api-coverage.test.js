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

vi.mock('../../shared/appwrite.ts', () => appwriteMocks);

describe('Expanded API & Caching Coverage', () => {
    let api;
    let cachedApi;
    let dataCache;

    beforeEach(async () => {
        vi.clearAllMocks();
        localStorage.clear();

        const cacheModule = await import('../../shared/cache.ts');
        dataCache = cacheModule.dataCache;
        dataCache.clear();
        dataCache.resetStats();

        const apiModule = await import('../../shared/api.ts');
        api = apiModule.api;
        cachedApi = apiModule.cachedApi;
    });

    it('should create stories and invalidate stories caches', async () => {
        appwriteMocks.databases.listDocuments.mockResolvedValue({
            documents: [{ $id: 'story-1', title: 'First Story' }],
            total: 1
        });
        appwriteMocks.databases.createDocument.mockResolvedValue({ $id: 'story-2', title: 'Second Story' });

        // Fetch from cache first
        await cachedApi.stories.list({ limit: 10 });
        await cachedApi.stories.list({ limit: 10 });
        expect(appwriteMocks.databases.listDocuments).toHaveBeenCalledTimes(1);

        // Perform mutation via api.stories.create
        await api.stories.create({ title: 'Second Story' });

        // Verify databases.createDocument was called
        expect(appwriteMocks.databases.createDocument).toHaveBeenCalledTimes(1);

        // Fetch list again, cache should have been invalidated and call database
        await cachedApi.stories.list({ limit: 10 });
        expect(appwriteMocks.databases.listDocuments).toHaveBeenCalledTimes(2);
    });

    it('should delete stories and invalidate highlights cache', async () => {
        appwriteMocks.databases.listDocuments.mockResolvedValue({
            documents: [{ $id: 'story-1', title: 'My Story' }],
            total: 1
        });
        appwriteMocks.databases.deleteDocument.mockResolvedValue({});

        await cachedApi.stories.list({ limit: 10 });
        await api.stories.delete('story-1');

        expect(appwriteMocks.databases.deleteDocument).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(String),
            'story-1'
        );

        await cachedApi.stories.list({ limit: 10 });
        expect(appwriteMocks.databases.listDocuments).toHaveBeenCalledTimes(2);
    });

    it('should route metadata settings requests via API layer', async () => {
        const mockMetadata = { $id: 'meta-1', ismaintenance: true, schoolYear: '2026-2027' };
        appwriteMocks.databases.listDocuments.mockResolvedValue({
            documents: [mockMetadata],
            total: 1
        });
        appwriteMocks.databases.updateDocument.mockResolvedValue(mockMetadata);

        // Load metadata
        const metadata = await cachedApi.metadata.get();
        expect(metadata).toEqual(mockMetadata);
        expect(appwriteMocks.databases.listDocuments).toHaveBeenCalledTimes(1);

        // Save metadata
        await api.metadata.update('meta-1', { ismaintenance: false });
        expect(appwriteMocks.databases.updateDocument).toHaveBeenCalledWith(
            expect.any(String),
            'metadata',
            'meta-1',
            { ismaintenance: false }
        );
    });

    it('should wrap student payment lists in typed paginated responses', async () => {
        appwriteMocks.databases.listDocuments.mockResolvedValue({
            documents: [
                { $id: 'pay-1', amount: 500, date_paid: '2026-07-01T00:00:00Z' },
                { $id: 'pay-2', amount: 300, date_paid: '2026-07-02T00:00:00Z' }
            ],
            total: 2
        });

        const res = await api.payments.listForStudent('student-1');
        
        expect(res).toBeDefined();
        expect(res.documents).toHaveLength(2);
        expect(res.total).toBe(2);
        expect(res.offset).toBe(0);
        expect(res.limit).toBe(100);
        expect(res.documents[0].amount).toBe(500);
    });

    it('should support attendance listAll and get cached entries', async () => {
        appwriteMocks.databases.listDocuments.mockResolvedValue({
            documents: [{ $id: 'att-1', name_attendance: 'Orientation' }],
            total: 1
        });

        const res = await cachedApi.attendance.listAll({ limit: 10 });
        expect(res.documents).toHaveLength(1);
        expect(appwriteMocks.databases.listDocuments).toHaveBeenCalledTimes(1);

        // Read again, must be cached
        const res2 = await cachedApi.attendance.listAll({ limit: 10 });
        expect(res2.documents).toHaveLength(1);
        expect(appwriteMocks.databases.listDocuments).toHaveBeenCalledTimes(1);
    });
});
