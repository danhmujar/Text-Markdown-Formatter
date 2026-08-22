import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { StyleOptions, FocusMode } from './types';
import { useGridHistory } from './hooks/useGridHistory';
import {
  DEFAULT_PRESETS,
  FONT_OPTIONS,
  hasBrTags,
  convertBrToNewlines,
  prepareCopiedText,
  buildInlineStyledHtml,
  buildGridHtml,
  copyFormattedTextToClipboard,
} from './utils/markdownFormatter';

export default function App() {
  // State-based history manager for 2D grid matrix and per-cell output overrides
  const { grid, outputOverrides, updateGrid, updateOutputOverrides, undo, redo, canUndo, canRedo } =
    useGridHistory({
      grid: [[DEFAULT_PRESETS[0].content]],
      outputOverrides: {},
    });

  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Focus Mode state: 'split' (both visible), 'input' (input maximized), 'output' (output maximized)
  const [focusMode, setFocusMode] = useState<FocusMode>('split');
  const [activePanel, setActivePanel] = useState<'input' | 'output'>('input');

  const [options, setOptions] = useState<StyleOptions>({
    fontFamily: FONT_OPTIONS[0].value,
    fontSize: 14,
    lineHeight: 1.6,
    bulletLevel1: 'disc',
    bulletLevel2: 'circle',
    bulletLevel3: 'square',
    tableBorderColor: '#cbd5e1',
    tableHeaderBg: '#f1f5f9',
    tableHeaderColor: '#0f172a',
    tableAlternateBg: true,
    highlightBoldKeys: true,
    primaryColor: '#2563eb',
    theme: 'dark',
    sanitizeOutput: true,
  });

  const isDark = options.theme === 'dark';

  // Toggle Focus Mode between split and active container
  const handleToggleFocusMode = () => {
    setFocusMode((prev) => {
      if (prev === 'split') {
        return activePanel;
      }
      return 'split';
    });
  };

  // Global Keyboard Shortcuts:
  // - Undo: Ctrl+Z / ⌘Z
  // - Redo: Ctrl+Y / ⌘⇧Z / ⌘Y
  // - Focus Mode toggle: Alt+F
  // - Exit Focus Mode: Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape exits Focus Mode to Split View
      if (e.key === 'Escape' && focusMode !== 'split') {
        e.preventDefault();
        setFocusMode('split');
        return;
      }

      // Alt+F toggles Focus Mode
      if (e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleToggleFocusMode();
        return;
      }

      const isModifier = e.ctrlKey || e.metaKey;
      if (!isModifier) return;

      const key = e.key.toLowerCase();

      if (key === 'z') {
        if (e.shiftKey) {
          // Redo
          e.preventDefault();
          redo();
        } else {
          // Undo
          e.preventDefault();
          undo();
        }
      } else if (key === 'y') {
        // Redo
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, focusMode, activePanel]);

  // Get current effective content for output cell:
  // If the cell was edited in output layer, return override;
  // otherwise return the input cell with <br> tags converted to clean line breaks.
  const getOutputContent = (rowIndex: number, colIndex: number): string => {
    const key = `${rowIndex}-${colIndex}`;
    if (outputOverrides[key] !== undefined) {
      return outputOverrides[key];
    }
    const rawInput = grid[rowIndex]?.[colIndex] || '';
    if (hasBrTags(rawInput)) {
      return convertBrToNewlines(rawInput);
    }
    return rawInput;
  };

  const hasOverride = (rowIndex: number, colIndex: number): boolean => {
    const key = `${rowIndex}-${colIndex}`;
    return outputOverrides[key] !== undefined;
  };

  // Allow manual edit on output container
  const handleOutputChange = (rowIndex: number, colIndex: number, val: string, isTyping = true) => {
    updateOutputOverrides(
      (prev) => ({
        ...prev,
        [`${rowIndex}-${colIndex}`]: val,
      }),
      isTyping,
    );
  };

  // Reset output cell to sync with input
  const handleResetOutputCell = (rowIndex: number, colIndex: number) => {
    updateOutputOverrides((prev) => {
      const next = { ...prev };
      delete next[`${rowIndex}-${colIndex}`];
      return next;
    }, false);
  };

  // Grid updater: clears any stale override on that modified cell
  const handleGridChange = (newGrid: string[][], isTyping = false) => {
    updateGrid(newGrid, isTyping);
  };

  // Copy a single cell:
  // Provides rich formatted HTML for Word/Outlook and plain text with <br> reversion if input had <br>.
  const handleCopyCell = async (rowIndex: number, colIndex: number) => {
    const outputContent = getOutputContent(rowIndex, colIndex);
    const inputContent = grid[rowIndex]?.[colIndex] || '';
    const textToCopy = prepareCopiedText(outputContent, inputContent);
    const wordExportHtml = buildInlineStyledHtml(
      outputContent,
      { ...options, theme: 'light' },
      true,
    );

    const success = await copyFormattedTextToClipboard(wordExportHtml, textToCopy, {
      sanitize: options.sanitizeOutput !== false,
    });

    if (success) {
      setCopiedCell(`${rowIndex}-${colIndex}`);
      setTimeout(() => setCopiedCell(null), 2500);
    }
  };

  // Copy all containers:
  // Provides rich formatted HTML table/block for Word/Outlook and plain text with <br> reversion if input had <br>.
  const handleCopyAllGrid = async () => {
    const outputMatrix = grid.map((row, r) => row.map((_, c) => getOutputContent(r, c)));
    const preparedMatrix = grid.map((row, r) =>
      row.map((inputCell, c) => {
        const outputCell = getOutputContent(r, c);
        return prepareCopiedText(outputCell, inputCell);
      }),
    );

    const wordExportGridHtml = buildGridHtml(outputMatrix, { ...options, theme: 'light' }, true);

    let combinedText = '';
    if (preparedMatrix.length === 1 && preparedMatrix[0].length === 1) {
      combinedText = preparedMatrix[0][0];
    } else {
      combinedText = preparedMatrix.map((row) => row.join('\t')).join('\n\n');
    }

    const success = await copyFormattedTextToClipboard(wordExportGridHtml, combinedText, {
      sanitize: options.sanitizeOutput !== false,
    });

    if (success) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden transition-colors ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Title + Font + Font Size + Undo/Redo + Focus Mode + Theme Toggle Header */}
      <Header
        options={options}
        setOptions={setOptions}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        focusMode={focusMode}
        activePanel={activePanel}
        onToggleFocusMode={handleToggleFocusMode}
      />

      {/* Input & Output Panels - In Focus Mode, inactive panel collapses completely */}
      <main
        className={`flex-1 overflow-hidden ${
          focusMode === 'split' ? 'grid grid-cols-1 lg:grid-cols-2' : 'grid grid-cols-1'
        }`}
      >
        {/* Input Panel */}
        <section
          id="input-container-panel"
          onClick={() => setActivePanel('input')}
          onFocusCapture={() => setActivePanel('input')}
          className={`h-full overflow-hidden ${focusMode === 'output' ? 'hidden' : 'block'} ${
            focusMode === 'split'
              ? isDark
                ? 'border-b lg:border-b-0 lg:border-r border-slate-800'
                : 'border-b lg:border-b-0 lg:border-r border-slate-200'
              : ''
          }`}
        >
          <Editor
            grid={grid}
            onChangeGrid={handleGridChange}
            theme={options.theme}
            isFocusMode={focusMode === 'input'}
            onExitFocus={() => setFocusMode('split')}
            onSwitchFocus={() => {
              setActivePanel('output');
              setFocusMode('output');
            }}
          />
        </section>

        {/* Output Panel */}
        <section
          id="output-container-panel"
          onClick={() => setActivePanel('output')}
          onFocusCapture={() => setActivePanel('output')}
          className={`h-full overflow-hidden ${focusMode === 'input' ? 'hidden' : 'block'}`}
        >
          <Preview
            grid={grid}
            options={options}
            getOutputContent={getOutputContent}
            hasOverride={hasOverride}
            onOutputChange={handleOutputChange}
            onResetOutputCell={handleResetOutputCell}
            onCopyCell={handleCopyCell}
            onCopyAllGrid={handleCopyAllGrid}
            copiedCell={copiedCell}
            copiedAll={copiedAll}
            isFocusMode={focusMode === 'output'}
            onExitFocus={() => setFocusMode('split')}
            onSwitchFocus={() => {
              setActivePanel('input');
              setFocusMode('input');
            }}
          />
        </section>
      </main>
    </div>
  );
}
