import { useCallback, useEffect, useRef, useState } from 'react';
import { AboutDialog } from './components/AboutDialog';
import { ChangelogDialog } from './components/ChangelogDialog';
import { ComparisonWorkspace } from './components/ComparisonWorkspace';
import { FormatterWorkspace } from './components/FormatterWorkspace';
import { Header } from './components/Header';
import { ToastContainer, showToast } from './components/Toast';
import type { StyleOptions } from './types';
import { useGridHistory } from './hooks/useGridHistory';
import { readWorkspace, useWorkspacePersistence } from './hooks/useWorkspacePersistence';
import { useCopy } from './hooks/useCopy';
import { convertBrToNewlines, hasBrTags } from './utils/markdownFormatter';
import { FONT_OPTIONS } from './constants/fonts';
import { useTheme } from './hooks/useTheme';
import { useVersionUpdate } from './hooks/useVersionUpdate';
import { getPrimaryForTheme } from './constants/themes';

type AppMode = 'formatter' | 'comparison';

export default function App() {
  const [persistedInitialState] = useState(() => readWorkspace());
  const { grid, updateGrid, commitPaste, undo, redo, canUndo, canRedo } =
    useGridHistory(persistedInitialState);
  const { clearStorage } = useWorkspacePersistence(grid, persistedInitialState);
  const [appMode, setAppMode] = useState<AppMode>('formatter');
  const [focusRequest, setFocusRequest] = useState(0);
  const { colorTheme, isDark, toggleDarkMode, setColorTheme } = useTheme();
  useVersionUpdate();

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

  const handleClearAll = useCallback(() => {
    const hasContent = grid.some((row) => row.some((cell) => cell.trim().length > 0));
    updateGrid([['']], false);
    clearStorage();
    setFocusRequest((request) => request + 1);
    showToast(hasContent ? 'Started new blank session' : 'Workspace is already empty', 'info');
  }, [clearStorage, grid, updateGrid]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (appMode !== 'formatter') return;
      if (event.altKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        handleClearAll();
        return;
      }
      if (!event.ctrlKey && !event.metaKey) return;
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

  const {
    copiedCell,
    copiedAll,
    handleCopyCell,
    handleCopyCellExcel,
    handleCopyAllGrid,
    handleCopyAllGridExcel,
  } = useCopy({ grid, options, getOutputContent: getFormattedContent });

  return (
    <>
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
          onToggleComparisonMode={() =>
            setAppMode((previous) => (previous === 'formatter' ? 'comparison' : 'formatter'))
          }
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
              onCopyCellExcel={handleCopyCellExcel}
              onCopyAllGrid={handleCopyAllGrid}
              onCopyAllGridExcel={handleCopyAllGridExcel}
              copiedCell={copiedCell}
              copiedAll={copiedAll}
            />
          </div>
          <div className="h-full" hidden={appMode !== 'comparison'}>
            <ComparisonWorkspace
              onBackToFormatter={() => setAppMode('formatter')}
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
    </>
  );
}
