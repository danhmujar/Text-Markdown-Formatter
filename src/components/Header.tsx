import React from 'react';
import {
  Sun,
  Moon,
  ShieldCheck,
  ShieldAlert,
  Undo2,
  Redo2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { StyleOptions, FocusMode } from '../types';
import { FONT_OPTIONS } from '../constants/fonts';

interface HeaderProps {
  options: StyleOptions;
  setOptions: React.Dispatch<React.SetStateAction<StyleOptions>>;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  focusMode?: FocusMode;
  activePanel?: 'input' | 'output';
  onToggleFocusMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  options,
  setOptions,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  focusMode = 'split',
  activePanel = 'input',
  onToggleFocusMode,
}) => {
  const isDark = options.theme === 'dark';
  const isSanitizeActive = options.sanitizeOutput !== false;
  const isFocused = focusMode !== 'split';

  const toggleTheme = () => {
    setOptions((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  };

  const toggleSanitize = () => {
    setOptions((prev) => ({
      ...prev,
      sanitizeOutput: prev.sanitizeOutput === false ? true : false,
    }));
  };

  return (
    <header
      className={`border-b px-6 py-2.5 sticky top-0 z-30 transition-colors ${
        isDark
          ? 'bg-slate-900 border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-800 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Title */}
        <div className="flex items-center gap-3">
          <h1
            className={`font-bold text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            Text &amp; Markdown Formatter
          </h1>
        </div>

        {/* Undo/Redo, Focus Mode, Font, Font Size, Sanitize Output, and Theme Toggle Controls */}
        <div className="flex items-center gap-2.5">
          {/* Undo / Redo Control Group */}
          <div
            className={`flex items-center rounded-md border p-0.5 shadow-2xs ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <button
              id="header-undo-btn"
              onClick={onUndo}
              disabled={!canUndo}
              className={`px-2 py-1.5 rounded transition flex items-center gap-1 text-xs font-medium ${
                canUndo
                  ? isDark
                    ? 'text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer active:scale-95'
                    : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900 cursor-pointer active:scale-95'
                  : isDark
                    ? 'text-slate-600 opacity-40 cursor-not-allowed'
                    : 'text-slate-400 opacity-40 cursor-not-allowed'
              }`}
              title="Undo last change (Ctrl+Z / ⌘Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Undo</span>
            </button>

            <div className={`w-px h-3.5 mx-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

            <button
              id="header-redo-btn"
              onClick={onRedo}
              disabled={!canRedo}
              className={`px-2 py-1.5 rounded transition flex items-center gap-1 text-xs font-medium ${
                canRedo
                  ? isDark
                    ? 'text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer active:scale-95'
                    : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900 cursor-pointer active:scale-95'
                  : isDark
                    ? 'text-slate-600 opacity-40 cursor-not-allowed'
                    : 'text-slate-400 opacity-40 cursor-not-allowed'
              }`}
              title="Redo next change (Ctrl+Y / ⌘⇧Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Redo</span>
            </button>
          </div>

          {/* Focus Mode Button */}
          <button
            id="focus-mode-toggle-btn"
            onClick={onToggleFocusMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition cursor-pointer active:scale-95 ${
              isFocused
                ? isDark
                  ? 'bg-blue-950/70 border-blue-600/70 text-blue-300 hover:bg-blue-900/70 shadow-2xs'
                  : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 shadow-2xs'
                : isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title={
              isFocused
                ? `Exit Focus Mode (currently maximizing ${focusMode === 'input' ? 'Input' : 'Output'}) [Esc]`
                : `Focus Mode: Maximize active container (${activePanel === 'input' ? 'Input' : 'Output'}) and collapse inactive view`
            }
          >
            {isFocused ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  Focus: <strong className="capitalize font-semibold">{focusMode}</strong>
                </span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Focus Mode</span>
                <span className="sm:hidden">Focus</span>
              </>
            )}
          </button>

          {/* Sanitize Output Toggle */}
          <button
            id="sanitize-output-toggle-btn"
            onClick={toggleSanitize}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition ${
              isSanitizeActive
                ? isDark
                  ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                : isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
            }`}
            title="Automatically strips unwanted background colors, dark mode styles, and meta tags during copy for seamless compatibility with Google Sheets, Excel, and Word"
          >
            {isSanitizeActive ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Sanitize Output</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                <span>Sanitize: Off</span>
              </>
            )}
          </button>

          {/* Font Selector */}
          <div
            className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 border ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Font:
            </span>
            <select
              id="font-family-select"
              value={options.fontFamily}
              onChange={(e) => setOptions((prev) => ({ ...prev, fontFamily: e.target.value }))}
              className={`bg-transparent text-xs focus:outline-none cursor-pointer pr-1 ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              {FONT_OPTIONS.map((f) => (
                <option
                  key={f.label}
                  value={f.value}
                  className={isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}
                >
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size controls */}
          <div
            className={`flex items-center rounded-md border overflow-hidden text-xs ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span
              className={`px-2.5 py-1.5 text-xs font-medium border-r ${
                isDark ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-200'
              }`}
            >
              Size
            </span>
            <button
              id="font-size-decrease-btn"
              onClick={() => setOptions((p) => ({ ...p, fontSize: Math.max(9, p.fontSize - 1) }))}
              className={`px-2.5 py-1.5 transition ${
                isDark
                  ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
              title="Decrease font size"
            >
              -
            </button>
            <span
              className={`px-2 py-1.5 font-mono border-x ${
                isDark ? 'text-slate-200 border-slate-700' : 'text-slate-800 border-slate-200'
              }`}
            >
              {options.fontSize}pt
            </span>
            <button
              id="font-size-increase-btn"
              onClick={() => setOptions((p) => ({ ...p, fontSize: Math.min(24, p.fontSize + 1) }))}
              className={`px-2.5 py-1.5 transition ${
                isDark
                  ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
              title="Increase font size"
            >
              +
            </button>
          </div>

          {/* Theme Toggle Button */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300 hover:text-amber-200'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
