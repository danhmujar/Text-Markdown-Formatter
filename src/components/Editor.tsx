import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  Columns,
  Rows,
  Grid2X2,
  Square,
  Sparkles,
  Check,
  Minimize2,
  ArrowRight,
  AlertTriangle,
  Settings2,
  ChevronDown,
} from 'lucide-react';
import {
  parsePasteToGrid,
  sanitizeInputText,
  smartCleanupMarkdown,
} from '../utils/markdownFormatter';
import { analyzeSyntaxWarnings } from '../utils/syntaxValidator';
import { EditorCell } from './EditorCell';
import { ThemeMode } from '../types';

interface EditorProps {
  grid: string[][];
  onChangeGrid: (newGrid: string[][], isTyping?: boolean) => void;
  theme?: ThemeMode;
  isFocusMode?: boolean;
  onExitFocus?: () => void;
  onSwitchFocus?: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  grid,
  onChangeGrid,
  theme = 'dark',
  isFocusMode = false,
  onExitFocus,
  onSwitchFocus,
}) => {
  const isDark = theme === 'dark';
  const numRows = grid.length;
  const numCols = Math.max(...grid.map((r) => r.length), 1);
  const [cleanupNotification, setCleanupNotification] = useState<string | null>(null);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const settingsPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSettingsPanel) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsPanelRef.current && !settingsPanelRef.current.contains(e.target as Node)) {
        setShowSettingsPanel(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSettingsPanel(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showSettingsPanel]);

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
    e: React.ClipboardEvent<HTMLTextAreaElement>,
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

  return (
    <div
      className={`flex flex-col h-full overflow-hidden transition-colors ${
        isDark ? 'bg-slate-900' : 'bg-slate-50'
      }`}
    >
      {/* Header bar with Clean Layout controls - Balanced height and padding */}
      <div
        className={`h-12 px-4 border-b flex items-center justify-between gap-3 text-xs shrink-0 transition-colors ${
          isDark ? 'bg-slate-850 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            Input
          </span>
          <span
            className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
              isDark
                ? 'bg-slate-800 text-blue-300 border-slate-700'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}
          >
            {numRows} × {numCols}
          </span>

          {/* Aggregate Stats Badges */}
          <span
            id="total-input-char-badge"
            className={`hidden md:inline-flex text-[11px] font-mono px-2 py-0.5 rounded border ${
              isDark
                ? 'bg-slate-800/80 text-slate-300 border-slate-700'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title={`Total across all cells: ${totalStats.totalChars.toLocaleString()} characters, ${totalStats.totalWords.toLocaleString()} words`}
          >
            {totalStats.totalChars.toLocaleString()}{' '}
            <span className="font-sans font-normal text-[10px] text-slate-400 ml-0.5">chars</span>
          </span>

          {/* Grid-Wide Warning Alert Badge */}
          {totalStats.totalWarnings > 0 && (
            <span
              id="grid-total-warnings-badge"
              className={`flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full border animate-pulse ${
                isDark
                  ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                  : 'bg-amber-50 border-amber-300 text-amber-800'
              }`}
              title={`${totalStats.totalWarnings} syntax warnings across editor cells`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              <span>
                {totalStats.totalWarnings} {totalStats.totalWarnings === 1 ? 'Warning' : 'Warnings'}
              </span>
            </span>
          )}

          {isFocusMode && (
            <div className="flex items-center gap-1.5 ml-1">
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  isDark
                    ? 'bg-blue-950/80 border-blue-600/60 text-blue-300'
                    : 'bg-blue-100/80 border-blue-300 text-blue-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                Focus Active
              </span>
              {onSwitchFocus && (
                <button
                  id="focus-switch-to-output-btn"
                  onClick={onSwitchFocus}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition cursor-pointer active:scale-95 ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
                  }`}
                  title="Switch Focus to Output container"
                >
                  <span>Output</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              )}
              {onExitFocus && (
                <button
                  id="focus-exit-split-btn"
                  onClick={onExitFocus}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition cursor-pointer active:scale-95 ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
                  }`}
                  title="Exit Focus Mode and return to Split View (Esc)"
                >
                  <Minimize2 className="w-3 h-3" />
                  <span>Split View</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Smart Cleanup + Settings dropdown (Layout presets & Grid growers hidden inside) */}
        <div className="flex items-center gap-2">
          {/* Smart Cleanup All Button — stays visible in header */}
          <button
            id="smart-cleanup-all-btn"
            onClick={handleSmartCleanupAll}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition shadow-2xs cursor-pointer active:scale-95 ${
              isDark
                ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-300 hover:bg-indigo-900/60 hover:text-indigo-200'
                : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800'
            }`}
            title="Automatically standardize quotes, strip redundant whitespace, and fix markdown syntax across all input cells"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Smart Cleanup</span>
          </button>

          {/* Settings trigger + floating panel */}
          <div ref={settingsPanelRef} className="relative">
            <button
              id="editor-settings-btn"
              onClick={() => setShowSettingsPanel((v) => !v)}
              aria-expanded={showSettingsPanel}
              aria-haspopup="dialog"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition cursor-pointer active:scale-95 ${
                showSettingsPanel
                  ? isDark
                    ? 'bg-slate-800 border-slate-600 text-white shadow-sm'
                    : 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                    : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200 shadow-xs'
              }`}
              title="Layout & grid settings"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Settings</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-200 ${showSettingsPanel ? 'rotate-180' : ''}`}
              />
            </button>

            {showSettingsPanel && (
              <div
                id="editor-settings-panel"
                role="dialog"
                aria-label="Layout & grid settings"
                className={`absolute right-0 top-full mt-2 w-72 rounded-lg border shadow-xl z-30 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}
              >
                <div className="p-3 space-y-3">
                  {/* Layout presets */}
                  <div>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                      Layout
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                      <button
                        id="layout-single-btn"
                        onClick={setSingleLayout}
                        className={`px-2.5 py-2 rounded-md flex items-center justify-center gap-1.5 text-[11px] font-medium border transition cursor-pointer active:scale-[0.98] ${
                          numRows === 1 && numCols === 1
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : isDark
                              ? 'bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="1 Cell (Single Container)"
                      >
                        <Square className="w-3 h-3" />
                        <span>1×1</span>
                      </button>
                      <button
                        id="layout-2x2-btn"
                        onClick={set2x2Layout}
                        className={`px-2.5 py-2 rounded-md flex items-center justify-center gap-1.5 text-[11px] font-medium border transition cursor-pointer active:scale-[0.98] ${
                          numRows === 2 && numCols === 2
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : isDark
                              ? 'bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="2x2 Grid (4 Cells)"
                      >
                        <Grid2X2 className="w-3 h-3 text-amber-400" />
                        <span>2×2</span>
                      </button>
                      <button
                        id="layout-left-right-btn"
                        onClick={setLeftRightLayout}
                        className={`px-2.5 py-2 rounded-md flex items-center justify-center gap-1.5 text-[11px] font-medium border transition cursor-pointer active:scale-[0.98] ${
                          numRows === 1 && numCols === 2
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : isDark
                              ? 'bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="2 Cells Side-by-Side (Left & Right)"
                      >
                        <Columns className="w-3 h-3 text-cyan-400" />
                        <span>Left &amp; Right</span>
                      </button>
                      <button
                        id="layout-up-down-btn"
                        onClick={setUpDownLayout}
                        className={`px-2.5 py-2 rounded-md flex items-center justify-center gap-1.5 text-[11px] font-medium border transition cursor-pointer active:scale-[0.98] ${
                          numRows === 2 && numCols === 1
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : isDark
                              ? 'bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="2 Cells Stacked (Up & Down)"
                      >
                        <Rows className="w-3 h-3 text-emerald-400" />
                        <span>Up &amp; Down</span>
                      </button>
                    </div>
                  </div>

                  <div className={`h-px ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

                  {/* Grow grid */}
                  <div>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                      Grid
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                      <button
                        id="add-column-btn"
                        onClick={addColumnRight}
                        className={`px-2.5 py-2 rounded-md border flex items-center justify-center gap-1.5 text-[11px] font-medium transition cursor-pointer active:scale-[0.98] ${
                          isDark
                            ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-200 border-slate-600'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                        }`}
                        title="Add Column to the Right"
                      >
                        <Plus className="w-3 h-3 text-cyan-500" />
                        <span>+ Col</span>
                      </button>
                      <button
                        id="add-row-btn"
                        onClick={addRowDown}
                        className={`px-2.5 py-2 rounded-md border flex items-center justify-center gap-1.5 text-[11px] font-medium transition cursor-pointer active:scale-[0.98] ${
                          isDark
                            ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-200 border-slate-600'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                        }`}
                        title="Add Row Down"
                      >
                        <Plus className="w-3 h-3 text-emerald-500" />
                        <span>+ Row</span>
                      </button>
                    </div>
                    <p
                      className={`mt-1.5 text-[10px] leading-snug ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                    >
                      Presets keep content; + adds an empty row/col.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating or Inline Toast Notification for Smart Cleanup */}
      {cleanupNotification && (
        <div
          className={`px-4 py-2 text-xs border-b flex items-center gap-2 animate-in fade-in duration-200 ${
            isDark
              ? 'bg-indigo-950/80 border-indigo-800/80 text-indigo-200'
              : 'bg-indigo-50 border-indigo-200 text-indigo-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="font-medium flex-1">{cleanupNotification}</span>
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        </div>
      )}

      {/* Grid of Input Cell Containers */}
      <div
        className={`flex-1 overflow-hidden p-3 transition-colors ${
          isDark ? 'bg-slate-950/40' : 'bg-slate-100/60'
        }`}
      >
        <div
          className="grid gap-3 h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))`,
          }}
        >
          {grid.map((row, r) =>
            row.map((cellValue, c) => (
              <EditorCell
                key={`cell-container-${r}-${c}`}
                rowIndex={r}
                colIndex={c}
                cellValue={cellValue}
                label={getCellLabel(r, c)}
                isDark={isDark}
                onCellChange={handleCellChange}
                onClearCell={handleClearCell}
                onSmartCleanupCell={handleSmartCleanupCell}
                onPasteOnCell={handlePasteOnCell}
              />
            )),
          )}
        </div>
      </div>
    </div>
  );
};
