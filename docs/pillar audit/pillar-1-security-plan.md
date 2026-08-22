# Pillar 1 — Security Fix Plan

**Project:** Text-Markdown-Formatter (`C:\AI\Project\Text-Markdown-Formatter`)
**Pillar:** 1/5 — Security (`five-pillar-audit:standard-code-audit` in `C:\Users\danhm\.config\opencode\memory.jsonl`)
**Scope:** XSS via `marked` → `dangerouslySetInnerHTML`, incomplete sanitizer, clipboard DOM, CSP
**Status:** Phase 1 complete (2026-08-22) — Phases 2-5 pending
**Date:** 2026-08-22
**Audit source:** Inline audit `src/components/Preview.tsx:646`, `src/utils/markdownFormatter.ts:1033-1045,977-1121,1217-1445`, `src/App.tsx:154-197`, `index.html:1-15`, `package.json:1-23`, `.env.example:1-9`
**Severity:** Critical (stored XSS in preview), High (bypassable sanitizer), Medium (clipboard fallback), Low (no CSP)

---

## Phase 0: Documentation Discovery (Done)

**Sources consulted**
- `src/components/Preview.tsx:1-694` — `Preview.tsx:363` `htmlFormatted = buildInlineStyledHtml(outputText, options, false)` → `Preview.tsx:646` `dangerouslySetInnerHTML={{ __html: htmlFormatted }}`
- `src/utils/markdownFormatter.ts:1-1445` — `marked` import `:1`, `marked.setOptions({gfm:true,breaks:true}):1033`, `marked.parse():1039`, `DOMParser:987`, `container.innerHTML:1200/1344`, `tempDiv.innerHTML` in `htmlTableToMarkdown:576-581` + `parsePasteToGrid:938-944`, `copyFormattedTextToClipboard:1357-1445` with `navigator.clipboard.write` + `ClipboardItem` + fallback `execCommand` div `:1403`
- `src/utils/markdownFormatter.ts:1217-1445` `sanitizeOutputHtml` + `SanitizeOptions:1203-1211` — current stripping logic `:1190-1300`
- `src/App.tsx:154-197` `handleCopyCell`/`handleCopyAllGrid` → `copyFormattedTextToClipboard(wordExportHtml, text, { sanitize: options.sanitizeOutput })` — sanitize is toggleable via `Header.tsx:49-52` `sanitizeOutput`
- `index.html:1-15` — no `Content-Security-Policy` meta, no `Trusted-Types`
- `package.json:1-23` — `dependencies` clean after maintainability fixes: `marked@18.0.10`, `react@19.0.1`, `vite@6.2.3`, `npm audit` 0; no `dompurify` yet
- `.env.example:1-9`, `vite.config.ts:1-22` — `GEMINI_API_KEY` placeholder, no `import.meta.env` leakage in `src/` (grep 0), `.gitignore:7` `.env*` correctly excludes secrets
- `src/utils/syntaxValidator.ts:1-80` — syntax warnings (not a security boundary)

**Allowed APIs / patterns to COPY (not invent)**
- **DOMPurify 3.x** — `import DOMPurify from 'dompurify'` + `DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style','script','iframe','object','embed','form'], FORBID_ATTR: ['style']? or ALLOW with hook })` — copy from https://github.com/cure53/DOMPurify#usage and npm `dompurify` README. Hook to strip `on*` and `javascript:`: `DOMPurify.addHook('uponSanitizeAttribute', (node, data) => { if (data.attrName.startsWith('on') || /^javascript:/i.test(data.attrValue)) data.keepAttr = false; })` — documented hook example.
- **marked 18.x** — `marked.parse(md, { gfm:true, breaks:true })` already used at `markdownFormatter.ts:1039`; do **not** use deprecated `marked.setOptions` globally — switch to per-call options `marked.parse(md, options)` per marked docs.
- **DOMParser** — existing `new DOMParser().parseFromString('<div>'+html+'</div>', 'text/html')` pattern at `markdownFormatter.ts:987,1175` — keep, but always feed DOMPurify-cleaned HTML.
- **Clipboard API** — `navigator.clipboard.write([new ClipboardItem({ 'text/html': blob, 'text/plain': blob })])` at `markdownFormatter.ts:1385-1390` — copy existing pattern, keep `try/catch` fallback.
- **CSP meta** — `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'">` — copy MDN `Content-Security-Policy` meta example.
- **Vite env** — no new `import.meta.env` needed; keep `vite.config.ts:17,19` `process.env.DISABLE_HMR` guard intact.

