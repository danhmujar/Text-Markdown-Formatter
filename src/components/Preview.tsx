import React, { useState, useMemo, useRef } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  Minimize2,
  ArrowLeft,
  Eye,
  Edit3,
  ListOrdered,
  List,
  Bold,
  Italic,
  Sparkles,
} from 'lucide-react';
import { StyleOptions } from '../types';
import {
  hasBrTags,
  buildInlineStyledHtml,
  applyNumberingToText,
  applyInlineFormatToText,
  smartCleanupMarkdown,
  getNextListPrefix,
  NumberingFormat,
} from '../utils/markdownFormatter';

interface PreviewProps {
  grid: string[][];
  options: StyleOptions;
  getOutputContent: (rowIndex: number, colIndex: number) => string;
  hasOverride: (rowIndex: number, colIndex: number) => boolean;
  onOutputChange: (rowIndex: number, colIndex: number, val: string, isTyping?: boolean) => void;
  onResetOutputCell: (rowIndex: number, colIndex: number) => void;
  onCopyCell: (rowIndex: number, colIndex: number) => void;
  onCopyAllGrid: () => void;
  copiedCell: string | null;
  copiedAll: boolean;
  isFocusMode?: boolean;
  onExitFocus?: () => void;
  onSwitchFocus?: () => void;
}

