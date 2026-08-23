import { useCallback, useEffect, useState } from 'react';
import { ColorTheme, THEME_STORAGE_KEY, VALID_THEMES, PersistedTheme } from '@/constants/themes';

function readPersisted(): PersistedTheme | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedTheme;
    if (!VALID_THEMES.includes(parsed.colorTheme)) return null;
    if (typeof parsed.darkMode !== 'boolean') return null;
    return parsed;
  } catch {
    return null;
  }
}

function applyBodyClasses(colorTheme: ColorTheme, darkMode: boolean) {
  const body = document.body;
  body.classList.remove(
    'theme-teal',
    'theme-terracotta',
    'theme-forest',
    'theme-slate',
    'theme-rosewood',
    'theme-pistachio',
    'theme-purple',
  );
  if (colorTheme) body.classList.add(colorTheme);
  body.classList.toggle('dark-theme', darkMode);
}

export function useTheme() {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const persisted = readPersisted();
    if (persisted) return persisted.colorTheme;
    return '';
  });

  const [darkMode, setDarkModeState] = useState<boolean>(() => {
    const persisted = readPersisted();
    if (persisted) return persisted.darkMode;
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    applyBodyClasses(colorTheme, darkMode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ colorTheme, darkMode }));
    } catch {
      // ignore
    }
  }, [colorTheme, darkMode]);

  useEffect(() => {
    applyBodyClasses(colorTheme, darkMode);
  }, []);

  const setColorTheme = useCallback((theme: ColorTheme) => {
    if (!VALID_THEMES.includes(theme)) return;
    setColorThemeState(theme);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkModeState((prev) => !prev);
  }, []);

  const isDark = darkMode;

  return {
    colorTheme,
    darkMode,
    isDark,
    setColorTheme,
    toggleDarkMode,
  };
}
