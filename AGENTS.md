# AGENTS.md

## Commands

| Task             | Command                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| Dev server       | `npm run dev` — Vite on `0.0.0.0:3000`                                                                       |
| Build            | `npm run build` (output `dist/`)                                                                             |
| Preview (prod)   | `npm run preview` — Playwright expects `4173` via `playwright.config.ts:14`                                  |
| Typecheck        | `npm run typecheck` — `tsc --noEmit`, strict mode                                                            |
| Lint             | `npm run lint` — `eslint .` with `typescript-eslint` + `jsx-a11y` (see `eslint.config.js:5` ignores `dist/`) |
| Format / check   | `npm run format` / `npm run format:check` — Prettier `printWidth:100, singleQuote, trailingComma:all`        |
| Unit tests       | `npm run test` — `vitest run` (jsdom)                                                                        |
| Single unit test | `npx vitest run src/utils/__tests__/markdownFormatter.test.ts` or `npx vitest run -t "test name"`            |
| A11y / e2e       | `npm run a11y:check` — builds then `playwright test`; filtered: `npm run test:a11y` (`--grep a11y`)          |
| Clean            | `npm run clean` — `rimraf dist`                                                                              |

Verification order: `lint` -> `typecheck` -> `test` -> `build` -> `a11y:check` (a11y needs a built `dist` for `preview` server).

## Stack & Entrypoints

- Vite 6 + React 19 + TypeScript strict (`tsconfig.json:8` `strict`, `noUnusedLocals/Parameters`, `isolatedModules`, `moduleResolution:bundler`, `jsx:react-jsx`).
- Tailwind CSS 4 via `vite.config.ts:2` `@tailwindcss/vite` plugin — no `tailwind.config.js`; theme vars in `src/styles/themes.css:31` imported by `src/index.css:1`.
- Entry: `src/main.tsx:1` -> `src/App.tsx:17`. `App` owns theme, grid/history, copy, style options, workspace restore/persistence, and New/Clear actions that remove saved workspace; it also owns About/changelog/comparison dialog state and renders `Header` plus the `Editor`/`Preview` split grid.
- Path alias `@/*` -> `./src/*` (`tsconfig.json:19`, `vite.config.ts:11`). Use it for imports.
- Markdown pipeline: `marked` + `dompurify` -> `src/utils/markdownFormatter.ts` re-exports `cleanup`/`tableConvert`/`listNumbering`/`htmlBuilder`/`sanitize`; `htmlBuilder` link color uses `primaryColor` from theme.
- Theme: `src/constants/themes.ts:1` (8 swatches, `THEME_PRIMARIES`, `getPrimaryForTheme`), `src/hooks/useTheme.ts:32` persists `formatter-theme-v1` and syncs `body.theme-*` + `body.dark-theme`.

## Architecture

```
src/
  App.tsx              # grid/history state, outputOverrides, workspace persistence, dialogs
  components/          # Header (ThemePicker/ThemeSlider), Editor/EditorCell, Preview/OutputCell,
                       # EditToolbar, AboutDialog, ChangelogDialog, ComparisonDialog,
                       # ErrorBoundary, Toast, ui/
  hooks/               # useTheme, useGridHistory, useGridActions, useOutputActions,
                       # useWorkspacePersistence, useCopy
  styles/themes.css    # CSS vars for 8 themes × light/dark (Calculator port)
  utils/               # markdownFormatter, cleanup, tableConvert, listNumbering, htmlBuilder,
                       # sanitize, security/sanitize, syntaxValidator, textWrap, lineDiff
  constants/           # themes (swatches/primaries), fonts, theme, release metadata/changelog
  types.ts             # StyleOptions, FocusMode, SyntaxWarning
tests/a11y.spec.ts     # Playwright + @axe-core/playwright (WCAG 2.1 AA)
```

