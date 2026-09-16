import React, { useEffect, useRef, useState } from 'react';
import { Undo2, Redo2, FilePlus2, Menu, X, Type, Sun, Moon, GitCompare } from 'lucide-react';
import type { StyleOptions } from '../types';
import { FONT_OPTIONS } from '../constants/fonts';
import { ColorTheme, THEME_SWATCHES } from '@/constants/themes';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { ThemeSlider } from './ThemeSlider';
import { ThemePicker } from './ThemePicker';
import { Tip } from './ui';

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
  const isOnline = useOnlineStatus();
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
            src="/pwa-192x192.png"
            alt="Text & Markdown Formatter icon"
            className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 object-contain"
          />
          <h1 className="font-bold text-sm sm:text-base tracking-tight truncate text-[var(--text-primary)]">
            Text &amp; Markdown Formatter
          </h1>
          {!isOnline && (
            <span
              id="offline-pill"
              role="status"
              aria-label="Browser reports no network connection; cached formatter features may still work"
              title="Browser reports no network connection; cached formatter features may still work"
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                isDark
                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                  : 'border-amber-500/60 bg-amber-100 text-amber-800'
              }`}
            >
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
              Offline
            </span>
          )}
        </div>

        {/* Compact navigation (Screen width < 1280px) */}
        <div className="flex xl:hidden items-center gap-2">
          {/* Quick theme toggle on mobile top bar for instant access */}
          <Tip tip={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            <button
              id="mobile-quick-theme-btn"
              type="button"
              onClick={onToggleDarkMode}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-11 w-11 items-center justify-center rounded-[10px] border transition hover:bg-[var(--surface-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)] active:scale-95"
              style={{
                backgroundColor: 'var(--panel-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)',
              }}
            >
              {isDark ? (
                <Sun aria-hidden="true" focusable="false" className="w-4 h-4" />
              ) : (
                <Moon aria-hidden="true" focusable="false" className="w-4 h-4" />
              )}
            </button>
          </Tip>

          {/* Hamburger Menu Toggle Button */}
          <Tip tip="Menu">
            <button
              id="mobile-menu-toggle-btn"
              ref={mobileMenuTriggerRef}
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-header-menu"
              className="flex h-11 w-11 items-center justify-center rounded-[10px] border transition hover:bg-[var(--surface-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-blue)] active:scale-95"
              style={{
                backgroundColor: isMobileMenuOpen ? 'var(--accent-bg)' : 'var(--panel-bg)',
                borderColor: isMobileMenuOpen ? 'var(--accent-border)' : 'var(--border-color)',
                color: isMobileMenuOpen ? 'var(--primary-blue)' : 'var(--text-secondary)',
              }}
            >
              {isMobileMenuOpen ? (
                <X aria-hidden="true" focusable="false" className="w-5 h-5" />
              ) : (
                <Menu aria-hidden="true" focusable="false" className="w-5 h-5" />
              )}
            </button>
          </Tip>
        </div>

        {/* Desktop Controls (Screen width >= 1280px) */}
        <div className="hidden xl:flex items-center gap-2.5">
          {/* New / Clear All Button */}
          {!isComparisonMode && onClearAll && (
            <Tip tip="Start a new blank session / Clear all cells">
              <button
                id="header-clear-all-btn"
                type="button"
                onClick={onClearAll}
                aria-label="New Blank Workspace / Clear All"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-transparent text-xs font-medium text-[var(--text-secondary)] transition cursor-pointer active:scale-95 hover:text-[var(--text-primary)] hover:bg-[var(--surface-bg)] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              >
                <FilePlus2
                  aria-hidden="true"
                  focusable="false"
                  className="w-3.5 h-3.5 text-blue-500"
                />
                <span>New</span>
              </button>
            </Tip>
          )}

          {/* Standalone Comparison Mode */}
          <Tip tip={isComparisonMode ? 'Return to Formatter' : 'Open Comparison Mode'}>
            <button
              id="comparison-mode-btn"
              type="button"
              onClick={onToggleComparisonMode}
              aria-label={isComparisonMode ? 'Exit Comparison Mode' : 'Open Comparison Mode'}
              aria-pressed={isComparisonMode}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                isComparisonMode
                  ? 'bg-[var(--accent-bg)] border-[var(--accent-border)] text-[var(--primary-blue)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-bg)]'
              }`}
            >
              <GitCompare aria-hidden="true" focusable="false" className="w-3.5 h-3.5" />
              <span>Comparison</span>
            </button>
          </Tip>

          {/* Undo / Redo Control Group */}
          {!isComparisonMode && (
            <div className="flex items-center rounded-md border border-[var(--border-color)] bg-[var(--surface-bg)] p-0.5">
              <Tip tip="Undo last change (Ctrl+Z / ⌘Z)">
                <button
                  id="header-undo-btn"
                  type="button"
                  onClick={onUndo}
                  disabled={!canUndo}
                  aria-disabled={!canUndo}
                  aria-label="Undo last change (Ctrl+Z / ⌘Z)"
                  className={`px-2 py-1.5 rounded transition flex items-center gap-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                    canUndo
                      ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel-bg)] cursor-pointer active:scale-95'
                      : 'text-[var(--text-secondary)] opacity-50 cursor-not-allowed'
                  }`}
                >
                  <Undo2 aria-hidden="true" focusable="false" className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Undo</span>
                </button>
              </Tip>

              <div className="w-px h-3.5 mx-0.5 bg-[var(--border-color)]" />

              <Tip tip="Redo next change (Ctrl+Y / ⌘⇧Z)">
                <button
                  id="header-redo-btn"
                  type="button"
                  onClick={onRedo}
                  disabled={!canRedo}
                  aria-disabled={!canRedo}
                  aria-label="Redo next change (Ctrl+Y / ⌘⇧Z)"
                  className={`px-2 py-1.5 rounded transition flex items-center gap-1 text-xs font-medium focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                    canRedo
                      ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel-bg)] cursor-pointer active:scale-95'
                      : 'text-[var(--text-secondary)] opacity-50 cursor-not-allowed'
                  }`}
                >
                  <Redo2 aria-hidden="true" focusable="false" className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Redo</span>
                </button>
              </Tip>
            </div>
          )}

          {/* Font Selector */}
          <div className="flex items-center gap-2 rounded-md px-2.5 py-1.5 border border-[var(--border-color)] bg-[var(--surface-bg)]">
            <label
              htmlFor="font-family-select"
              className="text-xs font-medium cursor-pointer text-[var(--text-secondary)]"
            >
              Font:
            </label>
            <select
              id="font-family-select"
              value={options.fontFamily}
              onChange={(e) => setOptions((prev) => ({ ...prev, fontFamily: e.target.value }))}
              aria-label="Select typography font family"
              className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer pr-1"
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
          <div className="flex items-center rounded-md border border-[var(--border-color)] bg-[var(--surface-bg)] overflow-hidden text-xs">
            <span className="px-2.5 py-1.5 text-xs font-medium border-r border-[var(--border-color)] text-[var(--text-secondary)]">
              Size
            </span>
            <Tip tip="Decrease font size">
              <button
                id="font-size-decrease-btn"
                type="button"
                onClick={() => setOptions((p) => ({ ...p, fontSize: Math.max(9, p.fontSize - 1) }))}
                aria-label="Decrease font size"
                className="px-2.5 py-1.5 text-[var(--text-secondary)] transition cursor-pointer hover:text-[var(--text-primary)] hover:bg-[var(--panel-bg)] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              >
                -
              </button>
            </Tip>
            <span className="px-2 py-1.5 font-mono border-x border-[var(--border-color)] text-[var(--text-primary)]">
              {options.fontSize}pt
            </span>
            <Tip tip="Increase font size">
              <button
                id="font-size-increase-btn"
                type="button"
                onClick={() =>
                  setOptions((p) => ({ ...p, fontSize: Math.min(24, p.fontSize + 1) }))
                }
                aria-label="Increase font size"
                className="px-2.5 py-1.5 text-[var(--text-secondary)] transition cursor-pointer hover:text-[var(--text-primary)] hover:bg-[var(--panel-bg)] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              >
                +
              </button>
            </Tip>
          </div>

          {/* Theme palette and appearance */}
          <div className="flex items-center gap-2">
            <ThemePicker colorTheme={colorTheme} onSelect={onSelectColorTheme} />
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
            className="xl:hidden absolute top-full left-0 right-0 p-4 bg-[var(--panel-bg)] border-t border-b shadow-xl max-h-[calc(100vh-56px)] overflow-y-auto space-y-3.5 animotion-fade-in-down z-40"
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
                {!isComparisonMode && onClearAll && (
                  <button
                    id="mobile-new-btn"
                    type="button"
                    onClick={() => {
                      onClearAll();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-md border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-secondary)] text-xs font-medium transition cursor-pointer active:scale-95 hover:text-[var(--text-primary)] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none min-h-[44px]"
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
                      ? 'bg-[var(--accent-bg)] border-[var(--accent-border)] text-[var(--primary-blue)]'
                      : 'border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:brightness-110'
                  }`}
                >
                  <GitCompare aria-hidden="true" focusable="false" className="w-4 h-4" />
                  <span>Comparison</span>
                </button>

                {!isComparisonMode && (
                  <button
                    id="mobile-undo-btn"
                    type="button"
                    onClick={onUndo}
                    disabled={!canUndo}
                    aria-disabled={!canUndo}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-md border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none min-h-[44px] ${
                      canUndo
                        ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:brightness-110 cursor-pointer active:scale-95'
                        : 'text-[var(--text-secondary)] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <Undo2 aria-hidden="true" focusable="false" className="w-4 h-4" />
                    <span>Undo</span>
                  </button>
                )}

                {!isComparisonMode && (
                  <button
                    id="mobile-redo-btn"
                    type="button"
                    onClick={onRedo}
                    disabled={!canRedo}
                    aria-disabled={!canRedo}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-md border border-[var(--border-color)] bg-[var(--surface-bg)] text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none min-h-[44px] ${
                      canRedo
                        ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:brightness-110 cursor-pointer active:scale-95'
                        : 'text-[var(--text-secondary)] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <Redo2 aria-hidden="true" focusable="false" className="w-4 h-4" />
                    <span>Redo</span>
                  </button>
                )}
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
                <div className="flex items-center justify-between rounded-md px-3 py-2 border border-[var(--border-color)] bg-[var(--surface-bg)] min-h-[44px]">
                  <label
                    htmlFor="mobile-font-family-select"
                    className="text-xs font-medium flex items-center gap-1.5 text-[var(--text-secondary)]"
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
                    className="bg-transparent text-xs font-medium text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded cursor-pointer py-1"
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
                <div className="flex items-center justify-between rounded-md border border-[var(--border-color)] bg-[var(--surface-bg)] min-h-[44px] px-2">
                  <span className="text-xs font-medium pl-1 text-[var(--text-secondary)]">
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
                      className="w-8 h-8 rounded flex items-center justify-center font-bold text-sm text-[var(--text-secondary)] bg-[var(--panel-bg)] border border-[var(--border-color)] transition cursor-pointer active:scale-95 hover:text-[var(--text-primary)] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                    >
                      -
                    </button>
                    <span className="font-mono text-xs font-semibold px-2 min-w-[36px] text-center text-[var(--text-primary)]">
                      {options.fontSize}pt
                    </span>
                    <button
                      id="mobile-font-size-increase-btn"
                      type="button"
                      onClick={() =>
                        setOptions((p) => ({ ...p, fontSize: Math.min(24, p.fontSize + 1) }))
                      }
                      aria-label="Increase font size"
                      className="w-8 h-8 rounded flex items-center justify-center font-bold text-sm text-[var(--text-secondary)] bg-[var(--panel-bg)] border border-[var(--border-color)] transition cursor-pointer active:scale-95 hover:text-[var(--text-primary)] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
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
              <div className="p-3 rounded-md border border-[var(--border-color)] bg-[var(--surface-bg)] space-y-3">
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
                  <span className="text-[11px] block mb-1.5 text-[var(--text-secondary)]">
                    Color Accent:
                  </span>
                  <fieldset
                    className="grid grid-cols-4 gap-2.5 pt-1"
                    aria-label="Mobile color theme selection"
                  >
                    <legend className="sr-only">Mobile color theme selection</legend>
                    {THEME_SWATCHES.map((s) => {
                      const active = s.id === colorTheme;
                      const id = `mobile-swatch-${s.id || 'default'}`;
                      return (
                        <React.Fragment key={id}>
                          <input
                            className="theme-swatch-input"
                            id={id}
                            type="radio"
                            name="mobile-color-theme"
                            value={s.id}
                            checked={active}
                            onChange={() => onSelectColorTheme(s.id)}
                          />
                          <Tip tip={s.title}>
                            <label
                              htmlFor={id}
                              className={`theme-swatch ${active ? 'active' : ''}`}
                              style={{ backgroundColor: s.color }}
                            >
                              <span className="sr-only">{s.title}</span>
                            </label>
                          </Tip>
                        </React.Fragment>
                      );
                    })}
                  </fieldset>
                </div>
              </div>
            </div>
          </nav>
        </>
      )}
    </header>
  );
});
