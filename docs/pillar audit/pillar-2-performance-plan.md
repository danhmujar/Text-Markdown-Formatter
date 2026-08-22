# Pillar 2 — Performance Fix Plan

**Project:** Text-Markdown-Formatter (`C:\AI\Project\Text-Markdown-Formatter`)
**Pillar:** 2/5 — Performance (`five-pillar-audit:standard-code-audit` in `C:\Users\danhm\.config\opencode\memory.jsonl`)
**Scope:** Bundle, Vite chunking, React memoization, `marked`/`DOMParser` hot path, motion dep, history compare
**Status:** Complete (Phases 1-5 & Cross-Pillar Verification completed on 2026-08-22)
**Date:** 2026-08-22
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

## Phase 1: Critical — Memoize Preview Per-Cell Parse — ✅ COMPLETE (2026-08-22)

**What to implement — COPY React `useMemo` + `memo` pattern**
1. Extract `src/components/PreviewCell.tsx`:
   ```tsx
   import React, { useMemo } from ''react'';
   import { StyleOptions } from ''../types'';
   import { buildInlineStyledHtml } from ''../utils/htmlBuilder'';
   const PreviewCell = React.memo(function PreviewCell({ outputText, options, isEditMode, ... }: { outputText:string, options:StyleOptions, isEditMode:boolean, ... }) {
     const htmlFormatted = useMemo(() => buildInlineStyledHtml(outputText, options, false), [outputText, options.theme, options.fontFamily, options.fontSize, options.lineHeight, options.bulletLevel1, options.bulletLevel2, options.bulletLevel3, options.tableBorderColor]);
     // keep sanitizeHtml wrapper from Security Phase 1 inside buildInlineStyledHtml, not here
     return (isEditMode ? <textarea ... value={outputText} /> : <div dangerouslySetInnerHTML={{__html: htmlFormatted}} />);
   });
   export { PreviewCell };
   ```
   Copy `React.memo` + `useMemo` deps verbatim from React docs; include all `options` fields that affect `buildInlineStyledHtml` (`theme, fontFamily, fontSize, lineHeight, bulletLevel1-3, tableBorderColor, etc.` at `htmlBuilder.ts:59-77`).
2. Update `src/components/Preview.tsx:354-363` — replace inline `grid.map(row.map(... const htmlFormatted=buildInlineStyledHtml ... return <div>))` with `<PreviewCell key={`cell-${r}-${c}`} outputText={outputText} options={options} isEditMode={isEditMode} ... />`. Keep `charCount/wordCount/lineCount` inside `PreviewCell` with `useMemo` as needed (currently computed per render at `Preview.tsx:364-366`).
3. Memoize `src/App.tsx:112-122` `getOutputContent` and `124-127` `hasOverride`:
   ```ts
   const getOutputContent = useCallback((r:number,c:number)=>{ const key=`${r}-${c}`; if(outputOverrides[key]!==undefined) return outputOverrides[key]; const raw=grid[r]?.[c]||''''; return hasBrTags(raw)?convertBrToNewlines(raw):raw; }, [grid, outputOverrides]);
   const hasOverride = useCallback((r,c)=> outputOverrides[`${r}-${c}`]!==undefined, [outputOverrides]);
   ```
   Copy `useCallback` deps pattern — do NOT include `grid.length` alone, include full `grid` (shallow compare okay for 2x2).
4. Wrap `Preview` export `export const Preview = React.memo(Preview)` if props stable; ensure `App` passes stable `onOutputChange, onResetOutputCell` via `useCallback` already? Add `useCallback` for `handleOutputChange:130` if not.

**Documentation references**
- `Preview.tsx:354-363,228,1` — hot path to memoize
- `htmlBuilder.ts:59-77` — `options` deps to list
- `App.tsx:112-137` — callbacks to stabilize
- External: React `memo`/`useMemo`/`useCallback` docs

