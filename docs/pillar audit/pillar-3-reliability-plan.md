# Pillar 3 — Reliability Fix Plan

**Project:** Text-Markdown-Formatter (`C:\AI\Project\Text-Markdown-Formatter`)
**Pillar:** 3/5 — Reliability (`five-pillar-audit:standard-code-audit` in `C:\Users\danhm\.config\opencode\memory.jsonl`)
**Scope:** Error boundaries, silent failures, history/debounce, edge inputs, runtime validation
**Status:** Plan (not yet executed) — orchestrator-only synthesis, no edits
**Date:** 2026-08-22
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

## Phase 1: Critical — Error Boundary + Top-Level Recovery

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
- [ ] `npx tsc --noEmit` passes with new class component (no `strict` issues)
- [ ] `grep -r "ErrorBoundary" src` = 2 (`ErrorBoundary.tsx` + `main.tsx`)
- [ ] Manual: throw inside `buildInlineStyledHtml` (temporarily `throw new Error(''test'')`) → boundary shows fallback, Retry button restores, no white screen
- [ ] `npm run build && vite preview` — no style regression

**Anti-pattern guards**
- Do NOT use functional `try/catch` in render — must be class `ErrorBoundary`
- Do NOT swallow error without `console.error` — keep `componentDidCatch` logging
- Do NOT add `window.addEventListener(''error'')` as primary — boundary is primary

**Effort:** ~30m

---

## Phase 2: High — Surface Silent Failures (Clipboard, DOM)

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
- [ ] `grep -n "showToast\|Copy failed" src` shows 2 sites (`handleCopyCell`, `handleCopyAllGrid`)
- [ ] Manual: block clipboard (`DevTools > Permissions > Clipboard` deny, or use http) → click Copy → toast appears, no silent noop
- [ ] Manual: paste malformed HTML table `<table><tr><td><svg onload=alert(1)>` → Preview shows text fallback, no crash, console warn present but toast shown
- [ ] `npx tsc --noEmit` passes

**Anti-pattern guards**
- Do NOT use `alert()` as permanent — toast is required, `alert` only fallback
- Do NOT change `copyFormattedTextToClipboard` signature — keep `Promise<boolean>`
- Do NOT remove `console.warn` — keep for DevTools, just add user-visible toast alongside

**Effort:** ~30m

---

## Phase 3: Medium — Harden `useGridHistory` (History, Debounce, Perf)

