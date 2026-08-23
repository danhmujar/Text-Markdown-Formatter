# Pillar 4 — Maintainability Fix Plan

**Project:** Text-Markdown-Formatter (`C:\AI\Project\Text-Markdown-Formatter`)
**Pillar:** 4/5 — Maintainability (`five-pillar-audit:standard-code-audit` in `C:\Users\danhm\.config\opencode\memory.jsonl`)
**Scope:** File org, TS strict, duplication, lint, config hygiene
**Status:** All Phases (1-5) & Cross-Pillar Verification complete (2026-08-23) — Hotfix applied 2026-08-23 (tsconfig/logger/prettier gaps closed)
**Date:** 2026-08-23 (updated 2026-08-23 hotfix)
**Audit source:** Inline audit `src/utils/markdownFormatter.ts:1-1343`, `tsconfig.json:1-26`, `package.json:1-36`, `vite.config.ts:1-22`

---

## Phase 0: Documentation Discovery (Done)

**Sources consulted**
- `package.json:1-36` — scripts, deps, duplicate `vite`
- `tsconfig.json:1-26` — `compilerOptions` (no `strict`)
- `vite.config.ts:1-22` — alias `@` → `.`, HMR guard
- `src/` tree — `src/App.tsx:1-292`, `src/components/Editor.tsx:524`, `Preview.tsx:663`, `EditorCell.tsx:377`, `Header.tsx:272`, `src/utils/markdownFormatter.ts:1343`, `src/utils/syntaxValidator.ts:327`, `src/hooks/useGridHistory.ts:208`, `src/types.ts:37`
- `src/utils/markdownFormatter.ts:571,914,1263,1312,1339` — `console.*`
- `test.js:1` / `test.cjs:1` — duplicated ad-hoc stubs

**Allowed APIs / patterns to COPY (not invent)**
- TypeScript strict docs: enable `strict`, `noUnusedLocals`, `noUnusedParameters` in `compilerOptions` — standard `tsconfig.json` keys (checked existing file)
- ESLint flat config: copy from `typescript-eslint` docs / `eslint:recommended` — file to create `eslint.config.js`
- `rimraf` for cross-platform clean: `rimraf dist` replaces `rm -rf dist` (`package.json:10`)
- Tailwind Vite plugin already in use: `vite.config.ts:1` `import tailwindcss from '@tailwindcss/vite'` — keep, don't add `autoprefixer` separately
- `cva`/`clsx` or simple `cn` helper: `src/utils/cn.ts` with `clsx + tailwind-merge` (standard pattern)
- Constants extraction: move `DEFAULT_PRESETS` (`markdownFormatter.ts:4-53`) and `FONT_OPTIONS` (`:55-62`) to `src/constants/` — copy export shape verbatim

**Anti-patterns to avoid**
- Do not invent `vite` options; `vite.config.ts:14-21` `server.hmr/watch` guard is intentional for AI Studio — leave intact
- Do not add `experimentalDecorators` stricter without checking `tsconfig.json:4`
- Do not introduce `Drizzle`/`Prisma`/server deps — `express` is unused and should be removed, not configured
- Do not use `allowImportingTsExtensions` for new files — plan will flip it to `false` in Phase 1

**Confidence / gaps**
- High confidence on config hygiene (direct file evidence). Medium on unused deps — `grep -r "express|dotenv|genai"` returned 0 hits in `src/` but runtime `dist/` not checked; Phase 1 will re-verify with `npm ls` / `depcheck`.
- Gap: No existing eslint config to copy — Phase 1 will scaffold from docs, not from repo.

---

## Phase 1: Config & Tooling Hygiene (Low risk, unblocks all phases) — ✅ COMPLETE (2026-08-22)

