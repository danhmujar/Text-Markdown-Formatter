import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOnlineStatus } from '../useOnlineStatus';

describe('useOnlineStatus', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;
  let current: boolean | undefined;

  function TestComponent() {
    current = useOnlineStatus();
    return null;
  }

  beforeEach(() => {
    // @ts-expect-error React act flag for test runners
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = undefined;
    }
    document.body.removeChild(container);
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
  });

  it('initializes from the browser network hint and follows connection events', () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
    act(() => {
      root = createRoot(container);
      root.render(React.createElement(TestComponent));
    });
    expect(current).toBe(false);

    act(() => window.dispatchEvent(new Event('online')));
    expect(current).toBe(true);
    act(() => window.dispatchEvent(new Event('offline')));
    expect(current).toBe(false);
  });

  it('removes event listeners when unmounted', () => {
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    act(() => {
      root = createRoot(container);
      root.render(React.createElement(TestComponent));
    });

    act(() => root?.unmount());
    root = undefined;

    expect(removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});
