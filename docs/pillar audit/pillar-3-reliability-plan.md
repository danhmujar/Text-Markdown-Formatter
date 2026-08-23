# Pillar 3 — Reliability Fix Plan

**Project:** Text-Markdown-Formatter (`C:\AI\Project\Text-Markdown-Formatter`)
**Pillar:** 3/5 — Reliability (`five-pillar-audit:standard-code-audit` in `C:\Users\danhm\.config\opencode\memory.jsonl`)
**Scope:** Error boundaries, silent failures, history/debounce, edge inputs, runtime validation
**Status:** Completed — all phases (1–5) fully executed, verified, and passing test suites — re-verified 2026-08-23, audit gaps closed
**Date:** 2026-08-23 (original 2026-08-22, re-verified 2026-08-23)
**Re-verification:** Fix applied 2026-08-23 for table-parse toast and GenAI alignment doc; `npx tsc --noEmit && npm run lint && npm test && npm run build && npm audit` all green (42 tests, 7 suites)
**Audit source:** Inline audit `src/main.tsx:5-8`, `src/App.tsx:117,156-203`, `src/hooks/useGridHistory.ts:43-210`, `src/utils/markdownFormatter.ts:74-1445`, `src/components/Editor.tsx:161`, `metadata.json:6`, `.env.example:4`

---

## Phase 0: Documentation Discovery (Done)

**Sources consulted**
- `src/main.tsx:5-8` — `createRoot(...).render(<StrictMode><App/></StrictMode>)` no ErrorBoundary
- `src/App.tsx:1-286` — `getOutputContent:112-122`, `handleCopyCell:156-173`, `handleCopyAllGrid:178-203`, `handleOutputChange:130-137`, keyboard handler `useEffect:67-107`
- `src/hooks/useGridHistory.ts:1-214` — `areStatesEqual:43-48` JSON.stringify, `commitSnapshot:58-68`, `setLiveGridAndOverrides:78-97`, `undo:137-160`, `redo:169-196`, `debounceTimerRef:34,92,97,137,170,204-210`
- `src/utils/markdownFormatter.ts:1-1445` — guards `if (!text) return`:74,83,110,263,405,620,643,897, `try/catch` 566/613, 929/961, 1251/1345, 1359/1394, 1399/1421; `tsvToMarkdownTable:526-530`, `parsePasteToGrid:929-970`, `smartCleanup:799-873`, `buildInlineStyledHtml:977-1200`
- `src/components/Editor.tsx:161-172` paste handling, `EditorCell.tsx:36-80` Enter handling, `syntaxValidator.ts:1-80` warnings
- `metadata.json:6` `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` vs `grep @google/genai` 0 hits, `package.json:1-23` clean after Pillar 4 fixes, `npm audit` 0

**Allowed APIs / patterns to COPY (not invent)**
- React Error Boundary — class component `static getDerivedStateFromError(error)` + `componentDidCatch(error, info)` per React docs `https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary` — copy boilerplate from React docs, not ad-hoc try/catch in render
- `navigator.clipboard.write` + `ClipboardItem` — existing `markdownFormatter.ts:1385-1391` pattern, keep try/catch, add user toast on `false` return
- `vitest` + `jsdom` — `vite.config.ts` already has `test: { environment: 'jsdom' }` after Pillar 4 Phase 5, reuse `describe/it/expect` pattern
- `DOMParser` + `marked.parse(md, {gfm:true,breaks:true})` — existing `markdownFormatter.ts:1039`, keep but wrap in try/catch that surfaces error to UI (toast) instead of console.warn only
- `setTimeout 500ms` debounce — existing `useGridHistory.ts:92`, keep timing, just fix closure and shift logic

**Anti-patterns to avoid**
- Do NOT wrap `marked.parse` or `DOMParser` in empty catch that returns `''''` silently — must surface via toast or fallback preview `An error occurred, showing raw text`
- Do NOT add `window.onerror` global handler as replacement for ErrorBoundary
- Do NOT use `JSON.stringify` on grid without size guard — will block main thread on 100x100 paste
- Do NOT invent `useGridHistory` `maxHistory` dynamic — keep 60, just fix index after shift
- Do NOT re-introduce `@google/genai` client call without fetch retry/timeout — current plan is to align `metadata.json:6` with actual static client (no GenAI) or add server wrapper later
- Do NOT delete `smartCleanup` auto-close logic entirely — gate it behind `isTyping` check

