import { useRef, useState, useCallback } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  applyInlineFormatToText,
  applyNumberingToText,
  getNextListPrefix,
  NumberingFormat,
  smartCleanupMarkdown,
} from '../utils/markdownFormatter';

interface UseOutputActionsArgs {
  getOutputContent: (rowIndex: number, colIndex: number) => string;
  onOutputChange: (rowIndex: number, colIndex: number, val: string, isTyping?: boolean) => void;
}

export function useOutputActions({ getOutputContent, onOutputChange }: UseOutputActionsArgs) {
  // Track per-cell mode: 'preview' (formatted rich text) or 'edit' (raw editable textarea)
  const [cellModes, setCellModes] = useState<Record<string, 'preview' | 'edit'>>({});

  // Textarea references for maintaining cursor focus during toolbar actions
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Feedback notifications per cell
  const [cellFeedback, setCellFeedback] = useState<Record<string, string | null>>({});

  const showCellFeedback = useCallback((cellId: string, msg: string) => {
    setCellFeedback((prev) => ({ ...prev, [cellId]: msg }));
    setTimeout(() => {
      setCellFeedback((prev) => ({ ...prev, [cellId]: null }));
    }, 2500);
  }, []);

  const toggleCellMode = useCallback((cellKey: string) => {
    setCellModes((prev) => ({
      ...prev,
      [cellKey]: prev[cellKey] === 'edit' ? 'preview' : 'edit',
    }));
  }, []);

  const handleApplyNumbering = useCallback(
    (r: number, c: number, format: NumberingFormat) => {
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
    },
    [getOutputContent, onOutputChange, showCellFeedback],
  );

  const handleApplyInlineFormat = useCallback(
    (r: number, c: number, wrapper: string, label: string) => {
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
    },
    [getOutputContent, onOutputChange, showCellFeedback],
  );

  const handleSmartCleanOutputCell = useCallback(
    (r: number, c: number) => {
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
    },
    [getOutputContent, onOutputChange, showCellFeedback],
  );

  /**
   * Auto-continuation on Enter:
   * Detects (i) (ii), 1. 2., a. b., bullet prefixes and automatically generates
   * the next numbered prefix on the new line.
   * If Enter is pressed on an empty prefix, it clears the prefix (allows easy list exit).
   */
  const handleTextareaKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLTextAreaElement>, r: number, c: number) => {
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
    },
    [onOutputChange],
  );

  return {
    cellModes,
    cellFeedback,
    textareaRefs,
    toggleCellMode,
    handleApplyNumbering,
    handleApplyInlineFormat,
    handleSmartCleanOutputCell,
    handleTextareaKeyDown,
  };
}