**Anti-patterns to avoid**
- Do NOT use `marked` `sanitize:true` option — removed in marked 0.6, does not exist.
- Do NOT rely on regex-only sanitization (`markdownFormatter.ts:1250-1267` fallback) — keep as fallback only when DOMPurify fails, not primary.
- Do NOT add `DOMPurify.sanitize` with `ALLOWED_TAGS: ['*']` — too permissive.
- Do NOT implement custom `isSafeUrl` with incomplete allowlist — use `DOMPurify` hook + explicit `href/src` scheme check `^(https?|mailto|tel|#|/)`.
- Do NOT remove `buildInlineStyledHtml` styling logic (`:995-1121` heading/paragraph/list/table/blockquote/code styles) — wrap it, don''t replace.
- Do NOT change `vite.config.ts:14-21` HMR guard or `metadata.json:6` `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` — out of scope.

**Confidence / gaps**
- High confidence on XSS path (direct file evidence, reproducible with `javascript:` payload).
- Medium on clipboard fallback exploitability — requires `sanitize:false` toggle (`Header.tsx:49`), but still reachable.
- Gap: No existing `dompurify` usage to copy — Phase 1 will scaffold from external docs; no server CSP header to inspect (static Vite preview only).

---

## Phase 1: Critical — Sanitize Preview Path with DOMPurify (blocks stored XSS) — ✅ COMPLETE (2026-08-22)

**What to implement — COPY from DOMPurify docs, wrap existing logic**
1. Install: `npm i dompurify && npm i -D @types/dompurify` (cite `dompurify` npm page)
2. Create `src/utils/security/sanitize.ts` (new folder, keeps Phase 3 split compatible):
   ```ts
   import DOMPurify from 'dompurify';
   // Hook to strip event handlers and javascript: URLs — copy DOMPurify hook docs
   DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
     if (data.attrName.startsWith('on')) data.keepAttr = false;
     if (data.attrName === 'href' || data.attrName === 'src' || data.attrName === 'xlink:href') {
       if (/^\s*javascript:/i.test(data.attrValue) || /^\s*data:text\/html/i.test(data.attrValue)) data.keepAttr = false;
     }
   });
   export function sanitizeHtml(dirty: string): string {
     return DOMPurify.sanitize(dirty, {
       USE_PROFILES: { html: true },
       FORBID_TAGS: ['script','style','iframe','object','embed','form','meta','link'],
       FORBID_ATTR: ['style'], // style is re-added safely by buildInlineStyledHtml; remove to prevent expression()
       KEEP_CONTENT: true,
     });
   }
   ```
   Copy `USE_PROFILES` + `FORBID_TAGS` from DOMPurify README.
3. Update `src/utils/markdownFormatter.ts:1033-1039` — replace `marked.setOptions` + `rawHtml = marked.parse(...)` with:
   ```ts
   import { sanitizeHtml } from './security/sanitize';
   const dirty = marked.parse(processedMarkdown, { gfm:true, breaks:true }) as string;
   const rawHtml = sanitizeHtml(dirty);
   ```
   Keep `preprocessMarkdownWithTsv:1037` call before.
4. Update `src/components/Preview.tsx:363` — ensure `htmlFormatted` is already sanitized via `buildInlineStyledHtml` change above; add defensive second sanitize before `dangerouslySetInnerHTML:646`:
   ```ts
   import { sanitizeHtml } from '../utils/security/sanitize';
   const htmlFormatted = sanitizeHtml(buildInlineStyledHtml(outputText, options, false));
   // or move sanitize inside buildInlineStyledHtml so Preview.tsx needs no change — either is acceptable, choose one
   ```
   Document choice in code comment — keep single sanitization point (prefer inside `htmlBuilder`).