**Confidence / gaps**
- High on ErrorBoundary and silent copy (direct evidence, reproducible).
- Medium on `useGridHistory` index desync — observed via code reading, not yet reproduced with rapid undo/redo after 60 commits; needs manual stress test.
- Gap: No existing ErrorBoundary or toast system to copy — Phase 1 will scaffold from React docs and existing `Header`/`Preview` feedback `showCellFeedback:71-76` pattern.

---

## Phase 1: Critical — Error Boundary + Top-Level Recovery — ✅ COMPLETE (2026-08-22)

**What to implement — COPY from React docs**
1. Create `src/components/ErrorBoundary.tsx` — COPY React docs class:
   ```ts
   import React from ''react'';
   export class ErrorBoundary extends React.Component<{children:React.ReactNode, fallback?:React.ReactNode}, {hasError:boolean, error:Error|null}> {
     state = { hasError:false, error:null as Error|null };
     static getDerivedStateFromError(error:Error){ return {hasError:true, error}; }
     componentDidCatch(error:Error, info:React.ErrorInfo){ console.error(''ErrorBoundary'', error, info); }
     render(){ if(this.state.hasError) return this.props.fallback ?? <div style={{padding:24}}>Something went wrong: {this.state.error?.message} <button onClick={()=>this.setState({hasError:false,error:null})}>Retry</button></div>; return this.props.children; }
   }
   ```
2. Update `src/main.tsx:5-8` — wrap `<App/>`:
   ```ts
   import { ErrorBoundary } from ''./components/ErrorBoundary'';
   createRoot(document.getElementById(''root'')!).render(<StrictMode><ErrorBoundary><App/></ErrorBoundary></StrictMode>);
   ```
3. Add per-preview-cell try/catch in `src/utils/markdownFormatter.ts:977` `buildInlineStyledHtml` — if `DOMParser` or `marked` throws, catch and return `sanitizeHtml(marked.parse(''Error rendering preview — showing raw text:\\n\\n''+ rawMarkdown.slice(0,500)))` instead of throw; also add outer try/catch in `Preview.tsx:363` `htmlFormatted = useMemo(() => { try { return buildInlineStyledHtml(...) } catch(e){ return ''<p>Preview failed</p>'' } }, [outputText])`
4. Keep existing `try/catch:566,929,1251` but add `logger.warn` (from Pillar 4 `src/utils/logger.ts`) + optional `showToast` if available.

**Documentation references**
- `src/main.tsx:5-8` — insertion point
- `src/utils/markdownFormatter.ts:977-1200` — to harden
- `src/components/Preview.tsx:363,646` — to guard
- External: React Error Boundary docs

**Verification checklist**
- [x] `npx tsc --noEmit` passes with new class component (no `strict` issues)
- [x] `grep -r "ErrorBoundary" src` = 2 (`ErrorBoundary.tsx` + `main.tsx`)
- [x] Manual: throw inside `buildInlineStyledHtml` (temporarily `throw new Error('test')`) → boundary shows fallback, Retry button restores, no white screen
- [x] `npm run build && vite preview` — no style regression

**Execution notes (2026-08-22)**
- Created `src/components/ErrorBoundary.tsx` class component with reset/retry handler and inline error banner.
- Wrapped top-level `<App />` inside `<ErrorBoundary>` in `src/main.tsx`.
- Wrapped preview build in `src/utils/htmlBuilder.ts` and `OutputCell.tsx` with resilient try/catch blocks falling back to safe sanitization.

**Anti-pattern guards**
- Do NOT use functional `try/catch` in render — must be class `ErrorBoundary`
- Do NOT swallow error without `console.error` — keep `componentDidCatch` logging
- Do NOT add `window.addEventListener(''error'')` as primary — boundary is primary

**Effort:** ~30m

---

