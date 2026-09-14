/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- scrollable comparison region must be focusable */
import React from 'react';
import { diffLines, isDiffSupported, type DiffLine } from '../utils/lineDiff';

interface ComparisonResultProps {
  leftText: string;
  rightText: string;
  fontSize: number;
}

function lineKindLabel(kind: DiffLine['kind']): string {
  if (kind === 'added') return 'added';
  if (kind === 'removed') return 'removed';
  return 'unchanged';
}

export const ComparisonResult: React.FC<ComparisonResultProps> = ({
  leftText,
  rightText,
  fontSize,
}) => {
  if (!isDiffSupported(leftText, rightText)) {
    return (
      <section aria-labelledby="comparison-result-title" className="flex min-h-0 flex-col">
        <h2 id="comparison-result-title" className="sr-only">
          Comparison result
        </h2>
        <p role="alert" className="text-sm text-[var(--text-secondary)]">
          Comparison is limited to 1,000 lines, 10,000 tokens per side, and a combined work limit.
          Reduce the number of changed lines or words and try again.
        </p>
      </section>
    );
  }

  const diff = diffLines(leftText, rightText);

  const renderLine = (side: 'left' | 'right', line: DiffLine | null, rowIndex: number) => {
    const label = side === 'left' ? 'Left' : 'Right';
    if (!line) {
      return (
        <div
          key={`${side}-spacer-${rowIndex}`}
          data-diff-side={side}
          data-diff-kind="spacer"
          role="note"
          aria-label={`No corresponding ${label} line`}
          className="min-h-8 border-b px-2 py-1.5"
          style={{ borderColor: 'var(--border-color)' }}
        />
      );
    }

    const kindLabel = lineKindLabel(line.kind);

    return (
      <div
        key={`${side}-line-${line.lineNumber}-${rowIndex}`}
        data-diff-side={side}
        data-diff-kind={line.kind}
        data-line-number={line.lineNumber}
        aria-label={`${label} line ${line.lineNumber}, ${kindLabel}`}
        className="min-h-8 border-b px-2 py-1.5 font-mono leading-5"
        style={{ borderColor: 'var(--border-color)', fontSize: `${fontSize}pt` }}
      >
        <span className="whitespace-pre-wrap break-words">
          {line.segments.map((segment, segmentIndex) => (
            <span
              key={`${segmentIndex}-${segment.text}`}
              data-diff-segment={segment.changed ? 'changed' : 'same'}
              className={segment.changed ? 'rounded-sm bg-[var(--diff-highlight-bg)]' : ''}
            >
              {segment.text}
            </span>
          ))}
        </span>
      </div>
    );
  };

  return (
    <section aria-labelledby="comparison-result-title" className="flex min-h-0 flex-col">
      <h2 id="comparison-result-title" className="sr-only">
        Comparison result
      </h2>
      {diff.identical && (
        <p className="mb-3 text-sm text-[var(--success-color)]">No differences found.</p>
      )}
      <div
        id="comparison-result"
        tabIndex={0}
        className="min-h-0 overflow-auto rounded border focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
        style={{ borderColor: 'var(--border-color)' }}
        aria-label="Side-by-side comparison"
      >
        <div
          className="min-w-[40rem]"
          data-comparison-text="true"
          style={{ fontSize: `${fontSize}pt` }}
        >
          <div
            className="sticky top-0 z-10 grid grid-cols-2 border-b text-xs font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: 'var(--surface-bg)',
              borderColor: 'var(--border-color)',
            }}
          >
            <h3 className="border-r px-3 py-2" style={{ borderColor: 'var(--border-color)' }}>
              Left
            </h3>
            <h3 className="px-3 py-2">Right</h3>
          </div>
          {diff.rows.length ? (
            diff.rows.map((row, rowIndex) => (
              <div
                key={`diff-row-${rowIndex}`}
                data-diff-row={rowIndex}
                className="grid grid-cols-2"
              >
                {renderLine('left', row.left, rowIndex)}
                {renderLine('right', row.right, rowIndex)}
              </div>
            ))
          ) : (
            <div data-diff-row="empty" className="grid grid-cols-2">
              <div
                data-diff-side="left"
                data-diff-kind="empty"
                className="border-r px-3 py-3 text-sm italic opacity-60"
                style={{ borderColor: 'var(--border-color)' }}
              >
                No content
              </div>
              <div
                data-diff-side="right"
                data-diff-kind="empty"
                className="px-3 py-3 text-sm italic opacity-60"
              >
                No content
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