**What to implement — COPY from docs, not transform**
1. Fix `package.json:2` `name: react-example` → `text-markdown-formatter` (copy `metadata.json:2` name, slugified)
2. Fix `package.json:10` `clean: rm -rf dist server.js` → `rimraf dist` (add `rimraf` dep — see `rimraf` docs)
3. Split `package.json:11` `lint: tsc --noEmit` → `typecheck: tsc --noEmit` + `lint: eslint .` + `format: prettier --check .` (copy `eslint.config.js` from `typescript-eslint` getting-started, `prettier` config `.prettierrc`)
4. Dedupe `package.json:24` + `:33` `vite` — keep only in `devDependencies`
5. Remove unused deps after verification: `express:4.21.2`, `dotenv:17.2.3`, `@google/genai:2.4.0` (if `depcheck` confirms), `@types/express`, `autoprefixer`, `esbuild` if not used by Vite internally — keep `tsx` only if needed for scripts
6. Tighten `tsconfig.json:1-26`:
   ```json
   "strict": true,
   "noUnusedLocals": true,
   "noUnusedParameters": true,
   "noFallthroughCasesInSwitch": true,
   "allowJs": false,
   "allowImportingTsExtensions": false,
   "skipLibCheck": false
   ```
   Keep `target: ES2022`, `module: ESNext`, `jsx: react-jsx`, `moduleResolution: bundler`.
7. Optional: narrow `vite.config.ts:11` alias `@` → `path.resolve(__dirname, './src')` (align with `tsconfig.json:19` `@/*` → `["./src/*"]`) — copy Vite alias docs

**Documentation references**
- `tsconfig.json:1-26` — current loose config to tighten
- `package.json:1-36` — scripts/deps to fix
- `vite.config.ts:1-22` — alias to narrow
- `metadata.json:2-3` — canonical project name
- External: TypeScript `strict` docs, `rimraf` npm, `typescript-eslint` flat config

**Verification checklist**
- [x] `npx tsc --noEmit` passes (0 errors) after strict enabled — fix any new `strictNullChecks` violations before proceeding
- [x] `npm run lint` (eslint) passes with 0 errors
- [x] `npm run build` succeeds, `dist/` generated
- [x] `grep -r "from 'express'" src` still 0, `npm ls express` gone
- [x] `Get-Content package.json | Select-String '"vite"'` shows 1 occurrence

**Execution notes (2026-08-22)** — done inline; subagent delegation unavailable (billing)
- Root cause of strict-mode error flood: `@types/react` + `@types/react-dom` were missing entirely — installed (`^19`). Remaining errors: only 11 (unused vars/imports + one type mismatch), all fixed minimally.
- Added `format: prettier --write .` + `format:check: prettier --check .` instead of single check script; one-time repo-wide prettier pass applied (formatting-only diff).
- `skipLibCheck: false` held — no third-party `.d.ts` errors surfaced.
- `src/main.tsx:3` `'./App.tsx'` → `'./App'` for `allowImportingTsExtensions: false`.
- Type fix: `Editor.theme` prop widened `'light' | 'dark'` → `ThemeMode` (runtime unchanged); dead `onSetFocusMode` prop removed from Header + App.
- New files: `eslint.config.js`, `.prettierrc`, `.prettierignore`. HMR guard untouched. Nothing committed.

**Hotfix (2026-08-23)** — verification found 3 drifts, all closed in this session
- `tsconfig.json:18-21` `allowImportingTsExtensions: true` → `false`, `paths @/*: ["./*"]` → `["./src/*"]` (plan Phase 1:6-7). `src/main.tsx:3` already extensionless, so `npx tsc --noEmit` stays 0 errors. Verified with `rg "allowImportingTsExtensions.*true" tsconfig.json` → 0.
- `vite.config.ts:12` alias `@` → `path.resolve(__dirname, './src')` aligned to tsconfig (plan optional, now applied; no `from "@/` consumers, so non-breaking).
- `npx prettier --write .` re-run fixed 31 files that drifted after pillar 2/3 commits; `prettier --check` now `All matched files use Prettier code style!`.

**Anti-pattern guards**
- Do NOT delete `vite.config.ts:14-21` HMR guard
- Do NOT add `experimentalDecorators:false` without testing
- Do NOT invent `eslint` globals — copy `eslint.config.js` `languageOptions.globals.browser`

**Effort:** ~1h, no code logic changes

---

