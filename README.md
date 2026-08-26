# Text & Markdown Formatter

Convert input text and Markdown — with nested lists, tables, custom line breaks, and real-time syntax warnings — into formatted output optimized for **Word, Outlook, Excel, Google Sheets, and Google Docs**. Paste stays clean thanks to aggressive sanitization and a `StartFragment`-wrapped clipboard payload.

> Stack: Vite 6 + React 19 + TypeScript (strict) + Tailwind CSS 4 · Markdown via `marked` + `DOMPurify` · Tests with Vitest + Playwright + axe-core.

## Features

- **2D Grid Editor** — 1×1 to 2×2 layouts (Single, Left/Right, Top/Bottom, 2×2) with per-cell character/word counters and toolbar actions.
- **Live Preview** — inline-styled HTML with LRU cache (`htmlBuilder.ts:43`), per-theme colors, nested list bullets (`disc`/`circle`/`square`), and table styles that survive paste.
- **Smart Cleanup** (`cleanup.ts:81`) — strips zero-width chars, normalizes curly quotes, fixes headings/bullets/checkboxes/blockquotes/links, unwraps hard-wrapped PDF paragraphs, auto-closes `**bold`/`~~strike~~`/fences (skipped while typing via `{isTyping:true}`).
- **Table & Paste Intelligence** — `tsvToMarkdownTable` converts tab-delimited pastes; `parsePasteToGrid` detects grids but avoids turning hard-wrapped prose (avg line >40 chars, no tabs) into a multi-row grid.
- **Syntax Validator** (`syntaxValidator.ts:7`) — real-time warnings for unclosed fences, backticks, HTML tags, `**`/`~~`, broken links, empty list items, and table separator/column mismatches.
- **Copy for Office** (`sanitize.ts:191`) — `sanitizeOutputHtml` always enforces security (`DOMPurify` + `on*`/`javascript:` stripping); compat mode strips dark backgrounds/meta/office XML/data attrs; clipboard writes `text/html` + `text/plain` with `<!--StartFragment-->` for Word/Outlook/Sheets.
- **UX** — undo/redo with 60-snapshot debounced history (`useGridHistory.ts:8`), Focus Mode (Split/Input/Output, `Alt+F` / `Esc`), palette + animated slider theming (7 color themes × light/dark, `useTheme.ts:32`), font family & size (9–24pt), presets, toasts, and per-cell output overrides (`"row-col"` keys).
- **Theming** — CSS variables (`styles/themes.css:1`) ported from `Calculator` (teal/terracotta/forest/slate/rosewood/pistachio/purple × light/dark at 5% lighten), `body.theme-*` + `body.dark-theme` classes, `localStorage` `formatter-theme-v1` persistence, `ThemePicker` radiogroup + `ThemeSlider` 68×34 animated toggle; `Copy All`/`Preview` and badges use `var(--primary-blue)`/`var(--accent-bg)`.
- **Accessibility** — WCAG 2.1 AA axe checks, skip link, dialog focus trap, `aria-live` counters, and `jsx-a11y` linting.

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

## Scripts

| Script                                                         | Description                                        |
| -------------------------------------------------------------- | -------------------------------------------------- |
| `npm run dev`                                                  | Vite dev server on `0.0.0.0:3000`                  |
| `npm run build`                                                | Production build (`dist/`)                         |
| `npm run preview`                                              | Serve `dist/` (Playwright expects `4173`)          |
| `npm run typecheck`                                            | `tsc --noEmit` (strict)                            |
| `npm run lint`                                                 | `eslint .` (`typescript-eslint` + `jsx-a11y`)      |
| `npm run format` / `format:check`                              | Prettier (`printWidth:100, singleQuote`)           |
| `npm run test`                                                 | `vitest run` (jsdom, 52 tests)                     |
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
  App.tsx                # grid: string[][] + outputOverrides + FocusMode + StyleOptions + useTheme
  components/
    Header.tsx           # palette (ThemePicker) + slider (ThemeSlider), font/size, undo/redo, Focus Mode, Sanitize
    Editor.tsx           # grid layout controls + Smart Cleanup + Settings panel (themed via var(--*))
    EditorCell.tsx       # per-cell textarea, counters, warnings, paste handling (themed)
    Preview.tsx          # output grid + Copy All (var(--primary-blue))
    OutputCell.tsx       # preview/edit toggle, inline formatting, reset, copy (themed)
    EditToolbar.tsx      # numbering/bullet/bold/italic/Clean (themed)
    ThemePicker.tsx      # radiogroup palette dropdown
    ThemeSlider.tsx      # 68×34 animated sun/moon toggle
    Toast.tsx / ErrorBoundary.tsx / ui/
  hooks/
    useTheme.ts          # colorTheme + darkMode, body class sync, localStorage formatter-theme-v1
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
    sanitize.ts          # sanitizeOutputHtml + copyFormattedTextToClipboard
    security/sanitize.ts # DOMPurify wrapper
    syntaxValidator.ts   # analyzeSyntaxWarnings
    textWrap.ts          # isWrappedParagraph heuristic
  constants/
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

## Configuration

- **Path alias** `@/*` → `./src/*` (`tsconfig.json:19`, `vite.config.ts:11`).
- **Tailwind** via `@tailwindcss/vite` — no `tailwind.config.js`; styles in `src/index.css` + `src/styles/themes.css`.
- **Theme** — CSS variables on `body` (`--bg-color`, `--panel-bg`, `--surface-bg`, `--border-color`, `--text-primary`, `--primary-blue`, `--accent-bg`), `body.theme-*` + `body.dark-theme` (8 swatches, 5% lighten for light), persisted as `formatter-theme-v1` in `localStorage`; outer/UI uses `var(--*)`, `htmlBuilder` link color uses `primaryColor`.
- **TypeScript** `strict` with `noUnusedLocals/Parameters`, `isolatedModules`, `moduleResolution:bundler`, `jsx:react-jsx`, `noEmit`.
- **ESLint** `typescript-eslint` + `jsx-a11y`; **Prettier** `printWidth:100, singleQuote, trailingComma:all` (ignores `dist`, `node_modules`, `.playwright-mcp`, `docs`).
- **CSP** in `index.html:8` (`default-src 'self'`, `style-src 'self' 'unsafe-inline'`) — external scripts/styles are blocked.
- **Build** chunks `vendor`/`marked`/`ui`/`purify` separately; `esbuild.drop: ['console','debugger']` strips logs in prod only; `DISABLE_HMR=true` disables HMR/watch for AI Studio.

## Testing

- **Unit** — `vite.config.ts:15` (`environment:jsdom`, `include: src/**/*.{test,spec}.{ts,tsx}`, `exclude: tests`). Run `npm run test`; 7 files / 52 tests.
- **A11y/E2E** — `playwright.config.ts:4` (`testDir: ./tests`, `baseURL: http://localhost:4173`, `webServer: npm run preview -- --port 4173`, single `chromium` project). Must `npm run build` before `npm run a11y:check`.

## Shortcuts

- `Ctrl+Z` / `⌘Z` — Undo, `Ctrl+Y` / `⌘⇧Z` / `⌘Y` — Redo
- `Alt+F` — Toggle Focus Mode, `Esc` — Exit Focus Mode to Split View

## License

Private — not published to a registry (`package.json:3`).
