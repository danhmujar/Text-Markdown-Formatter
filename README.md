# Text & Markdown Formatter

Convert input text and Markdown — with nested lists, tables, custom line breaks, and real-time syntax warnings — into formatted output optimized for **Word, Outlook, Excel, Google Sheets, and Google Docs**. Paste stays clean thanks to aggressive sanitization and a `StartFragment`-wrapped clipboard payload.

> Stack: Vite 6 + React 19 + TypeScript (strict) + Tailwind CSS 4 · Markdown via `marked` + `DOMPurify` · Tests with Vitest + Playwright + axe-core. Current release: **0.2.2**.

## Features

- **2D Grid Editor** — 1×1 to 2×2 layouts (Single, Left/Right, Top/Bottom, 2×2) with per-cell character/word counters and toolbar actions.
- **Live Preview** — inline-styled HTML with LRU cache (`htmlBuilder.ts:43`), per-theme colors, nested list bullets (`disc`/`circle`/`square`), and table styles that survive paste.
- **Smart Cleanup** (`cleanup.ts:81`) — strips zero-width chars, normalizes curly quotes, fixes headings/bullets/checkboxes/blockquotes/links, unwraps hard-wrapped PDF paragraphs, auto-closes `**bold`/`~~strike~~`/fences (skipped while typing via `{isTyping:true}`).
- **Table & Paste Intelligence** — `tsvToMarkdownTable` converts tab-delimited pastes; `parsePasteToGrid` detects grids but avoids turning hard-wrapped prose (avg line >40 chars, no tabs) into a multi-row grid.
- **Syntax Validator** (`syntaxValidator.ts:7`) — real-time warnings for unclosed fences, backticks, HTML tags, `**`/`~~`, broken links, empty list items, and table separator/column mismatches.
- **Copy for Office** (`sanitize.ts:191`) — `sanitizeOutputHtml` always enforces security (`DOMPurify` + `on*`/`javascript:` stripping); compat mode strips dark backgrounds/meta/office XML/data attrs; clipboard writes `text/html` + `text/plain` with `<!--StartFragment-->` for Word/Outlook/Sheets.
- **UX** — undo/redo with 60-snapshot debounced history (`useGridHistory.ts:8`), Focus Mode (Split/Input/Output, `Alt+F` / `Esc`), palette + animated slider theming (8 color themes × light/dark, `useTheme.ts:32`), shared font family & size (9–24pt), presets, toasts, and per-cell output overrides (`"row-col"` keys).
- **Workspace Persistence** — grid content and per-cell output overrides are restored on reload and saved to `localStorage` under `text-markdown-formatter:workspace` (version 1) with debounced writes; **New** clears the workspace and removes the saved state.
- **Standalone Comparison workspace** — open Comparison from the Header, paste independent Left and Right text, then Compare to see aligned line- and word-level discrepancy highlighting with spacer rows. Clear empties both sides and returns to the blank editing view; Comparison uses the Formatter’s shared font-size setting.
- **About & Release Information** — a fixed About FAB opens app details, version metadata, developer credit for Danh Michael Mujar, and a separate changelog dialog with static release entries.
- **Theming** — CSS variables (`styles/themes.css:1`) ported from `Calculator` (default plus seven named themes × light/dark at 5% lighten), `body.theme-*` + `body.dark-theme` classes, `localStorage` `formatter-theme-v1` persistence, `ThemePicker` radiogroup + `ThemeSlider` 68×34 animated toggle; `Copy All`/`Preview` and badges use `var(--primary-blue)`/`var(--accent-bg)`.
- **Accessibility** — WCAG 2.1 AA axe checks, skip link, keyboard-labeled controls, a non-modal Comparison workspace, modal About/changelog dialogs with focus trapping and inert background content, Escape-to-close, focus restoration, `aria-live` counters, and `jsx-a11y` linting.