## Phase 2: Constants Extraction (Copy-paste, no logic change) — ✅ COMPLETE (2026-08-22)

**What to implement**
1. Create `src/constants/presets.ts` — COPY `DEFAULT_PRESETS` verbatim from `src/utils/markdownFormatter.ts:4-53`
2. Create `src/constants/fonts.ts` — COPY `FONT_OPTIONS` verbatim from `src/utils/markdownFormatter.ts:55-62`
3. Create `src/constants/theme.ts` — extract hardcoded colors from `markdownFormatter.ts:956-957,995-1000` (`#374151`, `#cbd5e1`, `#f1f5f9`, `#0f172a`, `#1e293b`) into `THEME_COLORS` object
4. Update `src/utils/markdownFormatter.ts:1` to `import { DEFAULT_PRESETS } from '../constants/presets'` etc. — remove original exports after move
5. Update `src/App.tsx:7-14` imports `DEFAULT_PRESETS, FONT_OPTIONS` → `from './constants/presets'` / `from './constants/fonts'`
6. Update `src/components/Header.tsx:4` `FONT_OPTIONS` import path
7. Add barrel `src/constants/index.ts` re-exporting `presets`, `fonts`, `theme`

**Documentation references**
- `src/utils/markdownFormatter.ts:4-62` — source to copy
- `src/App.tsx:7-14` — consumer to update
- `src/components/Header.tsx:4` — consumer

**Verification checklist**
- [x] `npx tsc --noEmit` passes
- [x] `grep -r "DEFAULT_PRESETS" src` shows only `constants/presets.ts` definition + imports
- [x] `npm run build` succeeds, no runtime preset regression (bundle 327.97 kB, +0.35 kB ≈ 0.1%)
- [x] `git diff --stat` shows +4 files in `src/constants/`, -0 logic in `markdownFormatter.ts` except imports

**Execution notes (2026-08-22)**
- Line refs shifted post-prettier: presets/fonts were at `markdownFormatter.ts:4-68`; theme colors at `:1008,1050-1055`.
- Plan listed 5 colors; actual usage was 8 hex values — all captured in `THEME_COLORS` (`text`, `heading`, `strong`, `tableBorder`, `codeBg`, `codeText` as dark/light pairs).
- Sanitize-section inline colors (`sanitizeOutputHtml`, ~`:1302+`) intentionally untouched — they move to `sanitize.ts` in Phase 3.
- Consumers now import directly from `./constants/presets|fonts` (App.tsx, Header.tsx); no re-export shim kept since only 2 consumers existed.

**Anti-pattern guards**
- Do NOT rename `DEFAULT_PRESETS` ids (`user-discrepancy`, `audit-table-and-list`, `executive-brief`)
- Do NOT change `FONT_OPTIONS` values — exact copy
- Do NOT inline `THEME_COLORS` — keep as separate constants to avoid circular import

**Effort:** ~30m

---

## Phase 3: Split God File `markdownFormatter.ts:1343` (Highest value) — ✅ COMPLETE (2026-08-22)

**What to implement — COPY existing function bodies, do not rewrite logic**
1. Create `src/utils/listNumbering.ts` — move:
   - `type NumberingFormat` (`markdownFormatter.ts:115-126`)
   - `intToRoman` (`:131-146`), `romanToInt` (`:151-169`), `intToAlpha` (`:174-183`), `alphaToInt` (`:188-195`)
   - `getNumberingPrefix` (`:200-223`), `interface NextListPrefixResult` (`:225-230`), `getNextListPrefix` (`:236-367`)
   - `applyNumberingToText` (`:373-446`), `applyInlineFormatToText` (`:451-484`)
   - Keep regexes verbatim — copy 1:1
2. Create `src/utils/tableConvert.ts` — move:
   - `tsvToMarkdownTable` (`:486-522`), `htmlTableToMarkdown` (`:524-574`), `preprocessMarkdownWithTsv` (`:848-876`), `parsePasteToGrid` (`:878-945`)
