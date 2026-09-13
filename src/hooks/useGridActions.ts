import { useMemo, useState } from 'react';
import type { ClipboardEvent as ReactClipboardEvent } from 'react';
import {
  parsePasteToGrid,
  sanitizeInputText,
  smartCleanupMarkdown,
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

  const totalStats = useMemo(() => {
    let totalChars = 0;
    let totalWords = 0;
    let totalWarnings = 0;
    grid.forEach((row) => {
      row.forEach((cell) => {
        totalChars += cell.length;
        const trimmed = cell.trim();
        if (!trimmed) return;
        totalWords += trimmed.split(/\s+/).length;
        totalWarnings += analyzeSyntaxWarnings(cell).length;
      });
    });
    return { totalChars, totalWords, totalWarnings };
  }, [grid]);

  const showCleanupNotification = (message: string) => {
    setCleanupNotification(message);
    setTimeout(() => setCleanupNotification(null), 3000);
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string, isTyping = true) => {
    onChangeGrid(
      grid.map((row, r) => row.map((cell, c) => (r === rowIndex && c === colIndex ? value : cell))),
      isTyping,
    );
  };

  const handleClearCell = (rowIndex: number, colIndex: number) => {
    handleCellChange(rowIndex, colIndex, '', false);
  };

  const handleSmartCleanupCell = (rowIndex: number, colIndex: number) => {
    const current = grid[rowIndex]?.[colIndex] || '';
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
  };

  const handleSmartCleanupAll = () => {
    let totalFixes = 0;
    const nextGrid = grid.map((row) =>
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
  };

  const handlePasteOnCell = (
    event: ReactClipboardEvent<HTMLTextAreaElement>,
    rowIndex: number,
    colIndex: number,
  ): boolean => {
    const text = event.clipboardData.getData('text/plain');
    if (!text) return false;
    const html = event.clipboardData.getData('text/html');
    const parsedMatrix = parsePasteToGrid(text, html);

    event.preventDefault();
    if (parsedMatrix && (parsedMatrix.length > 1 || parsedMatrix[0].length > 1)) {
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
    const current = grid[rowIndex]?.[colIndex] || '';
    const before = current.substring(0, textarea.selectionStart);
    const after = current.substring(textarea.selectionEnd);
    const cleanedPaste = sanitizeInputText(text);
    const rawGrid = grid.map((row) => [...row]);
    const cleanedGrid = grid.map((row) => [...row]);
    rawGrid[rowIndex][colIndex] = before + text + after;
    cleanedGrid[rowIndex][colIndex] = before + cleanedPaste + after;
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
  };

  const setSingleLayout = () => onChangeGrid([[grid[0]?.[0] || '']], false);
  const setLeftRightLayout = () =>
    onChangeGrid([[grid[0]?.[0] || '', grid[0]?.[1] || grid[1]?.[0] || '']], false);
  const setUpDownLayout = () =>
    onChangeGrid([[grid[0]?.[0] || ''], [grid[1]?.[0] || grid[0]?.[1] || '']], false);
  const set2x2Layout = () =>
    onChangeGrid(
      [
        [grid[0]?.[0] || '', grid[0]?.[1] || ''],
        [grid[1]?.[0] || '', grid[1]?.[1] || ''],
      ],
      false,
    );
  const addColumnRight = () =>
    onChangeGrid(
      grid.map((row) => [...row, '']),
      false,
    );
  const addRowDown = () => onChangeGrid([...grid, new Array(numCols).fill('')], false);

  const getCellLabel = (rowIndex: number, colIndex: number) => {
    if (numRows === 1 && numCols === 2) return colIndex === 0 ? 'Left' : 'Right';
    if (numRows === 2 && numCols === 1) return rowIndex === 0 ? 'Top' : 'Bottom';
    if (numRows === 1 && numCols === 1) return 'Cleaned Text';
    return `R${rowIndex + 1} : C${colIndex + 1}`;
  };

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
