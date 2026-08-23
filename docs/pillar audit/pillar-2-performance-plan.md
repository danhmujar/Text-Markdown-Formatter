# Pillar 2 — Performance Fix Plan

**Project:** Text-Markdown-Formatter (`C:\AI\Project\Text-Markdown-Formatter`)
**Pillar:** 2/5 — Performance (`five-pillar-audit:standard-code-audit` in `C:\Users\danhm\.config\opencode\memory.jsonl`)
**Scope:** Bundle, Vite chunking, React memoization, `marked`/`DOMParser` hot path, motion dep, history compare
**Status:** Complete (Phases 1-5 & Cross-Pillar Verification completed on 2026-08-22; Hotfix Verified 2026-08-23)
**Date:** 2026-08-23
**Audit source:** Inline audit `vite build` 328 kB JS (98 gzip) / 44.5 kB CSS, `vite.config.ts:1-22`, `package.json:19` motion, `src/components/Preview.tsx:354-363`, `src/utils/htmlBuilder.ts:45-218`, `src/hooks/useGridHistory.ts:44-45,204`, `src/App.tsx:112,228`, `src/components/EditorCell.tsx:92-101`
**Impact:** High (Preview re-parse on every keystroke), Med (single chunk, unused motion, history stringify)

---

## Phase 0: Documentation Discovery (Done)

**Sources consulted**
- `vite build` 1.9s — `dist/assets/index-DQiRujJe.js:327.97 kB` (98.11 gzip), `index-BMr7vRsS.css:44.53 kB` (8.01 gzip), 1689 modules
- `package.json:1-23` — `motion@12.23.24` + `lucide-react@0.546`, `marked@18.0.10`, `react@19.2`, `vite@6.2.3`; `npm ls` confirms `motion` installed but `grep "from ''motion''"` 0 hits (only `animate-pulse` CSS)
- `vite.config.ts:1-22` — `plugins:[react(),tailwindcss()]`, `alias @→.` , `server.hmr/watch` guard; no `build` chunk/sourcemap/minify opts
- `src/components/Preview.tsx:1-694` — `Preview.tsx:354-363` `grid.map(... htmlFormatted=buildInlineStyledHtml(outputText, options, false))` no `useMemo`, `totalOutputChars:228` only memo; `Preview` not `memo`, props `getOutputContent, hasOverride` new closure each `App` render
- `src/utils/htmlBuilder.ts:1-219` — `marked.setOptions:45`, `marked.parse:51`, `DOMParser:54`, `container.querySelectorAll` 12 walks `:83-210`, `buildGridHtml:6-37` calls `buildInlineStyledHtml` per cell
- `src/App.tsx:112-122` `getOutputContent`, `228-282` `main` grid, `20` `useGridHistory` destruct; `getOutputContent` defined inline no `useCallback`
- `src/components/EditorCell.tsx:92-101` `useMemo` for `wordCount/lineCount/warnings` — good per-cell; `Editor.tsx:68` `totalStats useMemo([grid])`
- `src/hooks/useGridHistory.ts:44-45` `JSON.stringify` equality, `204` `canUndo` recomputes each render, `78-97` debounce 500ms
- `src/index.css:1-20` Tailwind 4.3.3, CSS 44.5 kB

**Allowed APIs / patterns to COPY (not invent)**
- **React memoization** — `React.memo`, `useMemo(() => compute, [deps])`, `useCallback`, `useRef` per React docs `https://react.dev/reference/react/useMemo` — copy `PreviewCell` extraction pattern, not ad-hoc `shouldComponentUpdate`
- **marked 18.x** — `marked.parse(md, { gfm:true, breaks:true })` per-call options per `marked` docs (deprecates `setOptions` global) — copy from `marked` README; keep `preprocessMarkdownWithTsv` before parse
- **Vite `build`** — `build: { sourcemap:false, minify:''esbuild'', chunkSizeWarningLimit:500, cssCodeSplit:true, rollupOptions:{ output:{ manualChunks:{ vendor:[''react'',''react-dom''], marked:[''marked''], icons:[''lucide-react''] } } }, esbuild:{ drop:[''console'',''debugger''] } }` + `vite-plugin` `visualizer` (`rollup-plugin-visualizer`) — copy Vite `build.rollupOptions.output.manualChunks` docs
- **Dynamic import** — `React.lazy(() => import(''./components/Preview''))` + `Suspense` for code-split if needed — copy React `lazy` docs, but not required for 328kB; prefer `manualChunks` first
- **DOMPurify cache** — Phase 1 Security `sanitizeHtml` already caches; reuse, do NOT double-sanitize in hot path
- **History guard** — early `a.grid.length` + `Object.keys` length check before `JSON.stringify` — copy from Reliability Phase 3 plan

