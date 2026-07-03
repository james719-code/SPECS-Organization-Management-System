import { useState, useEffect } from 'react';

type Listener = (pending: boolean) => void;
const listeners = new Set<Listener>();
let activeRequestsCount = 0;

export const globalLoadingTracker = {
  isPending() {
    return activeRequestsCount > 0;
  },
  startRequest() {
    activeRequestsCount++;
    this.notify();
  },
  endRequest() {
    activeRequestsCount = Math.max(0, activeRequestsCount - 1);
    this.notify();
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    // Initial sync
    listener(this.isPending());
    return () => {
      listeners.delete(listener);
    };
  },
  notify() {
    const pending = this.isPending();
    listeners.forEach(l => l(pending));
  }
};

export function useGlobalLoading() {
  const [pending, setPending] = useState(globalLoadingTracker.isPending());

  useEffect(() => {
    return globalLoadingTracker.subscribe(setPending);
  }, []);

  return pending;
}