## Quick Start

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build      # production build → dist/
npm run preview    # serve dist/ (Playwright uses :4173)
```

No backend required. Optional env vars are documented in `.env.example` (`GEMINI_API_KEY`, `APP_URL`) and only needed when deploying via AI Studio/Cloud Run.

## Automatic versioning

The repository-managed Git hook is configured automatically by `npm install` (or `npm run prepare`)
when the checkout is a Git repository. Each commit advances the synchronized version surfaces in the
same logical commit: `package.json`, `package-lock.json`, `src/constants/release.ts`, and this README.

- Ordinary commits (`fix:`, `docs:`, `chore:`, and similar) bump the patch version.
- `feat:` bumps the minor version.
- `feat!:` or a `BREAKING CHANGE:` footer bumps the major version.
- `release: v1.0.0` (or `release: 1.0.0`) sets an explicitly higher version.

The hook amends the just-created commit once with the generated files; it does not create a second
logical commit, tag, push, or changelog entry. Changelog entries remain curated in
`src/constants/release.ts`. Check synchronization locally with `npm run version:check`; CI runs the
same read-only check. The post-commit hook still runs with `git commit --no-verify`, so an emergency
bypass should use `TEXT_MARKDOWN_FORMATTER_SKIP=1 git commit ...` and be followed by
`npm run version:check`.

When you intentionally publish a release, review the generated commit first, then create and push a
tag explicitly:

```bash
git tag v1.0.0
git push origin main --follow-tags
```

## Scripts

| Script                                                         | Description                                        |
| -------------------------------------------------------------- | -------------------------------------------------- |
| `npm run dev`                                                  | Vite dev server on `0.0.0.0:3000`                  |
| `npm run build`                                                | Production build (`dist/`)                         |
| `npm run preview`                                              | Serve `dist/` (Playwright expects `4173`)          |
| `npm run typecheck`                                            | `tsc --noEmit` (strict)                            |
| `npm run lint`                                                 | `eslint .` (`typescript-eslint` + `jsx-a11y`)      |
| `npm run format` / `format:check`                              | Prettier (`printWidth:100, singleQuote`)           |
| `npm run test`                                                 | Vitest (jsdom) plus versioning tests               |
| `npm run test:versioning`                                      | Node versioning and hook integration tests         |
| `npm run prepare`                                              | Configure repository-local `.githooks`             |
| `npm run version:check`                                        | Verify all version surfaces are synchronized       |
| `npx vitest run src/utils/__tests__/markdownFormatter.test.ts` | Single file                                        |
| `npx vitest run -t "test name"`                                | Single test by name                                |
| `npm run a11y:check`                                           | `playwright test` (requires `npm run build` first) |
| `npm run test:a11y`                                            | Filtered `--grep a11y`                             |
| `npm run clean`                                                | `rimraf dist`                                      |

Recommended verification order: `lint` → `typecheck` → `test` → `build` → `a11y:check`.

## Project Structure

```
src/
  main.tsx               # React root + ErrorBoundary
  App.tsx                # grid/history, outputOverrides, app mode, persistence, and Formatter/Comparison mounting
  components/
    Header.tsx           # palette (ThemePicker) + slider (ThemeSlider), font/size, undo/redo, Focus Mode, New, Comparison
    Editor.tsx            # grid layout controls + Smart Cleanup + Settings panel (themed via var(--*))
    EditorCell.tsx       # per-cell textarea, counters, warnings, paste handling (themed)
    Preview.tsx          # output grid + Copy All (var(--primary-blue))
    OutputCell.tsx       # preview/edit toggle, inline formatting, reset, copy (themed)
    AboutDialog.tsx      # About FAB, app details, version, developer credit, and changelog link
    ChangelogDialog.tsx  # static release metadata in a separate dialog
    ComparisonWorkspace.tsx # standalone Left/Right editors and comparison workflow
    ComparisonResult.tsx # aligned line/word diff renderer with spacer rows
    EditToolbar.tsx      # numbering/bullet/bold/italic/Clean (themed)
    ThemePicker.tsx      # radiogroup palette dropdown
    ThemeSlider.tsx      # 68×34 animated sun/moon toggle
    Toast.tsx / ErrorBoundary.tsx / ui/
  hooks/
    useTheme.ts          # colorTheme + darkMode, body class sync, localStorage formatter-theme-v1
    useWorkspacePersistence.ts # debounced grid/outputOverrides persistence and reload restoration
    useGridHistory.ts    # history stack (max 60, 500ms debounce when isTyping)
    useGridActions.ts    # cell add/clear/cleanup/paste helpers
    useOutputActions.ts  # output edit, numbering, inline format
    useCopy.ts           # clipboard logic
  styles/
    themes.css           # :root / body.dark-theme / body.theme-* vars + slider/picker styles (Calculator port)
  utils/
    markdownFormatter.ts # re-exports: cleanup / tableConvert / listNumbering / htmlBuilder / sanitize
    cleanup.ts           # smartCleanupMarkdown, hasBrTags, convertBrToNewlines
    tableConvert.ts      # tsvToMarkdownTable, parsePasteToGrid, preprocessMarkdownWithTsv
    htmlBuilder.ts       # marked → DOMPurify → inline styled HTML (LRU cache, primaryColor → link color)
    lineDiff.ts          # aligned line- and word-level comparison
    sanitize.ts          # sanitizeOutputHtml + copyFormattedTextToClipboard
    security/sanitize.ts # DOMPurify wrapper
    syntaxValidator.ts   # analyzeSyntaxWarnings
    textWrap.ts          # isWrappedParagraph heuristic
  constants/
    release.ts           # APP_VERSION and static CHANGELOG_ENTRIES
    themes.ts            # ColorTheme, THEME_SWATCHES, THEME_PRIMARIES, getPrimaryForTheme
    fonts.ts / theme.ts
  types.ts               # StyleOptions, FocusMode, SyntaxWarning