- Grid is `string[][]` with per-cell output overrides keyed `"${row}-${col}"` (`src/App.tsx:125`). `updateGrid` / `updateOutputOverrides` go through `useGridHistory` (`src/hooks/useGridHistory.ts:8`).
- `useGridHistory`: max 60 snapshots, 500ms debounce when `isTyping=true`, skip commit if `JSON.stringify` equal, fast-path skips serialization for payloads >500k chars. `undo()` first restores uncommitted live state before popping history (`src/hooks/useGridHistory.ts:178`).
- `useWorkspacePersistence` (`src/hooks/useWorkspacePersistence.ts`) restores validated workspace state on reload and debounces grid/outputOverrides writes by 400ms under `text-markdown-formatter:workspace`, version 1. New/Clear removes that entry and resets to a blank grid.
- `OutputCell` opens `ComparisonDialog` per output cell; it compares input with effective output (including output overrides) using `diffLines` from `src/utils/lineDiff.ts`.
- About is a fixed FAB with developer credit for Danh Michael Mujar and a LinkedIn link; its separate changelog view uses static `APP_VERSION`/`CHANGELOG_ENTRIES` from `src/constants/release.ts`.
- About, changelog, and comparison dialogs use `role="dialog"`/`aria-modal`, focus the close control, trap Tab, close on Escape/backdrop, restore the trigger focus, and set the app background `inert`.

## Tests

- Vitest: `vite.config.ts:15` `environment:jsdom`, `include: ['src/**/*.{test,spec}.{ts,tsx}']`, `exclude: ['tests']`. 11 files / 80 tests under `src/**/__tests__/`.
- Playwright: `playwright.config.ts:4` `testDir: ./tests`, `baseURL: http://localhost:4173`, single `chromium` project, `webServer: npm run preview -- --port 4173` with `reuseExistingServer: !CI`. Must `npm run build` before `npm run a11y:check`.

## Gotchas

- Both `bun.lock` and `package-lock.json` exist; scripts assume `npm` (Playwright `webServer` uses `npm run preview`).
- `vite.config.ts:37` `esbuild.drop: ['console','debugger']` — console stripped in prod builds, not in dev.
- `vite.config.ts:42` HMR/file-watching disabled when `DISABLE_HMR=true` (AI Studio). Don't edit those guards.
- `index.html:8` CSP is strict (`default-src 'self'`, `style-src 'unsafe-inline'`). External scripts/styles will be blocked.
- Prettier ignores `dist`, `node_modules`, `.playwright-mcp`, `docs` (`.prettierignore:1`).
- `sanitizeOutputHtml` + `copyFormattedTextToClipboard` (`src/utils/sanitize.ts:21`) always enforces security sanitization; `compat` stripping is optional. Clipboard writes `text/html` + `text/plain` with `<!--StartFragment-->` wrapper for Word/Outlook.
- `smartCleanupMarkdown` (`src/utils/cleanup.ts`) behaves differently with `{isTyping:true}` — e.g. won't auto-close `**bold` mid-typing (`src/utils/__tests__/reliability.test.ts:82`). `parsePasteToGrid` has heuristics to avoid turning hard-wrapped single paragraphs (avg line >40 chars, no tabs) into a multi-row grid (`src/utils/__tests__/reliability.test.ts:25`).
- `vite.config.ts:27` `manualChunks: vendor/marked/ui/purify` — don't inline those into main chunk.
- Theme: `useTheme` persists `formatter-theme-v1` (`colorTheme` + `darkMode`) to `localStorage` and toggles `body.theme-*` / `body.dark-theme`; light themes are 5% darkened for stronger tint (see `src/styles/themes.css:31`). `ThemePicker` is a `radiogroup` inside `Header` `z-40` with `theme-picker` `z-100`; don't lower z-index or click gets intercepted by `main`. `Copy All` / `1×1` badges and `Clean` pills use `var(--primary-blue)` / `var(--accent-bg)` so they follow theme.
- Responsive: Header collapses on `< 640px` (Tailwind `sm:`) to a hamburger menu (`mobile-menu-toggle-btn` + `mobile-quick-theme-btn`) exposing actions (New, Undo, Redo), the Focus view toggle, typography settings, and theme swatches with >=44px touch targets. Resizing `>= 640px` auto-dismisses the mobile menu.
