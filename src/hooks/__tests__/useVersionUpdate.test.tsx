import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkForVersionUpdate,
  VERSION_UPDATE_STORAGE_KEY,
  useVersionUpdate,
} from '../useVersionUpdate';

describe('version update checks', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // @ts-expect-error React act flag for test runners
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    window.localStorage.clear();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.useRealTimers();
  });

  function response(version: unknown, ok = true): Response {
    return {
      ok,
      json: async () => ({ version }),
    } as Response;
  }

  it('notifies once for a newer valid manifest and remembers that version', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response('0.2.5'));
    const onUpdate = vi.fn();

    const result = await checkForVersionUpdate({
      fetchImpl,
      storage: window.localStorage,
      currentVersion: '0.2.4',
      onUpdate,
    });

    expect(result).toBe('0.2.5');
    expect(onUpdate).toHaveBeenCalledWith('0.2.5');
    expect(window.localStorage.getItem(VERSION_UPDATE_STORAGE_KEY)).toBe('0.2.5');
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringMatching(/^\/version\.json\?check=\d+$/),
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it('ignores equal, older, malformed, unavailable, and failed manifests', async () => {
    const onUpdate = vi.fn();

    expect(
      await checkForVersionUpdate({
        fetchImpl: vi.fn().mockResolvedValue(response('0.2.4')),
        currentVersion: '0.2.4',
        onUpdate,
      }),
    ).toBeNull();
    expect(
      await checkForVersionUpdate({
        fetchImpl: vi.fn().mockResolvedValue(response('0.2.3')),
        currentVersion: '0.2.4',
        onUpdate,
      }),
    ).toBeNull();
    expect(
      await checkForVersionUpdate({
        fetchImpl: vi.fn().mockResolvedValue(response('not-a-version')),
        currentVersion: '0.2.4',
        onUpdate,
      }),
    ).toBeNull();
    expect(
      await checkForVersionUpdate({
        fetchImpl: vi.fn().mockResolvedValue(response('0.2.5', false)),
        currentVersion: '0.2.4',
        onUpdate,
      }),
    ).toBeNull();
    expect(
      await checkForVersionUpdate({
        fetchImpl: vi.fn().mockRejectedValue(new Error('offline')),
        currentVersion: '0.2.4',
        onUpdate,
      }),
    ).toBeNull();

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('allows a later version after deduplicating the already-notified version', async () => {
    window.localStorage.setItem(VERSION_UPDATE_STORAGE_KEY, '0.2.5');
    const onUpdate = vi.fn();

    const duplicate = await checkForVersionUpdate({
      fetchImpl: vi.fn().mockResolvedValue(response('0.2.5')),
      storage: window.localStorage,
      currentVersion: '0.2.4',
      onUpdate,
    });
    const later = await checkForVersionUpdate({
      fetchImpl: vi.fn().mockResolvedValue(response('0.2.6')),
      storage: window.localStorage,
      currentVersion: '0.2.4',
      onUpdate,
    });

    expect(duplicate).toBeNull();
    expect(later).toBe('0.2.6');
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(VERSION_UPDATE_STORAGE_KEY)).toBe('0.2.6');
  });

  it('continues notifying when browser storage is unavailable', async () => {
    const throwingStorage = {
      getItem: () => {
        throw new Error('storage unavailable');
      },
      setItem: () => {
        throw new Error('storage unavailable');
      },
    } as unknown as Storage;
    const onUpdate = vi.fn();

    await expect(
      checkForVersionUpdate({
        fetchImpl: vi.fn().mockResolvedValue(response('0.2.5')),
        storage: throwingStorage,
        currentVersion: '0.2.4',
        onUpdate,
      }),
    ).resolves.toBe('0.2.5');
    expect(onUpdate).toHaveBeenCalledWith('0.2.5');
  });

  it('checks on startup and schedules another check after the interval', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response('0.2.5'));
    const onUpdate = vi.fn();
    let root: ReturnType<typeof createRoot> | undefined;

    function TestComponent() {
      useVersionUpdate({
        fetchImpl,
        storage: window.localStorage,
        currentVersion: '0.2.4',
        intervalMs: 1_000,
        timeoutMs: 100,
        onUpdate,
      });
      return null;
    }

    await act(async () => {
      root = createRoot(container);
      root.render(React.createElement(TestComponent));
      await Promise.resolve();
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith('0.2.5');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    act(() => root?.unmount());
  });

  it('waits while hidden and checks when the tab becomes visible', async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    const fetchImpl = vi.fn().mockResolvedValue(response('0.2.5'));
    const onUpdate = vi.fn();
    let root: ReturnType<typeof createRoot> | undefined;

    function TestComponent() {
      useVersionUpdate({
        fetchImpl,
        storage: null,
        currentVersion: '0.2.4',
        intervalMs: 1_000,
        onUpdate,
      });
      return null;
    }

    await act(async () => {
      root = createRoot(container);
      root.render(React.createElement(TestComponent));
      await Promise.resolve();
    });
    expect(fetchImpl).not.toHaveBeenCalled();

    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith('0.2.5');
    act(() => root?.unmount());
  });

  it('aborts an in-flight request when the hook unmounts', async () => {
    let requestSignal: AbortSignal | null | undefined;
    const fetchImpl = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      requestSignal = init?.signal;
      return new Promise<Response>(() => undefined);
    });
    let root: ReturnType<typeof createRoot> | undefined;

    function TestComponent() {
      useVersionUpdate({ fetchImpl, storage: null, intervalMs: 1_000, timeoutMs: 10_000 });
      return null;
    }

    await act(async () => {
      root = createRoot(container);
      root.render(React.createElement(TestComponent));
      await Promise.resolve();
    });
    expect(requestSignal?.aborted).toBe(false);

    act(() => root?.unmount());
    expect(requestSignal?.aborted).toBe(true);
  });

  it('silently retries after a timed-out request', async () => {
    const fetchImpl = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Request timed out', 'AbortError'));
          });
        }),
    );
    let root: ReturnType<typeof createRoot> | undefined;

    function TestComponent() {
      useVersionUpdate({
        fetchImpl,
        storage: null,
        intervalMs: 1_000,
        timeoutMs: 100,
      });
      return null;
    }

    await act(async () => {
      root = createRoot(container);
      root.render(React.createElement(TestComponent));
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    act(() => root?.unmount());
  });
});
