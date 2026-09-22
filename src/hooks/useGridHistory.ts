import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { hasBrTags } from '../utils/cleanup';

export interface GridHistoryState {
  grid: string[][];
  preserveBr?: boolean[][];
}

interface GridSnapshot {
  grid: string[][];
  preserveBr: boolean[][];
}

export function useGridHistory(initialState: GridHistoryState, maxHistory = 60) {
  if (!initialState || !Array.isArray(initialState.grid)) {
    throw new Error('useGridHistory: initialState.grid must be string[][]');
  }

  const cloneGrid = (grid: string[][]) => grid.map((row) => [...row]);
  const clonePreserveBr = (preserveBr: boolean[][]) => preserveBr.map((row) => [...row]);
  const getPreserveBr = (grid: string[][], previous: boolean[][] = []) =>
    grid.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (!cell.trim()) return false;
        return hasBrTags(cell) || Boolean(previous[rowIndex]?.[colIndex]);
      }),
    );
  const createSnapshot = (grid: string[][], previous: boolean[][] = []): GridSnapshot => ({
    grid: cloneGrid(grid),
    preserveBr: getPreserveBr(grid, previous),
  });
  const initialSnapshot = createSnapshot(initialState.grid, initialState.preserveBr);
  const [grid, setGridState] = useState<string[][]>(() => cloneGrid(initialSnapshot.grid));
  const [preserveBr, setPreserveBrState] = useState<boolean[][]>(() =>
    clonePreserveBr(initialSnapshot.preserveBr),
  );
  const [history, setHistory] = useState<GridSnapshot[]>([
    {
      grid: cloneGrid(initialSnapshot.grid),
      preserveBr: clonePreserveBr(initialSnapshot.preserveBr),
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const historyRef = useRef(history);
  historyRef.current = history;
  const indexRef = useRef(historyIndex);
  indexRef.current = historyIndex;
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const preserveBrRef = useRef(preserveBr);
  preserveBrRef.current = preserveBr;
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const areSnapshotsEqual = (a: GridSnapshot, b: GridSnapshot): boolean => {
    if (a === b) return true;
    if (a.grid.length !== b.grid.length || a.preserveBr.length !== b.preserveBr.length) {
      return false;
    }

    for (let rowIndex = 0; rowIndex < a.grid.length; rowIndex++) {
      if (
        a.grid[rowIndex]?.length !== b.grid[rowIndex]?.length ||
        a.preserveBr[rowIndex]?.length !== b.preserveBr[rowIndex]?.length
      ) {
        return false;
      }
      for (let colIndex = 0; colIndex < (a.grid[rowIndex]?.length ?? 0); colIndex++) {
        if (
          a.grid[rowIndex]?.[colIndex] !== b.grid[rowIndex]?.[colIndex] ||
          a.preserveBr[rowIndex]?.[colIndex] !== b.preserveBr[rowIndex]?.[colIndex]
        ) {
          return false;
        }
      }
    }

    return true;
  };

  const replaceHistory = useCallback((next: GridSnapshot[]) => {
    historyRef.current = next;
    indexRef.current = next.length - 1;
    setHistory(next);
    setHistoryIndex(indexRef.current);
  }, []);

  const commitSnapshot = useCallback(
    (snapshotToCommit: GridSnapshot) => {
      const current = historyRef.current[indexRef.current];
      if (current && areSnapshotsEqual(current, snapshotToCommit)) return;

      const next = [
        ...historyRef.current.slice(0, indexRef.current + 1),
        {
          grid: cloneGrid(snapshotToCommit.grid),
          preserveBr: clonePreserveBr(snapshotToCommit.preserveBr),
        },
      ].slice(-maxHistory);
      replaceHistory(next);
    },
    [maxHistory, replaceHistory],
  );

  const flushPendingSnapshot = useCallback(() => {
    if (!debounceTimerRef.current) return;
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
    commitSnapshot({
      grid: gridRef.current,
      preserveBr: preserveBrRef.current,
    });
  }, [commitSnapshot]);

  const updateGrid = useCallback(
    (newGrid: string[][], isTyping = false) => {
      if (!isTyping) flushPendingSnapshot();

      const nextSnapshot = createSnapshot(newGrid, preserveBrRef.current);
      gridRef.current = nextSnapshot.grid;
      preserveBrRef.current = nextSnapshot.preserveBr;
      setGridState(nextSnapshot.grid);
      setPreserveBrState(nextSnapshot.preserveBr);

      if (isTyping) {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          commitSnapshot({
            grid: gridRef.current,
            preserveBr: preserveBrRef.current,
          });
          debounceTimerRef.current = null;
        }, 500);
        return;
      }

      commitSnapshot(nextSnapshot);
    },
    [commitSnapshot, flushPendingSnapshot],
  );

  const commitPaste = useCallback(
    (rawGrid: string[][], cleanedGrid: string[][]) => {
      flushPendingSnapshot();

      const next = historyRef.current.slice(0, indexRef.current + 1);
      const append = (candidate: GridSnapshot) => {
        const previous = next[next.length - 1];
        if (!previous || !areSnapshotsEqual(previous, candidate)) {
          next.push({
            grid: cloneGrid(candidate.grid),
            preserveBr: clonePreserveBr(candidate.preserveBr),
          });
        }
      };
      const rawSnapshot = createSnapshot(rawGrid, preserveBrRef.current);
      const cleanedSnapshot = createSnapshot(cleanedGrid, rawSnapshot.preserveBr);
      append(rawSnapshot);
      append(cleanedSnapshot);

      const bounded = next.slice(-maxHistory);
      gridRef.current = cleanedSnapshot.grid;
      preserveBrRef.current = cleanedSnapshot.preserveBr;
      setGridState(cleanedSnapshot.grid);
      setPreserveBrState(cleanedSnapshot.preserveBr);
      replaceHistory(bounded);
    },
    [flushPendingSnapshot, maxHistory, replaceHistory],
  );

  const resetHistory = useCallback(
    (newState: string[][] | GridHistoryState) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      const nextSnapshot =
        'grid' in newState
          ? createSnapshot(newState.grid, newState.preserveBr)
          : createSnapshot(newState);
      gridRef.current = nextSnapshot.grid;
      preserveBrRef.current = nextSnapshot.preserveBr;
      setGridState(nextSnapshot.grid);
      setPreserveBrState(nextSnapshot.preserveBr);
      replaceHistory([nextSnapshot]);
    },
    [replaceHistory],
  );

  const undo = useCallback((): boolean => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const committedCurrent = historyRef.current[indexRef.current];
    const currentSnapshot = {
      grid: gridRef.current,
      preserveBr: preserveBrRef.current,
    };
    if (committedCurrent && !areSnapshotsEqual(currentSnapshot, committedCurrent)) {
      const restored = {
        grid: cloneGrid(committedCurrent.grid),
        preserveBr: clonePreserveBr(committedCurrent.preserveBr),
      };
      gridRef.current = restored.grid;
      preserveBrRef.current = restored.preserveBr;
      setGridState(restored.grid);
      setPreserveBrState(restored.preserveBr);
      return true;
    }

    if (indexRef.current === 0) return false;
    const targetIndex = indexRef.current - 1;
    indexRef.current = targetIndex;
    const restoredSnapshot = historyRef.current[targetIndex];
    const restoredGrid = cloneGrid(restoredSnapshot.grid);
    const restoredPreserveBr = clonePreserveBr(restoredSnapshot.preserveBr);
    gridRef.current = restoredGrid;
    preserveBrRef.current = restoredPreserveBr;
    setHistoryIndex(targetIndex);
    setGridState(restoredGrid);
    setPreserveBrState(restoredPreserveBr);
    return true;
  }, []);

  const redo = useCallback((): boolean => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (indexRef.current >= historyRef.current.length - 1) return false;
    const targetIndex = indexRef.current + 1;
    indexRef.current = targetIndex;
    const restoredSnapshot = historyRef.current[targetIndex];
    const restoredGrid = cloneGrid(restoredSnapshot.grid);
    const restoredPreserveBr = clonePreserveBr(restoredSnapshot.preserveBr);
    gridRef.current = restoredGrid;
    preserveBrRef.current = restoredPreserveBr;
    setHistoryIndex(targetIndex);
    setGridState(restoredGrid);
    setPreserveBrState(restoredPreserveBr);
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
        !areSnapshotsEqual(
          { grid, preserveBr },
          historyRef.current[historyIndex],
        )),
    [grid, historyIndex, preserveBr],
  );
  const canRedo = useMemo(() => historyIndex < history.length - 1, [historyIndex, history.length]);

  return {
    grid,
    preserveBr,
    updateGrid,
    commitPaste,
    resetHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    historyIndex,
    historyLength: history.length,
  };
}