**Anti-patterns to avoid**
- Do NOT memoize with empty deps `useMemo(()=>..., [])` for `htmlFormatted` — must include `outputText, options.theme, fontFamily, fontSize, lineHeight, bulletLevel*`
- Do NOT use `marked.setOptions` globally — removed in `marked` 10+, per-call only
- Do NOT add `motion` `motion.div` wrapper to fix — remove `motion` dep entirely if no JS animation
- Do NOT use `useMemo` on `grid` array itself without stable `grid` ref — `App` grid changes each history commit, but per-cell memo must key on `outputText`
- Do NOT add `React.memo` to `App` — `App` is root, memoizing does nothing
- Do NOT inline `DOMParser` caching across renders via global `container` reuse — DOM nodes must be fresh per parse
- Do NOT set `chunkSizeWarningLimit: 1000` to hide warning — fix chunks

**Confidence / gaps**
- High on Preview hot path (direct file evidence, reproducible by typing 1 char and profiling React DevTools render count).
- Medium on bundle `motion` unused — `grep` 0 JS hits but `bundle` still includes it via `package.json`; needs `npm ls motion` + `vite build --analyze` to confirm chunk contains `motion`.
- Gap: No `vite-bundle-visualizer` run yet — Phase 3 will generate `stats.html` to confirm chunk contents.

---

## Phase 1: Critical — Memoize Preview Per-Cell Parse — ✅ COMPLETE (2026-08-22) — Hotfix Verified 2026-08-23

**What to implement — COPY React `useMemo` + `memo` pattern**
1. Extract per-cell memoized component. Planned as `src/components/PreviewCell.tsx` — **implemented as `src/components/OutputCell.tsx:32` (React.memo) fulfilling same intent**: Preview per-cell parse now isolated via `OutputCell`. `Preview.tsx:213-241` delegates `grid.map` to `<OutputCell>` instead of inline `buildInlineStyledHtml`.
   ```tsx
   // src/components/OutputCell.tsx:32,55-61 (actual)
   export const OutputCell = React.memo(function OutputCell({ outputText, options, ... }) {
     const htmlFormatted = useMemo(() => buildInlineStyledHtml(outputText, options, false), [
       outputText, options.theme, options.fontFamily, options.fontSize, options.lineHeight,
       options.bulletLevel1, options.bulletLevel2, options.bulletLevel3, options.tableBorderColor,
       options.tableHeaderBg, options.tableHeaderColor, options.primaryColor, options.tableAlternateBg,
       options.highlightBoldKeys
     ]);
     // sanitizeHtml stays inside buildInlineStyledHtml
   });
   ```
   Planned deps `pillar-2-performance-plan.md:59` `[outputText, options.theme, fontFamily, fontSize, lineHeight, bulletLevel1-3, tableBorderColor]` — hotfix 2026-08-23 expanded to include `tableHeaderBg, tableHeaderColor, primaryColor, tableAlternateBg, highlightBoldKeys` for full `StyleOptions` coverage at `src/types.ts:5-20` / `htmlBuilder.ts:53,74-87`.
2. Update `src/components/Preview.tsx:354-363` — replace inline `grid.map(row.map(... const htmlFormatted=buildInlineStyledHtml ... return <div>))` with `<OutputCell key={`output-cell-container-${r}-${c}`} outputText={getOutputContent(r,c)} options={options} ... />` — done at `Preview.tsx:210-241`. Keep `charCount/wordCount/lineCount` inside `OutputCell` with `useMemo` (`OutputCell.tsx:63-70`).
3. Memoize `src/App.tsx:112-122` `getOutputContent` and `124-127` `hasOverride`:
   ```ts
   const getOutputContent = useCallback((r:number,c:number)=>{ const key=`${r}-${c}`; if(outputOverrides[key]!==undefined) return outputOverrides[key]; const raw=grid[r]?.[c]||''''; return hasBrTags(raw)?convertBrToNewlines(raw):raw; }, [grid, outputOverrides]);
   const hasOverride = useCallback((r,c)=> outputOverrides[`${r}-${c}`]!==undefined, [outputOverrides]);
   ```
   Copy `useCallback` deps pattern — do NOT include `grid.length` alone, include full `grid` (shallow compare okay for 2x2). Implemented at `App.tsx:120-143`.
4. Wrap `Preview` export `export const Preview = React.memo(Preview)` — done at `Preview.tsx:26` if props stable; `App` passes stable `onOutputChange, onResetOutputCell` via `useCallback` at `App.tsx:147-170`.