3. Create `src/utils/cleanup.ts` — move:
   - `sanitizeInputText` (`:576-579`), `interface SmartCleanupReport` (`:581-591`), `smartCleanupMarkdown` (`:599-846`), plus helpers `hasBrTags` (`:67-70`), `convertBrToNewlines` (`:76-85`), `convertNewlinesToBr` (`:91-98`), `prepareCopiedText` (`:105-113`)
4. Create `src/utils/htmlBuilder.ts` — move `buildGridHtml` (`:947-975`) and `buildInlineStyledHtml` (`:977-1121`)
5. Create `src/utils/sanitize.ts` — move `interface SanitizeOptions` (`:1123-1130`), `sanitizeOutputHtml` (`:1137-1269`), `copyFormattedTextToClipboard` (`:1271-1343`)
6. Keep `src/utils/markdownFormatter.ts` as barrel re-export:
   ```ts
   export * from './listNumbering';
   export * from './tableConvert';
   export * from './cleanup';
   export * from './htmlBuilder';
   export * from './sanitize';
   export { DEFAULT_PRESETS } from '../constants/presets';
   export { FONT_OPTIONS } from '../constants/fonts';
   ```
   Or keep deprecated re-export for 1 phase to avoid breaking imports, then migrate consumers.

7. Update consumers: `src/components/Editor.tsx:16` `parsePasteToGrid, sanitizeInputText, smartCleanupMarkdown`, `src/components/Preview.tsx:17-25`, `src/components/EditorCell.tsx:16` — keep importing from `../utils/markdownFormatter` (barrel) initially, then optional direct imports

**Documentation references**
- `src/utils/markdownFormatter.ts:1-1343` — source bodies to copy
- `src/components/Editor.tsx:16-18`, `Preview.tsx:17-25`, `EditorCell.tsx:15-16` — consumers
- Existing `src/utils/syntaxValidator.ts:1-327` — example of well-scoped util file to mimic (small, single-purpose)

**Verification checklist**
- [x] `npx tsc --noEmit` passes after split
- [x] `npm run build` succeeds, no bundle size regression >5% (327.97 kB, identical to Phase 2)
- [x] `grep -c "^export" src/utils/markdownFormatter.ts` ≈ 0 after (only barrel), `wc -l src/utils/*.ts` each <400 lines — see deviation below
- [x] Manual: TSV paste → markdown table renders verified live via Playwright (`Name\tQty / Apple\t3` → `<table>` in preview); HTML-table paste + `(i)` auto-continue covered by byte-exact code copy (no logic touched)
- [x] `grep -r "from '../utils/markdownFormatter'" src` still resolves via barrel

**Execution notes (2026-08-22)**
- Split done via scripted line-range splice of the post-prettier file (1368 lines) — byte-exact, no retyping. Boundaries: numbering 54-454, tables 456-552+831-928, cleanup 5-52+554-829, htmlBuilder 930-1143, sanitize 1145-1368.
- Resulting sizes: listNumbering 401, cleanup 325, sanitize 224, htmlBuilder 219, tableConvert 198; `markdownFormatter.ts` = 5-line barrel.
- Deviation: `listNumbering.ts` is 401 lines vs <400 soft target (off by one after prettier wrapping) — accepted.
- Internal dep graph (acyclic): `tableConvert -> cleanup`, `htmlBuilder -> tableConvert` (+ marked/THEME_COLORS); `listNumbering`, `cleanup`, `sanitize` standalone. No re-export shims needed beyond barrel.
- Unicode integrity checked at codepoint level (bullet chars U+2022/25E6/25AA present in extracted regexes).
- Live smoke test: vite preview + Playwright — app renders (font dropdown 6 items, editor grid), TSV pipeline works end-to-end across split modules. Only console message is pre-existing favicon 404.

**Anti-pattern guards**
- Do NOT rewrite regexes or `marked.setOptions({gfm:true,breaks:true})` at `markdownFormatter.ts:978-981` — copy verbatim to `htmlBuilder.ts`
- Do NOT change `DOMParser` usage (`:527,882,987,1175`) — keep client-only, no `jsdom` shim
- Do NOT add async to sync helpers; `copyFormattedTextToClipboard` stays `async` (`:1271`)
- Do NOT delete `markdownFormatter.ts` in same phase — keep barrel for backward compat, remove in Phase 5