5. Keep `sanitizeOutputHtml:1217` for copy path, but make it delegate to `sanitizeHtml` for event/js stripping (Phase 2 hardens it).

**Documentation references**
- `src/components/Preview.tsx:363,646` — injection sink to fix
- `src/utils/markdownFormatter.ts:1,1033-1045,977-990` — source to wrap
- External: `dompurify` README `addHook('uponSanitizeAttribute', ...)` example, `marked` 18.x `marked.parse(md, opts)` docs

**Verification checklist**
- [x] `npm ls dompurify` shows installed (3.4.14), `@types/dompurify` in `devDependencies`
- [x] `npx tsc --noEmit` passes after import
- [x] `grep -r "DOMPurify" src` = 1 file (`security/sanitize.ts`; integration point is `htmlBuilder.ts`, which imports `sanitizeHtml`)
- [x] Manual bypass tests in Preview (live, Playwright):
     - `[x](javascript:alert(1))` → anchor kept, href stripped entirely — no navigation vector
     - `<img src=x onerror=alert(1)>` → `onerror` stripped
     - `<svg onload=alert(1)>` → `onload` stripped
     - `<script>alert(1)</script>` → removed, not executed, surrounding content preserved
- [x] `npm run build` succeeds, `vite preview` — formatted preview still styled

**Execution notes (2026-08-22)** — executed in a separate session, concurrently with pillar-4 Phase 5; combined commit
- Single sanitization point chosen per plan preference: inside `buildInlineStyledHtml` (now `src/utils/htmlBuilder.ts` post-split), so `Preview.tsx` needed no change and `dangerouslySetInnerHTML` stays at exactly 1 site.
- `marked.setOptions({gfm,breaks})` global replaced with per-call `marked.parse(md, { gfm: true, breaks: true })` per marked docs (plan step 3).
- `FORBID_ATTR: ['style']` is lossless here: untrusted input styles are stripped, trusted styles are re-injected afterwards by `buildInlineStyledHtml` via the DOM API.
- Bundle impact: +30 kB min (dompurify) — verified as the sole cause of 356.80→386.86 kB via stash-rebuild comparison.

**Anti-pattern guards**
- Do NOT call `DOMPurify.sanitize` with `{ ALLOWED_TAGS: ['*'] }`
- Do NOT remove `buildInlineStyledHtml` style inlining (`:995-1121`) — sanitizer must run **before** style injection, not after
- Do NOT add `dangerouslySetInnerHTML` elsewhere — grep must stay at 1 site

**Effort:** ~45m, highest security value

---

## Phase 2: High — Harden `sanitizeOutputHtml` (copy-path bypass)

**What to implement — COPY hook pattern from Phase 1, extend attribute stripping**
1. Refactor `src/utils/markdownFormatter.ts:1217-1345` `sanitizeOutputHtml` to delegate event/js stripping to `sanitizeHtml`:
   - At `:1217` top, call `let html = sanitizeHtml(rawHtml);` before DOMParser logic, or reuse `sanitizeHtml` as base and keep existing `SanitizeOptions` for `stripBackgrounds`/`stripComments`/`cleanWordXml` behavior.
   - Keep `stripComments:1155`, `cleanWordXml:1161-1164`, `stripMetaTags:1166-1171` logic — these are Word/Outlook compat, not security, but retain.
