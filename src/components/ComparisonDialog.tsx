import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { diffLines } from '../utils/lineDiff';

interface ComparisonDialogProps {
  open: boolean;
  input: string;
  output: string;
  onClose: () => void;
  backgroundRef: React.RefObject<HTMLDivElement | null>;
  triggerRef: React.RefObject<HTMLElement | null>;
}
const focusable = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';
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
    const bg = backgroundRef.current;
    if (bg) bg.inert = true;
    closeRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab' && dialogRef.current) {
        const nodes = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusable));
        if (
          nodes.length &&
          ((e.shiftKey && document.activeElement === nodes[0]) ||
            (!e.shiftKey && document.activeElement === nodes[nodes.length - 1]))
        ) {
          e.preventDefault();
          (e.shiftKey ? nodes[nodes.length - 1] : nodes[0]).focus();
        }
      }
    };
    dialogRef.current?.addEventListener('keydown', handler);
    return () => {
      dialogRef.current?.removeEventListener('keydown', handler);
      if (bg) bg.inert = false;
      triggerRef.current?.focus();
    };
  }, [backgroundRef, onClose, open, triggerRef]);
  if (!open) return null;
  const panel = (title: string, lines: typeof diff.input, empty: boolean) => (
    <section
      className="min-w-0 flex-1 overflow-auto rounded border p-3"
      style={{ borderColor: 'var(--border-color)' }}
      aria-label={title}
    >
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-70">{title}</h3>
      {empty ? (
        <p className="text-sm italic opacity-60">No content</p>
      ) : (
        <pre className="whitespace-pre-wrap text-sm leading-6">
          {lines.map((line, i) => (
            <span
              key={`${i}-${line.text}`}
              className={
                line.kind === 'same'
                  ? 'block'
                  : `block ${line.kind === 'added' ? 'bg-emerald-500/15' : 'bg-rose-500/15'}`
              }
            >
              {line.kind === 'added' ? '+ ' : line.kind === 'removed' ? '− ' : '  '}
              {line.text || ' '}
              {'\n'}
            </span>
          ))}
        </pre>
      )}
    </section>
  );
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-3 sm:p-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
        <div className="mt-4 flex min-h-0 flex-col gap-3 overflow-auto md:flex-row">
          {panel('Input Markdown', diff.input, diff.inputEmpty)}
          {panel('Effective Output', diff.output, diff.outputEmpty)}
        </div>
      </div>
    </div>
  );
};
