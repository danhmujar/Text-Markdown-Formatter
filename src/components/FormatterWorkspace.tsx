import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Copy, Settings2, Sparkles } from 'lucide-react';
import type { PasteBehavior, StyleOptions } from '../types';
import { convertBrToNewlines, isMarkdownTable } from '../utils/markdownFormatter';
import { useGridActions } from '../hooks/useGridActions';
import { useFormatterActions } from '../hooks/useFormatterActions';
import { FormatterCell } from './FormatterCell';
import { BUTTON_VARIANTS } from './ui';
import { EditorSettingsPanel } from './ui/EditorSettingsPanel';

interface FormatterWorkspaceProps {
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  pasteBehavior: PasteBehavior;
  onPasteBehaviorChange: (behavior: PasteBehavior) => void;
  grid: string[][];
  preserveBr: boolean[][];
  options: StyleOptions;
  focusRequest: number;
  onChangeGrid: (grid: string[][], isTyping?: boolean) => void;
  onCommitPaste: (rawGrid: string[][], cleanedGrid: string[][]) => void;
  onCopyCell: (rowIndex: number, colIndex: number) => void;
  onCopyAllGrid: () => void;
  copiedCell: string | null;
  copiedAll: boolean;
}

export const FormatterWorkspace: React.FC<FormatterWorkspaceProps> = React.memo(
  function FormatterWorkspace({
    editing,
    onEditingChange,
    pasteBehavior,
    onPasteBehaviorChange,
    grid,
    preserveBr,
    options,
    focusRequest,
    onChangeGrid,
    onCommitPaste,
    onCopyCell,
    onCopyAllGrid,
    copiedCell,
    copiedAll,
  }) {
    const [showSettings, setShowSettings] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);
    const settingsTriggerRef = useRef<HTMLButtonElement>(null);
    const numRows = grid.length;
    const numCols = Math.max(...grid.map((row) => row.length), 1);
    const gridRef = useRef(grid);
    gridRef.current = grid;
    const getContent = useCallback(
      (rowIndex: number, colIndex: number) =>
        convertBrToNewlines(gridRef.current[rowIndex]?.[colIndex] || ''),
      [],
    );

    const {
      cleanupNotification,
      totalStats,
      handleCellChange,
      handleClearCell,
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
      cellFeedback,
      textareaRefs,
      handleApplyNumbering,
      handleApplyInlineFormat,
      handleSmartCleanCell,
      handleTextareaKeyDown,
      listTerminator,
      setListTerminator,
    } = useFormatterActions({ getContent, onContentChange: handleCellChange });

    useEffect(() => {
      if (focusRequest > 0) textareaRefs.current['0-0']?.focus();
    }, [focusRequest, textareaRefs]);

    useEffect(() => {
      if (!showSettings) return;
      const closeOutside = (event: MouseEvent) => {
        if (!settingsRef.current?.contains(event.target as Node)) setShowSettings(false);
      };
      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        setShowSettings(false);
        settingsTriggerRef.current?.focus();
      };
      document.addEventListener('mousedown', closeOutside);
      document.addEventListener('keydown', closeOnEscape);
      return () => {
        document.removeEventListener('mousedown', closeOutside);
        document.removeEventListener('keydown', closeOnEscape);
      };
    }, [showSettings]);

    const registerTextarea = useCallback(
      (rowIndex: number, colIndex: number, element: HTMLTextAreaElement | null) => {
        const cellId = `${rowIndex}-${colIndex}`;
        if (element) textareaRefs.current[cellId] = element;
        else delete textareaRefs.current[cellId];
      },
      [textareaRefs],
    );

    const handleCellPaste = useCallback(
      (event: React.ClipboardEvent<HTMLTextAreaElement>, rowIndex: number, colIndex: number) => {
        const result = handlePasteOnCell(
          event,
          rowIndex,
          colIndex,
          editing ? pasteBehavior : 'split-cells',
          !editing,
        );
        if (!result || !editing) return;
        const target = result.cursor === undefined ? '0-0' : `${rowIndex}-${colIndex}`;
        setTimeout(() => {
          const textarea = textareaRefs.current[target];
          textarea?.focus();
          if (result.cursor !== undefined)
            textarea?.setSelectionRange(result.cursor, result.cursor);
        }, 0);
      },
      [handlePasteOnCell, pasteBehavior, editing, textareaRefs],
    );

    const handleCellInput = useCallback(
      (rowIndex: number, colIndex: number, value: string) => {
        onEditingChange(true);
        handleCellChange(rowIndex, colIndex, value, true);
      },
      [handleCellChange, onEditingChange],
    );

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
                  role="img"
                  aria-label={`${totalStats.totalWarnings} syntax ${totalStats.totalWarnings === 1 ? 'warning' : 'warnings'} across the workspace`}
                  className="flex items-center gap-1 rounded-full border border-[var(--warning-border)] bg-[var(--warning-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--warning-color)]"
                >
                  <AlertTriangle aria-hidden="true" className="h-3 w-3" />
                  {totalStats.totalWarnings}
                </span>
              )}
            </div>
            <p className="mt-0.5 max-w-prose text-xs leading-5 text-[var(--text-secondary)]">
              Paste and edit your text. Use Clean to remove accidental line breaks, then Preview to
              review formatting.
            </p>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5 sm:mt-0">
            <button
              type="button"
              onClick={() => onEditingChange(!editing)}
              className="min-h-11 rounded-md bg-[var(--primary-blue)] px-3 text-xs font-medium text-[var(--primary-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)] focus-visible:ring-offset-2 sm:min-h-9"
            >
              {editing ? 'Preview' : 'Edit'}
            </button>
            {editing && (
              <label className="flex items-center gap-2 text-xs">
                <span>Paste behavior</span>
                <select
                  value={pasteBehavior}
                  onChange={(event) => onPasteBehaviorChange(event.target.value as PasteBehavior)}
                  className="min-h-11 rounded-md border border-[var(--border-color)] bg-[var(--surface-bg)] px-2 text-[var(--text-primary)] sm:min-h-9"
                >
                  <option value="single-cell">Keep in one cell</option>
                  <option value="split-cells">Split into cells</option>
                </select>
              </label>
            )}
            <div ref={settingsRef} className="relative">
              <button
                ref={settingsTriggerRef}
                id="editor-settings-btn"
                type="button"
                onClick={() => setShowSettings((visible) => !visible)}
                aria-expanded={showSettings}
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
                  numRows={numRows}
                  numCols={numCols}
                  onSetSingleLayout={setSingleLayout}
                  onSet2x2Layout={set2x2Layout}
                  onSetLeftRightLayout={setLeftRightLayout}
                  onSetUpDownLayout={setUpDownLayout}
                  onAddColumnRight={addColumnRight}
                  onAddRowDown={addRowDown}
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
                  className={`flex min-h-11 items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium text-[var(--primary-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:min-h-9 ${BUTTON_VARIANTS.disabledMuted}`}
                  style={{ backgroundColor: 'var(--primary-blue)' }}
                >
                  {copiedAll ? (
                    <Check aria-hidden="true" className="h-3.5 w-3.5" />
                  ) : (
                    <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedAll ? 'Copied' : 'Copy all to Catalyst'}</span>
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
            className="flex shrink-0 items-center gap-2 border-b border-[var(--accent-border)] bg-[var(--accent-bg)] px-4 py-2 text-xs text-[var(--primary-blue)]"
          >
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="font-medium">{cleanupNotification}</span>
          </div>
        )}

        <div className="flex-1 overflow-auto bg-[var(--surface-bg)] p-3">
          <div
            className="grid h-full min-h-[18rem] min-w-full w-full gap-3"
            style={{
              gridTemplateColumns: `repeat(${numCols}, minmax(16rem, 1fr))`,
              gridTemplateRows: `repeat(${numRows}, minmax(18rem, 1fr))`,
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
                    inputHadBr={Boolean(preserveBr[rowIndex]?.[colIndex]) && !isTable}
                    options={options}
                    mode={editing ? 'edit' : 'preview'}
                    isCopied={copiedCell === cellId}
                    feedback={cellFeedback[cellId] ?? null}
                    registerTextarea={registerTextarea}
                    onModeChange={() => {}}
                    onClear={handleClearCell}
                    onCopy={onCopyCell}
                    onKeyDown={handleTextareaKeyDown}
                    onPaste={handleCellPaste}
                    onChange={handleCellInput}
                    onApplyNumbering={handleApplyNumbering}
                    onApplyInlineFormat={handleApplyInlineFormat}
                    onSmartClean={handleSmartCleanCell}
                    listTerminator={listTerminator}
                    onListTerminatorChange={setListTerminator}
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
