import { useMemo, useState } from 'react';
import type { ClipboardEvent as ReactClipboardEvent } from 'react';
import {
  parsePasteToGrid,
  sanitizeInputText,
  smartCleanupMarkdown,
} from '../utils/markdownFormatter';
import { analyzeSyntaxWarnings } from '../utils/syntaxValidator';

interface UseGridActionsArgs {
  grid: string[][];
  onChangeGrid: (newGrid: string[][], isTyping?: boolean) => void;
  numRows: number;
  numCols: number;
}

export function useGridActions({ grid, onChangeGrid, numRows, numCols }: UseGridActionsArgs) {
  const [cleanupNotification, setCleanupNotification] = useState<string | null>(null);

  // Calculate total characters, words, and warnings across entire grid
  const totalStats = useMemo(() => {
    let totalChars = 0;
    let totalWords = 0;
    let totalWarnings = 0;

    grid.forEach((row) => {
      row.forEach((cell) => {
        totalChars += cell.length;
        const trimmed = cell.trim();
        if (trimmed) {
          totalWords += trimmed.split(/\s+/).length;
          const warnings = analyzeSyntaxWarnings(cell);
          totalWarnings += warnings.length;
        }
      });
    });

    return { totalChars, totalWords, totalWarnings };
  }, [grid]);

  // Update a single cell
  const handleCellChange = (rowIndex: number, colIndex: number, val: string, isTyping = true) => {
    const nextGrid = grid.map((row, r) =>
      row.map((cell, c) => (r === rowIndex && c === colIndex ? val : cell)),
    );
    onChangeGrid(nextGrid, isTyping);
  };

  // Clear single cell
  const handleClearCell = (rowIndex: number, colIndex: number) => {
    handleCellChange(rowIndex, colIndex, '', false);
  };

  // Smart Cleanup on a specific cell
  const handleSmartCleanupCell = (rowIndex: number, colIndex: number) => {
    const current = grid[rowIndex]?.[colIndex] || '';
    if (!current.trim()) return;
    const report = smartCleanupMarkdown(current);
    if (report.hasChanges) {
      handleCellChange(rowIndex, colIndex, report.cleaned, false);
      showCleanupNotification(
        `Cleaned ${getCellLabel(rowIndex, colIndex)}: Fixed ${report.fixesCount} syntax item(s)`,
      );
    } else {
      showCleanupNotification(
        `${getCellLabel(rowIndex, colIndex)} is already clean and standardized`,
      );
    }
  };

  // Smart Cleanup on the entire grid
  const handleSmartCleanupAll = () => {
    let totalFixes = 0;
    let anyChanges = false;
    const nextGrid = grid.map((row) =>
      row.map((cell) => {
        if (!cell.trim()) return cell;
        const report = smartCleanupMarkdown(cell);
        if (report.hasChanges) {
          anyChanges = true;
          totalFixes += report.fixesCount;
          return report.cleaned;
        }
        return cell;
      }),
    );

    if (anyChanges) {
      onChangeGrid(nextGrid, false);
      showCleanupNotification(
        `Smart Cleanup: Standardized quotes, spaces & syntax (${totalFixes} fixes)`,
      );
    } else {
      showCleanupNotification('All markdown text is already clean and standardized');
    }
  };

  const showCleanupNotification = (msg: string) => {
    setCleanupNotification(msg);
    setTimeout(() => {
      setCleanupNotification(null);
    }, 3000);
  };

  // Global paste handler: detects if multiple cells (tabs or rows) were pasted or cleans single cell paste
  const handlePasteOnCell = (
    e: ReactClipboardEvent<HTMLTextAreaElement>,
    rowIndex: number,
    colIndex: number,
  ) => {
    const text = e.clipboardData.getData('text/plain');
    const html = e.clipboardData.getData('text/html');

    const parsedMatrix = parsePasteToGrid(text, html);

    if (parsedMatrix && (parsedMatrix.length > 1 || parsedMatrix[0].length > 1)) {
      e.preventDefault();
      // Sanitize each cell inside the matrix
      const sanitizedMatrix = parsedMatrix.map((row) => row.map((cell) => sanitizeInputText(cell)));
      onChangeGrid(sanitizedMatrix, false);
      showCleanupNotification('Pasted and cleaned table matrix');
    } else if (text) {
      // Check if text contains metadata, encoded entities, or excessive spaces
      const sanitized = sanitizeInputText(text);
      if (sanitized !== text) {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentVal = grid[rowIndex]?.[colIndex] || '';
        const newVal = currentVal.substring(0, start) + sanitized + currentVal.substring(end);
        handleCellChange(rowIndex, colIndex, newVal, false);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + sanitized.length, start + sanitized.length);
        }, 0);
      }
    }
  };

  // Layout presets
  const setSingleLayout = () => {
    const firstCell = grid[0]?.[0] || '';
    onChangeGrid([[firstCell]], false);
  };

  const setLeftRightLayout = () => {
    const cell1 = grid[0]?.[0] || '';
    const cell2 = grid[0]?.[1] || grid[1]?.[0] || '';
    onChangeGrid([[cell1, cell2]], false);
  };

  const setUpDownLayout = () => {
    const cell1 = grid[0]?.[0] || '';
    const cell2 = grid[1]?.[0] || grid[0]?.[1] || '';
    onChangeGrid([[cell1], [cell2]], false);
  };

  const set2x2Layout = () => {
    const c00 = grid[0]?.[0] || '';
    const c01 = grid[0]?.[1] || '';
    const c10 = grid[1]?.[0] || '';
    const c11 = grid[1]?.[1] || '';
    onChangeGrid(
      [
        [c00, c01],
        [c10, c11],
      ],
      false,
    );
  };

  const addColumnRight = () => {
    const nextGrid = grid.map((row) => [...row, '']);
    onChangeGrid(nextGrid, false);
  };

  const addRowDown = () => {
    const emptyRow = new Array(numCols).fill('');
    onChangeGrid([...grid, emptyRow], false);
  };

  const getCellLabel = (r: number, c: number) => {
    if (numRows === 1 && numCols === 2) {
      return c === 0 ? 'Left' : 'Right';
    }
    if (numRows === 2 && numCols === 1) {
      return r === 0 ? 'Top' : 'Bottom';
    }
    if (numRows === 1 && numCols === 1) {
      return 'Input';
    }
    return `R${r + 1} : C${c + 1}`;
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