tests/
  a11y.spec.ts           # Playwright + @axe-core/playwright (WCAG 2.1 AA)
```

Key invariants:

- Grid is `string[][]`; per-cell output edits live in `Record<"${row}-${col}", string>` and take precedence over input (`App.tsx:125`).
- `useGridHistory` skips commits when serialized state is equal and skips serialization for payloads >500k chars.
- Preview and clipboard both go through `sanitizeHtml` before DOM styling; clipboard additionally wraps with `<!DOCTYPE html>…<!--StartFragment-->`.
- Workspace persistence stores `{ version: 1, grid, outputOverrides }` under `text-markdown-formatter:workspace`; restored state is copied into app state, writes are debounced, and **New** clears both state and storage.
- Comparison owns transient Left/Right text and a result view separate from the Formatter grid. `ComparisonResult` uses `diffLines` for aligned line- and word-level highlighting; Comparison state is intentionally not persisted.

## Configuration

- **Path alias** `@/*` → `./src/*` (`tsconfig.json:19`, `vite.config.ts:11`).
- **Tailwind** via `@tailwindcss/vite` — no `tailwind.config.js`; styles in `src/index.css` + `src/styles/themes.css`.
- **Theme** — CSS variables on `body` (`--bg-color`, `--panel-bg`, `--surface-bg`, `--border-color`, `--text-primary`, `--primary-blue`, `--accent-bg`), `body.theme-*` + `body.dark-theme` (8 swatches, 5% lighten for light), persisted as `formatter-theme-v1` in `localStorage`; outer/UI uses `var(--*)`, `htmlBuilder` link color uses `primaryColor`.
- **Workspace persistence** — `useWorkspacePersistence` uses `text-markdown-formatter:workspace` with storage version `1`; grid and `outputOverrides` writes are debounced, invalid/missing storage falls back safely, and **New**/Clear removes the saved workspace.
- **Dialogs and accessibility** — About and changelog are modal dialogs with `aria-modal`, focus trapping, inert background content, Escape-to-close, and focus restoration. Comparison is a non-modal in-app view switched in place with native hidden state, so it does not trap focus or inert the Formatter.
- **TypeScript** `strict` with `noUnusedLocals/Parameters`, `isolatedModules`, `moduleResolution:bundler`, `jsx:react-jsx`, `noEmit`.
- **ESLint** `typescript-eslint` + `jsx-a11y`; **Prettier** `printWidth:100, singleQuote, trailingComma:all` (ignores `dist`, `node_modules`, `.playwright-mcp`, `docs`).
- **CSP** in `index.html:8` (`default-src 'self'`, `style-src 'self' 'unsafe-inline'`) — external scripts/styles are blocked.
- **Build** chunks `vendor`/`marked`/`ui`/`purify` separately; `esbuild.drop: ['console','debugger']` strips logs in prod only; `DISABLE_HMR=true` disables HMR/watch for AI Studio.

## Testing

- **Unit** — `vite.config.ts:15` (`environment:jsdom`, `include: src/**/*.{test,spec}.{ts,tsx}`, `exclude: tests`). Run `npm run test`; 11 files / 92 tests.
- **A11y/E2E** — `playwright.config.ts:4` (`testDir: ./tests`, `baseURL: http://localhost:4173`, `webServer: npm run preview -- --port 4173`, single `chromium` project). Must `npm run build` before `npm run a11y:check`.

## Shortcuts

- `Ctrl+Z` / `⌘Z` — Undo, `Ctrl+Y` / `⌘⇧Z` / `⌘Y` — Redo
- `Alt+F` — Toggle Focus Mode, `Esc` — Exit Focus Mode to Split View

## License

Private — not published to a registry (`package.json:3`).
