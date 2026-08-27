# About FAB Design Specification

## Scope

Add a Calculator-inspired About floating action button (FAB) and responsive About dialog to Text & Markdown Formatter. The feature is informational only and must not alter editor, preview, copy, theme, or grid behavior.

## Design direction

Use the Calculator project's established pattern: a fixed circular `?` button near the bottom-left opens a centered modal dialog. Adapt the content and styling to this React/Tailwind application using existing theme variables rather than copying Calculator's vanilla CSS or PWA-specific behavior.

The dialog should feel like a compact product information panel: clear title, short introduction, grouped information sections, developer credit, and a single explicit close action. It must remain legible in both light and dark themes and usable at mobile widths.

## Content

### Title

About Text & Markdown Formatter

### Introduction

A client-side workspace for formatting text and Markdown into clean, structured output for Catalyst, Word, Outlook, Google Docs, and Excel.

### Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Marked
- DOMPurify
- Vitest
- Playwright

### Security & Architecture

- Client-side text processing
- Sanitized HTML output
- Clipboard-safe export paths
- No account or server-side document storage
- Undo/redo history within the current session

### Features

- Multi-cell text and Markdown workspace
- Live formatted preview
- Copy all or individual cells to Catalyst
- Word/Outlook-compatible formatted copy
- Excel-compatible copy
- Themes and dark mode
- Smart Cleanup
- Syntax warnings with automatic fixes
- Focus mode
- Undo and redo
- Responsive mobile layout

### Limitations

- Destination applications may interpret HTML spacing differently.
- Clipboard access depends on browser permissions and secure context.
- No cloud sync or shared workspace.
- Session data is not intended as permanent document storage.

### Developer credit

Built by Danh Michael Mujar, Analyst at WTW who believes professional tools should be clear, useful, and transparent. Include a working LinkedIn link for Danh Michael Mujar with safe external-link attributes.

## Interaction and accessibility

- Render a fixed circular About FAB at the bottom-left with accessible name `About this app`.
- Open a `role="dialog"` element with `aria-modal="true"` and an accessible heading.
- Provide a labeled close button.
- Close on Escape, close-button activation, or backdrop click.
- Return focus to the FAB after closing.
- Make background application content inert while the dialog is open.
- Keep dialog content internally scrollable on small screens.
- Respect existing light/dark theme variables.
- Do not add PWA or install-specific behavior.

## Architecture

Add a focused React About dialog component and local open/closed state at the application shell boundary. Keep modal focus and keyboard behavior inside the component. Mount the FAB and dialog alongside the existing Header, editor, preview, and ToastContainer so the modal is independent of grid state. Use existing Tailwind utilities, theme CSS variables, and Lucide icons where appropriate.

## Acceptance Criteria

1. A fixed About FAB is visible at the bottom-left of the application.
2. Activating the FAB opens an accessible About dialog.
3. The dialog includes the app introduction, tech stack, architecture/security, features, limitations, and developer credit.
4. The developer credit includes a working LinkedIn link for Danh Michael Mujar.
5. Escape, close-button, and backdrop interactions close the dialog.
6. Focus returns to the About FAB after closing.
7. The dialog works in both light and dark themes.
8. The dialog remains usable on mobile-width screens.
9. Existing editor, preview, copy, theme, and grid behavior remains unchanged.
10. No PWA manifest or install-icon behavior is added.