2. Extend DOMParser attribute loop at `:1190-1203` (currently removes `data-*`, `aria-*`, `id`, `class`, `contenteditable`, `tabindex`, `spellcheck`):
   ```ts
   if (attr.name.startsWith('on') || /^javascript:/i.test(attr.value)) htmlEl.removeAttribute(attr.name);
   // also check href/src/xlink:href scheme
   if (['href','src','xlink:href','action','formaction','cite','data'].includes(attr.name)) {
     if (/^\s*(javascript|data:text\/html|vbscript):/i.test(attr.value)) htmlEl.removeAttribute(attr.name);
     // optional: allow only https?|mailto|tel|hash|relative — else drop
   }
   if (attr.name === 'style' && /expression\s*\(|javascript:/i.test(attr.value)) htmlEl.removeAttribute(attr.name);
   ```
   Copy exact attribute names from `sanitizeOutputHtml:1191-1203` to avoid regression.
3. Ensure `Header.tsx:49-52` toggle `sanitizeOutput` **cannot** bypass security sanitization — split `options.sanitizeOutput` into `compatSanitize` (backgrounds) vs `securitySanitize` (always true). In `src/App.tsx:166-167,196-197` change:
   ```ts
   const clean = sanitizeOutputHtml(wordExportHtml, { security: true, compat: options.sanitizeOutput !== false });
   ```
   Keep UI toggle for compat only.

**Documentation references**
- `src/utils/markdownFormatter.ts:1190-1300` — loop to extend
- `src/App.tsx:166-167,196-197`, `Header.tsx:49-52` — toggle to split
- `src/utils/security/sanitize.ts` — Phase 1 hook to reuse

**Verification checklist**
- [ ] `grep -n "attr.name.startsWith('on')" src/utils/markdownFormatter.ts` shows new line
- [ ] `grep -n "javascript:" src/utils` shows 2-3 sites (hook + loop)
- [ ] Manual copy-path test: toggle Sanitize Off in header → copy cell with `<a href="javascript:alert(1)">` → pasted HTML in Word/Clipboard still has `href` stripped (check `navigator.clipboard.read` or fallback div content)
- [ ] `npx tsc --noEmit && npm run build` pass, copy still works (no `ClipboardItem` regression)

**Anti-pattern guards**
- Do NOT make `sanitizeOutputHtml` return rawHtml when `options.sanitize===false` — must still run `sanitizeHtml` security pass
- Do NOT use `innerHTML` regex to strip `on*` — use DOM API `removeAttribute`
- Do NOT allow `data:image/svg+xml` with script — block `data:text/html` and `data:image/svg+xml` containing `<script>`

**Effort:** ~30m

---

## Phase 3: Medium — Harden `htmlTableToMarkdown` / `parsePasteToGrid` + Clipboard Fallback

**What to implement**
1. `src/utils/markdownFormatter.ts:576-581,938-944` — `htmlTableToMarkdown` and `parsePasteToGrid` use `tempDiv.innerHTML = text` with raw clipboard HTML. Wrap:
   ```ts
   import { sanitizeHtml } from './security/sanitize';
   tempDiv.innerHTML = sanitizeHtml(text); // strips on*/javascript: before parsing
   // then extract textContent as before :538-539, 944
   ```
   Keep `DOMParser` path at `markdownFormatter.ts:527,882` — sanitize before `parser.parseFromString`.
2. `src/utils/markdownFormatter.ts:1403-1425` clipboard fallback — `container.innerHTML = cleanHtml` already uses `sanitizeOutputHtml` result (`:1400`). Ensure `cleanHtml` is always security-sanitized (Phase 2). Add `container.setAttribute('style','')` cleanup after copy, and `document.body.removeChild(container)` in `finally` (already at `:1425` but ensure it runs on error path).
3. Add `rel="noopener noreferrer"` to all `<a>` after sanitization in `buildInlineStyledHtml:977-1121` — iterate `container.querySelectorAll('a')` and set `a.rel` + `a.target='_blank'` only if `href` starts with `http`.

**Documentation references**
- `src/utils/markdownFormatter.ts:524-581` `htmlTableToMarkdown`, `878-945` `parsePasteToGrid`
- `src/utils/markdownFormatter.ts:1400-1425` fallback
- `buildInlineStyledHtml:1071` table/link styling section to add `a` handling

