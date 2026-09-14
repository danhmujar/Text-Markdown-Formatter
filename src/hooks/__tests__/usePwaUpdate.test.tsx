import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RegisterSWOptions } from 'vite-plugin-pwa/types';
import { PWA_UPDATE_INTERVAL_MS, usePwaUpdate } from '../usePwaUpdate';
import type { ToastMessage } from '../../components/Toast';

type ToastDetail = Omit<ToastMessage, 'id'>;

const controls = {
  offlineReady: false,
  needRefresh: false,
  setOfflineReady: vi.fn(),
  setNeedRefresh: vi.fn(),
  updateServiceWorker: vi.fn(),
  options: null as RegisterSWOptions | null,
};

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options?: RegisterSWOptions) => {
    controls.options = options ?? null;
    return {
      offlineReady: [controls.offlineReady, controls.setOfflineReady],
      needRefresh: [controls.needRefresh, controls.setNeedRefresh],
      updateServiceWorker: controls.updateServiceWorker,
    };
  },
}));

describe('usePwaUpdate', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot> | undefined;
  let toasts: ToastDetail[];
  const onToast = (event: Event) => {
    toasts.push((event as CustomEvent<ToastDetail>).detail);
  };

  function TestComponent({ intervalMs }: { intervalMs?: number }) {
    usePwaUpdate(intervalMs === undefined ? undefined : { intervalMs });
    return null;
  }

  async function renderHook(intervalMs?: number) {
    await act(async () => {
      root = createRoot(container);
      root.render(React.createElement(TestComponent, { intervalMs }));
      await Promise.resolve();
    });
  }

  async function rerenderHook(intervalMs?: number) {
    await act(async () => {
      root?.render(React.createElement(TestComponent, { intervalMs }));
      await Promise.resolve();
    });
  }

  function registerWorker(update: ReturnType<typeof vi.fn>) {
    const registration = { update } as unknown as ServiceWorkerRegistration;
    act(() => {
      controls.options?.onRegisteredSW?.('/sw.js', registration);
    });
    return registration;
  }

  beforeEach(() => {
    // @ts-expect-error React act flag for test runners
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    toasts = [];
    window.addEventListener('app-toast', onToast);
    controls.offlineReady = false;
    controls.needRefresh = false;
    controls.options = null;
    vi.clearAllMocks();
    controls.updateServiceWorker.mockResolvedValue(undefined);
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    vi.useFakeTimers();
  });

  afterEach(() => {
    window.removeEventListener('app-toast', onToast);
    if (root) {
      act(() => root?.unmount());
      root = undefined;
    }
    document.body.removeChild(container);
    vi.useRealTimers();
  });

  it('dispatches one offline-ready toast and clears the virtual flag', async () => {
    controls.offlineReady = true;
    await renderHook();

    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.msg).toBe('App is ready to work offline.');
    expect(toasts[0]?.type).toBe('success');
    expect(controls.setOfflineReady).toHaveBeenCalledWith(false);

    await rerenderHook();
    expect(toasts).toHaveLength(1);
  });

  it('dispatches a persistent update toast whose Reload action updates the worker', async () => {
    controls.needRefresh = true;
    await renderHook();

    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.msg).toBe('A new version is available.');
    expect(toasts[0]?.type).toBe('info');
    expect(toasts[0]?.duration).toBeNull();
    expect(toasts[0]?.action?.label).toBe('Reload');
    expect(controls.setNeedRefresh).toHaveBeenCalledWith(false);

    await act(async () => {
      toasts[0]?.action?.onClick();
      await Promise.resolve();
    });
    expect(controls.updateServiceWorker).toHaveBeenCalledTimes(1);
    expect(controls.updateServiceWorker).toHaveBeenCalledWith(true);

    await rerenderHook();
    expect(toasts).toHaveLength(1);
  });

  it('stays silent until the worker reports readiness or an update', async () => {
    await renderHook();
    expect(toasts).toHaveLength(0);
    expect(controls.setOfflineReady).not.toHaveBeenCalled();
    expect(controls.setNeedRefresh).not.toHaveBeenCalled();
  });

  it('checks for updates when the tab becomes visible and every 30 minutes', async () => {
    expect(PWA_UPDATE_INTERVAL_MS).toBe(30 * 60 * 1000);
    await renderHook();
    const update = vi.fn().mockResolvedValue(undefined);
    registerWorker(update);

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(update).not.toHaveBeenCalled();

    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(update).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(29 * 60 * 1000);
    });
    expect(update).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60 * 1000);
    });
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('prevents overlapping update checks', async () => {
    await renderHook(1_000);
    let resolveUpdate!: () => void;
    const update = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    registerWorker(update);

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(update).toHaveBeenCalledTimes(1);

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(update).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate();
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('ignores update errors and keeps polling', async () => {
    await renderHook(1_000);
    const update = vi.fn().mockRejectedValue(new Error('update failed'));
    registerWorker(update);

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(update).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(update).toHaveBeenCalledTimes(2);
  });

  it('removes listeners and timers on unmount', async () => {
    await renderHook(1_000);
    const update = vi.fn().mockResolvedValue(undefined);
    registerWorker(update);
    expect(update).toHaveBeenCalledTimes(0);

    act(() => root?.unmount());
    root = undefined;

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(update).not.toHaveBeenCalled();
  });
});
