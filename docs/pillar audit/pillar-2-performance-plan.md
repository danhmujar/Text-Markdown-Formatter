# Pillar 2 — Performance Fix Plan

**Project:** Text-Markdown-Formatter (`C:\AI\Project\Text-Markdown-Formatter`)
**Pillar:** 2/5 — Performance (`five-pillar-audit:standard-code-audit` in `C:\Users\danhm\.config\opencode\memory.jsonl`)
**Scope:** Bundle, Vite chunking, React memoization, `marked`/`DOMParser` hot path, motion dep, history compare
**Status:** Plan (not yet executed) — orchestrator-only synthesis, no edits
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

## Phase 1: Critical — Memoize Preview Per-Cell Parse (60% jank reduction)

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
- [ ] `npx tsc --noEmit` passes after `PreviewCell` extraction
- [ ] `grep -n "useMemo.*buildInline" src/components/PreviewCell.tsx` → 1, deps list includes `options.theme` etc.
- [ ] `grep -rn "React.memo" src/components/Preview.tsx src/components/PreviewCell.tsx` → 1-2 hits
- [ ] Manual profiling: React DevTools Profiler → type 10 chars in 1 cell, `PreviewCell` for edited cell re-renders, other 3 `PreviewCell` do NOT re-render (memo bail-out). Previously all 4 re-rendered.
- [ ] `npm run build` — no style regression, preview formatted same

**Anti-pattern guards**
- Do NOT memoize `buildGridHtml:6` separately — `PreviewCell` covers it; `buildGridHtml` for Copy All stays non-memo (on-demand)
- Do NOT omit `options.bulletLevel*` from deps — list bullets would stale after settings change
- Do NOT add `useMemo` around `grid.map` itself — per-cell memo is finer

**Effort:** ~1h, highest perf gain

---

## Phase 2: High — Harden `htmlBuilder` Hot Path

**What to implement**
1. Fix `htmlBuilder.ts:45-48` — replace global `marked.setOptions` with per-call:
   ```ts
   const rawHtml = marked.parse(processedMarkdown, { gfm:true, breaks:true }) as string;
   ```
   Keep `preprocessMarkdownWithTsv:50` before.
2. Add per-input LRU cache (size 20) for `buildInlineStyledHtml` to avoid re-parse when toggling `isForWordCopy` or theme unchanged:
   ```ts
   const cache = new Map<string,string>(); // key: rawMarkdown + JSON.stringify(options) + isForWordCopy
   export function buildInlineStyledHtml(...){
     const key = rawMarkdown + ''|'' + options.theme + ''|'' + options.fontFamily + isForWordCopy;
     if(cache.has(key)) return cache.get(key)!;
     // ... existing DOMParser + styling
     if(cache.size>20) cache.delete(cache.keys().next().value);
     cache.set(key, container.innerHTML); return container.innerHTML;
   }
   ```
   Keep `Map` simple, not external `lru-cache`.
3. Batch `querySelectorAll` walks — already 12 walks `:83-210`; keep but ensure they run on `container` only, not `document`. If `container` has no `h1/h2` etc., skip style (add `if(container.querySelector(''h1''))` guard). Optional micro-opt: use `container.children` loop once instead of 12 walks — but keep simple guard first.
4. Ensure `DOMParser:54` is fresh per call — do NOT reuse global `parser`.

**Documentation references**
- `htmlBuilder.ts:45-51,54,83-210` — hot path to fix
- `marked` 18.x `parse` per-call opts docs
- MDN `DOMParser` reuse note

**Verification checklist**
- [ ] `grep -n "marked.setOptions" src/utils/htmlBuilder.ts` → 0, `marked.parse.*gfm` → 1
- [ ] `grep -n "new Map" src/utils/htmlBuilder.ts` → 1 (cache)
- [ ] `npm run build` — bundle 328 kB → similar, but typing 500-line markdown (paste Stora Enso preset) feels <50ms vs ~150ms before (measure via `performance.now()` around `buildInlineStyledHtml` in DevTools)
- [ ] No `mermaid` or extra dep added

**Anti-pattern guards**
- Do NOT cache with `rawMarkdown` as sole key — must include `options` fields
- Do NOT set cache size 1000 — 20 is enough for 2x2 grid
- Do NOT swallow `marked.parse` throw — Phase 1 Reliability ErrorBoundary will catch

**Effort:** ~30m

---

## Phase 3: Medium — Vite Chunking & Unused Dep Removal

**What to implement**
1. **Drop `motion`** if still unused: `npm rm motion` — verify `grep -r "motion" src` 0 JS hits (only CSS `animate-pulse`). If any `motion/react` usage appears, keep but `npm rm motion` else remove. Update `package.json:19` accordingly.
2. **Vite `build` opts** `vite.config.ts:6` — add:
   ```ts
   build: {
     sourcemap: false,
     minify: ''esbuild'',
     chunkSizeWarningLimit: 600,
     cssCodeSplit: true,
     rollupOptions: {
       output: {
         manualChunks: {
           vendor: [''react'',''react-dom''],
           marked: [''marked''],
           ui: [''lucide-react''],
         },
       },
     },
     esbuild: { drop: [''console'',''debugger''] },
   }
   ```
   Copy Vite `build.rollupOptions.output.manualChunks` docs; keep `plugins:[react(),tailwindcss()]` order.
3. Optional: `npm i -D rollup-plugin-visualizer` + `plugins:[visualizer({filename:''stats.html''})]` to generate bundle treemap — copy `rollup-plugin-visualizer` README.
4. Verify `@tailwindcss/vite` already splits CSS — keep `cssCodeSplit:true`.

