import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { fireEvent } from '@testing-library/dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const methods = vi.hoisted(() => ({ legacyRevenueCandidates: vi.fn(), linkLegacyRevenue: vi.fn() }));
vi.mock('../../shared/api', () => ({ api: { payments: methods } }));
import LegacyRevenueLink from '../../components/payments/LegacyRevenueLink';
let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  methods.legacyRevenueCandidates.mockResolvedValue({ documents: [{ $id: 'revenue-a', name: 'Payment from Student A', date_earned: '2026-11-08', eventLabel: 'Event A' }], nextCursor: null });
  methods.linkLegacyRevenue.mockResolvedValue({ $id: 'legacy' });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
it('requires an explicit selection and links without automatically deleting a payment', async () => {
  const linked = vi.fn();
  await act(async () => root.render(<LegacyRevenueLink payment={{ $id: 'legacy', price: 100, quantity: 1, item_name: 'Fee' } as any} onClose={() => {}} onLinked={linked} />));
  const button = [...document.querySelectorAll('button')].find((entry) => entry.textContent === 'Link entry')!;
  expect(button.disabled).toBe(true);
  expect(methods.linkLegacyRevenue).not.toHaveBeenCalled();
  await act(async () => fireEvent.change(document.querySelector('#legacy-revenue')!, { target: { value: 'revenue-a' } }));
  await act(async () => fireEvent.click(button));
  expect(methods.linkLegacyRevenue).toHaveBeenCalledWith('legacy', 'revenue-a');
  expect(linked).toHaveBeenCalledTimes(1);
});
