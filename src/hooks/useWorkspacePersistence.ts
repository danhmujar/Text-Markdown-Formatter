import { useCallback, useEffect, useRef, useState } from 'react';
import type { GridHistoryState } from './useGridHistory';

export const WORKSPACE_STORAGE_KEY = 'text-markdown-formatter:workspace';
export const WORKSPACE_STORAGE_VERSION = 1;
const FALLBACK: GridHistoryState = { grid: [['']], outputOverrides: {} };

function isValidWorkspace(value: unknown): value is GridHistoryState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { version?: unknown; grid?: unknown; outputOverrides?: unknown };
  if (candidate.version !== WORKSPACE_STORAGE_VERSION || !Array.isArray(candidate.grid))
    return false;
  if (
    !candidate.grid.length ||
    candidate.grid.some(
      (row) => !Array.isArray(row) || row.some((cell) => typeof cell !== 'string'),
    )
  )
    return false;
  if (
    !candidate.outputOverrides ||
    typeof candidate.outputOverrides !== 'object' ||
    Array.isArray(candidate.outputOverrides)
  )
    return false;
  return Object.values(candidate.outputOverrides).every((entry) => typeof entry === 'string');
}

export function readWorkspace(): GridHistoryState {
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return FALLBACK;
    const parsed = JSON.parse(raw);
    if (!isValidWorkspace(parsed)) return FALLBACK;
    return {
      grid: parsed.grid.map((row) => [...row]),
      outputOverrides: { ...parsed.outputOverrides },
    };
  } catch {
    return FALLBACK;
  }
}

export function useWorkspacePersistence(
  grid: string[][],
  outputOverrides: Record<string, string>,
  initialState: GridHistoryState = readWorkspace(),
) {
  const [restoredState] = useState<GridHistoryState>(() => ({
    grid: initialState.grid.map((row) => [...row]),
    outputOverrides: { ...initialState.outputOverrides },
  }));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextPersistRef = useRef(false);
  const clearStorage = useCallback(() => {
    clearTimeout(timerRef.current ?? undefined);
    timerRef.current = null;
    skipNextPersistRef.current = true;
    try {
      window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    } catch {
      // Storage is optional.
    }
  }, []);

  useEffect(() => {
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    clearTimeout(timerRef.current ?? undefined);
    timerRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(
          WORKSPACE_STORAGE_KEY,
          JSON.stringify({ version: WORKSPACE_STORAGE_VERSION, grid, outputOverrides }),
        );
      } catch {
        // Storage is optional.
      }
      timerRef.current = null;
    }, 400);
    return () => {
      clearTimeout(timerRef.current ?? undefined);
      timerRef.current = null;
    };
  }, [grid, outputOverrides]);

  return { initialState: restoredState, clearStorage };
}