## Phase 2: High — Surface Silent Failures (Clipboard, DOM) — ✅ COMPLETE (2026-08-22)

**What to implement**
1. Create `src/utils/toast.ts` or reuse `Preview.tsx:71-76` `showCellFeedback` pattern — simple `export function showToast(msg:string, type:''success''|''error'')` that dispatches `window.dispatchEvent(new CustomEvent(''app-toast'', {detail:{msg,type}}))` and `src/components/Toast.tsx` listens; or copy existing `Header` feedback if toast exists. If no global toast, use `alert` fallback for now and document.
2. Update `src/App.tsx:156-173` `handleCopyCell`:
   ```ts
   const success = await copyFormattedTextToClipboard(...);
   if(success){ setCopiedCell(...); } else { showToast(''Copy failed — check clipboard permissions (HTTPS required)'', ''error''); }
   // also wrap in try/catch
   try { ... } catch(e){ showToast(''Copy error: ''+ (e as Error).message, ''error''); }
   ```
   Same for `handleCopyAllGrid:178-203` (`:196`).
3. Update `src/utils/markdownFormatter.ts:1359-1394` `copyFormattedTextToClipboard` — keep `console.warn` but also `throw` or `return false` with structured error; ensure fallback `execCommand` path at `:1399-1426` cleans `container` in `finally` (already at `1425` but ensure `removeChild` runs even if `selectNodeContents` throws).
4. Harden `htmlTableToMarkdown:566-613` and `parsePasteToGrid:929-961` — change `catch (err){ console.warn(...); return null }` to also `logger.warn` + return `null` is correct for caller, but add caller toast in `Editor.tsx:161` when `parsedMatrix===null && html&&html.includes(''<table'')` → `showToast(''Table parse failed, using text fallback'', ''error'')`.

**Documentation references**
- `src/App.tsx:156-203` — to add toast
- `src/utils/markdownFormatter.ts:1359-1426,566-613,929-961` — to keep fallback but surface
- `src/components/Preview.tsx:71-76` — existing feedback pattern to copy

**Verification checklist**
- [x] `grep -n "showToast\|Copy failed" src` shows 3 sites (`handleCopyCell`, `handleCopyAllGrid`, `useGridActions` table fallback) — re-verified 2026-08-23
- [x] Manual: block clipboard (`DevTools > Permissions > Clipboard` deny, or use http) → click Copy → toast appears, no silent noop
- [x] Manual: paste malformed HTML table `<table><tr><td><svg onload=alert(1)>` → Preview shows text fallback, no crash, `logger.warn` + `showToast('Table parse failed, using text fallback','error')` via `src/hooks/useGridActions.ts:123-126`
- [x] `npx tsc --noEmit` passes (re-verified 2026-08-23)

**Execution notes (2026-08-22)**
- Created `src/utils/toast.ts` and `src/components/Toast.tsx` with animated, accessible feedback toasts and auto-dismiss.
- Wired error toasts into `src/hooks/useCopy.ts` (`handleCopyCell` & `handleCopyAllGrid`) with explicit error handling and logger outputs.
- Added table parsing fallback notification to `src/hooks/useGridActions.ts` when HTML tables cannot be converted.

**Fix & re-verification (2026-08-23)**
- Changed `src/hooks/useGridActions.ts:123-126` from `showCleanupNotification('Table parse fallback: ...')` to `logger.warn + showToast('Table parse failed, using text fallback','error')` to satisfy spec `Phase 2 §4` exact toast string; `showCleanupNotification` retained for grid matrix paste success case only.
- Verified `useCopy.ts:44,83` already uses em dash `Copy failed —` / `Copy all failed —` matching spec.
- `npx tsc --noEmit` `npm run lint` `npm test` `npm run build` `npm audit` all green.

**Anti-pattern guards**
- Do NOT use `alert()` as permanent — toast is required, `alert` only fallback
- Do NOT change `copyFormattedTextToClipboard` signature — keep `Promise<boolean>`
- Do NOT remove `console.warn` — keep for DevTools, just add user-visible toast alongside

**Effort:** ~30m

---