**Effort:** ~2h, max maintainability gain

---

## Phase 4: Component Hygiene & Tailwind Dedup — ✅ COMPLETE (2026-08-22)

**What to implement**
1. Create `src/utils/cn.ts`:
   ```ts
   import { clsx } from 'clsx';
   import { twMerge } from 'tailwind-merge';
   export function cn(...inputs: Parameters<typeof clsx>) { return twMerge(clsx(inputs)); }
   ```
   (copy `clsx` + `tailwind-merge` docs — add both deps if not present)
2. Extract repeated Tailwind strings found via `grep` (dup count ≥2):
   - `bg-white hover:bg-slate-100 border-slate-200 text-slate-800` (Header/Editor)
   - `bg-blue-600 text-white border-blue-600 shadow-sm`
   - `bg-slate-700/60 text-slate-300 border-slate-600 hover:bg-slate-700`
   - Create `src/components/ui/buttonVariants.ts` with `cva` or simple `const BUTTON_VARIANTS = { primary: '...', ghost: '...' }` — copy strings verbatim then replace usages
3. Slim components:
   - `src/components/Preview.tsx:1-663` — extract `useCopy` hook for `copyFormattedTextToClipboard` logic (`Preview.tsx` copy state + `Header.tsx` copy)
   - `src/components/Editor.tsx:1-524` — extract `useGridActions` for `parsePasteToGrid` handlers
   - Goal: each component <350 lines
4. Add `src/components/ui/` barrel for shared variants

**Documentation references**
- `src/components/Preview.tsx:1-30` imports, `Header.tsx:2` `lucide-react` — existing UI patterns to keep
- Tailwind `cva` docs or `clsx` readme — pattern to copy
- Grep findings: `px-2 py-0.5 rounded border text-[11px]` dup ×3, `grid grid-cols-2 gap-1.5 mt-1.5` ×2

**Verification checklist**
- [x] `npx tsc --noEmit` passes
- [x] `grep -c "bg-white hover:bg-slate-100" src` = 1 (in `buttonVariants.ts`) after
- [x] Visual regression: dark/light toggle, Preview toolbar, Editor grid unchanged (Playwright screenshot compare vs pre-change baselines — pixel match)
- [x] `npm run build` + `npm run preview` — no style drift; live functional probes passed (settings panel 6 buttons, edit toolbar 7 buttons, Enter numbering continuation `(i)`→`(ii)`)

**Execution notes (2026-08-22)**
- Plan drift discovered: copy logic (`copiedCell`/`copiedAll` + `copyFormattedTextToClipboard` calls) lived in `App.tsx`, not Preview as the audit assumed — `useCopy` extracted from there.
- Hitting the <350 goal required going beyond the plan's letter: extracted `useOutputActions` (cell modes/feedback/textarea refs/numbering+inline handlers) plus `OutputCell.tsx` and `EditToolbar.tsx` from Preview (694→235), and `EditorSettingsPanel.tsx` + `useGridActions` from Editor (568→294).
- `BUTTON_VARIANTS` deduped 5 repeated families: neutral (`bg-white hover:bg-slate-100`) ×6, layout presets ×4, grid growers ×2, subtle-light focus buttons ×4, plus preset-active blue. Unique-color buttons left inline.
- New deps: `clsx` + `tailwind-merge` (runtime). Bundle 327.97→356.80 kB (+8.8%) — accepted cost of the prescribed stack; CSS +3 kB.
- Sizes after: Editor 294, Preview 235, Header 289, OutputCell 254, EditToolbar 164, EditorSettingsPanel ~150. EditorCell (387) untouched — not in plan scope.
- Smart-clean semantics preserved: Clean button routes through Preview's handler (`isTyping=false` history commit), not a per-cell duplicate.

**Anti-pattern guards**
- Do NOT replace `lucide-react` icons or `motion` (`framer-motion`) usage — keep existing animation API
- Do NOT introduce `DaisyUI`/new CSS framework
- Do NOT inline `cn` — always use helper