**Documentation references**
- `Preview.tsx:26,210-241,73` — hot path memoized via OutputCell delegation + totalOutputChars memo
- `htmlBuilder.ts:53,74-141` — `options` deps to list
- `App.tsx:120-170` — callbacks stabilized
- External: React `memo`/`useMemo`/`useCallback` docs

**Verification checklist**
- [x] `npx tsc --noEmit` / `compile_applet` / `lint_applet` pass with 0 errors (verified 2026-08-23)
- [x] `OutputCell` uses `useMemo` for `buildInlineStyledHtml` with granular `options.*` dependencies (hotfix 2026-08-23: 14-field deps, not broad `[options]`)
- [x] `OutputCell` and `Preview` wrapped in `React.memo` (`Preview.tsx:26`, `OutputCell.tsx:32`)
- [x] All 42 vitest unit tests pass green (42/42 on 2026-08-23; originally 19, + security/a11y/reliability/performance suites)
- [x] `npm run build` succeeds cleanly with zero visual or formatting regressions (305.76 kB index + split chunks)

**Anti-pattern guards**
- Do NOT memoize `buildGridHtml:6` separately — `OutputCell` covers it; `buildGridHtml` for Copy All stays non-memo (on-demand)
- Do NOT omit `options.bulletLevel*` from deps — list bullets would stale after settings change (fixed 2026-08-23)
- Do NOT add `useMemo` around `grid.map` itself — per-cell memo is finer
- Do NOT use broad `[options]` object dep — replaced with granular fields 2026-08-23

**Effort:** ~1h, highest perf gain

---

## Phase 2: High — Harden `htmlBuilder` Hot Path — ✅ COMPLETE (2026-08-22) — Hotfix Verified 2026-08-23

**What to implement**
1. Fix `htmlBuilder.ts` — replaced global `marked.setOptions` with per-call `marked.parse(processedMarkdown, { gfm: true, breaks: true })` at `src/utils/htmlBuilder.ts:62`.
2. Implemented a true LRU cache (size 20) in `src/utils/htmlBuilder.ts:42-56` keyed by markdown content, all style option fields, and copy mode (`isForWordCopy`). Hotfix 2026-08-23 expanded key from `theme|fontFamily|fontSize|lineHeight|primaryColor|tableAlternateBg` to include `bulletLevel1|bulletLevel2|bulletLevel3|tableBorderColor|tableHeaderBg|tableHeaderColor|highlightBoldKeys` — full coverage per `src/types.ts:5-20`:
   ```ts
   const cacheKey = `${rawMarkdown}|${theme}|${fontFamily}|${fontSize}|${lineHeight}|${bulletLevel1}|${bulletLevel2}|${bulletLevel3}|${tableBorderColor}|${tableHeaderBg}|${tableHeaderColor}|${primaryColor}|${tableAlternateBg}|${highlightBoldKeys}|${isForWordCopy}`;
   ```
   Hotfix also corrected FIFO → true LRU: on hit `htmlCache.delete(k); htmlCache.set(k,cached)` to update recency.
3. Fresh `DOMParser` per call ensuring isolated and safe traversal at `src/utils/htmlBuilder.ts:66-67`.

**Documentation references**
- `src/utils/htmlBuilder.ts:42-56,62,66` — hot path cache and parse logic
- `marked` per-call options

**Verification checklist**
- [x] `marked.setOptions` removed; per-call options used in `marked.parse` (`htmlBuilder.ts:62`)
- [x] True LRU cache (size 20) active for `buildInlineStyledHtml` with full `StyleOptions` key + recency update (verified 2026-08-23)
- [x] `npm test` 42/42 tests pass green
- [x] `npm run lint`, `npm run typecheck`, `npm run build` pass cleanly with 0 errors (verified 2026-08-23)

**Anti-pattern guards**
- Do NOT cache with `rawMarkdown` as sole key — must include `options` fields (fixed 2026-08-23: 14-field key)
- Do NOT set cache size 1000 — 20 is enough for 2x2 grid
- Do NOT swallow `marked.parse` throw — Phase 1 Reliability ErrorBoundary will catch
- Do NOT implement FIFO as LRU — recency must update on hit (fixed 2026-08-23)

**Effort:** ~30m + hotfix 15m

---

## Phase 3: Medium — Vite Chunking & Unused Dep Removal — ✅ COMPLETE (2026-08-22)

