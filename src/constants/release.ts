export const APP_NAME = 'Text & Markdown Formatter';
export const APP_VERSION = '0.5.1';
export const CHANGELOG_ENTRIES = [
  {
    date: '2026-09-05',
    title: 'Markdown table paste handling',
    description:
      'Standalone pipe-delimited Markdown tables now stay together in the current editor cell instead of being split into separate grid rows; TSV and HTML table imports remain supported.',
  },
  {
    date: '2026-09-04',
    title: 'Wrapped list paste cleanup',
    description:
      'Pasted Markdown list items now join indented visual line wraps while preserving separate items, nested lists, code blocks, and intentional paragraph breaks.',
  },
  {
    date: '2026-09-02',
    title: 'Automatic commit versioning',
    description:
      'Version metadata now advances automatically with each commit, supports feature, breaking-change, and exact release bumps, and stays synchronized across the app, package metadata, and README with a CI consistency check.',
  },
  {
    date: '2026-09-02',
    title: 'Standalone Comparison workspace',
    description:
      'Comparison is now a dedicated in-app workspace with blank Left and Right editors, aligned line- and word-level diff highlighting, Clear, and shared Formatter font sizing.',
  },
  {
    date: '2026-08-28',
    title: 'Workspace persistence',
    description: 'Your grid and output edits are saved locally in this browser.',
  },
  {
    date: '2026-08-28',
    title: 'Comparison foundation',
    description: 'Added the aligned line- and word-level diff engine that powers Comparison.',
  },
  {
    date: '2026-08-28',
    title: 'Release information',
    description: 'About now includes local version and changelog details.',
  },
] as const;
