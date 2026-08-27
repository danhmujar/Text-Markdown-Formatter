/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- scrollable preview region must be focusable (axe scrollable-region-focusable) */
import React, { useMemo } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Copy, Check, RotateCcw, Eye, Edit3, Table } from 'lucide-react';
import { StyleOptions } from '../types';
import { buildInlineStyledHtml, NumberingFormat } from '../utils/markdownFormatter';
import { cn } from '../utils/cn';
import { BUTTON_VARIANTS } from './ui';
import { EditToolbar } from './EditToolbar';

interface OutputCellProps {
  rowIndex: number;
  colIndex: number;
  outputText: string;
  inputHadBr: boolean;
  isOverridden: boolean;
  options: StyleOptions;
  cellMode: 'preview' | 'edit';
  isCopied: boolean;
  feedback: string | null;
  label: string;
  registerTextarea: (el: HTMLTextAreaElement | null) => void;
  onToggleMode: () => void;
  onReset: () => void;
  onCopy: () => void;
  onCopyExcel?: () => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  onOutputChange: (val: string) => void;
  onSmartClean: () => void;
  onApplyNumbering: (format: NumberingFormat) => void;
  onApplyInlineFormat: (wrapper: string, label: string) => void;
}

export const OutputCell: React.FC<OutputCellProps> = React.memo(function OutputCell({
  rowIndex: r,
  colIndex: c,
  outputText,
  inputHadBr,
  isOverridden,
  options,
  cellMode,
  isCopied,
  feedback,
  label,
  registerTextarea,
  onToggleMode,
  onReset,
  onCopy,
  onCopyExcel,
  onKeyDown,
  onOutputChange,
  onSmartClean,
  onApplyNumbering,
  onApplyInlineFormat,
}) {
  const isDark = options.theme === 'dark';
  const isEditMode = cellMode === 'edit';
  const htmlFormatted = useMemo(() => {
    try {
      return buildInlineStyledHtml(outputText, options, false);
    } catch {
      return '<p class="text-rose-400 italic text-xs">Preview failed to render</p>';
    }
  }, [
    outputText,
    options.theme,
    options.fontFamily,
    options.fontSize,
    options.lineHeight,
    options.bulletLevel1,
    options.bulletLevel2,
    options.bulletLevel3,
    options.tableBorderColor,
    options.tableHeaderBg,
    options.tableHeaderColor,
    options.primaryColor,
    options.tableAlternateBg,
    options.highlightBoldKeys,
  ]);
  const charCount = outputText.length;
  const wordCount = useMemo(
    () => (outputText.trim() ? outputText.trim().split(/\s+/).length : 0),
    [outputText],
  );
  const lineCount = useMemo(
    () => (outputText ? outputText.split(/\r?\n/).length : 0),
    [outputText],
  );

  return (
    <div
      id={`output-cell-${r}-${c}`}
      style={{
        backgroundColor: 'var(--panel-bg)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-primary)',
      }}
      className="flex flex-col rounded-lg overflow-hidden border shadow-sm h-full transition focus-within:ring-1 focus-within:ring-blue-500/40 focus-within:border-blue-500/60"
    >
      {/* Container Header */}
      <div
        style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--border-color)' }}
        className="h-8 px-3 border-b flex items-center justify-between gap-1 text-xs shrink-0 select-none"
      >
        <div className="flex items-center gap-1.5">
          <span
            className={`font-medium text-[11px] flex items-center gap-1.5 ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            <span
              style={{ backgroundColor: 'var(--primary-blue)' }}
              className="w-1.5 h-1.5 rounded-full inline-block"
            />
            {label}
          </span>
          {inputHadBr && (
            <span
              style={{
                backgroundColor: 'var(--accent-bg)',
                borderColor: 'var(--accent-border)',
                color: 'var(--primary-blue)',
              }}
              className="text-[10px] font-mono px-1.5 py-0.2 rounded border"
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
            type="button"
            onClick={onToggleMode}
            aria-label={
              isEditMode ? `Switch ${label} to Formatted Preview` : `Switch ${label} to Edit Mode`
            }
            aria-pressed={isEditMode}
            style={
              isEditMode
                ? {
                    backgroundColor: 'var(--primary-blue)',
                    borderColor: 'var(--primary-blue)',
                    color: 'white',
                  }
                : undefined
            }
            className={cn(
              'px-2 py-0.5 rounded border text-[10px] font-medium flex items-center gap-1 transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none',
              isEditMode
                ? 'shadow-2xs'
                : isDark
                  ? cn(BUTTON_VARIANTS.neutralDark, 'text-slate-300')
                  : cn(BUTTON_VARIANTS.neutralLight, 'text-slate-700', 'shadow-2xs'),
            )}
            title={isEditMode ? 'Switch to Formatted Preview' : 'Switch to Edit Mode'}
          >
            {isEditMode ? (
              <>
                <Eye aria-hidden="true" focusable="false" className="w-3 h-3 text-indigo-200" />
                <span>Preview</span>
              </>
            ) : (
              <>
                <Edit3 aria-hidden="true" focusable="false" className="w-3 h-3 text-slate-400" />
                <span>Edit</span>
              </>
            )}
          </button>

          {/* Revert / Reset if overridden */}
          {isOverridden && (
            <button
              id={`reset-output-cell-${r}-${c}`}
              type="button"
              onClick={onReset}
              aria-label={`Reset output for ${label} to match original input source`}
              className={cn(
                'px-1.5 py-0.5 rounded border text-[10px] font-medium flex items-center gap-1 transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none',
                isDark
                  ? cn(BUTTON_VARIANTS.neutralDark, 'text-slate-300', 'hover:text-white')
                  : cn(BUTTON_VARIANTS.neutralLight, 'text-slate-700', 'shadow-2xs'),
              )}
              title="Reset output to match original input source"
            >
              <RotateCcw aria-hidden="true" focusable="false" className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          )}

          {/* Copy Cell Button */}
          <button
            id={`copy-cell-btn-${r}-${c}`}
            type="button"
            onClick={onCopy}
            aria-label={
              inputHadBr
                ? `Copy formatted text for ${label} to Catalyst (converting line breaks back to <br>)`
                : `Copy formatted text for ${label} to Catalyst`
            }
            style={
              isCopied
                ? undefined
                : {
                    backgroundColor: 'var(--primary-blue)',
                    borderColor: 'var(--primary-blue)',
                  }
            }
            className={`px-2 py-0.5 rounded border text-[10px] font-medium flex items-center gap-1 transition shadow-2xs cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none hover:brightness-110 ${
              isCopied ? 'bg-emerald-600 text-white border-emerald-600 font-semibold' : 'text-white'
            }`}
            title={
              inputHadBr
                ? 'Copy formatted text to Catalyst (line breaks will convert back to <br> tags)'
                : 'Copy formatted text to Catalyst for Word & Outlook'
            }
          >
            {isCopied ? (
              <>
                <Check aria-hidden="true" focusable="false" className="w-3 h-3 text-white" />
                <span>Copied to Catalyst!</span>
              </>
            ) : (
              <>
                <Copy aria-hidden="true" focusable="false" className="w-3 h-3 text-white" />
                <span>Copy to Catalyst</span>
              </>
            )}
          </button>
          {onCopyExcel && (
            <button
              id={`copy-cell-excel-btn-${r}-${c}`}
              type="button"
              onClick={onCopyExcel}
              aria-label={`Copy formatted text for ${label} for Excel (keeps <br> literal)`}
              className="px-2 py-0.5 rounded border text-[10px] font-medium flex items-center gap-1 transition shadow-2xs cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none hover:brightness-110"
              style={{
                backgroundColor: 'var(--panel-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)',
              }}
              title="Copy for Excel — keeps <br> as text inside table cells"
            >
              <Table aria-hidden="true" focusable="false" className="w-3 h-3" />
              <span>Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Edit Mode Formatting Toolbar - Shown only when Edit Mode is active */}
      {isEditMode && (
        <EditToolbar
          rowIndex={r}
          colIndex={c}
          isDark={isDark}
          feedback={feedback}
          onApplyNumbering={onApplyNumbering}
          onApplyInlineFormat={onApplyInlineFormat}
          onSmartClean={onSmartClean}
        />
      )}

      {/* Body: Formatted Rich Text View (Default) OR Editable Textarea */}
      <div className="flex-1 relative overflow-hidden">
        {isEditMode ? (
          <textarea
            ref={(el) => {
              registerTextarea(el);
            }}
            id={`output-textarea-${r}-${c}`}
            value={outputText}
            onChange={(e) => onOutputChange(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label={`Edit output for ${label}`}
            aria-describedby={`output-footer-${r}-${c}`}
            placeholder={`Edit output for ${label}... (Press Enter to auto-continue numbering)`}
            className={`w-full h-full p-3.5 bg-transparent font-mono text-xs leading-relaxed resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 custom-scrollbar ${
              isDark
                ? 'text-slate-100 selection:bg-blue-600/40 placeholder:text-slate-400'
                : 'text-slate-800 selection:bg-blue-200 placeholder:text-slate-500'
            }`}
            spellCheck={false}
          />
        ) : (
          <div
            id={`output-formatted-${r}-${c}`}
            tabIndex={0}
            role="region"
            aria-label={`Formatted preview for ${label}`}
            dangerouslySetInnerHTML={{ __html: htmlFormatted }}
            className={`w-full h-full p-4 overflow-auto custom-scrollbar select-text leading-relaxed font-sans focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          />
        )}
      </div>

      {/* Output Footer Counter */}
      <div
        id={`output-footer-${r}-${c}`}
        style={{
          backgroundColor: 'var(--surface-bg)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-secondary)',
        }}
        className="h-6 px-3 border-t flex items-center justify-between text-[10.5px] font-mono shrink-0 select-none"
      >
        <div className="flex items-center gap-3">
          <span
            className={`font-semibold ${charCount > 0 ? (isDark ? 'text-slate-200' : 'text-slate-800') : 'opacity-60'}`}
          >
            {charCount.toLocaleString()}{' '}
            <span
              className={`font-sans font-normal text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              chars
            </span>
          </span>
          <span className="flex items-center gap-1">
            <span>{wordCount.toLocaleString()}</span>
            <span
              className={`font-sans text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              words
            </span>
          </span>
          <span className="hidden sm:flex items-center gap-1">
            <span>{lineCount}</span>
            <span
              className={`font-sans text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              lines
            </span>
          </span>
        </div>

        <span
          className={`text-[10px] font-sans flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
        >
          <span>{isEditMode ? 'Editing Raw Text' : 'Formatted Preview'}</span>
        </span>
      </div>
    </div>
  );
});
