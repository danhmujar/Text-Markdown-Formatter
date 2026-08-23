import React, { useMemo, useCallback } from 'react';
import { Copy, Check, Minimize2, ArrowLeft, Table } from 'lucide-react';
import { StyleOptions } from '../types';
import { hasBrTags, isMarkdownTable } from '../utils/markdownFormatter';
import { useOutputActions } from '../hooks/useOutputActions';
import { OutputCell } from './OutputCell';
import { cn } from '../utils/cn';
import { BUTTON_VARIANTS } from './ui';

interface PreviewProps {
  grid: string[][];
  options: StyleOptions;
  getOutputContent: (rowIndex: number, colIndex: number) => string;
  hasOverride: (rowIndex: number, colIndex: number) => boolean;
  onOutputChange: (rowIndex: number, colIndex: number, val: string, isTyping?: boolean) => void;
  onResetOutputCell: (rowIndex: number, colIndex: number) => void;
  onCopyCell: (rowIndex: number, colIndex: number) => void;
  onCopyCellExcel?: (rowIndex: number, colIndex: number) => void;
  onCopyAllGrid: () => void;
  onCopyAllGridExcel?: () => void;
  copiedCell: string | null;
  copiedAll: boolean;
  isFocusMode?: boolean;
  onExitFocus?: () => void;
  onSwitchFocus?: () => void;
}

