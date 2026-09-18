import { useCallback, useEffect, useRef, useState } from 'react';
import { AboutDialog } from './components/AboutDialog';
import { ChangelogDialog } from './components/ChangelogDialog';
import { ComparisonWorkspace } from './components/ComparisonWorkspace';
import { FormatterWorkspace } from './components/FormatterWorkspace';
import { Header } from './components/Header';
import { TooltipProvider } from './components/ui';
import { ToastContainer, showToast } from './components/Toast';
import type { StyleOptions } from './types';
import { useGridHistory } from './hooks/useGridHistory';
import { readWorkspace, useWorkspacePersistence } from './hooks/useWorkspacePersistence';
import { useCopy } from './hooks/useCopy';
import { convertBrToNewlines, hasBrTags } from './utils/markdownFormatter';
import { FONT_OPTIONS } from './constants/fonts';
import { useTheme } from './hooks/useTheme';
import { usePwaUpdate } from './hooks/usePwaUpdate';
import { getPrimaryForTheme } from './constants/themes';

type AppMode = 'formatter' | 'comparison';

export default function App() {
  const [persistedInitialState] = useState(() => readWorkspace());
  const { grid, updateGrid, commitPaste, resetHistory, undo, redo, canUndo, canRedo } =
    useGridHistory(persistedInitialState);
  const { clearStorage } = useWorkspacePersistence(grid, persistedInitialState);
  const [appMode, setAppMode] = useState<AppMode>('formatter');
  const [focusRequest, setFocusRequest] = useState(0);
  const restoreFormatterFocusRef = useRef(false);
  const { colorTheme, isDark, toggleDarkMode, setColorTheme } = useTheme();
  usePwaUpdate();

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
    setOptions((previous) => ({
      ...previous,
      theme: isDark ? 'dark' : 'light',
      primaryColor: getPrimaryForTheme(colorTheme, isDark),
    }));
  }, [colorTheme, isDark]);

  useEffect(() => {
    if (appMode === 'comparison') {
      document.getElementById('comparison-left-textarea')?.focus();
    } else if (restoreFormatterFocusRef.current) {
      restoreFormatterFocusRef.current = false;
      document.getElementById('main-content')?.focus();
    }
  }, [appMode]);

  const returnToFormatter = useCallback(() => {
    restoreFormatterFocusRef.current = true;
    setAppMode('formatter');
  }, []);

  const toggleComparisonMode = useCallback(() => {
    if (appMode === 'comparison') {
      returnToFormatter();
      return;
    }
    setAppMode('comparison');
  }, [appMode, returnToFormatter]);

  const handleClearAll = useCallback(() => {
    const hasContent = grid.some((row) => row.some((cell) => cell.trim().length > 0));
    resetHistory([['']]);
    clearStorage();
    setFocusRequest((request) => request + 1);
    showToast(hasContent ? 'Started new blank session' : 'Workspace is already empty', 'info');
  }, [clearStorage, grid, resetHistory]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (appMode !== 'formatter') return;
      if (event.altKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        handleClearAll();
        return;
      }
      if (!event.ctrlKey && !event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable)
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appMode, handleClearAll, redo, undo]);

  const getFormattedContent = useCallback(
    (rowIndex: number, colIndex: number) => {
      const source = grid[rowIndex]?.[colIndex] || '';
      return hasBrTags(source) ? convertBrToNewlines(source) : source;
    },
    [grid],
  );

  const { copiedCell, copiedAll, handleCopyCell, handleCopyAllGrid } = useCopy({
    grid,
    options,
    getOutputContent: getFormattedContent,
  });

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={appBackgroundRef}
        id="app-background"
        className="flex h-screen w-screen flex-col overflow-hidden transition-colors"
        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}
      >
        <Header
          options={options}
          setOptions={setOptions}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onClearAll={handleClearAll}
          onToggleComparisonMode={toggleComparisonMode}
          isComparisonMode={appMode === 'comparison'}
          colorTheme={colorTheme}
          isDark={isDark}
          onToggleDarkMode={toggleDarkMode}
          onSelectColorTheme={setColorTheme}
        />

        <main id="main-content" tabIndex={-1} className="min-h-0 flex-1 overflow-hidden">
          <div className="h-full" hidden={appMode !== 'formatter'}>
            <FormatterWorkspace
              grid={grid}
              options={options}
              focusRequest={focusRequest}
              onChangeGrid={updateGrid}
              onCommitPaste={commitPaste}
              onCopyCell={handleCopyCell}
              onCopyAllGrid={handleCopyAllGrid}
              copiedCell={copiedCell}
              copiedAll={copiedAll}
            />
          </div>
          <div className="h-full" hidden={appMode !== 'comparison'}>
            <ComparisonWorkspace
              onBackToFormatter={returnToFormatter}
              fontSize={options.fontSize}
            />
          </div>
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
    </TooltipProvider>
  );
}
