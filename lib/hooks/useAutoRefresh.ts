'use client';

import { useEffect, useRef } from 'react';

const DEFAULT_INTERVAL_MS = 15000;

type AutoRefreshOptions = {
  intervalMs?: number;
  enabled?: boolean;
};

/**
 * Polls on an interval while the tab is visible, and refreshes when the tab
 * regains focus so open pages stay in sync across customer and driver views.
 */
export function useAutoRefresh(
  refresh: () => void | Promise<void>,
  options?: AutoRefreshOptions
): void {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let timer: ReturnType<typeof setInterval> | null = null;

    const run = () => {
      void refreshRef.current();
    };

    const stopPolling = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const startPolling = () => {
      stopPolling();
      timer = setInterval(run, intervalMs);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        run();
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === 'visible') {
      startPolling();
    }

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, intervalMs]);
}