export const Preview: React.FC<PreviewProps> = ({
  grid,
  options,
  getOutputContent,
  hasOverride,
  onOutputChange,
  onResetOutputCell,
  onCopyCell,
  onCopyAllGrid,
  copiedCell,
  copiedAll,
  isFocusMode = false,
  onExitFocus,
  onSwitchFocus,
}) => {
  const isDark = options.theme === 'dark';
  const numRows = grid.length;
  const numCols = Math.max(...grid.map((r) => r.length), 1);

  // Track per-cell mode: 'preview' (formatted rich text) or 'edit' (raw editable textarea)
  const [cellModes, setCellModes] = useState<Record<string, 'preview' | 'edit'>>({});

  // Textarea references for maintaining cursor focus during toolbar actions
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Feedback notifications per cell
  const [cellFeedback, setCellFeedback] = useState<Record<string, string | null>>({});

  const showCellFeedback = (cellId: string, msg: string) => {
    setCellFeedback((prev) => ({ ...prev, [cellId]: msg }));
    setTimeout(() => {
      setCellFeedback((prev) => ({ ...prev, [cellId]: null }));
    }, 2500);
  };

  const getCellLabel = (r: number, c: number) => {
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
  };

  const toggleCellMode = (cellKey: string) => {
    setCellModes((prev) => ({
      ...prev,
      [cellKey]: prev[cellKey] === 'edit' ? 'preview' : 'edit',
    }));
  };

  const handleApplyNumbering = (r: number, c: number, format: NumberingFormat) => {
    const cellId = `${r}-${c}`;
    const ta = textareaRefs.current[cellId];
    const currentVal = getOutputContent(r, c);

    const start = ta ? ta.selectionStart : 0;
    const end = ta ? ta.selectionEnd : currentVal.length;

    const result = applyNumberingToText(currentVal, start, end, format);
    onOutputChange(r, c, result.text, false);

    const formatLabel =
      format === 'roman-parentheses' || format === '(i)'
        ? '(i) (ii) Roman'
        : format === 'numeric-dot' || format === '1.'
          ? '1. 2. Numbered'
          : format === 'alpha-dot' || format === 'a.'
            ? 'a. b. Alphabetical'
            : '• Bullet';
    showCellFeedback(cellId, `Applied ${formatLabel}`);

    if (ta) {
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(result.newSelectionStart, result.newSelectionEnd);
      }, 0);
    }
  };

  const handleApplyInlineFormat = (r: number, c: number, wrapper: string, label: string) => {
    const cellId = `${r}-${c}`;
    const ta = textareaRefs.current[cellId];
    const currentVal = getOutputContent(r, c);

    const start = ta ? ta.selectionStart : 0;
    const end = ta ? ta.selectionEnd : 0;

    const result = applyInlineFormatToText(currentVal, start, end, wrapper);
    onOutputChange(r, c, result.text, false);
    showCellFeedback(cellId, `Applied ${label}`);

    if (ta) {
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(result.newSelectionStart, result.newSelectionEnd);
      }, 0);
    }
  };

  const handleSmartCleanOutputCell = (r: number, c: number) => {
    const cellId = `${r}-${c}`;
    const currentVal = getOutputContent(r, c);
    if (!currentVal.trim()) return;

    const report = smartCleanupMarkdown(currentVal);
    if (report.hasChanges) {
      onOutputChange(r, c, report.cleaned, false);
      showCellFeedback(cellId, `Cleaned (${report.fixesCount} fixes)`);
    } else {
      showCellFeedback(cellId, 'Already clean');
    }
  };

  /**
   * Auto-continuation on Enter:
   * Detects (i) (ii), 1. 2., a. b., bullet prefixes and automatically generates
   * the next numbered prefix on the new line.
   * If Enter is pressed on an empty prefix, it clears the prefix (allows easy list exit).
   */
  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    r: number,
    c: number,
  ) => {
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) {
      return;
    }

    const ta = e.currentTarget;
    const val = ta.value;
    const cursor = ta.selectionStart;

    // Find start and end of current line up to cursor
    const lineStart = val.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
    const lineToCursor = val.substring(lineStart, cursor);
    const nextNewline = val.indexOf('\n', cursor);
    const lineEnd = nextNewline === -1 ? val.length : nextNewline;
    const fullLine = val.substring(lineStart, lineEnd);

    // Check if current line matches any list item prefix
    const nextPrefixInfo = getNextListPrefix(lineToCursor);

    if (!nextPrefixInfo) {
      return; // Standard newline
    }

    e.preventDefault();

    const { indent, nextPrefix, currentPrefix, isOnlyPrefix } = nextPrefixInfo;

    // If the user pressed Enter on a line that only contains the prefix (empty list item),
    // remove the prefix to easily exit the list
    if (isOnlyPrefix && fullLine.trim() === currentPrefix.trim()) {
      const before = val.substring(0, lineStart);
      const after = val.substring(lineEnd);
      const newVal = before + after;
      onOutputChange(r, c, newVal, false);
      setTimeout(() => {
        ta.selectionStart = lineStart;
        ta.selectionEnd = lineStart;
      }, 0);
      return;
    }

    // Insert newline + nextPrefix at cursor position
    const insertion = '\n' + indent + nextPrefix;
    const before = val.substring(0, cursor);
    const after = val.substring(cursor);
    const newVal = before + insertion + after;
    const newPos = cursor + insertion.length;

    onOutputChange(r, c, newVal, false);

    setTimeout(() => {
      ta.selectionStart = newPos;
      ta.selectionEnd = newPos;
    }, 0);
  };

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
      className={`flex flex-col h-full overflow-hidden transition-colors ${
        isDark ? 'bg-slate-950' : 'bg-slate-100'
      }`}
    >
      {/* Output Header with Focus Badges & Global Copy */}
      <div
        className={`h-12 px-4 border-b flex items-center justify-between gap-3 text-xs shrink-0 transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            Output
          </span>
          <span
            className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
              isDark
                ? 'bg-slate-800 text-emerald-300 border-slate-700'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {numRows} × {numCols}
          </span>
          <span
            id="total-output-char-badge"
            className={`hidden sm:inline-flex text-[11px] font-mono px-2 py-0.5 rounded border ${
              isDark
                ? 'bg-slate-800/80 text-slate-300 border-slate-700'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title={`Total output characters: ${totalOutputChars.toLocaleString()}`}
          >
            {totalOutputChars.toLocaleString()}{' '}
            <span className="font-sans font-normal text-[10px] text-slate-400 ml-0.5">chars</span>
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
                  onClick={onSwitchFocus}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition cursor-pointer active:scale-95 ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
                  }`}
                  title="Switch Focus to Input container"
                >
                  <ArrowLeft className="w-3 h-3 text-slate-400" />
                  <span>Input</span>
                </button>
              )}
              {onExitFocus && (
                <button
                  id="focus-exit-split-output-btn"
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

        <button
          id="copy-all-containers-btn"
          onClick={onCopyAllGrid}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium text-xs shadow-sm transition active:scale-95 cursor-pointer"
          title="Copy formatted output for Word & Outlook (with line breaks converted back to <br> if input had <br>)"
        >
          {copiedAll ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-300" />
              <span>Copied All!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy All</span>
            </>
          )}
        </button>
      </div>

      {/* Grid of Output Containers */}
      <div
        className={`flex-1 overflow-hidden p-3 transition-colors ${
          isDark ? 'bg-slate-950/70' : 'bg-slate-100/60'
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
            row.map((_, c) => {
              const cellId = `${r}-${c}`;
              const isCopied = copiedCell === cellId;
              const outputText = getOutputContent(r, c);
              const originalInput = grid[r]?.[c] || '';
              const inputHadBr = hasBrTags(originalInput);
              const isOverridden = hasOverride(r, c);
              const isEditMode = cellModes[cellId] === 'edit';
              const htmlFormatted = buildInlineStyledHtml(outputText, options, false);
              const charCount = outputText.length;
              const wordCount = outputText.trim() ? outputText.trim().split(/\s+/).length : 0;
              const lineCount = outputText ? outputText.split(/\r?\n/).length : 0;
              const feedback = cellFeedback[cellId];

              return (
                <div
                  key={`output-cell-container-${r}-${c}`}
                  id={`output-cell-${r}-${c}`}
                  className={`flex flex-col rounded-lg overflow-hidden border shadow-sm h-full transition focus-within:ring-1 focus-within:ring-blue-500/40 ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-100 focus-within:border-blue-500/60'
                      : 'bg-white border-slate-200 text-slate-800 focus-within:border-blue-500/60'
                  }`}
                >
                  {/* Container Header */}
                  <div
                    className={`h-8 px-3 border-b flex items-center justify-between gap-1 text-xs shrink-0 select-none ${
                      isDark ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-medium text-[11px] flex items-center gap-1.5 ${
                          isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        {getCellLabel(r, c)}
                      </span>
                      {inputHadBr && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                            isDark
                              ? 'bg-indigo-950/60 border-indigo-800 text-indigo-300'
                              : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          }`}
                          title="Input contains <br> tags. On Copy, line breaks will automatically convert back to <br> tags."
                        >
                          &lt;br&gt; Auto-Sync
                        </span>
                      )}
                      {isOverridden && (
                        <span className="text-[10px] text-blue-400 font-mono px-1.5 py-0.2 bg-blue-500/10 rounded">
                          edited
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Toggle Edit / Formatted Mode */}
                      <button
                        id={`toggle-edit-mode-${r}-${c}`}
                        onClick={() => toggleCellMode(cellId)}
                        className={`px-2 py-0.5 rounded border text-[10px] font-medium flex items-center gap-1 transition cursor-pointer active:scale-95 ${
                          isEditMode
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-2xs'
                            : isDark
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
                        }`}
                        title={isEditMode ? 'Switch to Formatted Preview' : 'Switch to Edit Mode'}
                      >
                        {isEditMode ? (
                          <>
                            <Eye className="w-3 h-3 text-indigo-200" />
                            <span>Preview</span>
                          </>
                        ) : (
                          <>
                            <Edit3 className="w-3 h-3 text-slate-400" />
                            <span>Edit</span>
                          </>
                        )}
                      </button>

                      {/* Revert / Reset if overridden */}
                      {isOverridden && (
                        <button
                          id={`reset-output-cell-${r}-${c}`}
                          onClick={() => onResetOutputCell(r, c)}
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-medium flex items-center gap-1 transition cursor-pointer active:scale-95 ${
                            isDark
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
                          }`}
                          title="Reset output to match original input source"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Reset</span>
                        </button>
                      )}

                      {/* Copy Cell Button */}
                      <button
                        id={`copy-cell-btn-${r}-${c}`}
                        onClick={() => onCopyCell(r, c)}
                        className={`px-2 py-0.5 rounded border text-[10px] font-medium flex items-center gap-1 transition shadow-2xs cursor-pointer active:scale-95 ${
                          isCopied
                            ? 'bg-emerald-600 text-white border-emerald-600 font-semibold'
                            : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600'
                        }`}
                        title={
                          inputHadBr
                            ? 'Copy formatted text to clipboard (line breaks will convert back to <br> tags)'
                            : 'Copy formatted text for Word & Outlook'
                        }
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-white" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-white" />
                            <span>{inputHadBr ? 'Copy as <br>' : 'Copy'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Edit Mode Formatting Toolbar - Shown only when Edit Mode is active */}
                  {isEditMode && (
                    <div
                      id={`edit-mode-toolbar-${r}-${c}`}
                      className={`px-2.5 py-1.5 border-b flex items-center justify-between gap-2 text-xs shrink-0 select-none transition-colors ${
                        isDark
                          ? 'bg-slate-900/95 border-indigo-900/40 text-slate-300'
                          : 'bg-indigo-50/50 border-indigo-100 text-slate-700'
                      }`}
                    >
                      {/* Numbering and list format buttons */}
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
                          Format:
                        </span>

                        {/* (i) (ii) Roman Numerals Button */}
                        <button
                          id={`btn-numbering-roman-${r}-${c}`}
                          onClick={() => handleApplyNumbering(r, c, 'roman-parentheses')}
                          className={`px-2 py-0.5 rounded border text-[11px] font-mono font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs ${
                            isDark
                              ? 'bg-indigo-950/80 hover:bg-indigo-900 border-indigo-700/70 text-indigo-200 hover:text-white'
                              : 'bg-white hover:bg-indigo-100/70 border-indigo-200 text-indigo-900 hover:text-indigo-950'
                          }`}
                          title="Add Roman numeral numbering (i) (ii) (iii)... (Click to toggle/number lines or selection)"
                        >
                          <ListOrdered className="w-3 h-3 text-indigo-400" />
                          <span>(i) (ii)</span>
                        </button>

                        {/* 1. 2. Numeric Numbering Button */}
                        <button
                          id={`btn-numbering-numeric-${r}-${c}`}
                          onClick={() => handleApplyNumbering(r, c, 'numeric-dot')}
                          className={`px-2 py-0.5 rounded border text-[11px] font-mono font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs ${
                            isDark
                              ? 'bg-blue-950/80 hover:bg-blue-900 border-blue-700/70 text-blue-200 hover:text-white'
                              : 'bg-white hover:bg-blue-100/70 border-blue-200 text-blue-900 hover:text-blue-950'
                          }`}
                          title="Add standard numbering 1. 2. 3.... (Click to toggle/number lines or selection)"
                        >
                          <ListOrdered className="w-3 h-3 text-blue-400" />
                          <span>1. 2.</span>
                        </button>

                        {/* a. b. Alphabetical Button */}
                        <button
                          id={`btn-numbering-alpha-${r}-${c}`}
                          onClick={() => handleApplyNumbering(r, c, 'alpha-dot')}
                          className={`px-2 py-0.5 rounded border text-[11px] font-mono font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs ${
                            isDark
                              ? 'bg-purple-950/80 hover:bg-purple-900 border-purple-700/70 text-purple-200 hover:text-white'
                              : 'bg-white hover:bg-purple-100/70 border-purple-200 text-purple-900 hover:text-purple-950'
                          }`}
                          title="Add alphabetical numbering a. b. c.... (Click to toggle/number lines or selection)"
                        >
                          <span>a. b.</span>
                        </button>

                        {/* Bullet list button */}
                        <button
                          id={`btn-numbering-bullet-${r}-${c}`}
                          onClick={() => handleApplyNumbering(r, c, 'bullet')}
                          className={`px-1.5 py-0.5 rounded border text-[10.5px] font-medium hidden sm:inline-flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs ${
                            isDark
                              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                          title="Add bullet points * ..."
                        >
                          <List className="w-3 h-3 text-slate-400" />
                          <span>Bullet</span>
                        </button>

                        <div className="w-px h-3.5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

                        {/* Bold Button */}
                        <button
                          id={`btn-format-bold-${r}-${c}`}
                          onClick={() => handleApplyInlineFormat(r, c, '**', 'Bold')}
                          className={`px-1.5 py-0.5 rounded border text-[10.5px] font-bold flex items-center transition cursor-pointer active:scale-95 shadow-2xs ${
                            isDark
                              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                          }`}
                          title="Toggle **bold** formatting on selection"
                        >
                          <Bold className="w-3 h-3" />
                        </button>

                        {/* Italic Button */}
                        <button
                          id={`btn-format-italic-${r}-${c}`}
                          onClick={() => handleApplyInlineFormat(r, c, '*', 'Italic')}
                          className={`px-1.5 py-0.5 rounded border text-[10.5px] font-serif italic flex items-center transition cursor-pointer active:scale-95 shadow-2xs ${
                            isDark
                              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                          }`}
                          title="Toggle *italic* formatting on selection"
                        >
                          <Italic className="w-3 h-3" />
                        </button>

                        {/* Smart Clean Button */}
                        <button
                          id={`btn-format-clean-${r}-${c}`}
                          onClick={() => handleSmartCleanOutputCell(r, c)}
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-medium hidden lg:inline-flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-2xs ${
                            isDark
                              ? 'bg-indigo-950/50 hover:bg-indigo-900/60 border-indigo-800/60 text-indigo-300'
                              : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                          }`}
                          title="Standardize quotes, spaces and markdown syntax"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                          <span>Clean</span>
                        </button>
                      </div>

                      {/* Toast / Status feedback or hint */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {feedback ? (
                          <span className="text-[10px] font-medium text-emerald-500 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in duration-150">
                            <Check className="w-3 h-3" />
                            <span>{feedback}</span>
                          </span>
                        ) : (
                          <span className="text-[9.5px] text-slate-400 dark:text-slate-500 hidden xl:inline">
                            Enter continues numbering
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Body: Formatted Rich Text View (Default) OR Editable Textarea */}
                  <div className="flex-1 relative overflow-hidden">
                    {isEditMode ? (
                      <textarea
                        ref={(el) => {
                          textareaRefs.current[cellId] = el;
                        }}
                        id={`output-textarea-${r}-${c}`}
                        value={outputText}
                        onChange={(e) => onOutputChange(r, c, e.target.value, true)}
                        onKeyDown={(e) => handleTextareaKeyDown(e, r, c)}
                        placeholder={`Edit output for ${getCellLabel(r, c)}... (Press Enter to auto-continue numbering)`}
                        className={`w-full h-full p-3.5 bg-transparent font-mono text-xs leading-relaxed resize-none focus:outline-none custom-scrollbar ${
                          isDark
                            ? 'text-slate-100 selection:bg-blue-600/40 placeholder:text-slate-600'
                            : 'text-slate-800 selection:bg-blue-200 placeholder:text-slate-400'
                        }`}
                        spellCheck={false}
                      />
                    ) : (
                      <div
                        id={`output-formatted-${r}-${c}`}
                        dangerouslySetInnerHTML={{ __html: htmlFormatted }}
                        className={`w-full h-full p-4 overflow-auto custom-scrollbar select-text leading-relaxed font-sans ${
                          isDark ? 'text-slate-100' : 'text-slate-900'
                        }`}
                      />
                    )}
                  </div>

                  {/* Output Footer Counter */}
                  <div
                    id={`output-footer-${r}-${c}`}
                    className={`h-6 px-3 border-t flex items-center justify-between text-[10.5px] font-mono shrink-0 select-none ${
                      isDark
                        ? 'bg-slate-900/90 border-slate-800 text-slate-400'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-semibold ${charCount > 0 ? (isDark ? 'text-slate-200' : 'text-slate-800') : 'opacity-60'}`}
                      >
                        {charCount.toLocaleString()}{' '}
                        <span className="font-sans font-normal text-[10px] text-slate-400">
                          chars
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span>{wordCount.toLocaleString()}</span>
                        <span className="font-sans text-[10px] text-slate-400">words</span>
                      </span>
                      <span className="hidden sm:flex items-center gap-1">
                        <span>{lineCount}</span>
                        <span className="font-sans text-[10px] text-slate-400">lines</span>
                      </span>
                    </div>

                    <span className="text-[10px] font-sans text-slate-400 flex items-center gap-1">
                      <span>{isEditMode ? 'Editing Raw Text' : 'Formatted Preview'}</span>
                    </span>
                  </div>
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
};
