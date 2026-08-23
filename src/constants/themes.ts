export type ColorTheme =
  | ''
  | 'theme-teal'
  | 'theme-terracotta'
  | 'theme-forest'
  | 'theme-slate'
  | 'theme-rosewood'
  | 'theme-pistachio'
  | 'theme-purple';

export interface ThemeSwatch {
  id: ColorTheme;
  label: string;
  color: string;
  title: string;
}

export const THEME_SWATCHES: ThemeSwatch[] = [
  { id: '', label: 'Default', color: '#2563eb', title: 'Financial Blue (Default)' },
  { id: 'theme-teal', label: 'Teal', color: '#0a7a7a', title: 'Transformative Teal' },
  { id: 'theme-terracotta', label: 'Terracotta', color: '#c15c3d', title: 'Deep Terracotta' },
  { id: 'theme-forest', label: 'Forest', color: '#3e7153', title: 'Forest Green' },
  { id: 'theme-slate', label: 'Slate', color: '#475569', title: 'Slate Graphite' },
  { id: 'theme-rosewood', label: 'Rosewood', color: '#b86b77', title: 'Dusty Rosewood' },
  { id: 'theme-pistachio', label: 'Pistachio', color: '#6a9970', title: 'Pale Pistachio' },
  { id: 'theme-purple', label: 'Purple', color: '#7c3aed', title: 'Royal Purple' },
];

export const THEME_PRIMARIES: Record<ColorTheme, { light: string; dark: string }> = {
  '': { light: '#2563eb', dark: '#3b82f6' },
  'theme-teal': { light: '#0a7a7a', dark: '#23a9a9' },
  'theme-terracotta': { light: '#c15c3d', dark: '#e27b5a' },
  'theme-forest': { light: '#3e7153', dark: '#61a37b' },
  'theme-slate': { light: '#475569', dark: '#7e95ad' },
  'theme-rosewood': { light: '#b86b77', dark: '#d58693' },
  'theme-pistachio': { light: '#6a9970', dark: '#8cba92' },
  'theme-purple': { light: '#7c3aed', dark: '#a276f5' },
};

export function getPrimaryForTheme(theme: ColorTheme, isDark: boolean): string {
  const entry = THEME_PRIMARIES[theme] ?? THEME_PRIMARIES[''];
  return isDark ? entry.dark : entry.light;
}

export const VALID_THEMES: ColorTheme[] = THEME_SWATCHES.map((s) => s.id);

export const THEME_STORAGE_KEY = 'formatter-theme-v1';

export interface PersistedTheme {
  colorTheme: ColorTheme;
  darkMode: boolean;
}
