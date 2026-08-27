export type ThemeMode = 'dark' | 'light' | 'word-classic' | 'modern-clean' | 'report-navy';

export type FocusMode = 'split' | 'input' | 'output';

export interface StyleOptions {
  fontFamily: string;
  fontSize: number; // e.g. 15
  lineHeight: number; // e.g. 1.6
  bulletLevel1: string; // 'disc' | 'circle' | 'square'
  bulletLevel2: string; // 'circle' | 'disc' | 'square'
  bulletLevel3: string; // 'square' | 'circle' | 'disc'
  tableBorderColor: string;
  tableHeaderBg: string;
  tableHeaderColor: string;
  tableAlternateBg: boolean;
  highlightBoldKeys: boolean;
  primaryColor: string;
  theme: ThemeMode;
}

export interface SyntaxWarning {
  id: string;
  severity: 'warning' | 'info' | 'error';
  title: string;
  description: string;
  line?: number;
  snippet?: string;
  fixSuggestion?: string;
}

