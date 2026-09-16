import React, { useEffect, useRef, useState } from 'react';
import { Palette } from 'lucide-react';
import { ColorTheme, THEME_SWATCHES } from '@/constants/themes';
import { Tip } from './ui';

interface ThemePickerProps {
  colorTheme: ColorTheme;
  onSelect: (theme: ColorTheme) => void;
}

export const ThemePicker: React.FC<ThemePickerProps> = React.memo(function ThemePicker({
  colorTheme,
  onSelect,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="theme-dropdown" id="theme-dropdown-container">
      <Tip tip="Choose color theme">
        <button
          ref={triggerRef}
          id="palette-toggle-btn"
          type="button"
          aria-label="Choose color theme"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((v) => !v)}
          className={`palette-btn-inner flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--surface-bg)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
            open ? 'ring-2 ring-blue-500' : ''
          }`}
        >
          <Palette aria-hidden="true" focusable="false" className="w-[18px] h-[18px]" />
        </button>
      </Tip>

      {open && (
        <fieldset className="theme-picker" id="theme-picker-panel">
          <legend className="sr-only">Color theme</legend>
          {THEME_SWATCHES.map((s) => {
            const active = s.id === colorTheme;
            const id = `theme-swatch-${s.id || 'default'}`;
            return (
              <React.Fragment key={s.id || 'default'}>
                <input
                  className="theme-swatch-input"
                  id={id}
                  type="radio"
                  name="color-theme"
                  value={s.id}
                  checked={active}
                  onChange={() => {
                    onSelect(s.id);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
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
      )}
    </div>
  );
});
