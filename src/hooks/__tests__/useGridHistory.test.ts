import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useGridHistory, GridHistoryState } from '../useGridHistory';

describe('useGridHistory', () => {
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    // @ts-expect-error React act flag for test runners
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (container && document.body.contains(container)) {
      document.body.removeChild(container);
    }
    vi.useRealTimers();
  });

  function renderGridHistoryHook(initialState: GridHistoryState, maxHistory = 60) {
    let hookResult: ReturnType<typeof useGridHistory> | null = null;

    function TestComponent() {
      hookResult = useGridHistory(initialState, maxHistory);
      return null;
    }

    const root = createRoot(container!);
    act(() => {
      root.render(React.createElement(TestComponent));
    });

    return {
      getResult: () => hookResult!,
      unmount: () => {
        act(() => {
          root.unmount();
        });
      },
    };
  }

  it('validates initial state and throws if grid is invalid', () => {
    expect(() => {
      // @ts-expect-error testing runtime guard
      useGridHistory(null);
    }).toThrow('useGridHistory: initialState.grid must be string[][]');
  });

  it('caps history stack at maxHistory (60) after 70 commits without desynchronization', () => {
    const hook = renderGridHistoryHook({
      grid: [['initial']],
      outputOverrides: {},
    });

    // Commit 70 distinct states
    for (let i = 1; i <= 70; i++) {
      act(() => {
        hook.getResult().updateGrid([[`cell-${i}`]], false);
      });
    }

    expect(hook.getResult().grid).toEqual([['cell-70']]);
    expect(hook.getResult().canRedo).toBe(false);
    expect(hook.getResult().canUndo).toBe(true);

    // Perform 60 undos
    let undosCount = 0;
    while (hook.getResult().canUndo && undosCount < 100) {
      act(() => {
        hook.getResult().undo();
      });
      undosCount++;
    }

    // Should perform max history depth undos cleanly
    expect(undosCount).toBe(59);
    expect(hook.getResult().canUndo).toBe(false);
    expect(hook.getResult().canRedo).toBe(true);

    // Redo back to top
    let redosCount = 0;
    while (hook.getResult().canRedo && redosCount < 100) {
      act(() => {
        hook.getResult().redo();
      });
      redosCount++;
    }

    expect(redosCount).toBe(59);
    expect(hook.getResult().grid).toEqual([['cell-70']]);
    hook.unmount();
  });

  it('debounces rapid typing updates into a single history snapshot after 500ms', () => {
    const hook = renderGridHistoryHook({
      grid: [['initial']],
      outputOverrides: {},
    });

    // Simulate fast typing 5 characters
    for (let i = 1; i <= 5; i++) {
      act(() => {
        hook.getResult().updateGrid([[`typing-${i}`]], true);
      });
      vi.advanceTimersByTime(50);
    }

    // Live grid updates immediately
    expect(hook.getResult().grid).toEqual([['typing-5']]);

    // Advance remaining debounce time to trigger snapshot commit
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Now undo should restore pre-typing state
    act(() => {
      hook.getResult().undo();
    });

    expect(hook.getResult().grid).toEqual([['initial']]);
    hook.unmount();
  });
});