**Verification checklist**
- [x] `npx tsc --noEmit` / `compile_applet` / `lint_applet` pass with 0 errors
- [x] `OutputCell` / `PreviewCell` uses `useMemo` for `buildInlineStyledHtml` with `options` dependencies
- [x] `OutputCell` and `Preview` wrapped in `React.memo`
- [x] All 19 vitest unit tests pass green
- [x] `npm run build` succeeds cleanly with zero visual or formatting regressions

**Anti-pattern guards**
- Do NOT memoize `buildGridHtml:6` separately — `PreviewCell` covers it; `buildGridHtml` for Copy All stays non-memo (on-demand)
- Do NOT omit `options.bulletLevel*` from deps — list bullets would stale after settings change
- Do NOT add `useMemo` around `grid.map` itself — per-cell memo is finer

**Effort:** ~1h, highest perf gain

---

## Phase 2: High — Harden `htmlBuilder` Hot Path — ✅ COMPLETE (2026-08-22)

**What to implement**
1. Fix `htmlBuilder.ts` — replaced global `marked.setOptions` with per-call `marked.parse(processedMarkdown, { gfm: true, breaks: true })`.
2. Implemented an LRU cache (size 20) in `htmlBuilder.ts` keyed by markdown content, style options, and copy mode (`isForWordCopy`).
3. Fresh `DOMParser` per call ensuring isolated and safe traversal.

**Documentation references**
- `src/utils/htmlBuilder.ts` — hot path cache and parse logic
- `marked` per-call options

**Verification checklist**
- [x] `marked.setOptions` removed; per-call options used in `marked.parse`
- [x] LRU cache (size 20) active for `buildInlineStyledHtml`
- [x] `npm test` 19/19 tests pass green
- [x] `npm run lint` and `npm run build` pass cleanly with 0 errors

**Anti-pattern guards**
- Do NOT cache with `rawMarkdown` as sole key — must include `options` fields
- Do NOT set cache size 1000 — 20 is enough for 2x2 grid
- Do NOT swallow `marked.parse` throw — Phase 1 Reliability ErrorBoundary will catch

**Effort:** ~30m

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
- [x] `motion` removed from dependencies and `node_modules`
- [x] `npm run build` generates split chunks (`vendor`, `marked`, `ui`, `purify`, `index`)
- [x] Console and debugger statements stripped in production builds
- [x] `npm test` 19/19 tests pass green
- [x] `npm run lint` and `npm run build` succeed with 0 errors

**Anti-pattern guards**
- Do NOT set `manualChunks: { vendor: [''react'',''react-dom'',''marked'',''lucide-react''] }` single chunk — keep 3 separate for cache
- Do NOT enable `sourcemap:true` in prod — leaks source and bloats
- Do NOT add `build.target: ''esnext''` without checking `browserslist`

**Effort:** ~30m

---

## Phase 4: Medium — History & Derived State Memoization — ✅ COMPLETE (2026-08-22)

**What to implement**
1. Enhanced `areStatesEqual` in `src/hooks/useGridHistory.ts` with fast-path length checks (`grid.length`, `outputOverrides` key count, and per-row lengths) before invoking `JSON.stringify`.
2. Memoized `canUndo` and `canRedo` with `useMemo` to prevent redundant serialization and comparison on keystrokes unless history states or uncommitted live buffers change.
3. Wrapped top-level components (`Header`, `Editor`, `EditorCell`) in `React.memo` alongside `Preview` and `OutputCell` for complete rendering boundary isolation across the app tree.

**Documentation references**
- `src/hooks/useGridHistory.ts` — history state comparison & memoized canUndo/canRedo
- `src/components/Header.tsx`, `src/components/Editor.tsx`, `src/components/EditorCell.tsx`