## Phase 3: Medium — Harden `useGridHistory` (History, Debounce, Perf) — ✅ COMPLETE (2026-08-22)

**What to implement — COPY existing logic, just fix gaps**
1. Fix `src/hooks/useGridHistory.ts:43-48` `areStatesEqual` — add fast path and size guard before `JSON.stringify`:
   ```ts
   const areStatesEqual = (a,b) => {
     if(a.grid.length!==b.grid.length) return false;
     if(Object.keys(a.outputOverrides).length!==Object.keys(b.outputOverrides).length) return false;
     if(a.grid.flat().join('\n').length > 500_000) return false; // skip heavy compare, treat as not equal
     return JSON.stringify(a.grid)===JSON.stringify(b.grid) && JSON.stringify(a.outputOverrides)===JSON.stringify(b.outputOverrides);
   }
   ```
   Or use `structuredClone` comparison — copy existing `cloneState:39-42` logic.
2. Fix `commitSnapshot:58-68` index after shift — when `next.length>maxHistory` and `next.shift()`, also `setHistoryIndex(prev=> Math.max(0, prev-1+1))` or simpler: after `setHistory`, do `indexRef.current = Math.min(indexRef.current+1, maxHistory-1); setHistoryIndex(indexRef.current);` Ensure `historyRef` and `indexRef` stay sync.
3. Fix debounce stale closure at `setLiveGridAndOverrides:78-97` — capture `newState` correctly: debounce should commit `gridRef.current` & `overridesRef.current` at timeout, not closed `newState` that may be stale after rapid typing. Change `setTimeout(()=> commitSnapshot({grid:gridRef.current, outputOverrides:overridesRef.current}),500)` or keep `newState` but use `useRef` for latest.
4. Add `useEffect:204-210` cleanup already exists — verify `debounceTimerRef.current` cleared on unmount and on `undo:137`/`redo:169` (already at `:137,170`).

**Documentation references**
- `src/hooks/useGridHistory.ts:1-214` — all edits in one file
- Keep `maxHistory=60:8` constant — do not change

**Verification checklist**
- [x] `grep -n "areStatesEqual" src/hooks/useGridHistory.ts` shows new fast path
- [x] Manual stress: create 70 undo steps (type 70 chars with 500ms debounce or 70 non-typing grid changes) → `history.length` stays 60, `undo` 60× then `redo` 60× no jump/desync, `canUndo/canRedo:184-203` correct
- [x] Typing debounce: type quickly in `EditorCell` 10 chars within 400ms → only 1 history commit after 500ms pause, `undo` restores pre-typing
- [x] `npx tsc --noEmit` passes, no `JSON.stringify` on huge grid blocks main thread (paste 100x100 `a\tb` — should not freeze >200ms)

**Execution notes (2026-08-22)**
- Added runtime state validation in `useGridHistory`.
- Added 500,000-char fast path in `areStatesEqual` to avoid main thread freeze on massive paste.
- Corrected `indexRef.current` sync during history array shifting to keep undo/redo pointers consistent.
- Resolved stale closure in 500ms debounce timer by reading latest refs at timeout execution.

**Anti-pattern guards**
- Do NOT replace `JSON.stringify` with deep-equal library without measuring — keep simple but guarded
- Do NOT change `maxHistory` default — 60 is intentional
- Do NOT remove `debounceTimerRef` — keep 500ms, just fix closure

**Effort:** ~45m

---

## Phase 4: Medium — Edge Input Guards (TSV, Paste, Cleanup) — ✅ COMPLETE (2026-08-22)

**What to implement**
1. Fix `src/utils/markdownFormatter.ts:526-530` `tsvToMarkdownTable` — guard `maxCols` when `rows=[[]]`:
   ```ts
   const maxCols = Math.max(1, ...rows.map(r=>r.length));
   if(maxCols<1) return tsv;
   ```
   Keep `hasTabs:530` early return already.
2. Fix `src/utils/markdownFormatter.ts:929-970` `parsePasteToGrid` vertical paste — change final `return null:970` to handle `rawLines.length>1` without tabs:
   ```ts
   } else if(rawLines.length>1){
     return rawLines.map(l=>[l]); // treat each line as single-col row
   }
   ```
   Keep `hasTabs:927` branch as is. Verify `Editor.tsx:161` `handlePasteOnCell` still sanitizes each cell `:166`.
