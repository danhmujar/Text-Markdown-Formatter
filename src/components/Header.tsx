import React, { useEffect, useRef, useState } from 'react';
import { Undo2, Redo2, FilePlus2, Menu, X, Type, Sun, Moon, GitCompare } from 'lucide-react';
import type { StyleOptions } from '../types';
import { FONT_OPTIONS } from '../constants/fonts';
import { ColorTheme, THEME_SWATCHES } from '@/constants/themes';
import { ThemeSlider } from './ThemeSlider';
import { ThemePicker } from './ThemePicker';

const mobileMenuFocusableSelector =
  'button:not([disabled]), select:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

interface HeaderProps {
  options: StyleOptions;
  setOptions: React.Dispatch<React.SetStateAction<StyleOptions>>;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onClearAll?: () => void;
  onToggleComparisonMode: () => void;
  isComparisonMode: boolean;
  colorTheme: ColorTheme;
  isDark: boolean;
  onToggleDarkMode: () => void;
  onSelectColorTheme: (theme: ColorTheme) => void;
}

export const Header: React.FC<HeaderProps> = React.memo(function Header({
  options,
  setOptions,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onClearAll,
  onToggleComparisonMode,
  isComparisonMode,
  colorTheme,
  isDark,
  onToggleDarkMode,
  onSelectColorTheme,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLElement>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);

  // Automatically close mobile menu when the full toolbar becomes available.
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const main = document.getElementById('main-content');
    const wasInert = main?.inert ?? false;
    if (main) main.inert = true;

    const menu = mobileMenuRef.current;
    menu?.querySelector<HTMLElement>(mobileMenuFocusableSelector)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setIsMobileMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !menu) return;

      const focusable = [
        mobileMenuTriggerRef.current,
        ...menu.querySelectorAll<HTMLElement>(mobileMenuFocusableSelector),
      ].filter(Boolean) as HTMLElement[];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (main) main.inert = wasInert;
      if (mobileMenuTriggerRef.current?.offsetParent) {
        mobileMenuTriggerRef.current.focus();
      }
    };
  }, [isMobileMenuOpen]);

  return (
    <header
      className="border-b px-4 sm:px-6 py-2.5 sticky top-0 z-40 transition-colors shadow-sm"
      style={{
        backgroundColor: 'var(--panel-bg)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="w-full flex items-center justify-between gap-3">
        {/* Title */}
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/text-markdown-formatter-icon.png"
            alt="Text & Markdown Formatter icon"
            className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 object-contain"
          />
          <h1
            className={`font-bold text-sm sm:text-base tracking-tight truncate ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Text &amp; Markdown Formatter
          </h1>
        </div>

        {/* Compact navigation (Screen width < 1280px) */}
        <div className="flex xl:hidden items-center gap-2">
          {/* Quick theme toggle on mobile top bar for instant access */}
          <button
            id="mobile-quick-theme-btn"
            type="button"
            onClick={onToggleDarkMode}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`min-h-11 min-w-11 p-2 rounded-md border text-xs transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <Sun aria-hidden="true" focusable="false" className="w-4 h-4" />
            ) : (
              <Moon aria-hidden="true" focusable="false" className="w-4 h-4" />
            )}
          </button>

          {/* Hamburger Menu Toggle Button */}
          <button
            id="mobile-menu-toggle-btn"
            ref={mobileMenuTriggerRef}
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-header-menu"
            className={`min-h-11 min-w-11 p-2 rounded-md border text-xs font-medium transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
              isMobileMenuOpen
                ? isDark
                  ? 'bg-blue-950 border-blue-600 text-blue-300'
                  : 'bg-blue-50 border-blue-300 text-blue-700'
                : isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Menu"
          >
            {isMobileMenuOpen ? (
              <X aria-hidden="true" focusable="false" className="w-5 h-5" />
            ) : (
              <Menu aria-hidden="true" focusable="false" className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Desktop Controls (Screen width >= 1280px) */}
        <div className="hidden xl:flex items-center gap-2.5">
          {/* New / Clear All Button */}
          {onClearAll && (
            <button
              id="header-clear-all-btn"
              type="button"
              onClick={onClearAll}
              aria-label="New Blank Workspace / Clear All"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Start a new blank session / Clear all cells"
            >
              <FilePlus2
                aria-hidden="true"
                focusable="false"
                className="w-3.5 h-3.5 text-blue-500"
              />
              <span>New</span>
            </button>
          )}

          {/* Standalone Comparison Mode */}
          <button
            id="comparison-mode-btn"
            type="button"
            onClick={onToggleComparisonMode}
            aria-label={isComparisonMode ? 'Exit Comparison Mode' : 'Open Comparison Mode'}
            aria-pressed={isComparisonMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
              isComparisonMode
                ? isDark
                  ? 'bg-blue-950/70 border-blue-600/70 text-blue-300 hover:bg-blue-900/70 shadow-2xs'
                  : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 shadow-2xs'
                : isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title={isComparisonMode ? 'Return to Formatter' : 'Open Comparison Mode'}
          >
            <GitCompare aria-hidden="true" focusable="false" className="w-3.5 h-3.5" />
            <span>Comparison</span>
          </button>

          {/* Undo / Redo Control Group */}
          <div
            className={`flex items-center rounded-md border p-0.5 shadow-2xs ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <button
              id="header-undo-btn"
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              aria-disabled={!canUndo}
              aria-label="Undo last change (Ctrl+Z / ⌘Z)"
              className={`px-2 py-1.5 rounded transition flex items-center gap-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                canUndo
                  ? isDark
                    ? 'text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer active:scale-95'
                    : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900 cursor-pointer active:scale-95'
                  : isDark
                    ? 'text-slate-500 opacity-60 cursor-not-allowed'
                    : 'text-slate-500 opacity-60 cursor-not-allowed'
              }`}
              title="Undo last change (Ctrl+Z / ⌘Z)"
            >
              <Undo2 aria-hidden="true" focusable="false" className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Undo</span>
            </button>

            <div className={`w-px h-3.5 mx-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

            <button
              id="header-redo-btn"
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              aria-disabled={!canRedo}
              aria-label="Redo next change (Ctrl+Y / ⌘⇧Z)"
              className={`px-2 py-1.5 rounded transition flex items-center gap-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                canRedo
                  ? isDark
                    ? 'text-slate-200 hover:bg-slate-700 hover:text-white cursor-pointer active:scale-95'
                    : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900 cursor-pointer active:scale-95'
                  : isDark
                    ? 'text-slate-500 opacity-60 cursor-not-allowed'
                    : 'text-slate-500 opacity-60 cursor-not-allowed'
              }`}
              title="Redo next change (Ctrl+Y / ⌘⇧Z)"
            >
              <Redo2 aria-hidden="true" focusable="false" className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Redo</span>
            </button>
          </div>

          {/* Font Selector */}
          <div
            className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 border ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <label
              htmlFor="font-family-select"
              className={`text-xs font-medium cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
            >
              Font:
            </label>
            <select
              id="font-family-select"
              value={options.fontFamily}
              onChange={(e) => setOptions((prev) => ({ ...prev, fontFamily: e.target.value }))}
              aria-label="Select typography font family"
              className={`bg-transparent text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer pr-1 ${
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
                isDark ? 'text-slate-300 border-slate-700' : 'text-slate-600 border-slate-200'
              }`}
            >
              Size
            </span>
            <button
              id="font-size-decrease-btn"
              type="button"
              onClick={() => setOptions((p) => ({ ...p, fontSize: Math.max(9, p.fontSize - 1) }))}
              aria-label="Decrease font size"
              className={`px-2.5 py-1.5 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
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
              type="button"
              onClick={() => setOptions((p) => ({ ...p, fontSize: Math.min(24, p.fontSize + 1) }))}
              aria-label="Increase font size"
              className={`px-2.5 py-1.5 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                isDark
                  ? 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
              title="Increase font size"
            >
              +
            </button>
          </div>

          {/* Theme Palette + Animated Dark Mode Slider (Calculator-inspired) */}
          <div className="flex items-center gap-2">
            <ThemePicker colorTheme={colorTheme} onSelect={onSelectColorTheme} isDark={isDark} />
            <div className="flex items-center gap-2 pl-1">
              <span
                className="hidden sm:inline text-[11px] font-medium"
                style={{ color: 'var(--text-secondary)' }}
                aria-hidden="true"
              >
                {isDark ? 'Dark' : 'Light'}
              </span>
              <ThemeSlider isDark={isDark} onToggle={onToggleDarkMode} />
            </div>
          </div>
        </div>
      </div>

      {/* Collapsed navigation (< 1280px) — overlaying, does not push Input/Output */}
      {isMobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 top-[56px] bg-black/20 backdrop-blur-[1px] xl:hidden z-30 cursor-default"
            tabIndex={-1}
          />
          <nav
            ref={mobileMenuRef}
            id="mobile-header-menu"
            aria-label="Mobile application navigation and settings"
            className="xl:hidden absolute top-full left-0 right-0 p-4 bg-[var(--panel-bg)] border-t border-b shadow-xl max-h-[calc(100vh-56px)] overflow-y-auto space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150 z-40"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--panel-bg)' }}
          >
            {/* Group 1: Session & History Actions */}
            <div>
              <span
                className="text-[11px] font-semibold uppercase tracking-wider block mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Actions &amp; History
              </span>
              <div className="grid grid-cols-2 gap-2">
                {onClearAll && (
                  <button
                    id="mobile-new-btn"
                    type="button"
                    onClick={() => {
                      onClearAll();
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-md border text-xs font-medium transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none min-h-[44px] ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <FilePlus2
                      aria-hidden="true"
                      focusable="false"
                      className="w-4 h-4 text-blue-500"
                    />
                    <span>New</span>
                  </button>
                )}

                <button
                  id="mobile-comparison-mode-btn"
                  type="button"
                  onClick={() => {
                    onToggleComparisonMode();
                    setIsMobileMenuOpen(false);
                  }}
                  aria-label={isComparisonMode ? 'Exit Comparison Mode' : 'Open Comparison Mode'}
                  aria-pressed={isComparisonMode}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-md border text-xs font-medium transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none min-h-[44px] ${
                    isComparisonMode
                      ? isDark
                        ? 'bg-blue-950/70 border-blue-600/70 text-blue-300'
                        : 'bg-blue-50 border-blue-300 text-blue-700'
                      : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <GitCompare aria-hidden="true" focusable="false" className="w-4 h-4" />
                  <span>Comparison</span>
                </button>

                <button
                  id="mobile-undo-btn"
                  type="button"
                  onClick={onUndo}
                  disabled={!canUndo}
                  aria-disabled={!canUndo}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-md border text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none min-h-[44px] ${
                    canUndo
                      ? isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 cursor-pointer active:scale-95'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-95'
                      : isDark
                        ? 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-60'
                        : 'bg-slate-50/50 border-slate-200/50 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Undo2 aria-hidden="true" focusable="false" className="w-4 h-4" />
                  <span>Undo</span>
                </button>

                <button
                  id="mobile-redo-btn"
                  type="button"
                  onClick={onRedo}
                  disabled={!canRedo}
                  aria-disabled={!canRedo}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-md border text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none min-h-[44px] ${
                    canRedo
                      ? isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 cursor-pointer active:scale-95'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-95'
                      : isDark
                        ? 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-60'
                        : 'bg-slate-50/50 border-slate-200/50 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Redo2 aria-hidden="true" focusable="false" className="w-4 h-4" />
                  <span>Redo</span>
                </button>
              </div>
            </div>

            {/* Group 3: Typography Settings */}
            <div>
              <span
                className="text-[11px] font-semibold uppercase tracking-wider block mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Typography
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Font selector */}
                <div
                  className={`flex items-center justify-between rounded-md px-3 py-2 border min-h-[44px] ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <label
                    htmlFor="mobile-font-family-select"
                    className={`text-xs font-medium flex items-center gap-1.5 ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    <Type aria-hidden="true" focusable="false" className="w-4 h-4" />
                    Font:
                  </label>
                  <select
                    id="mobile-font-family-select"
                    value={options.fontFamily}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, fontFamily: e.target.value }))
                    }
                    aria-label="Select typography font family"
                    className={`bg-transparent text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer py-1 ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option
                        key={f.label}
                        value={f.value}
                        className={
                          isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'
                        }
                      >
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font size */}
                <div
                  className={`flex items-center justify-between rounded-md border min-h-[44px] px-2 ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span
                    className={`text-xs font-medium pl-1 ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    Font Size
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      id="mobile-font-size-decrease-btn"
                      type="button"
                      onClick={() =>
                        setOptions((p) => ({ ...p, fontSize: Math.max(9, p.fontSize - 1) }))
                      }
                      aria-label="Decrease font size"
                      className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                        isDark
                          ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      -
                    </button>
                    <span
                      className={`font-mono text-xs font-semibold px-2 min-w-[36px] text-center ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      {options.fontSize}pt
                    </span>
                    <button
                      id="mobile-font-size-increase-btn"
                      type="button"
                      onClick={() =>
                        setOptions((p) => ({ ...p, fontSize: Math.min(24, p.fontSize + 1) }))
                      }
                      aria-label="Increase font size"
                      className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                        isDark
                          ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Group 4: Theme & Appearance */}
            <div>
              <span
                className="text-[11px] font-semibold uppercase tracking-wider block mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Theme &amp; Appearance
              </span>
              <div
                className={`p-3 rounded-md border space-y-3 ${
                  isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
                    Mode:{' '}
                    <strong className="font-semibold">
                      {isDark ? 'Dark Theme' : 'Light Theme'}
                    </strong>
                  </span>
                  <ThemeSlider isDark={isDark} onToggle={onToggleDarkMode} />
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1.5">
                    Color Accent:
                  </span>
                  <div
                    className="grid grid-cols-4 gap-2.5 pt-1"
                    role="radiogroup"
                    aria-label="Mobile color theme selection"
                  >
                    {THEME_SWATCHES.map((s) => {
                      const active = s.id === colorTheme;
                      return (
                        <button
                          key={`mobile-swatch-${s.id || 'default'}`}
                          id={`mobile-swatch-${s.id || 'default'}`}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          aria-label={s.title}
                          title={s.title}
                          onClick={() => {
                            onSelectColorTheme(s.id);
                          }}
                          className={`theme-swatch ${active ? 'active' : ''}`}
                          style={{ backgroundColor: s.color }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </nav>
        </>
      )}
    </header>
  );
});
