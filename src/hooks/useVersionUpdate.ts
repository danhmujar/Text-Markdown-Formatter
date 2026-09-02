import { useEffect } from 'react';
import { APP_VERSION } from '../constants/release';
import { showToast } from '../components/Toast';
import { compareVersions } from '../utils/version';

export const VERSION_UPDATE_STORAGE_KEY = 'text-markdown-formatter:last-notified-version:v1';
export const VERSION_UPDATE_INTERVAL_MS = 30 * 60 * 1000;
export const VERSION_UPDATE_TIMEOUT_MS = 5 * 1000;

interface VersionManifest {
  version: string;
}

export interface VersionUpdateCheckOptions {
  fetchImpl?: typeof fetch;
  storage?: Storage | null;
  signal?: AbortSignal;
  currentVersion?: string;
  lastNotifiedVersion?: string | null;
  onUpdate?: (version: string) => void;
}

export interface UseVersionUpdateOptions extends VersionUpdateCheckOptions {
  intervalMs?: number;
  timeoutMs?: number;
}

const EMPTY_VERSION_UPDATE_OPTIONS: UseVersionUpdateOptions = {};

function readStoredVersion(storage: Storage | null | undefined): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(VERSION_UPDATE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeVersion(storage: Storage | null | undefined, version: string): void {
  if (!storage) return;
  try {
    storage.setItem(VERSION_UPDATE_STORAGE_KEY, version);
  } catch {
    // Storage is optional; notification still works for the current page lifetime.
  }
}

function isManifest(value: unknown): value is VersionManifest {
  return typeof value === 'object' && value !== null && 'version' in value;
}

export async function checkForVersionUpdate({
  fetchImpl = globalThis.fetch,
  storage,
  signal,
  currentVersion = APP_VERSION,
  lastNotifiedVersion = null,
  onUpdate,
}: VersionUpdateCheckOptions = {}): Promise<string | null> {
  if (typeof fetchImpl !== 'function') return null;

  try {
    const response = await fetchImpl(`/version.json?check=${Date.now()}`, {
      cache: 'no-store',
      signal,
    });
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (!isManifest(payload)) return null;

    const remoteVersion = payload.version;
    if (compareVersions(remoteVersion, currentVersion) <= 0) return null;

    const storedVersion = lastNotifiedVersion ?? readStoredVersion(storage);
    if (storedVersion) {
      try {
        if (compareVersions(remoteVersion, storedVersion) <= 0) return null;
      } catch {
        // Ignore an invalid historical value and continue with the valid remote version.
      }
    }

    storeVersion(storage, remoteVersion);
    onUpdate?.(remoteVersion);
    return remoteVersion;
  } catch {
    return null;
  }
}

function getBrowserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function useVersionUpdate(
  options: UseVersionUpdateOptions = EMPTY_VERSION_UPDATE_OPTIONS,
): void {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    let disposed = false;
    let inFlight = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let activeController: AbortController | null = null;
    let lastNotifiedVersion = options.lastNotifiedVersion ?? null;
    const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
    const intervalMs = options.intervalMs ?? VERSION_UPDATE_INTERVAL_MS;
    const timeoutMs = options.timeoutMs ?? VERSION_UPDATE_TIMEOUT_MS;
    const fetchImpl = options.fetchImpl ?? globalThis.fetch;
    const onUpdate =
      options.onUpdate ??
      ((version: string) => {
        showToast(`Version ${version} is available.`, 'info', {
          action: { label: 'Reload', onClick: () => window.location.reload() },
          duration: null,
        });
      });

    const schedule = () => {
      if (disposed) return;
      if (timerId !== null) clearTimeout(timerId);
      timerId = setTimeout(() => {
        timerId = null;
        void check();
      }, intervalMs);
    };

    const check = async () => {
      if (disposed || document.hidden || inFlight) return;
      inFlight = true;
      const controller = new AbortController();
      activeController = controller;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const version = await checkForVersionUpdate({
          fetchImpl,
          storage,
          signal: controller.signal,
          currentVersion: options.currentVersion ?? APP_VERSION,
          lastNotifiedVersion,
          onUpdate: (nextVersion) => {
            lastNotifiedVersion = nextVersion;
            onUpdate(nextVersion);
          },
        });
        if (version) lastNotifiedVersion = version;
      } finally {
        clearTimeout(timeoutId);
        if (activeController === controller) activeController = null;
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
      activeController?.abort();
    };
  }, [options]);
}
