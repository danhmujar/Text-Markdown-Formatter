export const APP_NAME = 'Text & Markdown Formatter';
export const APP_VERSION = '0.18.0';
export const CHANGELOG_ENTRIES = [
  {
    date: '2026-11-04',
    title: 'v0.18.0 — Copy selected text to Catalyst in Edit and Preview',
    description:
      'Select part of a Formatter cell in Edit or Preview, then press Ctrl+C or right-click and choose Copy to prepare only that selection for Catalyst. Edit processes the exact selected Markdown; Preview copies visible text with enclosing bold, italic, and link formatting, list numbering, table boundaries, and formula text without duplicate accessibility content. Both modes share the working Copy to Catalyst clipboard writer and retain native copy-event data when clipboard access is denied. Full-cell and Copy all actions remain available. Help explains the selection options, and regression tests cover the complete financial-measures example, partial formatting, lists, tables, code, selection boundaries, and clipboard failures.',
  },
  {
    date: '2026-11-03',
    title: 'v0.17.0 — Help guide and keyboard shortcuts',
    description:
      'The bottom-left ? button now opens Help with Getting started, Keyboard shortcuts, and About sections. Learn the Formatter and Comparison workflows, paste modes, cleanup, Undo, and supported list controls. About retains the developer credit and LinkedIn link, and the changelog includes Back to Help. Help supports keyboard scrolling, focus trapping, Escape dismissal, and narrow screens. Existing shortcuts are documented; no new bold or italic key bindings were added.',
  },
  {
    date: '2026-11-03',
    title: 'Paste buttons for Formatter and Comparison',
    description:
      'Visible Paste buttons are available in every Formatter cell and both Comparison editors. Paste replaces selected text, inserts at the last cursor position, or appends when no position is recorded. Pasting from Formatter Preview switches to Edit and focuses the inserted text. Formatter buttons share the existing cleanup, table handling, limits, and Undo path; Comparison preserves plain text. Pending reads prevent duplicate requests, discard stale results, and explain blocked access, empty clipboards, or oversized content.',
  },
  {
    date: '2026-11-03',
    title: 'Repair word-by-word tabs in pasted paragraphs',
    description:
      'Recognized prose copied with tabs between words now stays in one Formatter cell, with ordinary spaces and joined visual line wraps, in both paste modes. Clean uses the same recognition helper. Blank paragraph boundaries, structured Markdown, code, and ambiguous short input are protected; rich HTML tables retain priority. Fixed detection when clipboard text ends with a newline, including the financial-report sample that previously became a 6 × 35 grid. Undo restores the original pasted spacing.',
  },
  {
    date: '2026-11-03',
    title: 'Flush-left lettered list conversion',
    description:
      'Tab now converts a Roman or numeric-dot item to a flush-left a. item without three leading spaces. Further Tab presses leave that lettered item unchanged. Enter continues the letters, while Shift+Tab or Enter on an empty lettered item returns to the next preceding parent number when available. Cursor placement remains within the edited line. Existing indented lists and multi-line selection indentation retain their previous behavior.',
  },
  {
    date: '2026-11-03',
    title: 'Paste focus and Help keyboard safeguards',
    description:
      'Formatter button paste now restores focus after the Edit textarea mounts, avoiding a Preview-to-Edit timing issue. Workspace keyboard shortcuts are inactive while Help, About, or the changelog is open. New Help and Paste controls have visible focus indicators and 44px touch targets. Regression coverage includes clipboard errors, selections, raw-paste Undo, table splitting, list controls, mobile Help, and accessible dialog navigation.',
  },
  {
    date: '2026-10-28',
    title: 'Preview-first paste and workspace editing',
    description:
      'Pastes are cleaned and previewed automatically, including detected multi-cell data. A workspace-wide Edit mode lets you edit all cells and choose whether new pastes stay in one cell or split into cells; pasted text remains uncleaned until you select Clean. The Edit and Preview button follows the selected theme.',
  },
  {
    date: '2026-09-29',
    title: 'Preserve Markdown table emphasis and literal line-break examples',
    description:
      'Pasted Markdown tables now keep adjacent bold spans separated by <br> tags intact, and inline-code examples such as `<br>` stay literal when output line breaks are normalized. Added regression coverage for both cases.',
  },
  {
    date: '2026-09-28',
    title: 'Preserve Markdown spacing between adjacent table cells',
    description:
      'Pasting Markdown tables no longer collapses the boundary between adjacent formatted cells or moves spaces inside emphasis markers. Cleanup now repairs whitespace only within complete bold, italic, and strikethrough spans, while table paste preserves intact plain-text Markdown when rich HTML splits formatting markers.',
  },
  {
    date: '2026-09-28',
    title: 'Streamlined Smart Cleanup controls',
    description:
      'Removed the workspace-wide Smart Cleanup button because common cleanup is already handled automatically. Per-cell Smart Cleanup remains available when you want to manually clean a specific cell.',
  },
  {
    date: '2026-09-28',
    title: 'General LaTeX math rendering with KaTeX',
    description:
      'Preview and rich HTML copy now render the KaTeX-supported LaTeX math subset using locally bundled KaTeX, including inline and display equations, fractions, roots, scripts, symbols, matrices, and environments. Original LaTeX remains available in plain-text copy; Smart Clean protects math source, syntax warnings identify unmatched delimiters and invalid expressions, and KaTeX output is sanitized with accessible MathML. Escaped delimiters, currency-like text, and code remain literal.',
  },
  {
    date: '2026-09-24',
    title: 'Clean Google Sheets cell wrappers on paste',
    description:
      'Pasting multiple cells from Google Sheets now removes nested HTML div wrappers around each cell while keeping its line breaks. Copy all to Catalyst no longer exposes those wrappers as literal tags. Added regression coverage for the Sheets table paste.',
  },
  {
    date: '2026-09-22',
    title: 'Preserve line breaks when copying typed text',
    description:
      'Catalyst plain-text copy now restores prose line breaks as <br> tags even when text was typed or edited from ordinary newlines. Markdown tables and structural block breaks remain newline-safe, with regression coverage for scratch typing and edited notes.',
  },
  {
    date: '2026-09-22',
    title: 'Duplicate update notifications prevented',
    description:
      'Persistent update notifications are now deduplicated at the shared toast boundary, so repeated service-worker events or remounted update handlers cannot stack duplicate Reload prompts. Regression coverage now verifies that identical persistent notifications render only once.',
  },
  {
    date: '2026-09-22',
    title: 'Update prompts with automatic changelog review',
    description:
      'Persistent update notifications are now deduplicated so one waiting service worker cannot stack duplicate Reload prompts. Choosing Reload records a one-time handoff, and the Changelog opens automatically after the updated app starts so users can review what changed immediately.',
  },
  {
    date: '2026-09-22',
    title: 'Catalyst copy fidelity and supported inline LaTeX rendering',
    description:
      "Edit mode now displays report notes that use <br> tags as ordinary editable line breaks while retaining the cell's original break format through typing, paste, Undo/Redo, and workspace restoration. Copy to Catalyst reconstructs <br> tags in the plain-text clipboard payload even after editing removes the original tags, while rich HTML keeps the same visible line structure and Markdown tables retain their newline-safe behavior. The shared renderer also converts the supported inline LaTeX forms \\ge and \\geq to ≥ and \\text{CO}_2\\text{eq} to CO₂eq across preview and rich copy, without changing code spans. Regression coverage now includes the report-note sample, editable line-break normalization, copy reversion, history metadata, persistence, and supported math symbols.",
  },
  {
    date: '2026-09-18',
    title: 'Unified formatted copy actions',
    description:
      'Removed the redundant Excel copy buttons and routed individual-cell and multi-cell copying through one Catalyst-compatible clipboard path. Rich HTML, plain-text fallbacks, sanitization, and table-cell line breaks now behave consistently across copy actions.',
  },
  {
    date: '2026-09-16',
    title: 'Edit-mode keyboard handling, list continuation, and syntax validation remediation',
    description:
      'Resolved critical audit findings across edit mode: fixed Roman numeral continuation to advance past (iv) to (v) instead of (w), added support for parenthesized numeric lists (1), excluded bullet lists from line terminators, ensured fallback Enter replaces active selections without duplicating text, protected structural markdown (headings, code blocks, tables, blockquotes) from bulk numbering, prevented global Undo/Redo from intercepting textarea typing history, added multi-line Tab and Shift+Tab indent/dedent handling, and refined syntax validation to catch glued bold markers while ignoring punctuation-adjacent formatting.',
  },
  {
    date: '2026-09-16',
    title: 'Custom smart-list continuation for numeric and Roman lists',
    description:
      'Pressing Enter now continues both 1. 2. 3. and (i) (ii) (iii) lists, while Tab creates a three-space a. sub-list and Shift+Tab returns to the parent item. Empty sub-items dedent automatically. The new End selector lets you choose a semicolon, colon, or no inserted terminator so list punctuation stays under your control, and the choice persists between sessions.',
  },
  {
    date: '2026-09-16',
    title: 'Single-row cell actions and natural-width preview tables',
    description:
      'The Edit, Copy to Catalyst, Excel, and delete buttons now stay in one row on all screen widths — swiping sideways on narrow cells — instead of dropping to a second row, and the bar never stretches wider than the screen. Preview tables keep their natural column widths and scroll horizontally inside the cell instead of squeezing text into narrow columns.',
  },
  {
    date: '2026-09-16',
    title: 'Wide preview tables stay inside the cell',
    description:
      'Tables with many columns no longer stretch the whole workspace sideways: the grid now caps at the available width and a wide preview table scrolls horizontally inside its own cell instead. Multi-cell layouts keep their minimum column widths and page scrolling exactly as before.',
  },
  {
    date: '2026-09-16',
    title: 'Theme-aware buttons, tooltips, and notifications',
    description:
      'Buttons, tooltips, and notifications now follow the active theme instead of fixed slate and indigo fills: header controls, the mobile menu, theme swatches, layout presets, editor formatting buttons, cell actions, and the cleanup banner tint with the selected palette in both light and dark modes, while toasts use a white card in light mode and keep their dark card after dark. Disabled accent actions such as Smart Cleanup, Copy-all, and Compare render as flat neutral buttons instead of washed-out accent fills so their unavailable state reads clearly on every theme.',
  },
  {
    date: '2026-09-16',
    title: 'Sturdier About and changelog dialogs',
    description:
      'The About and changelog dialogs now run on a maintained dialog foundation with the same look, keyboard traps, and focus behavior, opening with a short fade-and-slide entrance.',
  },
  {
    date: '2026-09-16',
    title: 'Instant hints across header, themes, and layouts',
    description:
      'Following the editor buttons, every remaining control hint — header actions, theme swatches, and layout settings — now appears instantly as a styled tooltip on hover or keyboard focus instead of the slow native popup.',
  },
  {
    date: '2026-09-16',
    title: 'Instant formatting button hints',
    description:
      'The editor formatting buttons now show immediate styled hints on hover or keyboard focus instead of the slow native popups, with the full hint text readable at a glance. This is the first step of the planned tooltip upgrade; header and settings hints follow.',
  },
  {
    date: '2026-09-16',
    title: 'Interface entrance animations',
    description:
      'Notifications, the mobile navigation menu, the Layout settings panel, and editor feedback now animate in with short fade-and-slide motion instead of appearing instantly. Motion is disabled automatically for users who prefer reduced motion.',
  },
  {
    date: '2026-09-16',
    title: 'Compact pill notifications and Catalyst copy labels',
    description:
      'Notifications are now compact pills docked bottom-right: the container shrink-wraps short messages, caps at 320px with wrapping for long text, and uses tighter padding with a smaller close button, so single-line toasts render around 258×50px instead of the previous full-width bar. Solid backgrounds replace the translucent fill so app border lines no longer bleed through the toast, and mobile keeps a full-width minus-margin layout. Copy buttons now name their destination explicitly — “Copy to Catalyst” per cell and “Copy all to Catalyst” in the workspace header — while the Excel variants keep their labels.',
  },
  {
    date: '2026-09-14',
    title: 'Installable offline support with prompted updates',
    description:
      'The app is now installable with regular and maskable icons and keeps working offline after the first online load, with the saved workspace restored locally and system fonts standing in for the network-loaded font. An advisory Offline badge reports the browser’s network hint without claiming cached-app availability. New builds prompt with a persistent Reload toast that never interrupts editing, replacing manifest polling with the service worker as the single update authority.',
  },
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
