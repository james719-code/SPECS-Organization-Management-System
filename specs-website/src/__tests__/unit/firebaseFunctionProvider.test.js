import { describe, expect, it, vi } from 'vitest';

vi.mock('../../shared/providers/firebaseProvider', () => ({
    getFirebaseIdToken: vi.fn().mockResolvedValue('firebase-token')
}));

import { FirebaseFunctionProvider } from '../../shared/providers/firebaseFunctionProvider';

describe('FirebaseFunctionProvider', () => {
    it('throws the backend error for non-success responses', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 403,
            text: async () => JSON.stringify({ success: false, error: 'Only admins can perform this action' })
        }));

        const provider = new FirebaseFunctionProvider('https://example.test/function', {});
        await expect(provider.createExecution('ignored', '{}')).rejects.toThrow('Only admins can perform this action');
    });

    it('returns the response envelope for successful responses', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ success: true })
        }));

        const provider = new FirebaseFunctionProvider('https://example.test/function', {});
        await expect(provider.createExecution('ignored', '{}')).resolves.toMatchObject({
            status: 'completed',
            responseBody: JSON.stringify({ success: true })
        });
    });
});
