import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Check,
  Minimize2,
  ArrowRight,
  AlertTriangle,
  Settings2,
  ChevronDown,
} from 'lucide-react';
import { EditorCell } from './EditorCell';
import { EditorSettingsPanel } from './ui/EditorSettingsPanel';
import { ThemeMode } from '../types';
import { useGridActions } from '../hooks/useGridActions';
import { cn } from '../utils/cn';
import { BUTTON_VARIANTS } from './ui';

interface EditorProps {
  grid: string[][];
  onChangeGrid: (newGrid: string[][], isTyping?: boolean) => void;
  theme?: ThemeMode;
  isFocusMode?: boolean;
  onExitFocus?: () => void;
  onSwitchFocus?: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  grid,
  onChangeGrid,
  theme = 'dark',
  isFocusMode = false,
  onExitFocus,
  onSwitchFocus,
}) => {
  const isDark = theme === 'dark';
  const numRows = grid.length;
  const numCols = Math.max(...grid.map((r) => r.length), 1);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const settingsPanelRef = useRef<HTMLDivElement>(null);

  const {
    cleanupNotification,
    totalStats,
    handleCellChange,
    handleClearCell,
    handleSmartCleanupCell,
    handleSmartCleanupAll,
    handlePasteOnCell,
    setSingleLayout,
    setLeftRightLayout,
    setUpDownLayout,
    set2x2Layout,
    addColumnRight,
    addRowDown,
    getCellLabel,
  } = useGridActions({ grid, onChangeGrid, numRows, numCols });

  useEffect(() => {
    if (!showSettingsPanel) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsPanelRef.current && !settingsPanelRef.current.contains(e.target as Node)) {
        setShowSettingsPanel(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSettingsPanel(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showSettingsPanel]);

  return (
    <div
      className={`flex flex-col h-full overflow-hidden transition-colors ${
        isDark ? 'bg-slate-900' : 'bg-slate-50'
      }`}
    >
      {/* Header bar with Clean Layout controls - Balanced height and padding */}
      <div
        className={`h-12 px-4 border-b flex items-center justify-between gap-3 text-xs shrink-0 transition-colors ${
          isDark ? 'bg-slate-850 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            Input
          </span>
          <span
            className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
              isDark
                ? 'bg-slate-800 text-blue-300 border-slate-700'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}
          >
            {numRows} × {numCols}
          </span>

          {/* Aggregate Stats Badges */}
          <span
            id="total-input-char-badge"
            className={`hidden md:inline-flex text-[11px] font-mono px-2 py-0.5 rounded border ${
              isDark
                ? 'bg-slate-800/80 text-slate-300 border-slate-700'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title={`Total across all cells: ${totalStats.totalChars.toLocaleString()} characters, ${totalStats.totalWords.toLocaleString()} words`}
          >
            {totalStats.totalChars.toLocaleString()}{' '}
            <span className="font-sans font-normal text-[10px] text-slate-400 ml-0.5">chars</span>
          </span>

          {/* Grid-Wide Warning Alert Badge */}
          {totalStats.totalWarnings > 0 && (
            <span
              id="grid-total-warnings-badge"
              className={`flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full border animate-pulse ${
                isDark
                  ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                  : 'bg-amber-50 border-amber-300 text-amber-800'
              }`}
              title={`${totalStats.totalWarnings} syntax warnings across editor cells`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              <span>
                {totalStats.totalWarnings} {totalStats.totalWarnings === 1 ? 'Warning' : 'Warnings'}
              </span>
            </span>
          )}

          {isFocusMode && (
            <div className="flex items-center gap-1.5 ml-1">
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  isDark
                    ? 'bg-blue-950/80 border-blue-600/60 text-blue-300'
                    : 'bg-blue-100/80 border-blue-300 text-blue-800'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                Focus Active
              </span>
              {onSwitchFocus && (
                <button
                  id="focus-switch-to-output-btn"
                  onClick={onSwitchFocus}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition cursor-pointer active:scale-95',
                    isDark
                      ? cn(BUTTON_VARIANTS.neutralDark, 'text-slate-300 hover:text-white')
                      : cn(BUTTON_VARIANTS.subtleLight, 'text-slate-700 hover:text-slate-900'),
                  )}
                  title="Switch Focus to Output container"
                >
                  <span>Output</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              )}
              {onExitFocus && (
                <button
                  id="focus-exit-split-btn"
                  onClick={onExitFocus}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition cursor-pointer active:scale-95',
                    isDark
                      ? cn(BUTTON_VARIANTS.neutralDark, 'text-slate-300 hover:text-white')
                      : cn(BUTTON_VARIANTS.subtleLight, 'text-slate-700 hover:text-slate-900'),
                  )}
                  title="Exit Focus Mode and return to Split View (Esc)"
                >
                  <Minimize2 className="w-3 h-3" />
                  <span>Split View</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Smart Cleanup + Settings dropdown (Layout presets & Grid growers hidden inside) */}
        <div className="flex items-center gap-2">
          {/* Smart Cleanup All Button — stays visible in header */}
          <button
            id="smart-cleanup-all-btn"
            onClick={handleSmartCleanupAll}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition shadow-2xs cursor-pointer active:scale-95 ${
              isDark
                ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-300 hover:bg-indigo-900/60 hover:text-indigo-200'
                : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800'
            }`}
            title="Automatically standardize quotes, strip redundant whitespace, and fix markdown syntax across all input cells"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Smart Cleanup</span>
          </button>

          {/* Settings trigger + floating panel */}
          <div ref={settingsPanelRef} className="relative">
            <button
              id="editor-settings-btn"
              onClick={() => setShowSettingsPanel((v) => !v)}
              aria-expanded={showSettingsPanel}
              aria-haspopup="dialog"
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition cursor-pointer active:scale-95',
                showSettingsPanel
                  ? isDark
                    ? 'bg-slate-800 border-slate-600 text-white shadow-sm'
                    : 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : isDark
                    ? cn(BUTTON_VARIANTS.neutralDark, 'text-slate-300 hover:text-white')
                    : cn(
                        BUTTON_VARIANTS.neutralLight,
                        'text-slate-700 hover:text-slate-900',
                        'shadow-xs',
                      ),
              )}
              title="Layout & grid settings"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Settings</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-200 ${showSettingsPanel ? 'rotate-180' : ''}`}
              />
            </button>

            {showSettingsPanel && (
              <EditorSettingsPanel
                isDark={isDark}
                numRows={numRows}
                numCols={numCols}
                onSetSingleLayout={setSingleLayout}
                onSet2x2Layout={set2x2Layout}
                onSetLeftRightLayout={setLeftRightLayout}
                onSetUpDownLayout={setUpDownLayout}
                onAddColumnRight={addColumnRight}
                onAddRowDown={addRowDown}
              />
            )}
          </div>
        </div>
      </div>

      {/* Floating or Inline Toast Notification for Smart Cleanup */}
      {cleanupNotification && (
        <div
          className={`px-4 py-2 text-xs border-b flex items-center gap-2 animate-in fade-in duration-200 ${
            isDark
              ? 'bg-indigo-950/80 border-indigo-800/80 text-indigo-200'
              : 'bg-indigo-50 border-indigo-200 text-indigo-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="font-medium flex-1">{cleanupNotification}</span>
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        </div>
      )}

      {/* Grid of Input Cell Containers */}
      <div
        className={`flex-1 overflow-hidden p-3 transition-colors ${
          isDark ? 'bg-slate-950/40' : 'bg-slate-100/60'
        }`}
      >
        <div
          className="grid gap-3 h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))`,
          }}
        >
          {grid.map((row, r) =>
            row.map((cellValue, c) => (
              <EditorCell
                key={`cell-container-${r}-${c}`}
                rowIndex={r}
                colIndex={c}
                cellValue={cellValue}
                label={getCellLabel(r, c)}
                isDark={isDark}
                onCellChange={handleCellChange}
                onClearCell={handleClearCell}
                onSmartCleanupCell={handleSmartCleanupCell}
                onPasteOnCell={handlePasteOnCell}
              />
            )),
          )}
        </div>
      </div>
    </div>
  );
};
