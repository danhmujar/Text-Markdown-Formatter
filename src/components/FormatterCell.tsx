/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- scrollable preview region must be focusable */
import React, { useEffect, useMemo, useState } from 'react';
import type {
  ClipboardEvent as ReactClipboardEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit3,
  Eye,
  Table,
  Trash2,
} from 'lucide-react';
import type { StyleOptions } from '../types';
import { analyzeSyntaxWarnings } from '../utils/syntaxValidator';
import { buildInlineStyledHtml, ListTerminator, NumberingFormat } from '../utils/markdownFormatter';
import { cn } from '../utils/cn';
import { BUTTON_VARIANTS } from './ui';
import { EditToolbar } from './EditToolbar';

interface FormatterCellProps {
  rowIndex: number;
  colIndex: number;
  content: string;
  inputHadBr: boolean;
  options: StyleOptions;
  mode: 'preview' | 'edit';
  isCopied: boolean;
  feedback: string | null;
  label: string;
  showLabel: boolean;
  registerTextarea: (
    rowIndex: number,
    colIndex: number,
    element: HTMLTextAreaElement | null,
  ) => void;
  onModeChange: (rowIndex: number, colIndex: number, mode: 'preview' | 'edit') => void;
  onClear: (rowIndex: number, colIndex: number) => void;
  onCopy: (rowIndex: number, colIndex: number) => void;
  onCopyExcel?: (rowIndex: number, colIndex: number) => void;
  onKeyDown: (
    event: ReactKeyboardEvent<HTMLTextAreaElement>,
    rowIndex: number,
    colIndex: number,
  ) => void;
  onPaste: (
    event: ReactClipboardEvent<HTMLTextAreaElement>,
    rowIndex: number,
    colIndex: number,
  ) => void;
  onChange: (rowIndex: number, colIndex: number, value: string) => void;
  onSmartClean: (rowIndex: number, colIndex: number) => void;
  onApplyNumbering: (rowIndex: number, colIndex: number, format: NumberingFormat) => void;
  onApplyInlineFormat: (rowIndex: number, colIndex: number, wrapper: string, label: string) => void;
  listTerminator: ListTerminator;
  onListTerminatorChange: (value: ListTerminator) => void;
}