**Verification checklist**
- [ ] `grep -n "tempDiv.innerHTML" src/utils/markdownFormatter.ts` shows `sanitizeHtml(` wrapper
- [ ] Paste HTML table with `<td><img onerror=alert(1)></td>` → grid parses text `""` or stripped, no alert
- [ ] Fallback copy test: force fallback by blocking `navigator.clipboard` (DevTools → override), copy cell → hidden div removed, no leftover `-9999px` div
- [ ] `grep -n 'rel=' src/utils/markdownFormatter.ts` shows new line

**Anti-pattern guards**
- Do NOT use `innerHTML` without sanitize — every `innerHTML =` must be preceded by `sanitizeHtml`
- Do NOT add `allowScript` or `SAFE_FOR_TEMPLATES` false

**Effort:** ~30m

---

## Phase 4: Low — CSP + Headers (defense in depth)

**What to implement — COPY MDN CSP meta example**
1. `index.html:5-11` — add inside `<head>` after `viewport`:
   ```html
   <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';">
   ```
   Note `style-src 'unsafe-inline'` is required for `buildInlineStyledHtml` inline styles (`style="font-family:..."` at `markdownFormatter.ts:1007-1107`). Document why `unsafe-inline` is needed; do NOT add `unsafe-eval`.
2. Optional Vite header: `vite.config.ts:14-21` `server.headers` for dev + `preview.headers` — add same CSP if using `vite preview` behind proxy (copy Vite `server.headers` docs).
3. `index.html:8-11` ensure `og:title` etc. not affected.
4. Document in `README.md` or `docs/pillar audit/README.md` why CSP is meta-only (static hosting, no server to set `Content-Security-Policy` header).

**Documentation references**
- `index.html:1-15` — insertion point
- `vite.config.ts:1-22` — optional headers
- MDN `Content-Security-Policy` `meta` tag docs