**Effort:** ~1.5h

---

## Phase 5: Logger, Tests Cleanup, Final Verification — ✅ COMPLETE (2026-08-22)

**What to implement**
1. Create `src/utils/logger.ts`:
   ```ts
   export const logger = {
     warn: (...args: unknown[]) => { if (import.meta.env.DEV) console.warn(...args); },
     error: (...args: unknown[]) => console.error(...args),
   };
   ```
   Replace `markdownFormatter.ts:571,914,1263,1312,1339` `console.*` with `logger.*` — copy call sites verbatim
2. Delete `test.js` + `test.cjs` (duplicated `marked` stubs `:1-5`) — replace with `src/utils/__tests__/markdownFormatter.test.ts` using `vitest` (copy Vitest `describe/it/expect` pattern) with 3 smoke tests: `smartCleanupMarkdown`, `tsvToMarkdownTable`, `getNextListPrefix`
3. Remove `dist/` + `test.*` from git tracking if needed, keep `dist` gitignored (` .gitignore:3`)
4. Add `src/utils/__tests__/` to `tsconfig.json` exclude if needed, add `vitest` config `vite.config.ts:6` `test: { environment: 'jsdom' }` — copy Vitest docs
5. Final barrel cleanup: after all consumers migrated to direct `listNumbering`/`tableConvert` imports, delete barrel fallback or keep as deprecated with `// @deprecated` comment

**Documentation references**
- `src/utils/markdownFormatter.ts:571,914,1263,1312,1339` — console sites to replace
- `test.js:1-5`, `test.cjs:1-5` — stubs to delete
- `vite.config.ts:6-22` — add `test` field per Vitest docs
- `.gitignore:1-7` — verify `dist` ignored

**Verification checklist**
- [x] `grep -r "console\.(warn|error|log)" src` = 0 (except `logger.ts`)
- [x] `npm test` (vitest) passes: 6/6 (plan called for 3 smoke tests; roman/alpha prefix + quote-standardization cases added)
- [x] `npx tsc --noEmit && npm run lint && npm run build` all green
- [x] `git status --porcelain` shows only intended files
- [x] `npm run preview` loads, no console spam in prod build

**Execution notes (2026-08-22)** — executed in parallel with pillar-1 Phase 1 (separate session); combined commit
- `logger.ts`: warn gated on `import.meta.env.DEV`, error always logs. All 5 console sites swapped (`sanitize.ts` ×3, `tableConvert.ts` ×2).
- `test.js`/`test.cjs` deleted; vitest@4 + jsdom wired via `vite.config.ts` `test.environment: 'jsdom'` + `"test": "vitest run"`.
- First vitest run hit a worker timeout (cold jsdom boot ~60s, one-off); warm runs pass in ~1s. If it recurs, try `--pool=forks`.
- Barrel decision: `markdownFormatter.ts` kept as pure re-export barrel (5 lines) — consumers unchanged, migration to direct imports deferred.
- Bundle note: 356.80→386.86 kB — +30 kB is dompurify from pillar-1 Phase 1 (bundled via htmlBuilder), NOT Phase 5 changes (logger is negligible). Verified by stash-rebuild comparison.

**Hotfix (2026-08-23)** — post-verification gaps closed
- `src/components/ErrorBoundary.tsx:1,24` `console.error` → `logger.error` (added `import { logger } from '../utils/logger'`); audit gap from `cea3fd4` perf commit that added ErrorBoundary after pillar-4 Phase 5. Now `grep console\. src` = only `logger.ts:3,5`.
- Gap `allowImportingTsExtensions` already false-verified via `npx prettier --write` re-run — no formatting drift introduced by tsconfig change.
- One `prettier --write .` pass fixed 31 files (all subsequent lint/build green, no functional change).

**Anti-pattern guards**
- Do NOT swallow errors — `logger.warn` must still log in DEV
- Do NOT add `eslint-disable` comments to pass lint — fix source
- Do NOT keep `test.js`/`test.cjs` alongside vitest

**Effort:** ~1h

---

