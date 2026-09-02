import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { diffLines, type DiffLine, type DiffSegment } from '../utils/lineDiff';

interface ComparisonDialogProps {
  open: boolean;
  input: string;
  output: string;
  onClose: () => void;
  backgroundRef: React.RefObject<HTMLDivElement | null>;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const focusable = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function lineKindLabel(kind: DiffLine['kind']): string {
  if (kind === 'added') return 'added';
  if (kind === 'removed') return 'removed';
  return 'unchanged';
}

function linePrefix(kind: DiffLine['kind']): string {
  if (kind === 'added') return '+';
  if (kind === 'removed') return '−';
  return ' ';
}

function segmentClass(segment: DiffSegment, kind: DiffLine['kind']): string {
  if (!segment.changed) return '';
  return kind === 'added' ? 'bg-emerald-500/40 rounded-sm' : 'bg-rose-500/40 rounded-sm';
}

export const ComparisonDialog: React.FC<ComparisonDialogProps> = ({
  open,
  input,
  output,
  onClose,
  backgroundRef,
  triggerRef,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const diff = diffLines(input, output);

  useEffect(() => {
    if (!open) return;
    const background = backgroundRef.current;
    const wasInert = background?.inert ?? false;
    if (background) background.inert = true;
    closeRef.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusable));
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialogRef.current?.addEventListener('keydown', handler);
    return () => {
      dialogRef.current?.removeEventListener('keydown', handler);
      if (background) background.inert = wasInert;
      triggerRef.current?.focus();
    };
  }, [backgroundRef, onClose, open, triggerRef]);

  if (!open) return null;

  const renderLine = (side: 'input' | 'output', line: DiffLine | null, rowIndex: number) => {
    if (!line) {
      const label =
        side === 'input' ? 'No corresponding input line' : 'No corresponding output line';
      return (
        <div
          key={`${side}-spacer-${rowIndex}`}
          data-diff-side={side}
          data-diff-kind="spacer"
          data-diff-row={rowIndex}
          role="note"
          aria-label={label}
          className="min-h-8 border-b px-2 py-1.5"
          style={{ borderColor: 'var(--border-color)' }}
        />
      );
    }

    const kindLabel = lineKindLabel(line.kind);
    const prefix = linePrefix(line.kind);
    const lineBackground =
      line.kind === 'added' ? 'bg-emerald-500/15' : line.kind === 'removed' ? 'bg-rose-500/15' : '';

    return (
      <div
        key={`${side}-line-${line.lineNumber}-${rowIndex}`}
        data-diff-side={side}
        data-diff-kind={line.kind}
        data-diff-row={rowIndex}
        data-line-number={line.lineNumber}
        aria-label={`${side === 'input' ? 'Input Markdown' : 'Effective Output'} line ${line.lineNumber}, ${kindLabel}`}
        className={`min-h-8 border-b px-2 py-1.5 font-mono text-xs leading-5 ${lineBackground}`}
        style={{ borderColor: 'var(--border-color)' }}
      >
        <span className="mr-2 inline-block w-7 select-none text-right text-[10px] opacity-50">
          {line.lineNumber}
        </span>
        <span
          aria-hidden="true"
          className="mr-2 inline-block w-3 select-none text-center opacity-70"
        >
          {prefix}
        </span>
        <span className="whitespace-pre-wrap break-words">
          {line.segments.map((segment, segmentIndex) => (
            <span
              key={`${segmentIndex}-${segment.text}`}
              data-diff-segment={segment.changed ? 'changed' : 'same'}
              className={segmentClass(segment, line.kind)}
            >
              {segment.text}
            </span>
          ))}
        </span>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-3 sm:p-6"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparison-dialog-title"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border p-4 shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
        style={{
          backgroundColor: 'var(--panel-bg)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
      >
        <header className="flex items-center justify-between">
          <h2 id="comparison-dialog-title" className="text-lg font-semibold">
            Compare input and output
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close comparison dialog"
            className="rounded p-1 focus-visible:ring-2"
          >
            <X aria-hidden="true" />
          </button>
        </header>
        {diff.identical && (
          <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
            No differences found.
          </p>
        )}
        <div
          className="mt-4 min-h-0 overflow-auto rounded border"
          style={{ borderColor: 'var(--border-color)' }}
          aria-label="Side-by-side comparison"
        >
          <div className="min-w-[40rem]">
            <div
              className="sticky top-0 z-10 grid grid-cols-2 border-b text-xs font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: 'var(--surface-bg)',
                borderColor: 'var(--border-color)',
              }}
            >
              <h3 className="border-r px-3 py-2" style={{ borderColor: 'var(--border-color)' }}>
                Input Markdown
              </h3>
              <h3 className="px-3 py-2">Effective Output</h3>
            </div>
            {diff.rows.length ? (
              diff.rows.map((row, rowIndex) => (
                <div
                  key={`diff-row-${rowIndex}`}
                  data-diff-row={rowIndex}
                  className="grid grid-cols-2"
                >
                  {renderLine('input', row.left, rowIndex)}
                  {renderLine('output', row.right, rowIndex)}
                </div>
              ))
            ) : (
              <div data-diff-row="empty" className="grid grid-cols-2">
                <div
                  data-diff-side="input"
                  data-diff-kind="empty"
                  className="border-r px-3 py-3 text-sm italic opacity-60"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  No content
                </div>
                <div
                  data-diff-side="output"
                  data-diff-kind="empty"
                  className="px-3 py-3 text-sm italic opacity-60"
                >
                  No content
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
