import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  account: { get: vi.fn() },
  databases: { getDocument: vi.fn(), createDocument: vi.fn(), updateDocument: vi.fn(), deleteDocument: vi.fn() },
  storage: {}, functions: { createExecution: vi.fn() },
}));
vi.mock('../../shared/appwrite.ts', () => mocks);
let api;
beforeAll(async () => {
  vi.stubEnv('VITE_DB_PROVIDER', 'firebase');
  vi.stubEnv('MODE', 'production');
  ({ api } = await import('../../shared/api'));
});
afterAll(() => { vi.stubEnv('VITE_DB_PROVIDER', 'appwrite'); vi.stubEnv('MODE', 'test'); });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.functions.createExecution.mockImplementation(async (_id, body) => {
    const { action, payload } = JSON.parse(body);
    return { responseBody: JSON.stringify({ success: true, [action === 'payment' ? 'payment' : 'story']: { $id: payload.paymentId || payload.storyId, createdAt: '2026-11-08T00:00:00Z' } }) };
  });
});

describe('Firebase protected writes', () => {
  it('routes every payment mutation through the backend without creating client revenue', async () => {
    const payment = { $id: 'payment-a', is_paid: false };
    await api.payments.create({ price: 100, quantity: 1 });
    await api.payments.update(payment.$id, { price: 200 });
    await api.payments.markPaid(payment, 'untrusted-recorder', 'untrusted-name', 'cash');
    await api.payments.delete(payment.$id);
    const calls = mocks.functions.createExecution.mock.calls.map(([, body]) => JSON.parse(body));
    expect(calls.map((entry) => entry.action)).toEqual(['payment', 'payment', 'payment', 'payment']);
    expect(calls.map((entry) => entry.payload.operation)).toEqual(['create', 'update', 'mark_paid', 'delete']);
    expect(calls[2].payload).toEqual({ operation: 'mark_paid', paymentId: 'payment-a', data: { modal_paid: 'cash' } });
    expect(mocks.databases.createDocument).not.toHaveBeenCalled();
    expect(mocks.databases.updateDocument).not.toHaveBeenCalled();
    expect(mocks.databases.deleteDocument).not.toHaveBeenCalled();
  });
  it('surfaces server rejections without falling back to unprotected writes', async () => {
    mocks.functions.createExecution.mockResolvedValue({ responseBody: JSON.stringify({ success: false, error: 'Legacy reconciliation required' }) });
    await expect(api.payments.delete('legacy')).rejects.toThrow('Legacy reconciliation required');
    expect(mocks.databases.deleteDocument).not.toHaveBeenCalled();
  });
});