**What to implement — COPY existing logic, just fix gaps**
1. Fix `src/hooks/useGridHistory.ts:43-48` `areStatesEqual` — add fast path and size guard before `JSON.stringify`:
   ```ts
   const areStatesEqual = (a,b) => {
     if(a.grid.length!==b.grid.length) return false;
     if(Object.keys(a.outputOverrides).length!==Object.keys(b.outputOverrides).length) return false;
     if(a.grid.flat().join(''\n'').length > 500_000) return false; // skip heavy compare, treat as not equal
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
- [ ] `grep -n "areStatesEqual" src/hooks/useGridHistory.ts` shows new fast path
- [ ] Manual stress: create 70 undo steps (type 70 chars with 500ms debounce or 70 non-typing grid changes) → `history.length` stays 60, `undo` 60× then `redo` 60× no jump/desync, `canUndo/canRedo:184-203` correct
- [ ] Typing debounce: type quickly in `EditorCell` 10 chars within 400ms → only 1 history commit after 500ms pause, `undo` restores pre-typing
- [ ] `npx tsc --noEmit` passes, no `JSON.stringify` on huge grid blocks main thread (paste 100x100 `a\tb` — should not freeze >200ms)

**Anti-pattern guards**
- Do NOT replace `JSON.stringify` with deep-equal library without measuring — keep simple but guarded
- Do NOT change `maxHistory` default — 60 is intentional
- Do NOT remove `debounceTimerRef` — keep 500ms, just fix closure

**Effort:** ~45m

---

## Phase 4: Medium — Edge Input Guards (TSV, Paste, Cleanup)

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
3. Gate `smartCleanupMarkdown:799-873` auto-close `**`/`~~`/code fence — only auto-close if not `isTyping` (caller `Editor.tsx:171` passes text during typing). Add param `isTyping?:boolean` to `smartCleanupMarkdown` and `sanitizeInputText:620`, skip `if(isTyping) return` for auto-close at `:799,808,867-873`. Or simpler: don''t auto-close unbalanced `**` on single line during typing — move that logic to `Preview` render only.
4. Add guard `src/App.tsx:112-122` `getOutputContent` — if `rowIndex<0 || colIndex<0` return '''', and if `grid[rowIndex]===undefined` return ''''.

**Documentation references**
- `src/utils/markdownFormatter.ts:526-530,929-970,799-873,620-643`
- `src/components/Editor.tsx:161-172` — consumer of `parsePasteToGrid`
- `src/App.tsx:112-122` — consumer

**Verification checklist**
- [ ] `grep -n "Math.max" src/utils/markdownFormatter.ts` shows `Math.max(1, ...`
- [ ] Paste `a\nb\nc` (3 lines, no tabs, from clipboard) → Editor creates 3 rows ×1 col, not 1 cell with `a\nb\nc`
- [ ] Paste single `\t` → `tsvToMarkdownTable` returns `|  |` with 2 empty cols, no throw
- [ ] Typing `**bold` (no closing) in `EditorCell` → `smartCleanup` does not auto-append `**` mid-typing; `Preview` shows raw `**bold` until user closes
- [ ] `npx tsc --noEmit` passes

**Anti-pattern guards**
- Do NOT change `tsvToMarkdownTable` to throw on empty — keep fallback `return tsv`
- Do NOT make `parsePasteToGrid` async — keep sync
- Do NOT remove `smartCleanup` entirely — keep its quote/space fixes, just gate bold auto-close

**Effort:** ~30m

---

## Phase 5: Low — Runtime Validation + GenAI Alignment + Tests

**What to implement**
1. Add runtime guard `src/hooks/useGridHistory.ts:8-12` — at top of `useGridHistory`:
   ```ts
   if(!initialState || !Array.isArray(initialState.grid)) throw new Error(''useGridHistory: initialState.grid must be string[][]'');
   ```
   Keep `Pillar 4` strict `noUncheckedIndexedAccess` will also require `grid[row]?.[col]` checks already present.
2. Align `metadata.json:6` `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` — either (a) remove capability if GenAI truly removed, or (b) document in `docs/pillar audit/reliability-notes.md` that client is static and server GenAI is injected via AI Studio secrets (`GEMINI_API_KEY` at `.env.example:4` maps to server). Do NOT re-add `@google/genai` client without server wrapper + `fetch` retry (exponential backoff 3×) + timeout `AbortController` 10s.
3. Add tests `src/hooks/__tests__/useGridHistory.test.ts` and `src/utils/__tests__/reliability.test.ts` using `vitest` + `jsdom` (reuse `vite.config.ts` test env from Pillar 4):
   ```ts
   it(''parsePaste vertical lines'', ()=> expect(parsePasteToGrid(''a\\nb\\nc'', undefined)).toEqual([[''a''],[''b''],[''c'']]));
   it(''tsv single tab no throw'', ()=> expect(()=> tsvToMarkdownTable(''\\t'')).not.toThrow());
   it(''undo/redo after 70 commits stays 60'', async()=>{ ... });
   it(''copy failure surfaces toast'', async()=>{ ... });
   ```
   Copy `vitest` `describe/it/expect` from Pillar 4 tests.
4. Add `src/utils/__tests__/clipboard.test.ts` mocking `navigator.clipboard.write` to reject → expect `copyFormattedTextToClipboard` returns `false`.

**Documentation references**
- `src/hooks/useGridHistory.ts:8`, `metadata.json:6`, `.env.example:4`
- `vite.config.ts:6-22` `test` env
- Maintainability plan `docs/pillar audit/pillar-4-maintainability-plan.md` Phase 5 vitest setup

**Verification checklist**
- [ ] `grep -n "initialState.grid" src/hooks/useGridHistory.ts` shows guard
- [ ] `Get-Content metadata.json | Select-String "MAJOR_CAPABILITY"` — either removed or documented
- [ ] `npm test -- reliability` 4/4 pass, `npm test -- useGridHistory` 2/2 pass
- [ ] `npx tsc --noEmit && npm run lint && npm run build` all green
- [ ] `npm audit` 0

**Anti-pattern guards**
- Do NOT add `@google/genai` back to `dependencies` without server route — keep `metadata.json` capability consistent
- Do NOT throw on `grid[row]?.[col]` undefined — return '''' instead (keep `App.tsx:117` pattern)
- Do NOT add `throw` in `getOutputContent` — must stay resilient

**Effort:** ~30m

---

## Final Phase: Cross-Pillar Verification

1. **Greps:**
   - `Select-String -Path "src\**\*.tsx" -Pattern "ErrorBoundary"` → 2 hits
   - `Select-String -Path "src\**\*.ts" -Pattern "showToast|Copy failed"` → 2+ hits
   - `Select-String -Path "src\hooks\useGridHistory.ts" -Pattern "JSON.stringify"` → 1, guarded
   - `Select-String -Path "src\utils\markdownFormatter.ts" -Pattern "rawLines.map"` → vertical paste fix present
2. **Build & audit:** `npx tsc --noEmit && npm run lint && npm test && npm run build && npm audit --audit-level=moderate`
3. **Manual UX:**
   - Force `throw` in `buildInlineStyledHtml` → boundary fallback with Retry
   - Copy with clipboard denied → toast
   - Paste `a\nb\nc` → 3 rows, `a\tb` → 1 row 2 cols, `\t` → no crash
   - Type `**bold` → no auto-close mid-typing
4. **No regression:** `Header` sanitize toggle, `Preview` styled preview, `Editor` undo/redo still work

---

## Execution Order & Dependencies

```
Phase 0 (done) -> Phase 1 (ErrorBoundary) -> Phase 2 (surface failures) -> Phase 3 (useGridHistory) -> Phase 4 (edge inputs) -> Phase 5 (validation/tests) -> Final Verify
          \-> Phase 1 must land before Phase 2 (boundary catches failures Phase 2 surfaces)
           -> Phase 3 can run in parallel with Phase 4 after Phase 1
```

- Each phase self-contained with doc refs — fresh chat can execute one phase.
- If `explore` subagents restored, delegate Phase 3 history logic to 1 explore.
- Estimated total: **2h45m** (30m+30m+45m+30m+30m)

---

## File Map (to create/modify)

```
docs/pillar audit/pillar-3-reliability-plan.md          <- this file
src/components/ErrorBoundary.tsx                        <- new
src/components/Toast.tsx (or reuse Preview feedback)    <- new or modify
src/utils/toast.ts                                      <- new
src/hooks/useGridHistory.ts:43-97,137-210               <- modify
src/utils/markdownFormatter.ts:566,799-873,929-970,1359  <- modify
src/App.tsx:156-203,112                                 <- modify (toast)
src/main.tsx:5-8                                        <- modify (wrap)
src/hooks/__tests__/useGridHistory.test.ts              <- new
src/utils/__tests__/reliability.test.ts                 <- new
metadata.json:6                                         <- review (remove or document)
vite.config.ts:6-22                                     <- reuse test env
```

## References

- Inline audit this chat citing `main.tsx:5-8`, `App.tsx:156-203`, `useGridHistory.ts:43-210`, `markdownFormatter.ts:566-1445`
- `five-pillar-audit:standard-code-audit` — `C:\Users\danhm\.config\opencode\memory.jsonl`
- External docs (to read per phase): React Error Boundary, `DOMPurify` is NOT needed here (security pillar), `vitest` jsdom, MDN `AbortController` if re-adding GenAI later
