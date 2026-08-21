import React, { useState, useMemo } from 'react';
import { Copy, Check, RotateCcw, Minimize2, ArrowLeft, Eye, Edit3 } from 'lucide-react';
import { StyleOptions } from '../types';
import { hasBrTags, buildInlineStyledHtml } from '../utils/markdownFormatter';

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
  onSwitchFocus
}) => {
  const isDark = options.theme === 'dark';
  const numRows = grid.length;
  const numCols = Math.max(...grid.map(r => r.length), 1);

  // Track per-cell mode: 'preview' (formatted rich text) or 'edit' (raw editable textarea)
  // Default to 'preview' so pasted raw markdown is immediately converted into beautiful formatted text
  const [cellModes, setCellModes] = useState<Record<string, 'preview' | 'edit'>>({});

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
    setCellModes(prev => ({
      ...prev,
      [cellKey]: prev[cellKey] === 'edit' ? 'preview' : 'edit'
    }));
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
    <div className={`flex flex-col h-full overflow-hidden transition-colors ${
      isDark ? 'bg-slate-950' : 'bg-slate-100'
    }`}>
      {/* Output Header with Focus Badges & Global Copy */}
      <div className={`h-12 px-4 border-b flex items-center justify-between gap-3 text-xs shrink-0 transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            Output
          </span>
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
            isDark 
              ? 'bg-slate-800 text-emerald-300 border-slate-700' 
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
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
            {totalOutputChars.toLocaleString()} <span className="font-sans font-normal text-[10px] text-slate-400 ml-0.5">chars</span>
          </span>
          {isFocusMode && (
            <div className="flex items-center gap-1.5 ml-1">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                isDark
                  ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300'
                  : 'bg-emerald-100/80 border-emerald-300 text-emerald-800'
              }`}>
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
      <div className={`flex-1 overflow-hidden p-3 transition-colors ${
        isDark ? 'bg-slate-950/70' : 'bg-slate-100/60'
      }`}>
        <div
          className="grid gap-3 h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))`
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
                  <div className={`h-8 px-3 border-b flex items-center justify-between gap-1 text-xs shrink-0 select-none ${
                    isDark ? 'bg-slate-850 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-medium text-[11px] flex items-center gap-1.5 ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        {getCellLabel(r, c)}
                      </span>
                      {inputHadBr && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                          isDark
                            ? 'bg-indigo-950/60 border-indigo-800 text-indigo-300'
                            : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        }`} title="Input contains <br> tags. On Copy, line breaks will automatically convert back to <br> tags.">
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
                        title={isEditMode ? "Switch to Formatted Preview" : "Switch to Edit Mode"}
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
                            ? "Copy formatted text to clipboard (line breaks will convert back to <br> tags)"
                            : "Copy formatted text for Word & Outlook"
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

                  {/* Body: Formatted Rich Text View (Default) OR Editable Textarea */}
                  <div className="flex-1 relative overflow-hidden">
                    {isEditMode ? (
                      <textarea
                        id={`output-textarea-${r}-${c}`}
                        value={outputText}
                        onChange={(e) => onOutputChange(r, c, e.target.value, true)}
                        placeholder={`Edit output for ${getCellLabel(r, c)}...`}
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
                      isDark ? 'bg-slate-900/90 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold ${charCount > 0 ? (isDark ? 'text-slate-200' : 'text-slate-800') : 'opacity-60'}`}>
                        {charCount.toLocaleString()} <span className="font-sans font-normal text-[10px] text-slate-400">chars</span>
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
            })
          )}
        </div>
      </div>
    </div>
  );
};