**Verification checklist**
- [x] Fast length-guard checks precede `JSON.stringify` comparisons in `areStatesEqual`
- [x] `canUndo` and `canRedo` memoized with `useMemo`
- [x] `Header`, `Editor`, `EditorCell`, `Preview`, `OutputCell` wrapped with `React.memo`
- [x] All 19 unit tests passing (`npm test`)
- [x] `npm run lint` and `npm run build` pass cleanly with 0 errors

**Anti-pattern guards**
- Do NOT memoize `grid` array itself with `useMemo` in `App` — history already clones
- Do NOT change `maxHistory=60` — keep

**Effort:** ~20m

---

## Phase 5: Verification & Profiling — ✅ COMPLETE (2026-08-22)

**What to implement**
1. Created `src/utils/__tests__/performance.test.ts` measuring 500-line markdown parse throughput and validating sub-millisecond LRU cache response times.
2. Verified `dist` chunking: `vendor`, `marked`, `ui`, `purify`, and `index` properly isolated.
3. Added `stats.html` to `.gitignore` to prevent committing build visualizer artifacts.
4. Validated zero runtime errors, zero regression on copy actions, formatting, and responsiveness across light/dark themes.

**Documentation references**
- `src/utils/__tests__/performance.test.ts` — automated performance and LRU cache test suite
- `vite.config.ts` build output & Rollup manualChunks configuration

**Verification checklist**
- [x] `npm run build` → `dist` split into modular chunks with gzip optimization
- [x] Automated performance test suite verifies sub-millisecond repeated cache access
- [x] `npm test` → 21/21 vitest unit and performance tests pass green
- [x] `npm run lint` & `compile_applet` pass with 0 errors
- [x] Large documents (500+ lines) parse with high throughput and instant cached re-renders

**Anti-pattern guards**
- Do NOT add `React.Profiler` in prod — dev only
- Do NOT keep `stats.html` committed — `.gitignore` it

**Effort:** ~20m

---

## Final Phase: Cross-Pillar Verification — ✅ PASSED (2026-08-22)

1. **Greps & Architecture:**
   - Component memoization (`React.memo`): `OutputCell`, `Preview`, `Header`, `Editor`, `EditorCell`
   - `marked.parse`: Per-call configuration with GFM and line breaks enabled
   - `marked.setOptions`: 0 occurrences (deprecated pattern eliminated)
   - `motion`: 0 dependencies / references
   - `manualChunks`: Configured for `vendor`, `marked`, `ui`, and `purify`
2. **Build & Audit:** Full compilation passes (`compile_applet`, `npm run lint`, `npm test` 21/21 passing).
3. **UX & Reactivity:** Typing in one cell isolates renders from other cells; theme and style changes update all cells correctly; Copy and Copy All functions remain fully operational.
4. **No Regressions:** Security sanitization (`DOMPurify`), fallback mechanisms, and UI components remain completely intact.

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
docs/pillar audit/pillar-2-performance-plan.md          <- this file
src/components/PreviewCell.tsx                          <- new (memoized)
src/components/Preview.tsx:1,228,354-363                 <- modify (use PreviewCell)
src/utils/htmlBuilder.ts:45-51,216                       <- modify (per-call marked, cache)
src/App.tsx:112-122                                      <- modify (useCallback)
src/hooks/useGridHistory.ts:44-45,204                    <- modify (memoize)
vite.config.ts:6-22                                      <- modify (build.manualChunks)
package.json:19                                          <- modify (rm motion)
stats.html                                               <- generated (gitignore)
```

## References

- Inline audit this chat citing `vite build` 328 kB, `Preview.tsx:354-363`, `htmlBuilder.ts:45-51`, `useGridHistory.ts:44-45`, `motion@12.23.24`
- `five-pillar-audit:standard-code-audit` — `C:\Users\danhm\.config\opencode\memory.jsonl`
- External docs (to read per phase): React `memo`/`useMemo`/`useCallback` + `lazy`, `marked` 18.x `parse` opts, Vite `build.rollupOptions.output.manualChunks` + `esbuild.drop`, `rollup-plugin-visualizer`, MDN `performance.mark`
