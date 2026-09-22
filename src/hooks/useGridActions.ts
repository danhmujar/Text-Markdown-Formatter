import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import type { ClipboardEvent as ReactClipboardEvent } from 'react';
import {
  parsePasteToGrid,
  isGridWithinLimits,
  isPasteWithinLimits,
  sanitizeInputText,
  smartCleanupMarkdown,
  convertBrToNewlines,
} from '../utils/markdownFormatter';
import { analyzeSyntaxWarnings } from '../utils/syntaxValidator';
import { showToast } from '../components/Toast';
import { logger } from '../utils/logger';

interface UseGridActionsArgs {
  grid: string[][];
  onChangeGrid: (newGrid: string[][], isTyping?: boolean) => void;
  onCommitPaste: (rawGrid: string[][], cleanedGrid: string[][]) => void;
  numRows: number;
  numCols: number;
}

export function useGridActions({
  grid,
  onChangeGrid,
  onCommitPaste,
  numRows,
  numCols,
}: UseGridActionsArgs) {
  const [cleanupNotification, setCleanupNotification] = useState<string | null>(null);
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const deferredGrid = useDeferredValue(grid);

  const totalStats = useMemo(() => {
    let totalChars = 0;
    let totalWords = 0;
    let totalWarnings = 0;
    deferredGrid.forEach((row) => {
      row.forEach((cell) => {
        totalChars += cell.length;
        const trimmed = cell.trim();
        if (!trimmed) return;
        totalWords += trimmed.split(/\s+/).length;
        totalWarnings += analyzeSyntaxWarnings(cell).length;
      });
    });
    return { totalChars, totalWords, totalWarnings };
  }, [deferredGrid]);

  const showCleanupNotification = useCallback((message: string) => {
    setCleanupNotification(message);
    setTimeout(() => setCleanupNotification(null), 3000);
  }, []);

  const getCellLabel = useCallback(
    (rowIndex: number, colIndex: number) => {
      if (numRows === 1 && numCols === 2) return colIndex === 0 ? 'Left' : 'Right';
      if (numRows === 2 && numCols === 1) return rowIndex === 0 ? 'Top' : 'Bottom';
      if (numRows === 1 && numCols === 1) return 'Cleaned Text';
      return `R${rowIndex + 1} : C${colIndex + 1}`;
    },
    [numCols, numRows],
  );

  const handleCellChange = useCallback(
    (rowIndex: number, colIndex: number, value: string, isTyping = true) => {
      const nextGrid = gridRef.current.map((row, r) =>
        row.map((cell, c) => (r === rowIndex && c === colIndex ? value : cell)),
      );
      if (!isGridWithinLimits(nextGrid)) {
        showToast('Workspace limit reached. Remove some content before adding more.', 'error');
        return;
      }
      onChangeGrid(nextGrid, isTyping);
    },
    [onChangeGrid],
  );

  const handleClearCell = useCallback(
    (rowIndex: number, colIndex: number) => {
      handleCellChange(rowIndex, colIndex, '', false);
    },
    [handleCellChange],
  );

  const handleSmartCleanupCell = useCallback(
    (rowIndex: number, colIndex: number) => {
      const current = gridRef.current[rowIndex]?.[colIndex] || '';
      if (!current.trim()) return;
      const report = smartCleanupMarkdown(current);
      if (report.hasChanges) {
        handleCellChange(rowIndex, colIndex, report.cleaned, false);
        showCleanupNotification(
          `Cleaned ${getCellLabel(rowIndex, colIndex)}: Fixed ${report.fixesCount} syntax item(s)`,
        );
        return;
      }
      showCleanupNotification(
        `${getCellLabel(rowIndex, colIndex)} is already clean and standardized`,
      );
    },
    [getCellLabel, handleCellChange, showCleanupNotification],
  );

  const handleSmartCleanupAll = useCallback(() => {
    let totalFixes = 0;
    const nextGrid = gridRef.current.map((row) =>
      row.map((cell) => {
        if (!cell.trim()) return cell;
        const report = smartCleanupMarkdown(cell);
        totalFixes += report.fixesCount;
        return report.cleaned;
      }),
    );
    if (totalFixes > 0) {
      onChangeGrid(nextGrid, false);
      showCleanupNotification(
        `Smart Cleanup: Standardized quotes, spaces & syntax (${totalFixes} fixes)`,
      );
      return;
    }
    showCleanupNotification('All markdown text is already clean and standardized');
  }, [onChangeGrid, showCleanupNotification]);

  const handlePasteOnCell = useCallback(
    (
      event: ReactClipboardEvent<HTMLTextAreaElement>,
      rowIndex: number,
      colIndex: number,
    ): boolean => {
      const text = event.clipboardData.getData('text/plain');
      if (!text) return false;
      const html = event.clipboardData.getData('text/html');
      if (!isPasteWithinLimits(text)) {
        event.preventDefault();
        showToast('Paste is too large. Paste a smaller selection.', 'error');
        return true;
      }
      const parsedMatrix = parsePasteToGrid(text, html);

      event.preventDefault();
      if (parsedMatrix && (parsedMatrix.length > 1 || parsedMatrix[0].length > 1)) {
        if (!isGridWithinLimits(parsedMatrix)) {
          showToast('Paste is too large. Paste a smaller selection.', 'error');
          return true;
        }
        const cleanedMatrix = parsedMatrix.map((row) => row.map((cell) => sanitizeInputText(cell)));
        onCommitPaste(parsedMatrix, cleanedMatrix);
        showCleanupNotification('Pasted and cleaned table matrix');
        return true;
      }

      if (parsedMatrix === null && html && html.includes('<table')) {
        logger.warn('Table parse failed, using text fallback');
        showToast('Table parse failed, using text fallback', 'error');
      }

      const textarea = event.currentTarget;
      const currentGrid = gridRef.current;
      const current = convertBrToNewlines(currentGrid[rowIndex]?.[colIndex] || '');
      const before = current.substring(0, textarea.selectionStart);
      const after = current.substring(textarea.selectionEnd);
      const cleanedPaste = sanitizeInputText(text);
      const rawGrid = currentGrid.map((row) => [...row]);
      const cleanedGrid = currentGrid.map((row) => [...row]);
      rawGrid[rowIndex][colIndex] = before + text + after;
      cleanedGrid[rowIndex][colIndex] = before + cleanedPaste + after;
      if (!isGridWithinLimits(rawGrid)) {
        showToast('Paste is too large. Paste a smaller selection.', 'error');
        return true;
      }
      onCommitPaste(rawGrid, cleanedGrid);

      const rawLineBreaks = text.replace(/\r\n?/g, '\n').split('\n').length - 1;
      const cleanedLineBreaks = cleanedPaste.replace(/\r\n?/g, '\n').split('\n').length - 1;
      const removedLineBreaks = rawLineBreaks - cleanedLineBreaks;
      if (removedLineBreaks > 0) {
        showCleanupNotification(
          `Removed ${removedLineBreaks} accidental line ${removedLineBreaks === 1 ? 'break' : 'breaks'}`,
        );
      } else if (cleanedPaste !== text) {
        showCleanupNotification('Pasted and cleaned text');
      }
      return true;
    },
    [onCommitPaste, showCleanupNotification],
  );

  const applyPreset = useCallback(
    (nextGrid: string[][]) => {
      const retainedContent = new Map<string, number>();
      nextGrid.flat().forEach((cell) => {
        if (cell.trim()) retainedContent.set(cell, (retainedContent.get(cell) ?? 0) + 1);
      });
      const removesContent = gridRef.current.flat().some((cell) => {
        if (!cell.trim()) return false;
        const count = retainedContent.get(cell) ?? 0;
        if (count === 0) return true;
        retainedContent.set(cell, count - 1);
        return false;
      });
      if (
        removesContent &&
        !window.confirm(
          'This layout will remove content from cells outside the new layout. Continue?',
        )
      ) {
        return;
      }
      onChangeGrid(nextGrid, false);
    },
    [onChangeGrid],
  );

  const setSingleLayout = useCallback(() => {
    const current = gridRef.current;
    applyPreset([[current[0]?.[0] || '']]);
  }, [applyPreset]);

  const setLeftRightLayout = useCallback(() => {
    const current = gridRef.current;
    applyPreset([[current[0]?.[0] || '', current[0]?.[1] || current[1]?.[0] || '']]);
  }, [applyPreset]);

  const setUpDownLayout = useCallback(() => {
    const current = gridRef.current;
    applyPreset([[current[0]?.[0] || ''], [current[1]?.[0] || current[0]?.[1] || '']]);
  }, [applyPreset]);

  const set2x2Layout = useCallback(() => {
    const current = gridRef.current;
    applyPreset([
      [current[0]?.[0] || '', current[0]?.[1] || ''],
      [current[1]?.[0] || '', current[1]?.[1] || ''],
    ]);
  }, [applyPreset]);

  const addColumnRight = useCallback(() => {
    const nextGrid = gridRef.current.map((row) => [...row, '']);
    if (!isGridWithinLimits(nextGrid)) {
      showToast('Maximum grid size reached.', 'error');
      return;
    }
    onChangeGrid(nextGrid, false);
  }, [onChangeGrid]);

  const addRowDown = useCallback(() => {
    const nextGrid = [...gridRef.current, new Array(numCols).fill('')];
    if (!isGridWithinLimits(nextGrid)) {
      showToast('Maximum grid size reached.', 'error');
      return;
    }
    onChangeGrid(nextGrid, false);
  }, [numCols, onChangeGrid]);

  return {
    cleanupNotification,
    totalStats,
    handleCellChange,
    handleClearCell,
    handleSmartCleanupCell,
    handleSmartCleanupAll,
    handlePasteOnCell,
    setSingleLayout,
    setLeftRightLayout,
    setUpDownLayout,
    set2x2Layout,
    addColumnRight,
    addRowDown,
    getCellLabel,
  };
}