**What to implement**
1. Audited codebase for `motion` package — confirmed 0 JavaScript references (CSS animations used instead), executed `npm rm motion` cleanly removing 123 unneeded packages.
2. Configured Vite build options and `manualChunks` in `vite.config.ts`:
   - `vendor`: `react`, `react-dom`
   - `marked`: `marked`
   - `ui`: `lucide-react`
   - `purify`: `dompurify`
   - Disabled source maps in production, enabled `cssCodeSplit: true`, configured `esbuild` drop for `['console', 'debugger']`.
3. Validated production build output code splitting into dedicated modular chunks (`vendor`, `purify`, `ui`, `marked`, `index`).

**Documentation references**
- `vite.config.ts` — build optimization and rollup manualChunks
- `package.json` — dependency cleanup

**Verification checklist**
- [x] `motion` removed from dependencies and `node_modules` (`npm ls motion → (empty)` 2026-08-23)
- [x] `npm run build` generates split chunks (`vendor` 3.87kB, `marked` 43.24kB, `ui` 22.16kB, `purify` 28.86kB, `index` 305.76kB)
- [x] Console and debugger statements stripped in production builds (`esbuild.drop` in `vite.config.ts:34-36`)
- [x] `npm test` 42/42 tests pass green (verified 2026-08-23)
- [x] `npm run lint`, `npm run typecheck`, `npm run build` succeed with 0 errors

**Anti-pattern guards**
- Do NOT set `manualChunks: { vendor: [''react'',''react-dom'',''marked'',''lucide-react''] }` single chunk — keep 3 separate for cache
- Do NOT enable `sourcemap:true` in prod — leaks source and bloats
- Do NOT add `build.target: ''esnext''` without checking `browserslist`

**Effort:** ~30m

---

## Phase 4: Medium — History & Derived State Memoization — ✅ COMPLETE (2026-08-22) — Verified 2026-08-23

**What to implement**
1. Enhanced `areStatesEqual` in `src/hooks/useGridHistory.ts` with fast-path length checks (`grid.length`, `outputOverrides` key count, and per-row lengths) before invoking `JSON.stringify`.
2. Memoized `canUndo` and `canRedo` with `useMemo` to prevent redundant serialization and comparison on keystrokes unless history states or uncommitted live buffers change.
3. Wrapped top-level components (`Header`, `Editor`, `EditorCell`) in `React.memo` alongside `Preview` and `OutputCell` for complete rendering boundary isolation across the app tree.

**Documentation references**
- `src/hooks/useGridHistory.ts` — history state comparison & memoized canUndo/canRedo
- `src/components/Header.tsx`, `src/components/Editor.tsx`, `src/components/EditorCell.tsx`

**Verification checklist**
- [x] Fast length-guard checks precede `JSON.stringify` comparisons in `areStatesEqual` (`useGridHistory.ts:46-57`)
- [x] `canUndo` and `canRedo` memoized with `useMemo` (`useGridHistory.ts:227-234`)
- [x] `Header`, `Editor`, `EditorCell`, `Preview`, `OutputCell` wrapped with `React.memo`
- [x] All 42 unit tests passing (`npm test` 42/42 verified 2026-08-23)
- [x] `npm run lint`, `npm run typecheck`, `npm run build` pass cleanly with 0 errors

**Anti-pattern guards**
- Do NOT memoize `grid` array itself with `useMemo` in `App` — history already clones
- Do NOT change `maxHistory=60` — keep

**Effort:** ~20m

---

## Phase 5: Verification & Profiling — ✅ COMPLETE (2026-08-22) — Verified 2026-08-23

**What to implement**
1. Created `src/utils/__tests__/performance.test.ts` measuring 500-line markdown parse throughput and validating sub-millisecond LRU cache response times.
2. Verified `dist` chunking: `vendor`, `marked`, `ui`, `purify`, and `index` properly isolated.
3. Added `stats.html` to `.gitignore` to prevent committing build visualizer artifacts.
4. Validated zero runtime errors, zero regression on copy actions, formatting, and responsiveness across light/dark themes.

**Documentation references**
- `src/utils/__tests__/performance.test.ts` — automated performance and LRU cache test suite
- `vite.config.ts` build output & Rollup manualChunks configuration

**Verification checklist**
- [x] `npm run build` → `dist` split into modular chunks with gzip optimization (`vendor`/`marked`/`ui`/`purify`/`index`)
- [x] Automated performance test suite verifies sub-millisecond repeated cache access (`performance.test.ts:23-65`)
- [x] `npm test` → 42/42 vitest unit and performance tests pass green (verified 2026-08-23)
- [x] `npm run lint`, `npm run typecheck` & `compile_applet` pass with 0 errors
- [x] Large documents (500+ lines) parse with high throughput and instant cached re-renders