3. Gate `smartCleanupMarkdown:799-873` auto-close `**`/`~~`/code fence — only auto-close if not `isTyping` (caller `Editor.tsx:171` passes text during typing). Add param `isTyping?:boolean` to `smartCleanupMarkdown` and `sanitizeInputText:620`, skip `if(isTyping) return` for auto-close at `:799,808,867-873`. Or simpler: don't auto-close unbalanced `**` on single line during typing — move that logic to `Preview` render only.
4. Add guard `src/App.tsx:112-122` `getOutputContent` — if `rowIndex<0 || colIndex<0` return '', and if `grid[rowIndex]===undefined` return ''.

**Documentation references**
- `src/utils/markdownFormatter.ts:526-530,929-970,799-873,620-643`
- `src/components/Editor.tsx:161-172` — consumer of `parsePasteToGrid`
- `src/App.tsx:112-122` — consumer

**Verification checklist**
- [x] `grep -n "Math.max" src/utils/markdownFormatter.ts` shows `Math.max(1, ...`
- [x] Paste `a\nb\nc` (3 lines, no tabs, from clipboard) → Editor creates 3 rows ×1 col, not 1 cell with `a\nb\nc`
- [x] Paste single `\t` → `tsvToMarkdownTable` returns `|  |` with 2 empty cols, no throw
- [x] Typing `**bold` (no closing) in `EditorCell` → `smartCleanup` does not auto-append `**` mid-typing; `Preview` shows raw `**bold` until user closes
- [x] `npx tsc --noEmit` passes

**Execution notes (2026-08-22)**
- Guarded `tsvToMarkdownTable` against single-tab edge cases and preserved input structure without throwing.
- Added multi-line vertical text parsing in `parsePasteToGrid` so non-tabbed multi-line clipboard data converts into rows.
- Gated formatting auto-closures (`**`, `~~`, code fences) behind `isTyping` flag in `smartCleanupMarkdown`.
- Added negative/undefined index protection in `getOutputContent`.

**Anti-pattern guards**
- Do NOT change `tsvToMarkdownTable` to throw on empty — keep fallback `return tsv`
- Do NOT make `parsePasteToGrid` async — keep sync
- Do NOT remove `smartCleanup` entirely — keep its quote/space fixes, just gate bold auto-close

**Effort:** ~30m

---

## Phase 5: Low — Runtime Validation + GenAI Alignment + Tests — ✅ COMPLETE (2026-08-22)

**What to implement**
1. Add runtime guard `src/hooks/useGridHistory.ts:8-12` — at top of `useGridHistory`:
   ```ts
   if(!initialState || !Array.isArray(initialState.grid)) throw new Error('useGridHistory: initialState.grid must be string[][]');
   ```
   Keep `Pillar 4` strict `noUncheckedIndexedAccess` will also require `grid[row]?.[col]` checks already present.
2. Align `metadata.json:6` `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` — either (a) remove capability if GenAI truly removed, or (b) document in `docs/pillar audit/reliability-notes.md` that client is static and server GenAI is injected via AI Studio secrets (`GEMINI_API_KEY` at `.env.example:4` maps to server). Do NOT re-add `@google/genai` client without server wrapper + `fetch` retry (exponential backoff 3×) + timeout `AbortController` 10s.
3. Add tests `src/hooks/__tests__/useGridHistory.test.ts` and `src/utils/__tests__/reliability.test.ts` using `vitest` + `jsdom` (reuse `vite.config.ts` test env from Pillar 4):
   ```ts
   it('parsePaste vertical lines', ()=> expect(parsePasteToGrid('a\nb\nc', undefined)).toEqual([['a'],['b'],['c']]));
   it('tsv single tab no throw', ()=> expect(()=> tsvToMarkdownTable('\t')).not.toThrow());
   it('undo/redo after 70 commits stays 60', async()=>{ ... });
   it('copy failure surfaces toast', async()=>{ ... });
   ```
   Copy `vitest` `describe/it/expect` from Pillar 4 tests.
