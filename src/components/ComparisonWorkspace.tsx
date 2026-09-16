import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Eraser, GitCompare, Pencil } from 'lucide-react';
import { ComparisonResult } from './ComparisonResult';
import { BUTTON_VARIANTS } from './ui';

interface ComparisonWorkspaceProps {
  onBackToFormatter: () => void;
  fontSize: number;
}

type ComparisonView = 'editing' | 'result';

const editorClassName =
  'min-h-0 w-full flex-1 resize-none rounded-lg border bg-transparent p-3 font-mono leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

export const ComparisonWorkspace: React.FC<ComparisonWorkspaceProps> = ({
  onBackToFormatter,
  fontSize,
}) => {
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [view, setView] = useState<ComparisonView>('editing');

  const leftEditorRef = useRef<HTMLTextAreaElement>(null);
  const previousViewRef = useRef(view);

  useEffect(() => {
    if (previousViewRef.current === view) return;
    previousViewRef.current = view;
    if (view === 'result') document.getElementById('comparison-result')?.focus();
    else leftEditorRef.current?.focus();
  }, [view]);

  const isEditing = view === 'editing';
  const isBlank = !leftText.trim() && !rightText.trim();

  const clearComparison = () => {
    if (!isBlank && !window.confirm('Clear both comparison drafts? This cannot be undone.')) {
      return;
    }
    setLeftText('');
    setRightText('');
    setView('editing');
  };

  return (
    <div
      id="comparison-main-content"
      tabIndex={-1}
      className="flex h-full min-h-0 flex-col overflow-hidden p-3 outline-none sm:p-5"
      aria-labelledby="comparison-heading"
    >
      <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            id="comparison-heading"
            className="flex items-center gap-2 text-lg font-semibold sm:text-xl"
          >
            <GitCompare
              aria-hidden="true"
              focusable="false"
              className="h-5 w-5 text-[var(--primary-blue)]"
            />
            Comparison
          </h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)] sm:text-sm">
            Paste two versions side by side, then compare their differences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="comparison-clear-btn"
            type="button"
            onClick={clearComparison}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm"
            style={{
              backgroundColor: 'var(--surface-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          >
            <Eraser aria-hidden="true" focusable="false" className="h-4 w-4" />
            Clear
          </button>
          <button
            id="comparison-back-btn"
            type="button"
            onClick={onBackToFormatter}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm"
            style={{
              backgroundColor: 'var(--surface-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          >
            <ArrowLeft aria-hidden="true" focusable="false" className="h-4 w-4" />
            Back to Formatter
          </button>
        </div>
      </header>

      {isEditing ? (
        <form
          className="flex min-h-0 flex-1 flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setView('result');
          }}
        >
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
            <section
              className="flex min-h-[12rem] min-w-0 flex-1 flex-col rounded-lg border p-3"
              style={{
                backgroundColor: 'var(--panel-bg)',
                borderColor: 'var(--border-color)',
              }}
              aria-labelledby="comparison-left-heading"
            >
              <h2 id="comparison-left-heading" className="mb-2 text-sm font-semibold">
                Left
              </h2>
              <label className="sr-only" htmlFor="comparison-left-textarea">
                Left
              </label>
              <textarea
                ref={leftEditorRef}
                id="comparison-left-textarea"
                value={leftText}
                onChange={(event) => setLeftText(event.target.value)}
                placeholder="Paste or type the left version here..."
                className={editorClassName}
                style={{ fontSize: `${fontSize}pt` }}
                spellCheck={false}
              />
            </section>
            <section
              className="flex min-h-[12rem] min-w-0 flex-1 flex-col rounded-lg border p-3"
              style={{
                backgroundColor: 'var(--panel-bg)',
                borderColor: 'var(--border-color)',
              }}
              aria-labelledby="comparison-right-heading"
            >
              <h2 id="comparison-right-heading" className="mb-2 text-sm font-semibold">
                Right
              </h2>
              <label className="sr-only" htmlFor="comparison-right-textarea">
                Right
              </label>
              <textarea
                id="comparison-right-textarea"
                value={rightText}
                onChange={(event) => setRightText(event.target.value)}
                placeholder="Paste or type the right version here..."
                className={editorClassName}
                style={{ fontSize: `${fontSize}pt` }}
                spellCheck={false}
              />
            </section>
          </div>
          <div className="flex shrink-0 justify-end">
            <button
              id="comparison-run-btn"
              type="submit"
              disabled={isBlank}
              aria-describedby={isBlank ? 'comparison-content-prompt' : undefined}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${BUTTON_VARIANTS.disabledMuted}`}
              style={{
                backgroundColor: 'var(--primary-blue)',
                borderColor: 'var(--primary-blue)',
              }}
            >
              <GitCompare aria-hidden="true" focusable="false" className="h-4 w-4" />
              Compare
            </button>
          </div>
          {isBlank && (
            <p
              id="comparison-content-prompt"
              className="shrink-0 text-right text-xs text-[var(--text-secondary)]"
            >
              Enter content on at least one side to compare.
            </p>
          )}
        </form>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Review the aligned differences below.
            </p>
            <button
              id="comparison-edit-btn"
              type="button"
              onClick={() => setView('editing')}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm"
              style={{
                backgroundColor: 'var(--surface-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              <Pencil aria-hidden="true" focusable="false" className="h-3.5 w-3.5" />
              Edit comparison
            </button>
          </div>
          <ComparisonResult leftText={leftText} rightText={rightText} fontSize={fontSize} />
        </div>
      )}
    </div>
  );
};