**Documentation references**
- `vite.config.ts:1-22` — to extend
- `package.json:19` `motion` to remove
- External: Vite `build` docs, `rollup-plugin-visualizer` usage

**Verification checklist**
- [ ] `npm ls motion` → `empty` after removal, `package.json` no `motion`
- [ ] `npm run build` → `dist/assets` shows 3-4 chunks: `vendor-XXXX.js` (~45 kB), `marked-XXXX.js` (~20 kB), `ui-XXXX.js` (~15 kB), `index-XXXX.js` (~250 kB) vs previous single 328 kB
- [ ] `gzip` total `98 kB` → similar or -5 kB after `motion` drop
- [ ] `npx tsc --noEmit && npm run build` pass, `vite preview` no 404 for chunks, `index.html` loads all chunks

**Anti-pattern guards**
- Do NOT set `manualChunks: { vendor: [''react'',''react-dom'',''marked'',''lucide-react''] }` single chunk — keep 3 separate for cache
- Do NOT enable `sourcemap:true` in prod — leaks source and bloats
- Do NOT add `build.target: ''esnext''` without checking `browserslist`

**Effort:** ~30m

---

## Phase 4: Medium — History & Derived State Memoization

**What to implement**
1. Fix `src/hooks/useGridHistory.ts:44-45` as in Reliability Phase 3 — add fast path before `JSON.stringify`:
   ```ts
   if(a.grid.length!==b.grid.length) return false;
   if(Object.keys(a.outputOverrides).length!==Object.keys(b.outputOverrides).length) return false;
   // optional: if(totalChars>500k) skip compare
   ```
2. Memoize `canUndo/canRedo` `useGridHistory.ts:204` — change:
   ```ts
   const canUndo = useMemo(()=> historyIndex>0 || (historyRef.current[historyIndex] && !areStatesEqual({grid, outputOverrides}, historyRef.current[historyIndex])), [historyIndex, history.length, grid, outputOverrides]);
   const canRedo = useMemo(()=> historyIndex < history.length-1, [historyIndex, history.length]);
   ```
   Copy `useMemo` pattern.
3. Memoize `Header` undo/redo `disabled` props already via `canUndo/canRedo` — ensure `App.tsx:20` destruct passes stable booleans.
4. Optional: `Editor.tsx:68` `totalStats useMemo([grid])` already good; add `Preview.tsx:228` `totalOutputChars useMemo([grid, getOutputContent])` deps stable after Phase 1 `useCallback`.

**Documentation references**
- `useGridHistory.ts:44-45,204` — to memoize
- `App.tsx:20,112`, `Editor.tsx:68`, `Preview.tsx:228`

**Verification checklist**
- [ ] `grep -n "JSON.stringify" src/hooks/useGridHistory.ts` → 1, preceded by length checks
- [ ] React DevTools → typing does NOT recompute `canUndo` stringify on every keystroke unless `historyIndex` changes
- [ ] Paste 100x100 grid — typing remains <16ms frame (check Performance tab)

**Anti-pattern guards**
- Do NOT memoize `grid` array itself with `useMemo` in `App` — history already clones
- Do NOT change `maxHistory=60` — keep

**Effort:** ~20m

---

## Phase 5: Verification & Profiling

**What to implement**
1. Add `npm run analyze` script: `"analyze": "vite build && npx vite-bundle-visualizer"` or `rollup-plugin-visualizer` `stats.html` — copy visualizer docs
2. Create `tests/perf/typing.spec.ts` (Playwright) that types 500 chars into `EditorCell` and asserts `PreviewCell` render time <100ms via `performance.mark` — copy Playwright `test` pattern from `.playwright-mcp`
3. Manual profiling: `vite preview` → DevTools Performance → record typing, check `PreviewCell` bail-outs, `buildInlineStyledHtml` calls 1 per edited cell not 4
4. Verify bundle: `npx vite --version`, `npm run build` → 3 chunks, gzip ~93 kB after `motion` removal

**Documentation references**
- `vite.config.ts` build output
- Playwright `performance` API
- Reliability `ErrorBoundary` ensures perf test not blocked by throw

**Verification checklist**
- [ ] `npm run build` → `dist` chunks as Phase 3, gzip <95 kB
- [ ] `npm run analyze` → `stats.html` shows `marked`, `vendor`, `ui` separated, `motion` 0
- [ ] `npx tsc --noEmit && npm run lint && npm test` (if vitest) pass
- [ ] Manual: paste Stora Enso preset (3 pages) → preview renders <100ms, typing lag 0

**Anti-pattern guards**
- Do NOT add `React.Profiler` in prod — dev only
- Do NOT keep `stats.html` committed — `.gitignore` it

**Effort:** ~20m

---

## Final Phase: Cross-Pillar Verification

1. **Greps:**
   - `Select-String -Path "src\**\*.tsx" -Pattern "React\.memo"` → 2+ (PreviewCell, maybe Preview)
   - `Select-String -Path "src\utils\htmlBuilder.ts" -Pattern "marked\.parse" | Select-String "gfm"` → 1 per-call
   - `Select-String -Path "src\utils\htmlBuilder.ts" -Pattern "marked\.setOptions"` → 0
   - `Select-String -Path "package.json" -Pattern "motion"` → 0 after removal
   - `Select-String -Path "vite.config.ts" -Pattern "manualChunks"` → 1
2. **Build & audit:** `npx tsc --noEmit && npm run lint && npm run build && npm run preview` + React DevTools Profiler
3. **Manual UX:** type in Input → only edited `PreviewCell` updates, switch theme/font → all cells update (deps correct), Copy All → still works (`buildGridHtml` on-demand)
4. **No regression:** Security `sanitizeHtml` still wraps `marked.parse`, Reliability `ErrorBoundary` still catches, A11y focus ring still shows

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
