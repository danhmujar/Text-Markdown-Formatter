import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Copy, Settings2, Sparkles, Table } from 'lucide-react';
import type { StyleOptions } from '../types';
import { hasBrTags, isMarkdownTable } from '../utils/markdownFormatter';
import { useGridActions } from '../hooks/useGridActions';
import { useFormatterActions } from '../hooks/useFormatterActions';
import { FormatterCell } from './FormatterCell';
import { EditorSettingsPanel } from './ui/EditorSettingsPanel';

interface FormatterWorkspaceProps {
  grid: string[][];
  options: StyleOptions;
  focusRequest: number;
  onChangeGrid: (grid: string[][], isTyping?: boolean) => void;
  onCommitPaste: (rawGrid: string[][], cleanedGrid: string[][]) => void;
  onCopyCell: (rowIndex: number, colIndex: number) => void;
  onCopyCellExcel?: (rowIndex: number, colIndex: number) => void;
  onCopyAllGrid: () => void;
  onCopyAllGridExcel?: () => void;
  copiedCell: string | null;
  copiedAll: boolean;
}

export const FormatterWorkspace: React.FC<FormatterWorkspaceProps> = React.memo(
  function FormatterWorkspace({
    grid,
    options,
    focusRequest,
    onChangeGrid,
    onCommitPaste,
    onCopyCell,
    onCopyCellExcel,
    onCopyAllGrid,
    onCopyAllGridExcel,
    copiedCell,
    copiedAll,
  }) {
    const [showSettings, setShowSettings] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);
    const isDark = options.theme === 'dark';
    const numRows = grid.length;
    const numCols = Math.max(...grid.map((row) => row.length), 1);
    const getContent = useCallback(
      (rowIndex: number, colIndex: number) => grid[rowIndex]?.[colIndex] || '',
      [grid],
    );

    const {
      cleanupNotification,
      totalStats,
      handleCellChange,
      handleClearCell,
      handleSmartCleanupAll,
      handlePasteOnCell,
      setSingleLayout,
      setLeftRightLayout,
      setUpDownLayout,
      set2x2Layout,
      addColumnRight,
      addRowDown,
      getCellLabel,
    } = useGridActions({ grid, onChangeGrid, onCommitPaste, numRows, numCols });

    const {
      cellModes,
      cellFeedback,
      textareaRefs,
      setCellMode,
      handleApplyNumbering,
      handleApplyInlineFormat,
      handleSmartCleanCell,
      handleTextareaKeyDown,
    } = useFormatterActions({ getContent, onContentChange: handleCellChange });

    useEffect(() => {
      if (focusRequest > 0) textareaRefs.current['0-0']?.focus();
    }, [focusRequest, textareaRefs]);

    useEffect(() => {
      if (!showSettings) return;
      const closeOutside = (event: MouseEvent) => {
        if (!settingsRef.current?.contains(event.target as Node)) setShowSettings(false);
      };
      document.addEventListener('mousedown', closeOutside);
      return () => document.removeEventListener('mousedown', closeOutside);
    }, [showSettings]);

    const changeMode = (cellId: string, mode: 'preview' | 'edit') => {
      setCellMode(cellId, mode);
      if (mode === 'edit') setTimeout(() => textareaRefs.current[cellId]?.focus(), 0);
    };

    return (
      <section
        aria-labelledby="formatter-heading"
        className="flex h-full flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--text-primary)' }}
      >
        <div
          className="shrink-0 border-b px-3 py-2 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:px-4"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 id="formatter-heading" className="text-sm font-semibold tracking-tight">
                Cleaned text
              </h2>
              <span
                className="rounded-md border px-1.5 py-0.5 font-mono text-[11px]"
                style={{
                  backgroundColor: 'var(--surface-bg)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-secondary)',
                }}
              >
                {numRows} × {numCols}
              </span>
              <span className="hidden font-mono text-[11px] text-[var(--text-secondary)] md:inline">
                {totalStats.totalChars.toLocaleString()} chars
              </span>
              {totalStats.totalWarnings > 0 && (
                <span
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    isDark
                      ? 'border-amber-800 bg-amber-950/80 text-amber-300'
                      : 'border-amber-300 bg-amber-50 text-amber-800'
                  }`}
                >
                  <AlertTriangle aria-hidden="true" className="h-3 w-3" />
                  {totalStats.totalWarnings}
                </span>
              )}
            </div>
            <p className="mt-0.5 max-w-prose text-xs leading-5 text-[var(--text-secondary)]">
              Paste wrapped text. Accidental line breaks are removed; intentional structure stays.
            </p>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5 sm:mt-0">
            <button
              type="button"
              onClick={handleSmartCleanupAll}
              disabled={totalStats.totalChars === 0}
              className="flex min-h-11 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9"
              style={{
                backgroundColor: 'var(--accent-bg)',
                borderColor: 'var(--accent-border)',
                color: 'var(--primary-blue)',
              }}
            >
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
              <span>Smart Cleanup</span>
            </button>
            <div ref={settingsRef} className="relative">
              <button
                id="editor-settings-btn"
                type="button"
                onClick={() => setShowSettings((visible) => !visible)}
                aria-expanded={showSettings}
                aria-haspopup="dialog"
                aria-controls="editor-settings-panel"
                aria-label="Layout and grid settings"
                className="flex min-h-11 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:min-h-9"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <Settings2 aria-hidden="true" className="h-3.5 w-3.5" />
                <span>Layout</span>
                <ChevronDown aria-hidden="true" className="h-3 w-3" />
              </button>
              {showSettings && (
                <EditorSettingsPanel
                  isDark={isDark}
                  numRows={numRows}
                  numCols={numCols}
                  onSetSingleLayout={setSingleLayout}
                  onSet2x2Layout={set2x2Layout}
                  onSetLeftRightLayout={setLeftRightLayout}
                  onSetUpDownLayout={setUpDownLayout}
                  onAddColumnRight={addColumnRight}
                  onAddRowDown={addRowDown}
                  onClose={() => setShowSettings(false)}
                />
              )}
            </div>
            {(numRows > 1 || numCols > 1) && (
              <>
                <button
                  id="copy-all-containers-btn"
                  type="button"
                  onClick={onCopyAllGrid}
                  disabled={totalStats.totalChars === 0}
                  className="flex min-h-11 items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:min-h-9"
                  style={{ backgroundColor: 'var(--primary-blue)' }}
                >
                  {copiedAll ? (
                    <Check aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : (
                    <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedAll ? 'Copied' : 'Copy all'}</span>
                </button>
                <button
                  type="button"
                  onClick={onCopyAllGridExcel}
                  disabled={totalStats.totalChars === 0}
                  aria-label="Copy all formatted text for Excel"
                  className="flex min-h-11 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:min-h-9"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  <Table aria-hidden="true" className="h-3.5 w-3.5" />
                  <span>Excel</span>
                </button>
              </>
            )}
          </div>
        </div>

        {cleanupNotification && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={`flex shrink-0 items-center gap-2 border-b px-4 py-2 text-xs ${
              isDark
                ? 'border-indigo-800/80 bg-indigo-950/80 text-indigo-200'
                : 'border-indigo-200 bg-indigo-50 text-indigo-800'
            }`}
          >
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="font-medium">{cleanupNotification}</span>
          </div>
        )}

        <div className="flex-1 overflow-hidden bg-[var(--surface-bg)] p-3">
          <div
            className="grid h-full w-full gap-3"
            style={{
              gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))`,
            }}
          >
            {grid.map((row, rowIndex) =>
              row.map((content, colIndex) => {
                const cellId = `${rowIndex}-${colIndex}`;
                const isTable = isMarkdownTable(content);
                return (
                  <FormatterCell
                    key={cellId}
                    rowIndex={rowIndex}
                    colIndex={colIndex}
                    label={getCellLabel(rowIndex, colIndex)}
                    showLabel={numRows > 1 || numCols > 1}
                    content={content}
                    inputHadBr={hasBrTags(content) && !isTable}
                    options={options}
                    mode={cellModes[cellId] ?? 'preview'}
                    isCopied={copiedCell === cellId}
                    feedback={cellFeedback[cellId] ?? null}
                    registerTextarea={(element) => {
                      textareaRefs.current[cellId] = element;
                    }}
                    onModeChange={(mode) => changeMode(cellId, mode)}
                    onClear={() => handleClearCell(rowIndex, colIndex)}
                    onCopy={() => onCopyCell(rowIndex, colIndex)}
                    onCopyExcel={
                      onCopyCellExcel ? () => onCopyCellExcel(rowIndex, colIndex) : undefined
                    }
                    onKeyDown={(event) => handleTextareaKeyDown(event, rowIndex, colIndex)}
                    onPaste={(event) => {
                      if (handlePasteOnCell(event, rowIndex, colIndex)) {
                        setCellMode(cellId, 'preview');
                      }
                    }}
                    onChange={(value) => {
                      setCellMode(cellId, 'edit');
                      handleCellChange(rowIndex, colIndex, value, true);
                    }}
                    onApplyNumbering={(format) => handleApplyNumbering(rowIndex, colIndex, format)}
                    onApplyInlineFormat={(wrapper, label) =>
                      handleApplyInlineFormat(rowIndex, colIndex, wrapper, label)
                    }
                    onSmartClean={() => handleSmartCleanCell(rowIndex, colIndex)}
                  />
                );
              }),
            )}
          </div>
        </div>
      </section>
    );
  },
);
