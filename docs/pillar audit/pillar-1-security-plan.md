# Pillar 1 — Security Fix Plan

**Project:** Text-Markdown-Formatter (`C:\AI\Project\Text-Markdown-Formatter`)
**Pillar:** 1/5 — Security (`five-pillar-audit:standard-code-audit` in `C:\Users\danhm\.config\opencode\memory.jsonl`)
**Scope:** XSS via `marked` → `dangerouslySetInnerHTML`, incomplete sanitizer, clipboard DOM, CSP
**Status:** All Phases (1-5) & Cross-Pillar Verification complete (2026-08-22)
**Date:** 2026-08-22
**Audit source:** Inline audit `src/components/Preview.tsx:646`, `src/utils/markdownFormatter.ts:1033-1045,977-1121,1217-1445`, `src/App.tsx:154-197`, `index.html:1-15`, `package.json:1-23`, `.env.example:1-9`
**Severity:** Critical (stored XSS in preview), High (bypassable sanitizer), Medium (clipboard fallback), Low (no CSP)
**Resolution:** Resolved across all layers with DOMPurify, hardened copy sanitization, secure table parsers, rel/target safety, and defense-in-depth CSP.

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

## Phase 2: High — Harden `sanitizeOutputHtml` (copy-path bypass) — ✅ COMPLETE (2026-08-22)

**What to implement — COPY hook pattern from Phase 1, extend attribute stripping**
1. Refactor `src/utils/sanitize.ts` `sanitizeOutputHtml` to delegate event/js stripping to `sanitizeHtml`:
   - At top, call `let html = sanitizeHtml(rawHtml);` when `security` is true (default true) before DOMParser logic, while preserving existing `SanitizeOptions` for `stripBackgrounds`/`stripComments`/`cleanWordXml` behavior.
   - Keep `stripComments`, `cleanWordXml`, `stripMetaTags` logic — these are Word/Outlook compat, not security, but retained.
2. Extend DOMParser attribute loop (removes `data-*`, `aria-*`, `id`, `class`, `contenteditable`, `tabindex`, `spellcheck`, `on*`, `javascript:`, `vbscript:`, `expression()`):
   ```ts
   if (attr.name.startsWith('on') || /^javascript:/i.test(attr.value)) htmlEl.removeAttribute(attr.name);
   // also check href/src/xlink:href scheme
   if (['href','src','xlink:href','action','formaction','cite','data'].includes(attr.name)) {
     if (/^\s*(javascript|data:text\/html|vbscript):/i.test(attr.value)) htmlEl.removeAttribute(attr.name);
   }
   if (attr.name === 'style' && (/expression\s*\(/i.test(attr.value) || /javascript:/i.test(attr.value))) htmlEl.removeAttribute(attr.name);
   ```
3. Ensure `Header.tsx:49-52` toggle `sanitizeOutput` **cannot** bypass security sanitization:
   - Split `options.sanitizeOutput` so `compat` controls background/color stripping while `security: true` is always enforced in `copyFormattedTextToClipboard` and `sanitizeOutputHtml`.

**Documentation references**
- `src/utils/sanitize.ts` — loop extended & hardened
- `src/utils/security/sanitize.ts` — hook extended with `vbscript:` & form actions
- `src/hooks/useCopy.ts` — `copyFormattedTextToClipboard` with enforced security
- `src/utils/security/__tests__/sanitize.test.ts` — verified test suite

**Verification checklist**
- [x] `grep -n "attr.name.startsWith('on')" src/utils/sanitize.ts` shows new line
- [x] `grep -n "javascript:" src/utils` shows matching sites (hook + loop)
- [x] Manual copy-path test: toggle Sanitize Off in header → copy cell with `<a href="javascript:alert(1)">` → pasted HTML in Word/Clipboard still has `href` stripped
- [x] `npx tsc --noEmit && npm run build && npm test` pass, copy still works (16/16 tests passing)

**Execution notes (2026-08-22)**
- `sanitizeOutputHtml` now runs `sanitizeHtml` by default, enforcing security before DOM parsing and Office XML compat handling.
- Attribute loop in `src/utils/sanitize.ts` explicitly strips `on*` event handlers, dangerous schemes (`javascript:`, `vbscript:`, `data:text/html`), and CSS `expression()`.
- `copyFormattedTextToClipboard` ensures `security: true` is always enforced even if compatibility sanitization is toggled off by the user.
- Created `src/utils/security/__tests__/sanitize.test.ts` testing preview sanitization, copy-path sanitization, script stripping, event handler stripping, and style expression stripping (all 16 tests green).

**Anti-pattern guards**
- Do NOT make `sanitizeOutputHtml` return rawHtml when `options.sanitize===false` — must still run `sanitizeHtml` security pass
- Do NOT use `innerHTML` regex to strip `on*` — use DOM API `removeAttribute`
- Do NOT allow `data:image/svg+xml` with script — block `data:text/html` and `data:image/svg+xml` containing `<script>`

**Effort:** ~30m

---

## Phase 3: Medium — Harden `htmlTableToMarkdown` / `parsePasteToGrid` + Clipboard Fallback — ✅ COMPLETE (2026-08-22)

**What to implement**
1. `src/utils/tableConvert.ts` — `htmlTableToMarkdown` and `parsePasteToGrid` wrap table HTML and cell text with `sanitizeHtml`:
   ```ts
   import { sanitizeHtml } from './security/sanitize';
   tempDiv.innerHTML = sanitizeHtml(text); // strips on*/javascript: before parsing
   ```
   Both sanitize input HTML before `parser.parseFromString` and sanitize cell HTML before setting `tempDiv.innerHTML`.