export const Preview: React.FC<PreviewProps> = React.memo(function Preview({
  grid,
  options,
  getOutputContent,
  hasOverride,
  onOutputChange,
  onResetOutputCell,
  onCopyCell,
  onCopyCellExcel,
  onCopyAllGrid,
  onCopyAllGridExcel,
  copiedCell,
  copiedAll,
  isFocusMode = false,
  onExitFocus,
  onSwitchFocus,
}) {
  const isDark = options.theme === 'dark';
  const numRows = grid.length;
  const numCols = Math.max(...grid.map((r) => r.length), 1);

  const {
    cellModes,
    cellFeedback,
    textareaRefs,
    toggleCellMode,
    handleApplyNumbering,
    handleApplyInlineFormat,
    handleSmartCleanOutputCell,
    handleTextareaKeyDown,
  } = useOutputActions({ getOutputContent, onOutputChange });

  const getCellLabel = useCallback(
    (r: number, c: number) => {
      if (numRows === 1 && numCols === 2) {
        return c === 0 ? 'Left Output' : 'Right Output';
      }
      if (numRows === 2 && numCols === 1) {
        return r === 0 ? 'Top Output' : 'Bottom Output';
      }
      if (numRows === 1 && numCols === 1) {
        return 'Output Area';
      }
      return `Output Cell (${r + 1}, ${c + 1})`;
    },
    [numRows, numCols],
  );

  // Total characters across all output containers
  const totalOutputChars = useMemo(() => {
    let total = 0;
    grid.forEach((row, r) => {
      row.forEach((_, c) => {
        total += getOutputContent(r, c).length;
      });
    });
    return total;
  }, [grid, getOutputContent]);

  return (
    <div
      className="flex flex-col h-full overflow-hidden transition-colors"
      style={{ backgroundColor: 'var(--panel-bg)' }}
    >
      {/* Output Header with Focus Badges & Global Copy */}
      <div
        className="h-12 px-4 border-b flex items-center justify-between gap-3 text-xs shrink-0 transition-colors"
        style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2">
          <h2
            id="output-heading"
            className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
          >
            Output
          </h2>
          <span
            style={{
              backgroundColor: 'var(--accent-bg)',
              color: 'var(--primary-blue)',
              borderColor: 'var(--accent-border)',
            }}
            className="text-[11px] font-mono px-2 py-0.5 rounded border"
          >
            {numRows} × {numCols}
          </span>
          <span
            id="total-output-char-badge"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            style={{
              backgroundColor: 'var(--panel-bg)',
              color: 'var(--text-secondary)',
              borderColor: 'var(--border-color)',
            }}
            className="hidden sm:inline-flex text-[11px] font-mono px-2 py-0.5 rounded border"
            title={`Total output characters: ${totalOutputChars.toLocaleString()}`}
          >
            {totalOutputChars.toLocaleString()}{' '}
            <span
              className={`font-sans font-normal text-[10px] ml-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
            >
              chars
            </span>
          </span>
          {isFocusMode && (
            <div className="flex items-center gap-1.5 ml-1">
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  isDark
                    ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300'
                    : 'bg-emerald-100/80 border-emerald-300 text-emerald-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Focus Active
              </span>
              {onSwitchFocus && (
                <button
                  id="focus-switch-to-input-btn"
                  type="button"
                  onClick={onSwitchFocus}
                  aria-label="Switch focus to Input container"
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none',
                    isDark
                      ? cn(BUTTON_VARIANTS.neutralDark, 'text-slate-300 hover:text-white')
                      : cn(BUTTON_VARIANTS.subtleLight, 'text-slate-700 hover:text-slate-900'),
                  )}
                  title="Switch Focus to Input container"
                >
                  <ArrowLeft
                    aria-hidden="true"
                    focusable="false"
                    className={`w-3 h-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                  />
                  <span>Input</span>
                </button>
              )}
              {onExitFocus && (
                <button
                  id="focus-exit-split-output-btn"
                  type="button"
                  onClick={onExitFocus}
                  aria-label="Exit Focus Mode and return to Split View (Escape)"
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none',
                    isDark
                      ? cn(BUTTON_VARIANTS.neutralDark, 'text-slate-300 hover:text-white')
                      : cn(BUTTON_VARIANTS.subtleLight, 'text-slate-700 hover:text-slate-900'),
                  )}
                  title="Exit Focus Mode and return to Split View (Esc)"
                >
                  <Minimize2 aria-hidden="true" focusable="false" className="w-3 h-3" />
                  <span>Split View</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="copy-all-containers-btn"
            type="button"
            onClick={onCopyAllGrid}
            aria-label="Copy all formatted output to clipboard for Word/Outlook"
            className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-md font-medium text-xs shadow-sm transition active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none hover:brightness-110"
            style={{ backgroundColor: 'var(--primary-blue)' }}
            title="Copy for Word & Outlook — <br> becomes line break in tables"
          >
            {copiedAll ? (
              <>
                <Check
                  aria-hidden="true"
                  focusable="false"
                  className="w-3.5 h-3.5 text-emerald-300"
                />
                <span>Copied All!</span>
              </>
            ) : (
              <>
                <Copy aria-hidden="true" focusable="false" className="w-3.5 h-3.5" />
                <span>Copy All</span>
              </>
            )}
          </button>
          <button
            id="copy-all-excel-btn"
            type="button"
            onClick={onCopyAllGridExcel}
            aria-label="Copy all formatted output for Excel (keeps <br> literal in tables)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium text-xs shadow-sm transition active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none border hover:brightness-110"
            style={{
              backgroundColor: 'var(--panel-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
            }}
            title="Copy for Excel — keeps <br> as text inside table cells"
          >
            <Table aria-hidden="true" focusable="false" className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Grid of Output Containers */}
      <div
        className="flex-1 overflow-hidden p-3 transition-colors"
        style={{ backgroundColor: 'var(--surface-bg)' }}
      >
        <div
          className="grid gap-3 h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))`,
          }}
        >
          {grid.map((row, r) =>
            row.map((_, c) => {
              const cellId = `${r}-${c}`;
              const outputText = getOutputContent(r, c);
              const inputText = grid[r]?.[c] || '';
              const isTable = isMarkdownTable(outputText) || isMarkdownTable(inputText);
              return (
                <OutputCell
                  key={`output-cell-container-${r}-${c}`}
                  rowIndex={r}
                  colIndex={c}
                  label={getCellLabel(r, c)}
                  outputText={outputText}
                  inputHadBr={hasBrTags(inputText) && !isTable}
                  isOverridden={hasOverride(r, c)}
                  options={options}
                  cellMode={cellModes[cellId] ?? 'preview'}
                  isCopied={copiedCell === cellId}
                  feedback={cellFeedback[cellId] ?? null}
                  registerTextarea={(el) => {
                    textareaRefs.current[cellId] = el;
                  }}
                  onToggleMode={() => toggleCellMode(cellId)}
                  onReset={() => onResetOutputCell(r, c)}
                  onCopy={() => onCopyCell(r, c)}
                  onCopyExcel={onCopyCellExcel ? () => onCopyCellExcel(r, c) : undefined}
                  onKeyDown={(e) => handleTextareaKeyDown(e, r, c)}
                  onOutputChange={(val) => onOutputChange(r, c, val, true)}
                  onApplyNumbering={(format) => handleApplyNumbering(r, c, format)}
                  onApplyInlineFormat={(wrapper, formatLabel) =>
                    handleApplyInlineFormat(r, c, wrapper, formatLabel)
                  }
                  onSmartClean={() => handleSmartCleanOutputCell(r, c)}
                />
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
});