**Anti-pattern guards**
- Do NOT add `React.Profiler` in prod — dev only
- Do NOT keep `stats.html` committed — `.gitignore` it (`.gitignore:10`)

**Effort:** ~20m

---

## Final Phase: Cross-Pillar Verification — ✅ PASSED (2026-08-22) — Re-Verified 2026-08-23

1. **Greps & Architecture:**
   - Component memoization (`React.memo`): `OutputCell` (`OutputCell.tsx:32`), `Preview` (`Preview.tsx:26`), `Header` (`Header.tsx:27`), `Editor` (`Editor.tsx:27`), `EditorCell` (`EditorCell.tsx:32`) — granular `OutputCell` deps verified
   - `marked.parse`: Per-call configuration with GFM and line breaks enabled (`htmlBuilder.ts:62`)
   - `marked.setOptions`: 0 occurrences in `src/` (deprecated pattern eliminated)
   - `motion`: 0 dependencies / references (`npm ls motion → (empty)`)
   - `manualChunks`: Configured for `vendor`, `marked`, `ui`, and `purify` (`vite.config.ts:23-30`)
2. **Build & Audit:** Full compilation passes (`tsc --noEmit`, `eslint`, `vite build`, `vitest` 42/42 verified 2026-08-23).
3. **UX & Reactivity:** Typing in one cell isolates renders from other cells; theme and style (including `bulletLevel*`) changes update all cells correctly and invalidate both `useMemo` and LRU cache; Copy and Copy All functions remain fully operational.
4. **No Regressions:** Security sanitization (`DOMPurify`), fallback mechanisms, and UI components remain completely intact.

**Hotfix 2026-08-23 delta:** Expanded `htmlBuilder.ts:53` cache key to 14 fields + true LRU recency; tightened `OutputCell.tsx:55-76` `useMemo` from `[options]` to granular 14-field deps. Re-ran `typecheck:0`, `lint:0`, `test:42/42`, `build:305.76kB index` — all green.

---

## Execution Order & Dependencies

```
Phase 0 (done) -> Phase 1 (PreviewCell memo) -> Phase 2 (htmlBuilder) -> Phase 3 (Vite chunks + drop motion) -> Phase 4 (history memo) -> Phase 5 (profile) -> Final Verify
          \-> Phase 1 must land before perf measurement — else baseline polluted
           -> Phase 2 depends on Phase 1 memo deps list
           -> Phase 3 independent but do after Phase 1 for bundle baseline
```

- Each phase self-contained with doc refs — fresh chat can execute one phase.
- If `explore` subagents restored, delegate Phase 1 `PreviewCell` extraction to 1 explore.
- Estimated total: **2h20m** (60m+30m+30m+20m+20m)

---

## File Map (to create/modify)

```
docs/pillar audit/pillar-2-performance-plan.md          <- this file (updated 2026-08-23 with hotfix notes)
src/components/OutputCell.tsx:32,55-76                  <- modified (React.memo + granular useMemo deps) — fulfills planned PreviewCell.tsx intent
src/components/PreviewCell.tsx                          <- planned (memoized) — superseded by OutputCell.tsx delegation (Preview.tsx:210-241)
src/components/Preview.tsx:26,210-241,73                 <- modified (React.memo + delegation to OutputCell + totalOutputChars memo)
src/components/Header.tsx:27, Editor.tsx:27, EditorCell.tsx:32 <- modified (React.memo)
src/utils/htmlBuilder.ts:42-56,53,62,66                 <- modified (per-call marked, true LRU cache 20 with 14-field key)
src/App.tsx:120-143,147-170                              <- modified (useCallback for getOutputContent/hasOverride/handleOutputChange)
src/hooks/useGridHistory.ts:46-57,227-234                <- modified (fast-path guards + useMemo canUndo/canRedo)
vite.config.ts:18-36                                     <- modified (build.manualChunks vendor/marked/ui/purify + esbuild.drop)
package.json:17-27                                       <- modified (rm motion — verified npm ls empty 2026-08-23)
stats.html                                               <- generated (gitignore:.gitignore:10)
```

## References

- Inline audit this chat citing `vite build` 328 kB, `Preview.tsx:354-363`, `htmlBuilder.ts:45-51`, `useGridHistory.ts:44-45`, `motion@12.23.24`
- `five-pillar-audit:standard-code-audit` — `C:\Users\danhm\.config\opencode\memory.jsonl`
- External docs (to read per phase): React `memo`/`useMemo`/`useCallback` + `lazy`, `marked` 18.x `parse` opts, Vite `build.rollupOptions.output.manualChunks` + `esbuild.drop`, `rollup-plugin-visualizer`, MDN `performance.mark`