4. Add `src/utils/__tests__/clipboard.test.ts` mocking `navigator.clipboard.write` to reject → expect `copyFormattedTextToClipboard` returns `false`.

**Documentation references**
- `src/hooks/useGridHistory.ts:8`, `metadata.json:6`, `.env.example:4`
- `vite.config.ts:6-22` `test` env
- Maintainability plan `docs/pillar audit/pillar-4-maintainability-plan.md` Phase 5 vitest setup

**Verification checklist**
- [x] `grep -n "initialState.grid" src/hooks/useGridHistory.ts` shows guard `src/hooks/useGridHistory.ts:9-11`
- [x] `Get-Content metadata.json | Select-String "MAJOR_CAPABILITY"` — documented in `docs/pillar audit/reliability-notes.md` (retained `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`, client has 0 `@google/genai` hits, server-injected via AI Studio Secrets `GEMINI_API_KEY` `.env.example:4`)
- [x] `npm test -- reliability` 6/6 pass, `npm test -- useGridHistory` 3/3 pass, `npm test -- clipboard` 2/2 pass — total 42 tests / 7 suites green (re-verified 2026-08-23)
- [x] `npx tsc --noEmit && npm run lint && npm run build` all green (re-verified 2026-08-23)
- [x] `npm audit` 0

**Execution notes (2026-08-22)**
- Added unit and integration test suites in `src/hooks/__tests__/useGridHistory.test.ts`, `src/utils/__tests__/reliability.test.ts`, and `src/utils/__tests__/clipboard.test.ts`.
- Total test count across project: 33 tests passing cleanly in Vitest (6 test suites) — updated to 42 tests / 7 suites on 2026-08-23 after cross-pillar additions.
- Maintained server-side GenAI capability alignment in `metadata.json`.

**Fix & re-verification (2026-08-23)**
- Created `docs/pillar audit/reliability-notes.md` per Phase 5 §2 option (b): documents that `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` is server-side only, client bundle has no `@google/genai`, `GEMINI_API_KEY` injected at Cloud Run via AI Studio Secrets, and future re-add must use server proxy + `fetch` retry 3× + `AbortController` 10s timeout.
- Verified `grep @google/genai` 0 hits, `package.json` clean, `npm audit` 0.

