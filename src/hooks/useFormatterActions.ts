import { useRef, useState, useCallback, useEffect } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  applyInlineFormatToText,
  applyListDedent,
  applyListIndent,
  applyNumberingToText,
  applySmartListEnter,
  getNextListPrefix,
  getListTerminator,
  setListTerminator,
  subscribeListTerminator,
  type ListTerminator,
  NumberingFormat,
  smartCleanupMarkdown,
} from '../utils/markdownFormatter';

interface UseFormatterActionsArgs {
  getContent: (rowIndex: number, colIndex: number) => string;
  onContentChange: (rowIndex: number, colIndex: number, value: string, isTyping?: boolean) => void;
}

export function useFormatterActions({ getContent, onContentChange }: UseFormatterActionsArgs) {
  const [cellModes, setCellModes] = useState<Record<string, 'preview' | 'edit'>>({});
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [cellFeedback, setCellFeedback] = useState<Record<string, string | null>>({});
  const [listTerminator, setTerminator] = useState<ListTerminator>(() => getListTerminator());

  useEffect(() => subscribeListTerminator(() => setTerminator(getListTerminator())), []);

  const showCellFeedback = useCallback((cellId: string, message: string) => {
    setCellFeedback((previous) => ({ ...previous, [cellId]: message }));
    setTimeout(() => {
      setCellFeedback((previous) => ({ ...previous, [cellId]: null }));
    }, 2500);
  }, []);

  const setCellMode = useCallback((cellKey: string, mode: 'preview' | 'edit') => {
    setCellModes((previous) => ({ ...previous, [cellKey]: mode }));
  }, []);

  const handleApplyNumbering = useCallback(
    (rowIndex: number, colIndex: number, format: NumberingFormat) => {
      const cellId = `${rowIndex}-${colIndex}`;
      const textarea = textareaRefs.current[cellId];
      const current = getContent(rowIndex, colIndex);
      const start = textarea ? textarea.selectionStart : 0;
      const end = textarea ? textarea.selectionEnd : current.length;
      const result = applyNumberingToText(current, start, end, format);
      onContentChange(rowIndex, colIndex, result.text, false);

      const formatLabel =
        format === 'roman-parentheses' || format === '(i)'
          ? '(i) (ii) Roman'
          : format === 'numeric-dot' || format === '1.'
            ? '1. 2. Numbered'
            : format === 'alpha-dot' || format === 'a.'
              ? 'a. b. Alphabetical'
              : '• Bullet';
      showCellFeedback(cellId, `Applied ${formatLabel}`);

      if (textarea) {
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(result.newSelectionStart, result.newSelectionEnd);
        }, 0);
      }
    },
    [getContent, onContentChange, showCellFeedback],
  );

  const handleApplyInlineFormat = useCallback(
    (rowIndex: number, colIndex: number, wrapper: string, label: string) => {
      const cellId = `${rowIndex}-${colIndex}`;
      const textarea = textareaRefs.current[cellId];
      const current = getContent(rowIndex, colIndex);
      const start = textarea ? textarea.selectionStart : 0;
      const end = textarea ? textarea.selectionEnd : 0;
      const result = applyInlineFormatToText(current, start, end, wrapper);
      onContentChange(rowIndex, colIndex, result.text, false);
      showCellFeedback(cellId, `Applied ${label}`);

      if (textarea) {
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(result.newSelectionStart, result.newSelectionEnd);
        }, 0);
      }
    },
    [getContent, onContentChange, showCellFeedback],
  );

  const handleSmartCleanCell = useCallback(
    (rowIndex: number, colIndex: number) => {
      const cellId = `${rowIndex}-${colIndex}`;
      const current = getContent(rowIndex, colIndex);
      if (!current.trim()) return;
      const report = smartCleanupMarkdown(current);
      if (report.hasChanges) {
        onContentChange(rowIndex, colIndex, report.cleaned, false);
        showCellFeedback(cellId, `Cleaned (${report.fixesCount} fixes)`);
        return;
      }
      showCellFeedback(cellId, 'Already clean');
    },
    [getContent, onContentChange, showCellFeedback],
  );

  const handleTextareaKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>, rowIndex: number, colIndex: number) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const textarea = event.currentTarget;

      if (event.key === 'Tab' && !event.ctrlKey && !event.altKey && !event.metaKey) {
        const value = textarea.value;
        const cursor = textarea.selectionStart;
        const result = event.shiftKey
          ? applyListDedent(value, cursor)
          : applyListIndent(value, cursor);
        if (!result) return;
        event.preventDefault();
        onContentChange(rowIndex, colIndex, result.text, false);
        setTimeout(() => textarea.setSelectionRange(result.newCursor, result.newCursor), 0);
        return;
      }

      if (
        event.key !== 'Enter' ||
        event.shiftKey ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
      ) {
        return;
      }

      const value = textarea.value;
      const cursor = textarea.selectionStart;
      const smartResult = applySmartListEnter(value, cursor, listTerminator);
      if (smartResult) {
        event.preventDefault();
        onContentChange(rowIndex, colIndex, smartResult.text, false);
        setTimeout(
          () => textarea.setSelectionRange(smartResult.newCursor, smartResult.newCursor),
          0,
        );
        return;
      }

      const lineStart = value.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1;
      const lineToCursor = value.substring(lineStart, cursor);
      const nextNewline = value.indexOf('\n', cursor);
      const lineEnd = nextNewline === -1 ? value.length : nextNewline;
      const fullLine = value.substring(lineStart, lineEnd);
      const nextPrefixInfo = getNextListPrefix(lineToCursor);
      if (!nextPrefixInfo) return;

      event.preventDefault();
      const { indent, nextPrefix, currentPrefix, isOnlyPrefix } = nextPrefixInfo;
      if (isOnlyPrefix && fullLine.trim() === currentPrefix.trim()) {
        const nextValue = value.substring(0, lineStart) + value.substring(lineEnd);
        onContentChange(rowIndex, colIndex, nextValue, false);
        setTimeout(() => textarea.setSelectionRange(lineStart, lineStart), 0);
        return;
      }

      const insertion = '\n' + indent + nextPrefix;
      const nextValue = value.substring(0, cursor) + insertion + value.substring(cursor);
      const nextPosition = cursor + insertion.length;
      onContentChange(rowIndex, colIndex, nextValue, false);
      setTimeout(() => textarea.setSelectionRange(nextPosition, nextPosition), 0);
    },
    [listTerminator, onContentChange],
  );

  return {
    cellModes,
    cellFeedback,
    textareaRefs,
    setCellMode,
    handleApplyNumbering,
    handleApplyInlineFormat,
    handleSmartCleanCell,
    handleTextareaKeyDown,
    listTerminator,
    setListTerminator,
  };
}
