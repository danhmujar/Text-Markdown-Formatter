import { useState, useEffect, useCallback, useRef } from 'react';
import { AboutDialog } from './components/AboutDialog';
import { ChangelogDialog } from './components/ChangelogDialog';
import { ComparisonDialog } from './components/ComparisonDialog';
import { Header } from './components/Header';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { ToastContainer, showToast } from './components/Toast';
import { StyleOptions, FocusMode } from './types';
import { useGridHistory } from './hooks/useGridHistory';
import { readWorkspace, useWorkspacePersistence } from './hooks/useWorkspacePersistence';
import { useCopy } from './hooks/useCopy';
import { hasBrTags, convertBrToNewlines } from './utils/markdownFormatter';
import { FONT_OPTIONS } from './constants/fonts';
import { useTheme } from './hooks/useTheme';
import { getPrimaryForTheme } from './constants/themes';
export default function App() {
  const [persistedInitialState] = useState(() => readWorkspace());
  // State-based history manager for 2D grid matrix and per-cell output overrides
  const {
    grid,
    outputOverrides,
    updateGrid,
    updateOutputOverrides,
    updateAll,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useGridHistory(persistedInitialState);
  const { clearStorage } = useWorkspacePersistence(grid, outputOverrides, persistedInitialState);

  // Focus Mode state: 'split' (both visible), 'input' (input maximized), 'output' (output maximized)
  const [focusMode, setFocusMode] = useState<FocusMode>('split');
  const [activePanel, setActivePanel] = useState<'input' | 'output'>('input');

  const { colorTheme, isDark, toggleDarkMode, setColorTheme } = useTheme();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const aboutTriggerRef = useRef<HTMLButtonElement>(null);
  const appBackgroundRef = useRef<HTMLDivElement>(null);

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
    primaryColor: getPrimaryForTheme(colorTheme, isDark),
    theme: isDark ? 'dark' : 'light',
  });

  useEffect(() => {
    setOptions((prev) => ({
      ...prev,
      theme: isDark ? 'dark' : 'light',
      primaryColor: getPrimaryForTheme(colorTheme, isDark),
    }));
  }, [colorTheme, isDark]);

  // Toggle Focus Mode between split and active container
  const handleToggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
      if (prev === 'split') {
        return activePanel;
      }
      return 'split';
    });
  }, [activePanel]);

  // Announce Focus Mode state changes to assistive technologies and UI toast
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const modeName =
      focusMode === 'split'
        ? 'Split View'
        : focusMode === 'input'
          ? 'Input Focus Mode'
          : 'Output Focus Mode';
    showToast(`${modeName} activated`, 'info');
  }, [focusMode]);
  // Clear all / New Blank Session handler
  const handleClearAll = useCallback(() => {
    const hasContent =
      grid.some((row) => row.some((cell) => cell.trim().length > 0)) ||
      Object.keys(outputOverrides).length > 0;
    updateAll([['']], {});
    clearStorage();
    showToast(hasContent ? 'Started new blank session' : 'Workspace is already empty', 'info');
  }, [clearStorage, grid, outputOverrides, updateAll]);
  const [comparison, setComparison] = useState<{ row: number; col: number } | null>(null);
  const comparisonTriggerRef = useRef<HTMLElement | null>(null);

  // Global Keyboard Shortcuts:
  // - Undo: Ctrl+Z / ⌘Z
  // - Redo: Ctrl+Y / ⌘⇧Z / ⌘Y
  // - New / Blank: Ctrl+Shift+N / ⌘⇧N / Alt+N
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

      // Alt+N starts new blank session
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleClearAll();
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
  }, [undo, redo, focusMode, handleToggleFocusMode, handleClearAll]);

  // Get current effective content for output cell:
  // If the cell was edited in output layer, return override;
  // otherwise return the input cell with <br> tags converted to clean line breaks.
  const getOutputContent = useCallback(
    (rowIndex: number, colIndex: number): string => {
      if (rowIndex < 0 || colIndex < 0 || !grid[rowIndex]) {
        return '';
      }
      const key = `${rowIndex}-${colIndex}`;
      if (outputOverrides[key] !== undefined) {
        return outputOverrides[key];
      }
      const rawInput = grid[rowIndex]?.[colIndex] || '';
      if (hasBrTags(rawInput)) {
        return convertBrToNewlines(rawInput);
      }
      return rawInput;
    },
    [grid, outputOverrides],
  );

  const hasOverride = useCallback(
    (rowIndex: number, colIndex: number): boolean => {
      const key = `${rowIndex}-${colIndex}`;
      return outputOverrides[key] !== undefined;
    },
    [outputOverrides],
  );

  // Allow manual edit on output container
  const handleOutputChange = useCallback(
    (rowIndex: number, colIndex: number, val: string, isTyping = true) => {
      updateOutputOverrides(
        (prev) => ({
          ...prev,
          [`${rowIndex}-${colIndex}`]: val,
        }),
        isTyping,
      );
    },
    [updateOutputOverrides],
  );

  // Reset output cell to sync with input
  const handleResetOutputCell = useCallback(
    (rowIndex: number, colIndex: number) => {
      updateOutputOverrides((prev) => {
        const next = { ...prev };
        delete next[`${rowIndex}-${colIndex}`];
        return next;
      }, false);
    },
    [updateOutputOverrides],
  );

  const {
    copiedCell,
    copiedAll,
    handleCopyCell,
    handleCopyCellExcel,
    handleCopyAllGrid,
    handleCopyAllGridExcel,
  } = useCopy({
    grid,
    options,
    getOutputContent,
  });

  // Grid updater: clears any stale override on that modified cell
  const handleGridChange = useCallback(
    (newGrid: string[][], isTyping = false) => {
      updateGrid(newGrid, isTyping);
    },
    [updateGrid],
  );

  return (
    <>
    <div
      ref={appBackgroundRef}
      id="app-background"
      className="flex flex-col h-screen w-screen overflow-hidden transition-colors"
      style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}
    >
      {/* Title + Font + Font Size + Undo/Redo + New/Blank + Focus Mode + Theme Toggle Header */}
      <Header
        options={options}
        setOptions={setOptions}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onClearAll={handleClearAll}
        focusMode={focusMode}
        activePanel={activePanel}
        onToggleFocusMode={handleToggleFocusMode}
        colorTheme={colorTheme}
        isDark={isDark}
        onToggleDarkMode={toggleDarkMode}
        onSelectColorTheme={setColorTheme}
      />

      {/* Input & Output Panels - In Focus Mode, inactive panel collapses completely */}
      <main
        id="main-content"
        tabIndex={-1}
        className={`flex-1 overflow-hidden focus:outline-none ${
          focusMode === 'split' ? 'grid grid-cols-1 lg:grid-cols-2' : 'grid grid-cols-1'
        }`}
      >
        {/* Input Panel */}
        <section
          id="input-container-panel"
          aria-labelledby="input-heading"
          onFocusCapture={() => setActivePanel('input')}
          style={{ borderColor: 'var(--border-color)' }}
          className={`h-full overflow-hidden ${focusMode === 'output' ? 'hidden' : 'block'} ${
            focusMode === 'split' ? 'border-b lg:border-b-0 lg:border-r' : ''
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
          aria-labelledby="output-heading"
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
            onCopyCellExcel={handleCopyCellExcel}
            onCopyAllGrid={handleCopyAllGrid}
            onCopyAllGridExcel={handleCopyAllGridExcel}
            copiedCell={copiedCell}
            copiedAll={copiedAll}
            isFocusMode={focusMode === 'output'}
            onExitFocus={() => setFocusMode('split')}
            onSwitchFocus={() => {
              setActivePanel('input');
              setFocusMode('input');
            }}
            onCompareCell={(row, col) => {
              comparisonTriggerRef.current = document.activeElement as HTMLElement;
              setComparison({ row, col });
            }}
          />
        </section>
      </main>
      <ToastContainer />
    </div>
    <AboutDialog
      open={aboutOpen}
      onOpen={() => setAboutOpen(true)}
      onClose={() => setAboutOpen(false)}
      onOpenChangelog={() => {
        setAboutOpen(false);
        setChangelogOpen(true);
      }}
      triggerRef={aboutTriggerRef}
      backgroundRef={appBackgroundRef}
    />
    <ChangelogDialog
      open={changelogOpen}
      onClose={() => setChangelogOpen(false)}
      triggerRef={aboutTriggerRef}
      backgroundRef={appBackgroundRef}
    />
    {comparison && (
      <ComparisonDialog
        open
        input={grid[comparison.row]?.[comparison.col] || ''}
        output={getOutputContent(comparison.row, comparison.col)}
        onClose={() => setComparison(null)}
        triggerRef={comparisonTriggerRef}
        backgroundRef={appBackgroundRef}
      />
    )}
    </>
  );
}
