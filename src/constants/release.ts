export const APP_NAME = 'Text & Markdown Formatter';
export const APP_VERSION = '0.6.4';
export const CHANGELOG_ENTRIES = [
  {
    date: '2026-09-14',
    title: 'Reliability, accessibility, and performance remediation',
    description:
      'Pending typing is now committed before layout changes and paste operations, so immediate structural changes and Undo preserve recent text. Workspace and paste boundaries cover the 500,000-character total limit, while New removes saved state and starts a clean history session. Dark themes now use stronger boundaries and readable dialog actions; settings, theme radios, changelog scrolling, comparison clearing, populated previews, remote-image blocking, and 5×5 mobile grids have browser coverage. Formatter cell actions remain stable during typing, aggregate counters are deferred, dependency locks resolve js-yaml 4.3.2, and CI runs an explicit production build plus accessibility coverage.',
  },
  {
    date: '2026-09-14',
    title: 'Comparison mode reliability and readability',
    description:
      'Comparison now isolates Formatter actions, preserves keyboard focus across editing and results, rejects oversized diffs before quadratic processing, treats LF and CRLF content equally, and uses neutral aligned rows with yellow word-level highlights instead of line colors, markers, and line numbers.',
  },
  {
    date: '2026-09-14',
    title: 'Premium workspace refinement',
    description:
      'Light theme surfaces now separate the page canvas, panels, and editor more clearly across every palette. The desktop header reduces inactive control chrome while preserving grouped history and typography actions. Empty single-cell workspaces no longer show an unused cell header, Smart Cleanup is unavailable until text exists, and the accessible Cleaned Text editor label remains intact. The illustrated day-and-night appearance switch is retained.',
  },
  {
    date: '2026-09-13',
    title: 'Combined auto-preview workspace',
    description:
      'The Formatter now uses one preview-first workspace instead of separate Input and Output panels. Pasting removes detected accidental line wraps, reports the exact count, opens the formatted preview automatically, and keeps the raw paste as the first Undo target. Edit and Copy stay in the same cell; multi-cell HTML/TSV layouts, Catalyst and Excel copy, formatting tools, and existing saved output edits remain supported through the grid-only workspace migration.',
  },
  {
    date: '2026-09-12',
    title: 'UI and accessibility audit fixes',
    description:
      'Responsive navigation now avoids intermediate-width toolbar clipping, theme accents meet contrast requirements, controls have usable touch targets, and keyboard and screen-reader behavior is improved.',
  },
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
    description: 'Your cleaned workspace is saved locally in this browser.',
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
