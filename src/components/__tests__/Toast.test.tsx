import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast, ToastContainer } from '../Toast';

describe('ToastContainer', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    // @ts-expect-error React act flag for test runners
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.useFakeTimers();
    act(() => {
      root = createRoot(container);
      root.render(React.createElement(ToastContainer));
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.removeChild(container);
    vi.useRealTimers();
  });

  it('keeps an actionable update toast visible until it is acted on or closed', () => {
    const onReload = vi.fn();

    act(() => {
      showToast('Version 0.2.5 is available.', 'info', {
        action: { label: 'Reload', onClick: onReload },
        duration: null,
      });
    });

    expect(container.textContent).toContain('Version 0.2.5 is available.');
    const reloadButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Reload',
    );
    expect(reloadButton).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(container.textContent).toContain('Version 0.2.5 is available.');

    act(() => reloadButton?.click());
    expect(onReload).toHaveBeenCalledOnce();
    expect(container.textContent).not.toContain('Version 0.2.5 is available.');
  });

  it('retains the existing four-second default timeout for ordinary toasts', () => {
    act(() => showToast('Saved', 'success'));
    expect(container.textContent).toContain('Saved');

    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(container.textContent).not.toContain('Saved');
  });
});
