import React, { useState, useMemo } from 'react';
import {
  Trash2,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { SyntaxWarning } from '../types';
import { analyzeSyntaxWarnings } from '../utils/syntaxValidator';
import { getNextListPrefix } from '../utils/markdownFormatter';

interface EditorCellProps {
  rowIndex: number;
  colIndex: number;
  cellValue: string;
  label: string;
  isDark: boolean;
  onCellChange: (rowIndex: number, colIndex: number, val: string, isTyping?: boolean) => void;
  onClearCell: (rowIndex: number, colIndex: number) => void;
  onSmartCleanupCell: (rowIndex: number, colIndex: number) => void;
  onPasteOnCell: (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    rowIndex: number,
    colIndex: number,
  ) => void;
}

export const EditorCell: React.FC<EditorCellProps> = React.memo(function EditorCell({
  rowIndex,
  colIndex,
  cellValue,
  label,
  isDark,
  onCellChange,
  onClearCell,
  onSmartCleanupCell,
  onPasteOnCell,
}) {
  const [showWarningsDrawer, setShowWarningsDrawer] = useState<boolean>(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;

    const ta = e.currentTarget;
    const val = ta.value;
    const cursor = ta.selectionStart;

    const lineStart = val.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
    const lineToCursor = val.substring(lineStart, cursor);
    const nextNewline = val.indexOf('\n', cursor);
    const lineEnd = nextNewline === -1 ? val.length : nextNewline;
    const fullLine = val.substring(lineStart, lineEnd);

    const nextPrefixInfo = getNextListPrefix(lineToCursor);
    if (!nextPrefixInfo) return;

    e.preventDefault();

    const { indent, nextPrefix, currentPrefix, isOnlyPrefix } = nextPrefixInfo;

    if (isOnlyPrefix && fullLine.trim() === currentPrefix.trim()) {
      const before = val.substring(0, lineStart);
      const after = val.substring(lineEnd);
      const newVal = before + after;
      onCellChange(rowIndex, colIndex, newVal, false);
      setTimeout(() => {
        ta.selectionStart = lineStart;
        ta.selectionEnd = lineStart;
      }, 0);
      return;
    }

    const insertion = '\n' + indent + nextPrefix;
    const before = val.substring(0, cursor);
    const after = val.substring(cursor);
    const newVal = before + insertion + after;
    const newPos = cursor + insertion.length;

    onCellChange(rowIndex, colIndex, newVal, false);
    setTimeout(() => {
      ta.selectionStart = newPos;
      ta.selectionEnd = newPos;
    }, 0);
  };

  // Dynamic character, word, and line counts
  const charCount = cellValue.length;
  const wordCount = useMemo(() => {
    const trimmed = cellValue.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [cellValue]);
  const lineCount = useMemo(() => {
    return cellValue ? cellValue.split(/\r?\n/).length : 0;
  }, [cellValue]);

  // Real-time syntax warnings analysis
  const warnings: SyntaxWarning[] = useMemo(() => {
    return analyzeSyntaxWarnings(cellValue);
  }, [cellValue]);

  const errorCount = warnings.filter((w) => w.severity === 'error').length;

  return (
    <div
      id={`cell-container-${rowIndex}-${colIndex}`}
      className={`flex flex-col rounded-lg overflow-hidden border transition shadow-sm h-full ${
        warnings.length > 0
          ? errorCount > 0
            ? isDark
              ? 'bg-slate-900/95 border-red-900/60 focus-within:border-red-500/80 focus-within:ring-1 focus-within:ring-red-500/30'
              : 'bg-white border-red-300 focus-within:border-red-500/80 focus-within:ring-1 focus-within:ring-red-500/20'
            : isDark
              ? 'bg-slate-900/95 border-amber-900/60 focus-within:border-amber-500/80 focus-within:ring-1 focus-within:ring-amber-500/30'
              : 'bg-white border-amber-300 focus-within:border-amber-500/80 focus-within:ring-1 focus-within:ring-amber-500/20'
          : isDark
            ? 'bg-slate-900/90 border-slate-800 focus-within:border-blue-500/60 focus-within:ring-1 focus-within:ring-blue-500/30'
            : 'bg-white border-slate-200 focus-within:border-blue-500/60 focus-within:ring-1 focus-within:ring-blue-500/20'
      }`}
    >
      {/* Cell Header with Label, Real-Time Warnings Badge & Actions */}
      <div
        className={`h-8 px-3 border-b flex items-center justify-between gap-1 text-xs shrink-0 ${
          isDark ? 'bg-slate-850/90 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span
            className={`font-medium text-[11px] flex items-center gap-1.5 shrink-0 ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            {label}
          </span>

          {/* Warnings Pill in Header */}
          {warnings.length > 0 ? (
            <button
              id={`cell-warnings-btn-${rowIndex}-${colIndex}`}
              onClick={() => setShowWarningsDrawer(!showWarningsDrawer)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition cursor-pointer active:scale-95 ${
                errorCount > 0
                  ? isDark
                    ? 'bg-red-950/80 border-red-800 text-red-300 hover:bg-red-900/80'
                    : 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
                  : isDark
                    ? 'bg-amber-950/80 border-amber-800 text-amber-300 hover:bg-amber-900/80'
                    : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
              }`}
              title="Click to view syntax warnings and auto-fix suggestions"
            >
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>
                {warnings.length} {warnings.length === 1 ? 'Warning' : 'Warnings'}
              </span>
              {showWarningsDrawer ? (
                <ChevronUp className="w-3 h-3 ml-0.5 opacity-70" />
              ) : (
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
              )}
            </button>
          ) : cellValue.trim().length > 0 ? (
            <span
              className={`hidden sm:flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                isDark ? 'text-emerald-400/80 bg-emerald-950/40' : 'text-emerald-700 bg-emerald-50'
              }`}
              title="No syntax warnings detected in this cell"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Valid</span>
            </span>
          ) : null}
        </div>

        {/* Action buttons (Smart Clean, Clear) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            id={`smart-clean-cell-${rowIndex}-${colIndex}`}
            onClick={() => onSmartCleanupCell(rowIndex, colIndex)}
            className={`px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] font-medium transition cursor-pointer active:scale-95 ${
              isDark
                ? 'hover:bg-slate-800 text-indigo-400 hover:text-indigo-300'
                : 'hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800'
            }`}
            title="Smart Cleanup this cell (fixes unclosed tags, spacing & syntax)"
          >
            <Sparkles className="w-3 h-3" />
            <span>Clean</span>
          </button>

          <button
            id={`clear-cell-${rowIndex}-${colIndex}`}
            onClick={() => onClearCell(rowIndex, colIndex)}
            className={`p-1 rounded transition cursor-pointer active:scale-95 ${
              isDark
                ? 'hover:bg-slate-800 text-slate-400 hover:text-red-400'
                : 'hover:bg-slate-100 text-slate-400 hover:text-red-600'
            }`}
            title="Clear this cell"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable Warnings Drawer */}
      {showWarningsDrawer && warnings.length > 0 && (
        <div
          id={`cell-warnings-drawer-${rowIndex}-${colIndex}`}
          className={`border-b p-2.5 max-h-48 overflow-y-auto text-xs flex flex-col gap-1.5 custom-scrollbar transition-all ${
            isDark
              ? 'bg-slate-950/95 border-amber-900/50 text-slate-200'
              : 'bg-amber-50/70 border-amber-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between pb-1 border-b border-amber-500/20 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Real-Time Syntax Diagnostics ({warnings.length})</span>
            </span>
            <button
              onClick={() => onSmartCleanupCell(rowIndex, colIndex)}
              className={`text-[10px] px-2 py-0.5 rounded font-medium border flex items-center gap-1 transition ${
                isDark
                  ? 'bg-indigo-900/60 border-indigo-700 text-indigo-200 hover:bg-indigo-800/80'
                  : 'bg-indigo-100 border-indigo-300 text-indigo-800 hover:bg-indigo-200'
              }`}
              title="Apply Smart Cleanup to auto-fix standard syntax"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>Auto-Fix with Clean</span>
            </button>
          </div>

          <div className="flex flex-col gap-1.5 pt-0.5">
            {warnings.map((warn) => (
              <div
                key={warn.id}
                className={`p-1.5 rounded border text-[11px] flex flex-col gap-0.5 ${
                  warn.severity === 'error'
                    ? isDark
                      ? 'bg-red-950/40 border-red-800/60 text-red-200'
                      : 'bg-red-50/80 border-red-200 text-red-900'
                    : warn.severity === 'warning'
                      ? isDark
                        ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                        : 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : isDark
                        ? 'bg-blue-950/40 border-blue-800/60 text-blue-200'
                        : 'bg-blue-50/80 border-blue-200 text-blue-900'
                }`}
              >
                <div className="flex items-center justify-between font-medium">
                  <span className="flex items-center gap-1">
                    {warn.severity === 'error' ? (
                      <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                    ) : warn.severity === 'warning' ? (
                      <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                    ) : (
                      <Info className="w-3 h-3 text-blue-500 shrink-0" />
                    )}
                    <span>{warn.title}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {warn.line && (
                      <span className="text-[10px] font-mono opacity-80 px-1 py-0.2 rounded bg-black/20">
                        Line {warn.line}
                      </span>
                    )}
                    <button
                      onClick={() => onSmartCleanupCell(rowIndex, colIndex)}
                      className={`text-[9.5px] px-1.5 py-0.5 rounded font-medium border flex items-center gap-0.5 transition cursor-pointer active:scale-95 ${
                        isDark
                          ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-700 text-emerald-300'
                          : 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-800'
                      }`}
                      title="Fix this issue automatically"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Fix</span>
                    </button>
                  </div>
                </div>

                <p className="text-[10.5px] opacity-90 pl-4">{warn.description}</p>

                {warn.snippet && (
                  <div className="mt-0.5 ml-4 px-1.5 py-0.5 rounded font-mono text-[10px] bg-black/25 text-slate-300 truncate">
                    <code>{warn.snippet}</code>
                  </div>
                )}

                {warn.fixSuggestion && (
                  <p className="text-[10px] opacity-80 italic pl-4 text-emerald-400 dark:text-emerald-300">
                    💡 Tip: {warn.fixSuggestion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cell Textarea */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          id={`cell-textarea-${rowIndex}-${colIndex}`}
          value={cellValue}
          onChange={(e) => onCellChange(rowIndex, colIndex, e.target.value, true)}
          onKeyDown={handleKeyDown}
          onPaste={(e) => onPasteOnCell(e, rowIndex, colIndex)}
          placeholder={`Type or paste markdown in ${label}...`}
          className={`w-full h-full p-3 bg-transparent font-mono text-xs leading-relaxed resize-none focus:outline-none custom-scrollbar ${
            isDark
              ? 'text-slate-100 selection:bg-blue-600/40 placeholder:text-slate-600'
              : 'text-slate-800 selection:bg-blue-200 placeholder:text-slate-400'
          }`}
          spellCheck={false}
        />
      </div>

      {/* Dynamic Character, Word & Line Counter Footer */}
      <div
        id={`cell-counter-footer-${rowIndex}-${colIndex}`}
        className={`h-6 px-3 border-t flex items-center justify-between text-[10.5px] font-mono shrink-0 select-none ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 text-slate-400'
            : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            id={`cell-char-count-${rowIndex}-${colIndex}`}
            className={`font-semibold ${
              charCount > 0 ? (isDark ? 'text-slate-200' : 'text-slate-800') : 'opacity-60'
            }`}
            title="Total character count"
          >
            {charCount.toLocaleString()}{' '}
            <span className="font-sans font-normal text-[10px] text-slate-400">chars</span>
          </span>

          <span
            id={`cell-word-count-${rowIndex}-${colIndex}`}
            className="flex items-center gap-1"
            title="Total word count"
          >
            <span>{wordCount.toLocaleString()}</span>
            <span className="font-sans text-[10px] text-slate-400">words</span>
          </span>

          <span
            id={`cell-line-count-${rowIndex}-${colIndex}`}
            className="hidden sm:flex items-center gap-1"
            title="Total lines"
          >
            <span>{lineCount}</span>
            <span className="font-sans text-[10px] text-slate-400">lines</span>
          </span>
        </div>

        {/* Quick status on the right */}
        {warnings.length > 0 ? (
          <button
            onClick={() => setShowWarningsDrawer(!showWarningsDrawer)}
            className="flex items-center gap-1 text-[10px] font-sans font-medium text-amber-500 hover:underline cursor-pointer"
            title="Toggle warning details"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>
              {warnings.length} issue{warnings.length > 1 ? 's' : ''}
            </span>
          </button>
        ) : charCount > 0 ? (
          <span className="text-[10px] font-sans text-emerald-500/80 flex items-center gap-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>Clean</span>
          </span>
        ) : null}
      </div>
    </div>
  );
});
