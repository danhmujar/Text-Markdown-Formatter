import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { showToast } from '../components/Toast';

export const PWA_UPDATE_INTERVAL_MS = 30 * 60 * 1000;
export const PWA_CHANGELOG_ON_RELOAD_KEY = 'text-markdown-formatter:changelog-after-update';

export interface UsePwaUpdateOptions {
  intervalMs?: number;
}

const EMPTY_PWA_UPDATE_OPTIONS: UsePwaUpdateOptions = {};

export function consumeChangelogAfterUpdate(): boolean {
  try {
    if (sessionStorage.getItem(PWA_CHANGELOG_ON_RELOAD_KEY) !== '1') return false;
    sessionStorage.removeItem(PWA_CHANGELOG_ON_RELOAD_KEY);
    return true;
  } catch {
    return false;
  }
}

export function usePwaUpdate(options: UsePwaUpdateOptions = EMPTY_PWA_UPDATE_OPTIONS): void {
  const { intervalMs = PWA_UPDATE_INTERVAL_MS } = options;
  const intervalRef = useRef(intervalMs);
  intervalRef.current = intervalMs;

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swScriptUrl, registration) {
      registrationRef.current = registration ?? null;
    },
  });
  const offlineNotifiedRef = useRef(false);
  const updateNotifiedRef = useRef(false);
  const updateServiceWorkerRef = useRef(updateServiceWorker);
  updateServiceWorkerRef.current = updateServiceWorker;

  useEffect(() => {
    if (!offlineReady) {
      offlineNotifiedRef.current = false;
      return;
    }
    if (offlineNotifiedRef.current) return;
    offlineNotifiedRef.current = true;
    setOfflineReady(false);
    showToast('App is ready to work offline.', 'success');
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (!needRefresh) return;
    if (updateNotifiedRef.current) return;
    updateNotifiedRef.current = true;
    setNeedRefresh(false);
    showToast('A new version is available.', 'info', {
      action: {
        label: 'Reload',
        onClick: () => {
          try {
            sessionStorage.setItem(PWA_CHANGELOG_ON_RELOAD_KEY, '1');
          } catch {
            // The reload still works when session storage is unavailable.
          }
          void updateServiceWorkerRef.current(true);
        },
      },
      duration: null,
    });
  }, [needRefresh, setNeedRefresh]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    let disposed = false;
    let inFlight = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (disposed) return;
      if (timerId !== null) clearTimeout(timerId);
      timerId = setTimeout(() => {
        timerId = null;
        void check();
      }, intervalRef.current);
    };

    const check = async () => {
      if (disposed || document.hidden || inFlight) return;
      const registration = registrationRef.current;
      if (!registration) {
        schedule();
        return;
      }
      inFlight = true;
      try {
        await registration.update();
      } catch {
        // Browser update errors are silent; the next check retries.
      } finally {
        inFlight = false;
        schedule();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) void check();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    void check();

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timerId !== null) clearTimeout(timerId);
    };
  }, []);
}
