import { describe, expect, it, vi } from 'vitest';
import { approveAccounts } from '../../shared/bulkApproval';

describe('Bulk account approval', () => {
  it('approves a 300-student cohort in six bounded requests', async () => {
    const ids = Array.from({ length: 300 }, (_, index) => `student-${index}`);
    const send = vi.fn(async (batch) => ({ success: true, successCount: batch.length, failedIds: [] }));
    expect(await approveAccounts(ids, send)).toEqual({ successCount: 300, failedIds: [] });
    expect(send).toHaveBeenCalledTimes(6);
    expect(send.mock.calls.every(([batch]) => batch.length === 50)).toBe(true);
    expect(send.mock.calls.flatMap(([batch]) => batch)).toEqual(ids);
  });
  it('keeps failed and unconfirmed accounts retryable while continuing other batches', async () => {
    const ids = Array.from({ length: 101 }, (_, index) => `student-${index}`);
    const send = vi.fn().mockResolvedValueOnce({ success: false, successCount: 49, failedIds: ['student-4'] })
      .mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({ success: true, successCount: 1, failedIds: [] });
    expect(await approveAccounts(ids, send)).toEqual({ successCount: 50, failedIds: ['student-4', ...ids.slice(50, 100)] });
  });
  it('does not report success for malformed responses or duplicate selection IDs', async () => {
    const send = vi.fn().mockResolvedValue({ success: true });
    expect(await approveAccounts(['student-a', 'student-a'], send)).toEqual({ successCount: 0, failedIds: ['student-a'] });
    expect(send).toHaveBeenCalledWith(['student-a']);
  });
});