**Verification checklist**
- [ ] `Get-Content index.html | Select-String "Content-Security-Policy"` shows 1
- [ ] `vite build && vite preview` — no CSP violation in console (allow `data:` for images, `unsafe-inline` for styles)
- [ ] `Preview.tsx:646` still renders styled preview (CSP didn't block inline styles due to `style-src 'unsafe-inline'`)
- [ ] Security scanner (e.g., `https://csp-evaluator.withgoogle.com`) reports `object-src 'none'`, `script-src 'self'` only

**Anti-pattern guards**
- Do NOT add `script-src 'unsafe-inline'` — breaks XSS protection
- Do NOT add `default-src *` — must stay `'self'`
- Do NOT rely on CSP alone — DOMPurify remains primary (CSP is fallback)

**Effort:** ~15m

---

## Phase 5: Verification & Regression (no new features, only proof)

**What to implement**
1. Create `src/utils/security/__tests__/sanitize.test.ts` using `vitest` (copy `vitest` `describe/it/expect` pattern — `vite.config.ts` already has `vitest` via `typescript-eslint` docs reference):
   ```ts
   describe('sanitizeHtml', () => {
     it('strips on* handlers', () => expect(sanitizeHtml('<img src=x onerror=alert(1)>')).not.toMatch(/onerror/));
     it('strips javascript: href', () => expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toMatch(/javascript:/));
     it('keeps safe markdown', () => expect(sanitizeHtml('<p>hello <strong>world</strong></p>')).toMatch(/<strong>/));
     it('strips script', () => expect(sanitizeHtml('<script>alert(1)</script><p>hi</p>')).not.toMatch(/script/));
   });
   ```
2. Add `npm run test` if not present (Phase 1 of maintainability plan will have added `vitest` — reuse). Run `npm test -- src/utils/security`.
3. Manual checklist from Phase 1-4 verification — re-run all bypass payloads in both Preview and Copy paths.
4. Grep anti-patterns:
   - `Select-String -Path "src\**\*.ts" -Pattern "dangerouslySetInnerHTML"` → must be 1, and line 646 preceded by `sanitizeHtml`
   - `Select-String -Path "src\**\*.ts" -Pattern "innerHTML\s*=" | Where { $_ -notmatch "sanitizeHtml" }` → 0
   - `Select-String -Path "index.html" -Pattern "Content-Security-Policy"` → 1
5. `npx tsc --noEmit && npm run lint && npm run build && npm test` all green, `npm audit` still 0.

**Documentation references**
- `src/utils/security/__tests__/` — new tests
- `vite.config.ts:6-22` — `test: { environment: 'jsdom' }` per Vitest docs (added in maintainability Phase 5)
- Maintainability plan `docs/pillar audit/pillar-4-maintainability-plan.md` Phase 5 — reuse vitest setup

**Verification checklist**
- [ ] `npm test` 4/4 pass
- [ ] `grep -c "dangerouslySetInnerHTML" src` =1 and `grep -B2 "dangerouslySetInnerHTML" src/components/Preview.tsx` shows `sanitizeHtml`
- [ ] No `on*=` in `dist/assets/*.js` after build (check `Select-String -Path "dist\**\*.js" -Pattern "onerror"` → 0 or only in test)
- [ ] `preview` loads, copy-to-Word still works with tables/lists

**Anti-pattern guards**
- Do NOT mark `javascript:` test as todo — must pass
- Do NOT add `eslint-disable` for `dangerouslySetInnerHTML` — keep lint warning as signal
- Do NOT keep `test.js`/`test.cjs` — already slated for deletion in Pillar 4 Phase 5

**Effort:** ~30m

---

## Final Phase: Cross-Pillar Verification

1. **Re-run Phase 0 graps:**
   - `Select-String -Path "src\**\*.tsx" -Pattern "dangerouslySetInnerHTML"` → 1, sanitized
   - `Select-String -Path "src\**\*.ts" -Pattern "DOMPurify"` → 2+ hits
   - `Select-String -Path "index.html" -Pattern "Content-Security-Policy"` → 1
2. **Build & audit:** `npm run typecheck && npm run lint && npm test && npm run build && npm audit --audit-level=moderate`
3. **Manual UX:** paste TSV `a\tb`, HTML table `<table><tr><td>hi</td></tr></table>`, `(i)` list in Preview — all render, no alert
4. **No regression:** `Header.tsx:158-182` Sanitize Output toggle still works (compat only), `Preview.tsx:646` styled preview unchanged

---

## Execution Order & Dependencies

```
Phase 0 (done) -> Phase 1 ✅ (DOMPurify preview) -> Phase 2 (harden sanitizeOutputHtml) -> Phase 3 (table/clipboard) -> Phase 4 (CSP) -> Phase 5 (tests) -> Final Verify
          \-> done — preview path sanitized; Phases 2+ unblocked
           -> Phase 2 depends on Phase 1 hook to reuse
           -> Phase 4 can run in parallel with Phase 3
```

- Each phase is self-contained with doc refs — can run in fresh chat.
- If `explore` subagents restored (billing), delegate Phase 3 table parsing to 1 explore.
- Estimated total: **2.5h** (45m+30m+30m+15m+30m)

---

## File Map (to create/modify)

```
docs/pillar audit/pillar-1-security-plan.md         <- this file
src/utils/security/sanitize.ts                     <- new
src/utils/security/__tests__/sanitize.test.ts      <- new
src/utils/markdownFormatter.ts:1,1033,1190,576,938  <- modify (wrap)
src/components/Preview.tsx:363,646                 <- modify (sanitize)
src/App.tsx:166,196                                <- modify (split toggle)
index.html:5                                       <- modify (CSP)
package.json:14-15                                 <- modify (add dompurify)
```

## References

- Inline audit this chat citing `Preview.tsx:646`, `markdownFormatter.ts:1033-1445`, `sanitizeOutputHtml:1217`, `App.tsx:154-197`
- `five-pillar-audit:standard-code-audit` — `C:\Users\danhm\.config\opencode\memory.jsonl`
- External docs (to read per phase): DOMPurify `sanitize` + `addHook('uponSanitizeAttribute')`, marked 18.x `parse`, MDN CSP `meta`, Vite `server.headers`, Vitest `jsdom`
