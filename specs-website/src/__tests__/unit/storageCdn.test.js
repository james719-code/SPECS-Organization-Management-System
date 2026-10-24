import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    createSignedUrl: vi.fn(),
    list: vi.fn(),
    remove: vi.fn(),
    from: vi.fn(),
    getBucket: vi.fn(),
    getPublicUrl: vi.fn(),
}));
vi.mock('npm:@supabase/supabase-js@2', () => ({
    createClient: () => ({ storage: { from: mocks.from, getBucket: mocks.getBucket } }),
}));

let publicAsset;
let storageAction;
let jsonResponse;
let env;
const asset = (bucket = 'specs-events', fileId = 'image-id') => {
    const url = new URL('https://project.test/functions/v1/specs-api/asset');
    url.searchParams.set('bucket', bucket);
    url.searchParams.set('fileId', fileId);
    return publicAsset(new Request(url), url);
};

beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T00:00:00Z'));
    env = {
        SUPABASE_URL: 'https://project.test',
        SUPABASE_SERVICE_ROLE_KEY: 'server-only',
        STORAGE_ALLOWED_BUCKETS: 'specs-events,specs-highlights,resumes',
        STORAGE_PUBLIC_ASSET_BUCKETS: 'specs-events,specs-highlights',
    };
    vi.stubGlobal('Deno', { env: { get: (key) => env[key] } });
    vi.stubGlobal('fetch', vi.fn());
    mocks.from.mockReturnValue(mocks);
    mocks.list.mockResolvedValue({ data: [{ name: 'photo.jpg' }], error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.getBucket.mockResolvedValue({ data: { public: false }, error: null });
    mocks.getPublicUrl.mockImplementation((path) => ({ data: { publicUrl: `https://project.test/storage/v1/object/public/specs-events/${path}` } }));
    mocks.createSignedUrl.mockImplementation(async (path) => ({
        data: { signedUrl: `https://project.test/storage/v1/object/sign/${path}?token=${Date.now()}` },
        error: null,
    }));
    ({ publicAsset, storageAction } = await import('../../../../supabase/functions/specs-api/modules/storage.ts'));
    ({ jsonResponse } = await import('../../../../supabase/functions/specs-api/http.ts'));
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('Storage CDN delivery', () => {
    it('redirects bytes to Storage and shares one signed URL across repeat visitors', async () => {
        const first = await asset();
        vi.advanceTimersByTime(10_000);
        const second = await asset();
        expect(first.status).toBe(307);
        expect(second.headers.get('location')).toBe(first.headers.get('location'));
        expect(first.headers.get('cache-control')).toBe('public, max-age=300, must-revalidate');
        expect(first.body).toBeNull();
        expect(mocks.createSignedUrl).toHaveBeenCalledTimes(1);
        expect(mocks.list).toHaveBeenCalledTimes(1);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('bounds redirect caching to URL validity and renews before expiry', async () => {
        const first = await asset();
        vi.advanceTimersByTime(3_500_000);
        expect((await asset()).headers.get('cache-control')).toContain('max-age=40,');
        vi.advanceTimersByTime(40_000);
        expect((await asset()).headers.get('location')).not.toBe(first.headers.get('location'));
        expect(mocks.createSignedUrl).toHaveBeenCalledTimes(2);
    });

    it('does not share cached paths across buckets', async () => {
        await asset();
        await asset('specs-highlights');
        expect(mocks.createSignedUrl).toHaveBeenCalledTimes(2);
    });

    it('checks current bucket permissions even when a URL is cached', async () => {
        await asset();
        env.STORAGE_PUBLIC_ASSET_BUCKETS = 'specs-highlights';
        expect((await asset()).status).toBe(403);
        expect((await asset('resumes')).status).toBe(403);
        env.STORAGE_PUBLIC_ASSET_BUCKETS = 'specs-events';
        env.STORAGE_ALLOWED_BUCKETS = 'specs-highlights';
        await expect(asset()).rejects.toThrow('Storage bucket is not allowed');
    });

    it('evicts resolved file aliases when an object is deleted', async () => {
        await asset();
        await asset('specs-events', 'image-id/photo.jpg');
        await storageAction({ uid: 'admin', role: 'admin' }, {
            action: 'delete', bucket: 'specs-events', path: 'image-id/photo.jpg',
        });
        await asset();
        await asset('specs-events', 'image-id/photo.jpg');
        expect(mocks.createSignedUrl).toHaveBeenCalledTimes(4);
    });

    it('does not retain failed signing responses', async () => {
        mocks.createSignedUrl.mockResolvedValueOnce({ error: { message: 'Unavailable' } });
        const failed = await asset();
        expect(failed.status).toBe(404);
        expect(failed.headers.get('cache-control')).toBe('no-store');
        expect((await asset()).status).toBe(307);
    });

    it('bounds the in-memory URL cache', async () => {
        for (let i = 0; i < 501; i++) await asset('specs-events', `file-${i}/photo.jpg`);
        await asset('specs-events', 'file-0/photo.jpg');
        expect(mocks.createSignedUrl).toHaveBeenCalledTimes(502);
    });

    it('redirects public buckets to their permanent Storage URL with a long redirect cache', async () => {
        mocks.getBucket.mockResolvedValue({ data: { public: true }, error: null });
        const first = await asset();
        vi.advanceTimersByTime(3_600_000 * 5);
        const second = await asset();
        expect(first.status).toBe(307);
        expect(first.headers.get('location')).toBe('https://project.test/storage/v1/object/public/specs-events/image-id/photo.jpg');
        expect(second.headers.get('location')).toBe(first.headers.get('location'));
        expect(first.headers.get('cache-control')).toBe('public, max-age=86400, must-revalidate');
        expect(mocks.createSignedUrl).not.toHaveBeenCalled();
        expect(mocks.getBucket).toHaveBeenCalledTimes(1);
        expect(mocks.list).toHaveBeenCalledTimes(1);
    });

    it('falls back to signed URLs when the bucket visibility cannot be read', async () => {
        mocks.getBucket.mockResolvedValue({ data: null, error: { message: 'Unavailable' } });
        const response = await asset();
        expect(response.headers.get('location')).toContain('/object/sign/');
    });

    it('prevents shared caching of authenticated JSON and signed operations', () => {
        expect(jsonResponse({ token: 'private' }).headers.get('cache-control')).toBe('no-store');
    });
});