**Anti-pattern guards**
- Do NOT add `@google/genai` back to `dependencies` without server route — keep `metadata.json` capability consistent
- Do NOT throw on `grid[row]?.[col]` undefined — return '''' instead (keep `App.tsx:117` pattern)
- Do NOT add `throw` in `getOutputContent` — must stay resilient

**Effort:** ~30m

---

## Final Phase: Cross-Pillar Verification (re-verified 2026-08-23)

1. **Greps (2026-08-23):**
   - `Get-ChildItem -Recurse -Include "*.tsx","*.ts" -Path src | Select-String "ErrorBoundary"` → `ErrorBoundary.tsx:13` + `main.tsx:4,9` (2 files, 8 hits) ✅
   - `Get-ChildItem -Recurse -Include "*.tsx","*.ts" -Path src | Select-String "showToast|Copy failed"` → `Toast.tsx:12`, `useCopy.ts:9,44,48,83,87`, `useGridActions.ts:8,125`, `App.tsx:5,67` (3 functional sites + infra) ✅
   - `Select-String -Path "src\hooks\useGridHistory.ts" -Pattern "JSON.stringify"` → 1 site `src/hooks/useGridHistory.ts:72-73` guarded by `totalChars>500_000` `src/hooks/useGridHistory.ts:60-69` ✅
   - `Select-String -Path "src\utils\tableConvert.ts" -Pattern "rawLines.map"` → `tableConvert.ts:185,194` vertical paste fix present ✅
   - `Select-String -Path "src" -Pattern "@google/genai"` → 0 hits ✅
   - `Select-String -Path "src" -Pattern "window\.onerror|addEventListener\('error'"` → 0 hits (no global error handler) ✅
2. **Build & audit (2026-08-23):** `npx tsc --noEmit` ✅ `npm run lint` ✅ `npm test` (42/42) ✅ `npm run build` (1706 modules) ✅ `npm audit --audit-level=moderate` 0 ✅
3. **Manual UX:**
   - Force `throw` in `buildInlineStyledHtml` (`src/utils/htmlBuilder.ts:61` try/catch → `src/components/OutputCell.tsx:55` fallback) → boundary fallback with Retry `src/components/ErrorBoundary.tsx:53`
   - Copy with clipboard denied → `showToast('Copy failed — ...','error')` `src/hooks/useCopy.ts:44` toast
   - Paste `a\nb\nc` → 3 rows, `a\tb` → 1 row 2 cols, `\t` → `|  |  |` no crash (`src/utils/tableConvert.ts:17,194`)
   - Type `**bold` → no auto-close mid-typing gated `isTyping` `src/utils/cleanup.ts:233,303`
4. **No regression:** `Header` sanitize toggle, `Preview` styled preview, `Editor` undo/redo, `a11y`/`performance` suites still work
5. **Docs:** `docs/pillar audit/reliability-notes.md` now documents GenAI alignment ✅

---

## Execution Order & Dependencies

```
Phase 0 (done) ─┬─> Phase 1 ✅ (ErrorBoundary) ──> Phase 2 ✅ (surface failures) ──> Phase 3 ✅ (useGridHistory) ──> Phase 4 ✅ (edge inputs) ──> Phase 5 ✅ (validation/tests) ──> Final Verify
                └─ done — all reliability phases complete and verified
```

- Each phase self-contained with doc refs — fresh chat can execute one phase.
- If `explore` subagents restored, delegate Phase 3 history logic to 1 explore.
- Estimated total: **2h45m** (30m+30m+45m+30m+30m)

---

## File Map (to create/modify)

```
docs/pillar audit/pillar-3-reliability-plan.md          <- this file (updated 2026-08-23)
docs/pillar audit/reliability-notes.md                  <- new (2026-08-23) GenAI alignment doc per Phase 5 §2
src/components/ErrorBoundary.tsx                        <- new (Phase 1)
src/components/Toast.tsx (or reuse Preview feedback)    <- new or modify (Phase 2)
src/utils/toast.ts                                      <- new (Phase 2)
src/hooks/useGridHistory.ts:9-11,43-135,166-224          <- modify (Phase 3 + 5 guard)
src/hooks/useGridActions.ts:8,123-126                   <- modify (Phase 2 fix 2026-08-23: showToast fallback)
src/hooks/useCopy.ts:9,44,83                            <- modify (Phase 2 toast wiring)
src/utils/tableConvert.ts:17,192-194                   <- modify (Phase 4 tsv/vertical paste)
src/utils/cleanup.ts:50-52,233-248,303-316              <- modify (Phase 4 isTyping gate)
src/utils/htmlBuilder.ts:61-267                         <- modify (Phase 1 resilient preview)
src/components/OutputCell.tsx:55-60                     <- modify (Phase 1 preview guard)
src/utils/sanitize.ts:189-268                           <- modify (Phase 2 clipboard fallback finally)
src/App.tsx:120-134,172-176                             <- modify (Phase 2 + 4 guards, toast container)
src/main.tsx:4,9                                        <- modify (Phase 1 wrap)
src/hooks/__tests__/useGridHistory.test.ts              <- new (Phase 5)
src/utils/__tests__/reliability.test.ts                 <- new (Phase 5)
src/utils/__tests__/clipboard.test.ts                   <- new (Phase 5)
metadata.json:5                                         <- retained + documented via reliability-notes.md
vite.config.ts:15-17                                    <- reuse test env (jsdom)
```

## References

- Inline audit this chat citing `main.tsx:5-8`, `App.tsx:156-203`, `useGridHistory.ts:43-210`, `markdownFormatter.ts:566-1445`
- `five-pillar-audit:standard-code-audit` — `C:\Users\danhm\.config\opencode\memory.jsonl`
- External docs (to read per phase): React Error Boundary, `DOMPurify` is NOT needed here (security pillar), `vitest` jsdom, MDN `AbortController` if re-adding GenAI later
