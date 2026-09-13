import { useCallback, useEffect, useRef, useState } from 'react';
import type { GridHistoryState } from './useGridHistory';

export const WORKSPACE_STORAGE_KEY = 'text-markdown-formatter:workspace';
export const WORKSPACE_STORAGE_VERSION = 2;
const FALLBACK: GridHistoryState = { grid: [['']] };

function isValidGrid(value: unknown): value is string[][] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (row) =>
        Array.isArray(row) && row.length > 0 && row.every((cell) => typeof cell === 'string'),
    )
  );
}

function migrateVersionOne(grid: string[][], overrides: unknown): string[][] | null {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return null;
  if (!Object.values(overrides).every((entry) => typeof entry === 'string')) return null;

  const migrated = grid.map((row) => [...row]);
  for (const [key, value] of Object.entries(overrides)) {
    const match = /^(\d+)-(\d+)$/.exec(key);
    if (!match) continue;
    const rowIndex = Number(match[1]);
    const colIndex = Number(match[2]);
    if (migrated[rowIndex]?.[colIndex] !== undefined)
      migrated[rowIndex][colIndex] = value as string;
  }
  return migrated;
}

export function readWorkspace(): GridHistoryState {
  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return FALLBACK;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return FALLBACK;

    const candidate = parsed as {
      version?: unknown;
      grid?: unknown;
      outputOverrides?: unknown;
    };
    if (!isValidGrid(candidate.grid)) return FALLBACK;
    if (candidate.version === WORKSPACE_STORAGE_VERSION) {
      return { grid: candidate.grid.map((row) => [...row]) };
    }
    if (candidate.version === 1) {
      const migrated = migrateVersionOne(candidate.grid, candidate.outputOverrides);
      return migrated ? { grid: migrated } : FALLBACK;
    }
    return FALLBACK;
  } catch {
    return FALLBACK;
  }
}

export function useWorkspacePersistence(
  grid: string[][],
  initialState: GridHistoryState = readWorkspace(),
) {
  const [restoredState] = useState<GridHistoryState>(() => ({
    grid: initialState.grid.map((row) => [...row]),
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
          JSON.stringify({ version: WORKSPACE_STORAGE_VERSION, grid }),
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
  }, [grid]);

  return { initialState: restoredState, clearStorage };
}