## Final Phase: Cross-Pillar Verification

1. **Match audit** — re-run maintainability grep:
   - `Select-String -Path "src\**\*.ts" -Pattern "console\."` → 0 outside `logger.ts` (2026-08-23 hotfix: `ErrorBoundary.tsx:24` migrated to `logger.error`)
   - `Select-String -Path "src\**\*.ts" -Pattern "DEFAULT_PRESETS|FONT_OPTIONS"` → only `src/constants/` + expected consumer imports (`App.tsx:10`, `Header.tsx:13`)
   - `Get-ChildItem src/utils/*.ts | Measure` → 5+ small utils vs 1 god file (listNumbering 369, cleanup 294, sanitize 244, htmlBuilder 232, tableConvert 174, barrel 5)
2. **Anti-pattern grep**
   - `rg "rm -rf" package.json` → 0 ✅
   - `rg "\"react-example\"" package.json` → 0 ✅
   - `rg "allowImportingTsExtensions.*true" tsconfig.json` → 0 ✅ (hotfix 2026-08-23: `tsconfig.json:21` `true` → `false`)
3. **Tests** — `npm run typecheck && npm run lint && npm test && npm run build` → all green (prettier `--check` now passes after `prettier --write` on 31 files)
4. **No regressions** — `vite preview` + manual: paste HTML table, TSV, `(i)` list, copy to clipboard (sanitized HTML)

**Hotfix verification (2026-08-23)**
- `npx tsc --noEmit` → 0 errors, `allowImportingTsExtensions: false` compatible (`src/main.tsx:3` `from './App'` extensionless)
- `npx eslint .` → 0 errors
- `npx prettier --check .` → `All matched files use Prettier code style!` (previously 31 files warn)
- `npx vitest run` → 7 files / 42 tests PASS
- `npm run build` → `vendor 3.8kB / ui 22kB / purify 28kB / marked 43kB / index 305kB` — identical to pre-hotfix
- `Select-String "console\." src` → only `src/utils/logger.ts:3,5` ✅
- `tsconfig.json:19` `@/*` → `["./src/*"]` and `vite.config.ts:12` `@` → `path.resolve(__dirname, './src')` aligned per plan Phase 1:7 optional

---

## Execution Order & Dependencies

```
Phase 0 (done) ─┬─> Phase 1 ✅ (tooling + hotfix 2026-08-23) ──> Phase 2 ✅ (constants) ──> Phase 3 ✅ (split) ──> Phase 4 ✅ (cn/dedup) ──> Phase 5 ✅ (logger/tests + hotfix ErrorBoundary) ──> Final Verify ✅ (hotfix verified)
                └─ done — strict TS passes; Final Verify now green (prettier/tsconfig/logger)
```

- Each phase is **self-contained** with its own doc refs — can be executed in fresh chat context.
- If `explore` subagents become available (billing restored), delegate Phase 3 split to 1 explore per util file.
- Estimated total: **6h** (1 + 0.5 + 2 + 1.5 + 1)

---

## File Map (to create)

```
docs/pillar audit/pillar-4-maintainability-plan.md   ← this file
src/constants/presets.ts
src/constants/fonts.ts
src/constants/theme.ts
src/constants/index.ts
src/utils/listNumbering.ts
src/utils/tableConvert.ts
src/utils/cleanup.ts
src/utils/htmlBuilder.ts
src/utils/sanitize.ts
src/utils/cn.ts
src/utils/logger.ts
src/utils/__tests__/markdownFormatter.test.ts
src/components/ui/buttonVariants.ts
eslint.config.js
.prettierrc
```

## References

- Inline audit findings (this chat) citing `src/utils/markdownFormatter.ts:4-1343`, `tsconfig.json:1-26`, `package.json:1-36`, `vite.config.ts:1-22`
- `five-pillar-audit:standard-code-audit` — `C:\Users\danhm\.config\opencode\memory.jsonl`
- External docs (to read per phase): TypeScript `tsconfig` strict, `typescript-eslint` flat config, `rimraf`, `clsx`+`tailwind-merge`/`cva`, Vitest `jsdom`
