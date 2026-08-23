import React, { useEffect, useRef, useState } from 'react';
import { Palette } from 'lucide-react';
import { ColorTheme, THEME_SWATCHES } from '@/constants/themes';

interface ThemePickerProps {
  colorTheme: ColorTheme;
  onSelect: (theme: ColorTheme) => void;
  isDark: boolean;
}

export const ThemePicker: React.FC<ThemePickerProps> = React.memo(function ThemePicker({
  colorTheme,
  onSelect,
  isDark,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
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
      <button
        id="palette-toggle-btn"
        type="button"
        aria-label="Choose color theme"
        aria-expanded={open}
        aria-haspopup="true"
        title="Choose color theme"
        onClick={() => setOpen((v) => !v)}
        className={`palette-btn-inner flex items-center justify-center w-[34px] h-[34px] rounded-full border transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
          isDark
            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
        } ${open ? (isDark ? 'ring-2 ring-blue-500' : 'ring-2 ring-blue-400') : ''}`}
      >
        <Palette aria-hidden="true" focusable="false" className="w-[18px] h-[18px]" />
      </button>

      <div
        className={`theme-picker ${open ? 'active' : ''}`}
        role="radiogroup"
        aria-label="Color theme"
        id="theme-picker-panel"
      >
        {THEME_SWATCHES.map((s) => {
          const active = s.id === colorTheme;
          return (
            <button
              key={s.id || 'default'}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={s.title}
              title={s.title}
              data-theme={s.id}
              onClick={() => {
                onSelect(s.id);
                setOpen(false);
              }}
              className={`theme-swatch ${active ? 'active' : ''}`}
              style={{ backgroundColor: s.color }}
            />
          );
        })}
      </div>
    </div>
  );
});