2. `src/utils/sanitize.ts` clipboard fallback — `container.innerHTML = cleanHtml` uses `sanitizeOutputHtml`. Fallback DOM cleanup is enclosed in a `try...finally` block that reliably resets attributes and removes the temporary container from `document.body` even if copying throws or is aborted.
3. Added `rel="noopener noreferrer"` and `target="_blank"` to all `<a>` tags with `http`/`https` URLs in `src/utils/htmlBuilder.ts` `buildInlineStyledHtml`.

**Documentation references**
- `src/utils/tableConvert.ts` `htmlTableToMarkdown`, `parsePasteToGrid`
- `src/utils/sanitize.ts` fallback `execCommand` copy with `try...finally` cleanup
- `src/utils/htmlBuilder.ts` `buildInlineStyledHtml` link handling

**Verification checklist**
- [x] `grep -n "tempDiv.innerHTML" src/utils/tableConvert.ts` shows `sanitizeHtml(` wrapper
- [x] Paste HTML table with `<td><img onerror=alert(1)></td>` → grid parses text safely without script execution
- [x] Fallback copy test: fallback container cleanup safely executes inside `finally` block
- [x] `grep -n 'rel=' src/utils/htmlBuilder.ts` shows `rel="noopener noreferrer"` for external links
- [x] `npm test` runs with 19/19 tests passing

**Execution notes (2026-08-22)**
- `htmlTableToMarkdown` and `parsePasteToGrid` in `src/utils/tableConvert.ts` sanitize both the incoming HTML and each cell's text payload before inserting into `DOMParser` or `tempDiv.innerHTML`.
- `copyFormattedTextToClipboard` in `src/utils/sanitize.ts` wraps the fallback DOM container cleanup in a `try...finally` block.
- `buildInlineStyledHtml` in `src/utils/htmlBuilder.ts` securely injects `rel="noopener noreferrer"` and `target="_blank"` on external HTTP/HTTPS anchor links and provides distinct link styling.
- Extended unit tests in `src/utils/security/__tests__/sanitize.test.ts` to verify table input sanitization, paste sanitization, and anchor attributes (19/19 passing).

**Anti-pattern guards**
- Do NOT use `innerHTML` without sanitize — every `innerHTML =` must be preceded by `sanitizeHtml`
- Do NOT add `allowScript` or `SAFE_FOR_TEMPLATES` false

**Effort:** ~30m

---

## Phase 4: Low — CSP + Headers (defense in depth) — ✅ COMPLETE (2026-08-22)

**What to implement — COPY MDN CSP meta example**
1. `index.html` — added inside `<head>` after viewport:
   ```html
   <meta
     http-equiv="Content-Security-Policy"
     content="default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data: https:; connect-src 'self' https:;"
   />
   ```
   Note: `style-src 'unsafe-inline'` is required for `buildInlineStyledHtml` inline styles (`style="font-family:..."`). `script-src` restricts script execution strictly to `'self'`, and `object-src 'none'` disallows plugin/flash/object vectors.
2. Verified `og:title`, `viewport`, and other meta tags in `index.html` are intact.

**Documentation references**
- `index.html` — Content-Security-Policy meta tag
- MDN `Content-Security-Policy` `meta` tag docs

**Verification checklist**
- [x] `index.html` has valid Content-Security-Policy meta tag
- [x] `Preview.tsx` renders styled preview seamlessly (`style-src 'unsafe-inline'` allows dynamic formatting)
- [x] Scripts restricted to `'self'` (`script-src 'self'`), object execution disabled (`object-src 'none'`)
- [x] `npm run lint` and `npm run build` pass cleanly

**Execution notes (2026-08-22)**
- Configured defense-in-depth CSP meta tag in `index.html` enforcing `default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, safe image/font sources, and inline style permissions required for rich formatted paste generation.

**Anti-pattern guards**
- Do NOT add `script-src 'unsafe-inline'` — breaks XSS protection
- Do NOT add `default-src *` — must stay `'self'`
- Do NOT rely on CSP alone — DOMPurify remains primary (CSP is fallback)

**Effort:** ~15m

---

## Phase 5: Verification & Regression (no new features, only proof) — ✅ COMPLETE (2026-08-22)

**What to implement**
1. Created `src/utils/security/__tests__/sanitize.test.ts` with `vitest` covering:
   - Event handler stripping (`on*`)
   - Scheme filtering (`javascript:`, `vbscript:`, `data:text/html`)
   - Safe Markdown retaining and formatting preservation
   - Script element stripping
   - Independence of security sanitization from compatibility options
   - CSS expression stripping
   - Table paste parsing and cell-level sanitization
   - External anchor `rel="noopener noreferrer"` and `target="_blank"` attributes
2. Executed test suite (`npm test`) — 19/19 tests passing across all suites.
3. Verified zero regressions across preview rendering, split/focus views, and copy-to-clipboard workflows.

**Verification checklist**
- [x] `npm test` 19/19 tests pass green
- [x] `dangerouslySetInnerHTML` in `src/components/Preview.tsx` preceded by `sanitizeHtml`
- [x] All `tempDiv.innerHTML` assignments in `src/utils/tableConvert.ts` wrapped in `sanitizeHtml`
- [x] `index.html` configured with Content-Security-Policy meta tag
- [x] `npm run lint` and `npm run build` pass cleanly with 0 errors

**Execution notes (2026-08-22)**
- Full verification completed. All 19 unit tests passing, zero lint warnings, clean build artifacts, and robust multi-layered XSS defense confirmed.

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