export const FormatterCell: React.FC<FormatterCellProps> = React.memo(function FormatterCell({
  rowIndex,
  colIndex,
  content,
  inputHadBr,
  options,
  mode,
  isCopied,
  feedback,
  label,
  showLabel,
  registerTextarea,
  onModeChange,
  onClear,
  onCopy,
  onCopyExcel,
  onKeyDown,
  onPaste,
  onChange,
  onSmartClean,
  onApplyNumbering,
  onApplyInlineFormat,
  listTerminator,
  onListTerminatorChange,
}) {
  const [showWarnings, setShowWarnings] = useState(false);
  const isDark = options.theme === 'dark';
  const isEditMode = content.length === 0 || mode === 'edit';
  const warnings = useMemo(() => analyzeSyntaxWarnings(content), [content]);
  const htmlFormatted = useMemo(() => {
    if (isEditMode) return '';
    try {
      return buildInlineStyledHtml(content, options, false);
    } catch {
      return '<p class="text-rose-400 italic text-xs">Preview failed to render</p>';
    }
  }, [content, isEditMode, options]);
  const wordCount = useMemo(
    () => (content.trim() ? content.trim().split(/\s+/).length : 0),
    [content],
  );
  const lineCount = useMemo(() => (content ? content.split(/\r?\n/).length : 0), [content]);

  useEffect(() => {
    if (!showWarnings) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowWarnings(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showWarnings]);
  const showCellHeader = showLabel || warnings.length > 0 || Boolean(content);

  return (
    <div
      id={`formatter-cell-${rowIndex}-${colIndex}`}
      style={{
        backgroundColor: 'var(--panel-bg)',
        borderColor: warnings.length ? 'var(--warning-border)' : 'var(--border-color)',
        color: 'var(--text-primary)',
      }}
      className="flex h-full flex-col overflow-clip rounded-lg border shadow-sm transition focus-within:ring-1 focus-within:ring-blue-500/40"
    >
      {showCellHeader ? (
        <div
          className="sticky left-0 z-10 flex min-h-10 max-w-[calc(100vw-2rem)] shrink-0 items-center justify-between gap-2 border-b px-3 py-1.5 text-xs"
          style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <span
              id={`formatter-cell-label-${rowIndex}-${colIndex}`}
              className={`${showLabel ? '' : 'sr-only '}shrink-0 text-[11px] font-medium text-[var(--text-secondary)]`}
            >
              {label}
            </span>
            {warnings.length > 0 && (
              <button
                type="button"
                onClick={() => setShowWarnings((visible) => !visible)}
                aria-expanded={showWarnings}
                aria-controls={`formatter-warnings-${rowIndex}-${colIndex}`}
                aria-label={`${warnings.length} syntax ${warnings.length === 1 ? 'warning' : 'warnings'} for ${label}`}
                className={`flex min-h-11 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:min-h-8 ${
                  isDark
                    ? 'border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-color)]'
                    : 'border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-color)]'
                }`}
              >
                <AlertTriangle aria-hidden="true" className="h-3 w-3" />
                {warnings.length}
                {showWarnings ? (
                  <ChevronUp aria-hidden="true" className="h-3 w-3" />
                ) : (
                  <ChevronDown aria-hidden="true" className="h-3 w-3" />
                )}
              </button>
            )}
          </div>

          <div className="flex min-w-0 flex-nowrap items-center justify-end gap-1.5 overflow-x-auto">
            {content && (
              <button
                id={`toggle-edit-mode-${rowIndex}-${colIndex}`}
                type="button"
                onClick={() => onModeChange(rowIndex, colIndex, isEditMode ? 'preview' : 'edit')}
                aria-label={isEditMode ? `Preview ${label}` : `Edit ${label}`}
                aria-pressed={isEditMode}
                className={cn(
                  'flex min-h-11 items-center gap-1 rounded border px-2 py-1 text-[10px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:min-h-8',
                  isEditMode
                    ? 'border-[var(--primary-blue)] bg-[var(--primary-blue)] text-[var(--primary-foreground)]'
                    : BUTTON_VARIANTS.neutralOnSurface,
                )}
              >
                {isEditMode ? (
                  <Eye aria-hidden="true" className="h-3 w-3" />
                ) : (
                  <Edit3 aria-hidden="true" className="h-3 w-3" />
                )}
                <span>{isEditMode ? 'Preview' : 'Edit'}</span>
              </button>
            )}
            {content && (
              <button
                type="button"
                onClick={() => onCopy(rowIndex, colIndex)}
                aria-label={`Copy formatted ${label} to Catalyst`}
                className={`flex min-h-11 items-center gap-1 rounded border px-2 py-1 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:min-h-8 ${
                  isCopied
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-transparent text-[var(--primary-foreground)]'
                }`}
                style={isCopied ? undefined : { backgroundColor: 'var(--primary-blue)' }}
              >
                {isCopied ? (
                  <Check aria-hidden="true" className="h-3 w-3" />
                ) : (
                  <Copy aria-hidden="true" className="h-3 w-3" />
                )}
                <span>{isCopied ? 'Copied' : 'Copy to Catalyst'}</span>
              </button>
            )}
            {content && onCopyExcel && (
              <button
                type="button"
                onClick={() => onCopyExcel(rowIndex, colIndex)}
                aria-label={`Copy formatted ${label} for Excel`}
                className="flex min-h-11 items-center gap-1 rounded border px-2 py-1 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:min-h-8"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                <Table aria-hidden="true" className="h-3 w-3" />
                <span>Excel</span>
              </button>
            )}
            {content && (
              <button
                type="button"
                onClick={() => onClear(rowIndex, colIndex)}
                aria-label={`Clear ${label}`}
                className="flex min-h-11 min-w-11 items-center justify-center rounded text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 hover:text-red-600 sm:min-h-8 sm:min-w-8"
              >
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <span id={`formatter-cell-label-${rowIndex}-${colIndex}`} className="sr-only">
          {label}
        </span>
      )}

      {showWarnings && warnings.length > 0 && (
        <div
          id={`formatter-warnings-${rowIndex}-${colIndex}`}
          role="region"
          aria-label={`Syntax warnings for ${label}`}
          className={`max-h-40 shrink-0 overflow-y-auto border-b p-2.5 text-xs ${
            isDark ? 'border-amber-900/50 bg-slate-950/95' : 'border-amber-200 bg-amber-50'
          }`}
        >
          {warnings.map((warning) => (
            <div key={warning.id} className="mb-1.5 last:mb-0">
              <strong>{warning.title}</strong>
              {warning.line && (
                <span className="ml-2 font-mono text-[10px]">Line {warning.line}</span>
              )}
              <p className="text-[10.5px] opacity-90">{warning.description}</p>
            </div>
          ))}
        </div>
      )}

      {isEditMode && content && (
        <EditToolbar
          rowIndex={rowIndex}
          colIndex={colIndex}
          isDark={isDark}
          feedback={feedback}
          onApplyNumbering={(format) => onApplyNumbering(rowIndex, colIndex, format)}
          onApplyInlineFormat={(wrapper, formatLabel) =>
            onApplyInlineFormat(rowIndex, colIndex, wrapper, formatLabel)
          }
          onSmartClean={() => onSmartClean(rowIndex, colIndex)}
          listTerminator={listTerminator}
          onListTerminatorChange={onListTerminatorChange}
        />
      )}

      <div className="relative flex-1 overflow-hidden">
        {isEditMode ? (
          <textarea
            ref={(element) => registerTextarea(rowIndex, colIndex, element)}
            id={`formatter-textarea-${rowIndex}-${colIndex}`}
            value={content}
            onChange={(event) => onChange(rowIndex, colIndex, event.target.value)}
            onKeyDown={(event) => onKeyDown(event, rowIndex, colIndex)}
            onPaste={(event) => onPaste(event, rowIndex, colIndex)}
            aria-labelledby={`formatter-cell-label-${rowIndex}-${colIndex}`}
            aria-describedby={`formatter-footer-${rowIndex}-${colIndex}`}
            placeholder="Paste text from PDF, Word, or email…"
            className={`h-full w-full resize-none bg-transparent p-4 font-mono text-xs leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              isDark
                ? 'text-slate-100 placeholder:text-slate-400 selection:bg-blue-600/40'
                : 'text-slate-800 placeholder:text-slate-500 selection:bg-blue-200'
            }`}
            spellCheck={false}
          />
        ) : (
          <div
            id={`formatter-preview-${rowIndex}-${colIndex}`}
            tabIndex={0}
            role="region"
            aria-label={`Formatted preview for ${label}`}
            dangerouslySetInnerHTML={{ __html: htmlFormatted }}
            className={`h-full w-full select-text overflow-auto p-4 font-sans leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          />
        )}
      </div>

      <div
        id={`formatter-footer-${rowIndex}-${colIndex}`}
        className="flex h-7 shrink-0 items-center justify-between border-t px-3 font-mono text-[10.5px]"
        style={{
          backgroundColor: 'var(--surface-bg)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-secondary)',
        }}
      >
        <span>
          {content.length.toLocaleString()} chars · {wordCount.toLocaleString()} words · {lineCount}{' '}
          lines
        </span>
        <span className="font-sans">{isEditMode ? 'Editing' : 'Preview'}</span>
      </div>
      {inputHadBr && <span className="sr-only">Line break tags are preserved when copied.</span>}
    </div>
  );
});
