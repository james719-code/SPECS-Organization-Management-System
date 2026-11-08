export interface ApprovalResult { successCount: number; failedIds: string[] }

export async function approveAccounts(
  ids: string[],
  send: (ids: string[]) => Promise<{ success?: boolean; successCount?: number; failedIds?: string[]; error?: string }>,
): Promise<ApprovalResult> {
  const unique = [...new Set(ids)];
  const result: ApprovalResult = { successCount: 0, failedIds: [] };
  for (let offset = 0; offset < unique.length; offset += 50) {
    const batch = unique.slice(offset, offset + 50);
    try {
      const response = await send(batch);
      if (!Number.isInteger(response.successCount) || !Array.isArray(response.failedIds)
        || response.failedIds.some((id) => !batch.includes(id))
        || response.successCount! + new Set(response.failedIds).size !== batch.length) {
        throw new Error(response.error || 'Invalid bulk approval response');
      }
      result.successCount += response.successCount!;
      result.failedIds.push(...new Set(response.failedIds));
    } catch {
      // A lost response can be retried: approval is idempotent. Preserve these
      // accounts in the selection instead of reporting unconfirmed success.
      result.failedIds.push(...batch);
    }
  }
  return result;
}
