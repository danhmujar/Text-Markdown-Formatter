import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

export interface GridHistoryState {
  grid: string[][];
}

export function useGridHistory(initialState: GridHistoryState, maxHistory = 60) {
  if (!initialState || !Array.isArray(initialState.grid)) {
    throw new Error('useGridHistory: initialState.grid must be string[][]');
  }

  const cloneGrid = (grid: string[][]) => grid.map((row) => [...row]);
  const [grid, setGridState] = useState<string[][]>(() => cloneGrid(initialState.grid));
  const [history, setHistory] = useState<string[][][]>([cloneGrid(initialState.grid)]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const historyRef = useRef(history);
  historyRef.current = history;
  const indexRef = useRef(historyIndex);
  indexRef.current = historyIndex;
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const areGridsEqual = (a: string[][], b: string[][]): boolean => {
    if (a === b) return true;
    if (a.length !== b.length) return false;

    let totalChars = 0;
    for (let rowIndex = 0; rowIndex < a.length; rowIndex++) {
      if (a[rowIndex]?.length !== b[rowIndex]?.length) return false;
      for (const cell of a[rowIndex] ?? []) totalChars += cell.length;
    }

    if (totalChars > 500_000) return false;
    return JSON.stringify(a) === JSON.stringify(b);
  };

  const replaceHistory = useCallback((next: string[][][]) => {
    historyRef.current = next;
    indexRef.current = next.length - 1;
    setHistory(next);
    setHistoryIndex(indexRef.current);
  }, []);

  const commitSnapshot = useCallback(
    (gridToCommit: string[][]) => {
      const current = historyRef.current[indexRef.current];
      if (current && areGridsEqual(current, gridToCommit)) return;

      const next = [
        ...historyRef.current.slice(0, indexRef.current + 1),
        cloneGrid(gridToCommit),
      ].slice(-maxHistory);
      replaceHistory(next);
    },
    [maxHistory, replaceHistory],
  );

  const updateGrid = useCallback(
    (newGrid: string[][], isTyping = false) => {
      const cloned = cloneGrid(newGrid);
      gridRef.current = cloned;
      setGridState(cloned);

      if (isTyping) {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          commitSnapshot(gridRef.current);
          debounceTimerRef.current = null;
        }, 500);
        return;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      commitSnapshot(cloned);
    },
    [commitSnapshot],
  );

  const commitPaste = useCallback(
    (rawGrid: string[][], cleanedGrid: string[][]) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      const next = historyRef.current.slice(0, indexRef.current + 1);
      const append = (candidate: string[][]) => {
        const previous = next[next.length - 1];
        if (!previous || !areGridsEqual(previous, candidate)) next.push(cloneGrid(candidate));
      };
      append(rawGrid);
      append(cleanedGrid);

      const bounded = next.slice(-maxHistory);
      const cloned = cloneGrid(cleanedGrid);
      gridRef.current = cloned;
      setGridState(cloned);
      replaceHistory(bounded);
    },
    [maxHistory, replaceHistory],
  );

  const undo = useCallback((): boolean => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const committedCurrent = historyRef.current[indexRef.current];
    if (committedCurrent && !areGridsEqual(gridRef.current, committedCurrent)) {
      const restored = cloneGrid(committedCurrent);
      gridRef.current = restored;
      setGridState(restored);
      return true;
    }

    if (indexRef.current === 0) return false;
    const targetIndex = indexRef.current - 1;
    const restored = cloneGrid(historyRef.current[targetIndex]);
    indexRef.current = targetIndex;
    gridRef.current = restored;
    setHistoryIndex(targetIndex);
    setGridState(restored);
    return true;
  }, []);

  const redo = useCallback((): boolean => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (indexRef.current >= historyRef.current.length - 1) return false;
    const targetIndex = indexRef.current + 1;
    const restored = cloneGrid(historyRef.current[targetIndex]);
    indexRef.current = targetIndex;
    gridRef.current = restored;
    setHistoryIndex(targetIndex);
    setGridState(restored);
    return true;
  }, []);

  useEffect(
    () => () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    },
    [],
  );

  const canUndo = useMemo(
    () =>
      historyIndex > 0 ||
      (Boolean(historyRef.current[historyIndex]) &&
        !areGridsEqual(grid, historyRef.current[historyIndex])),
    [grid, historyIndex],
  );
  const canRedo = useMemo(() => historyIndex < history.length - 1, [historyIndex, history.length]);

  return {
    grid,
    updateGrid,
    commitPaste,
    undo,
    redo,
    canUndo,
    canRedo,
    historyIndex,
    historyLength: history.length,
  };
}
