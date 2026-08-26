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
- Entry: `src/main.tsx:1` -> `src/App.tsx:13` (`App` owns `useTheme` + `useGridHistory` + `useCopy` + `StyleOptions` state; renders `Header` (palette + slider) + `Editor`/`Preview` split grid).
- Path alias `@/*` -> `./src/*` (`tsconfig.json:19`, `vite.config.ts:11`). Use it for imports.
- Markdown pipeline: `marked` + `dompurify` -> `src/utils/markdownFormatter.ts` re-exports `cleanup`/`tableConvert`/`listNumbering`/`htmlBuilder`/`sanitize`; `htmlBuilder` link color uses `primaryColor` from theme.
- Theme: `src/constants/themes.ts:1` (8 swatches, `THEME_PRIMARIES`, `getPrimaryForTheme`), `src/hooks/useTheme.ts:32` persists `formatter-theme-v1` and syncs `body.theme-*` + `body.dark-theme`.

## Architecture

```
src/
  App.tsx              # 2D grid state (string[][]) + outputOverrides Record<row-col, string> + useTheme
  components/          # Header (ThemePicker/ThemeSlider), Editor/EditorCell, Preview/OutputCell, EditToolbar, ErrorBoundary, Toast, ui/
  hooks/               # useTheme (palette + slider), useGridHistory (undo/redo), useGridActions, useOutputActions, useCopy
  styles/themes.css    # CSS vars for 7 themes × light/dark (Calculator port)
  utils/               # markdownFormatter, cleanup, tableConvert, listNumbering, htmlBuilder, sanitize, security/sanitize, syntaxValidator, textWrap
  constants/           # themes (swatches/primaries), fonts, theme
  types.ts             # StyleOptions, FocusMode, SyntaxWarning
tests/a11y.spec.ts     # Playwright + @axe-core/playwright (WCAG 2.1 AA)
```

- Grid is `string[][]` with per-cell output overrides keyed `"${row}-${col}"` (`src/App.tsx:125`). `updateGrid` / `updateOutputOverrides` go through `useGridHistory` (`src/hooks/useGridHistory.ts:8`).
- `useGridHistory`: max 60 snapshots, 500ms debounce when `isTyping=true`, skip commit if `JSON.stringify` equal, fast-path skips serialization for payloads >500k chars. `undo()` first restores uncommitted live state before popping history (`src/hooks/useGridHistory.ts:178`).

## Tests

- Vitest: `vite.config.ts:15` `environment:jsdom`, `include: ['src/**/*.{test,spec}.{ts,tsx}']`, `exclude: ['tests']`. 7 files / 52 tests under `src/**/__tests__/`.
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
- Responsive: Header collapses on `< 640px` (Tailwind `sm:`) to a hamburger menu (`mobile-menu-toggle-btn` + `mobile-quick-theme-btn`) exposing actions (New, Undo, Redo), view toggles (Focus, Sanitize), typography settings, and theme swatches with >=44px touch targets. Resizing `>= 640px` auto-dismisses the mobile menu.
