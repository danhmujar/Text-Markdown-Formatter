import { useState, useCallback, useRef, useEffect } from 'react';

export interface GridHistoryState {
  grid: string[][];
  outputOverrides: Record<string, string>;
}

export function useGridHistory(initialState: GridHistoryState, maxHistory = 60) {
  // Current live state
  const [grid, setGridState] = useState<string[][]>(() =>
    initialState.grid.map(row => [...row])
  );
  const [outputOverrides, setOutputOverridesState] = useState<Record<string, string>>(() => ({
    ...initialState.outputOverrides
  }));

  // History stack of committed states
  const [history, setHistory] = useState<GridHistoryState[]>([
    {
      grid: initialState.grid.map(row => [...row]),
      outputOverrides: { ...initialState.outputOverrides }
    }
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // References for reliable closures inside timers and event callbacks
  const historyRef = useRef(history);
  historyRef.current = history;
  const indexRef = useRef(historyIndex);
  indexRef.current = historyIndex;
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const overridesRef = useRef(outputOverrides);
  overridesRef.current = outputOverrides;

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Deep cloning helper
  const cloneState = (s: GridHistoryState): GridHistoryState => ({
    grid: s.grid.map(r => [...r]),
    outputOverrides: { ...s.outputOverrides }
  });

  const areStatesEqual = (a: GridHistoryState, b: GridHistoryState): boolean => {
    return (
      JSON.stringify(a.grid) === JSON.stringify(b.grid) &&
      JSON.stringify(a.outputOverrides) === JSON.stringify(b.outputOverrides)
    );
  };

  // Commit a snapshot to history
  const commitSnapshot = useCallback((stateToCommit: GridHistoryState) => {
    const currentCommitted = historyRef.current[indexRef.current];
    if (currentCommitted && areStatesEqual(currentCommitted, stateToCommit)) {
      return;
    }

    const cloned = cloneState(stateToCommit);
    setHistory(prev => {
      const trimmed = prev.slice(0, indexRef.current + 1);
      const next = [...trimmed, cloned];
      if (next.length > maxHistory) {
        next.shift();
      }
      return next;
    });

    setHistoryIndex(prev => {
      const nextIdx = indexRef.current + 1;
      return Math.min(nextIdx, maxHistory - 1);
    });
  }, [maxHistory]);

  // Update live state with optional debounced history push (for typing) or immediate commit
  const setLiveGridAndOverrides = useCallback((
    newGrid: string[][],
    newOverrides: Record<string, string>,
    isTyping = false
  ) => {
    setGridState(newGrid.map(r => [...r]));
    setOutputOverridesState({ ...newOverrides });

    const newState: GridHistoryState = {
      grid: newGrid,
      outputOverrides: newOverrides
    };

    if (isTyping) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        commitSnapshot(newState);
        debounceTimerRef.current = null;
      }, 500);
    } else {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      commitSnapshot(newState);
    }
  }, [commitSnapshot]);

  // Set grid only
  const updateGrid = useCallback((newGrid: string[][], isTyping = false) => {
    setLiveGridAndOverrides(newGrid, overridesRef.current, isTyping);
  }, [setLiveGridAndOverrides]);

  // Set output overrides only
  const updateOutputOverrides = useCallback((
    updater: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>),
    isTyping = false
  ) => {
    const nextOverrides = typeof updater === 'function' ? updater(overridesRef.current) : updater;
    setLiveGridAndOverrides(gridRef.current, nextOverrides, isTyping);
  }, [setLiveGridAndOverrides]);

  // Set both atomically
  const updateAll = useCallback((newGrid: string[][], newOverrides: Record<string, string>) => {
    setLiveGridAndOverrides(newGrid, newOverrides, false);
  }, [setLiveGridAndOverrides]);

  // Undo
  const undo = useCallback((): boolean => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const currentLiveState: GridHistoryState = {
      grid: gridRef.current,
      outputOverrides: overridesRef.current
    };
    const committedCurrent = historyRef.current[indexRef.current];

    // If there is uncommitted live typing state, restore current committed state first
    if (committedCurrent && !areStatesEqual(currentLiveState, committedCurrent)) {
      setGridState(committedCurrent.grid.map(r => [...r]));
      setOutputOverridesState({ ...committedCurrent.outputOverrides });
      return true;
    }

    if (indexRef.current > 0) {
      const targetIndex = indexRef.current - 1;
      const targetState = historyRef.current[targetIndex];
      if (targetState) {
        setHistoryIndex(targetIndex);
        setGridState(targetState.grid.map(r => [...r]));
        setOutputOverridesState({ ...targetState.outputOverrides });
        return true;
      }
    }
    return false;
  }, []);

  // Redo
  const redo = useCallback((): boolean => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (indexRef.current < historyRef.current.length - 1) {
      const targetIndex = indexRef.current + 1;
      const targetState = historyRef.current[targetIndex];
      if (targetState) {
        setHistoryIndex(targetIndex);
        setGridState(targetState.grid.map(r => [...r]));
        setOutputOverridesState({ ...targetState.outputOverrides });
        return true;
      }
    }
    return false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const canUndo = historyIndex > 0 || (
    historyRef.current[historyIndex] &&
    !areStatesEqual(
      { grid, outputOverrides },
      historyRef.current[historyIndex]
    )
  );
  const canRedo = historyIndex < history.length - 1;

  return {
    grid,
    outputOverrides,
    updateGrid,
    updateOutputOverrides,
    updateAll,
    undo,
    redo,
    canUndo,
    canRedo,
    historyIndex,
    historyLength: history.length
  };
}
