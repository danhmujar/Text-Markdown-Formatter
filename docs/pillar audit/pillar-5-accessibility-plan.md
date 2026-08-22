# Pillar 5 — Accessibility/UX Fix Plan

**Project:** Text-Markdown-Formatter (`C:\AI\Project\Text-Markdown-Formatter`)
**Pillar:** 5/5 — Accessibility/UX (`five-pillar-audit:standard-code-audit` in `C:\Users\danhm\.config\opencode\memory.jsonl`)
**Scope:** Accessible names, label association, focus trap, focus-visible, contrast, live regions, semantics, skip link
**Status:** Plan (not yet executed) — orchestrator-only synthesis, no edits
**Date:** 2026-08-22
**Audit source:** Inline audit `src/components/Header.tsx:82-263`, `Editor.tsx:369-493,310-323`, `EditorCell.tsx:142-368,310-323`, `Preview.tsx:288-646`, `src/App.tsx:67-106,212-282`, `index.html:14`
**WCAG:** 2.1 AA — 1.3.1 Info & Relationships, 2.4.3 Focus Order, 2.4.7 Focus Visible, 4.1.2 Name/Role/Value, 1.4.3 Contrast

---

## Phase 0: Documentation Discovery (Done)

**Sources consulted**
- `src/components/Header.tsx:1-289` — `header:57`, `h1:67`, buttons `82,103,124,159,229,248,263` no `type`/`aria-label`, `select:196` no label, `span Font::193` not label
- `src/components/Editor.tsx:1-568` — `button:314,329,350,366,407,422,437,452,480,493` no `type`/`aria-label`, `aria-expanded:369` + `role=dialog:392` present, `textarea` via `EditorCell`, `settingsPanelRef:47`, `Escape:56-58` + `mousedown:51-53`, `totalStats:68-86` spans no live region, `placeholder` not label
- `src/components/EditorCell.tsx:1-387` — `textarea:310-323` `id=cell-textarea-${r}-${c}` no `label`/`aria-labelledby`, visual label `span:132` not linked, buttons `142,181,195,225,274,368` title-only, icons `Trash2:205` etc no `aria-hidden`, `showWarningsDrawer:43` no `aria-controls`
- `src/components/Preview.tsx:1-694` — `textarea:627-642` same label gap, buttons `288,303,321,415,442,458,504,519,534,548,565,579,593` no names, `onKeyDown:634` Enter handling, `htmlFormatted:363` + `dangerouslySetInnerHTML:646`, bulk spans `255-274` no `aria-live`
- `src/App.tsx:67-106` shortcuts `Escape`/`Alt+F`/`Ctrl+Z/Y` global `keydown:105-106`, `main:226-282` `section#input-container-panel`/`#output-container-panel` no `aria-labelledby`, `grid:354` no landmark
- `index.html:1-15` — no skip link, no `lang` beyond `<html lang=en>` present, no `meta theme-color`
- `src/index.css:1-20` — Tailwind `focus`/`placeholder` utilities, no `focus-visible` override seen

**Allowed APIs / patterns to COPY (not invent)**
- **Accessible name** — `aria-label="Undo (Ctrl+Z)"` or `aria-labelledby="label-id"` per MDN `aria-label` + `aria-labelledby` — copy `EditorCell` label linkage: `<span id="cell-label-${r}-${c}">${label}</span>` + `<textarea aria-labelledby="cell-label-${r}-${c}">`
- **Button type** — `type="button"` per HTML spec — required on every `<button>` not in form (copy React docs `type="button"` example)
- **Dialog** — `role="dialog" aria-modal="true" aria-labelledby="settings-title"` already at `Editor.tsx:391-393`, add `focus-trap-react` (`npm i focus-trap-react`) — `focus-trap-react` README `FocusTrap active={show} onDeactivate={()=>setShow(false)}` or manual `focus-trap` without lib: `useEffect` move focus to `dialog.querySelector('button')` on open, trap `Tab`/`Shift+Tab` loop, return focus to trigger `editor-settings-btn:367` on close — copy `focus-trap-react` docs
- **Focus-visible** — Tailwind `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 outline-none` — copy Tailwind `focus-visible` docs, do NOT use `focus:ring` alone
- **Live region** — `<span aria-live="polite" aria-atomic="true">` or `role="status"` for dynamic char/word/warning badges — copy MDN `aria-live` `polite` example
- **Decorative icons** — `lucide-react` icons `aria-hidden="true" focusable="false"` — copy `lucide-react` a11y guide; add `size` not via `title`
- **Skip link** — `index.html:14` insert `<a href="#main-content" class="sr-only focus:not-sr-only ...">Skip to main content</a>` + `App.tsx:226` `main id="main-content"` — copy Tailwind `sr-only` pattern
- **Contrast** — Tailwind `text-slate-600` on `bg-white` is 7:1, `text-slate-500` on `bg-slate-950` is 4.6:1 — copy WCAG contrast checker targets, not invent hex

**Anti-patterns to avoid**
- Do NOT rely on `title` alone for accessible name — `title` is not exposed on `Tab` focus in many SR; must add `aria-label`
- Do NOT add `aria-hidden="true"` to interactive `button` — only to icons inside
- Do NOT use `tabIndex={0}` on non-interactive `div/span` to fix focus order — use semantic `button`/`a`/`input`
- Do NOT add `role="button"` to `div` — keep native `button`
- Do NOT use `outline-none` without `focus-visible:ring` replacement — fails 2.4.7
- Do NOT add `aria-live="assertive"` to every badge — only warnings `role="alert"` if error, otherwise `polite`
- Do NOT invent `aria-describedby` pointing to missing id — every `aria-*` must reference existing element

**Confidence / gaps**
- High on missing `aria-label`/`type` (30+ grep hits, direct evidence).
- Medium on focus trap — observed `role=dialog` but no trap logic, not yet tested with keyboard `Tab` leak (needs manual).
- Gap: No `axe-core` or `eslint-plugin-jsx-a11y` runs yet — Phase 5 will add `npm i -D axe-playwright` / `eslint-plugin-jsx-a11y` scans, not invented.

---

## Phase 1: Critical — Accessible Names & Label Association (Blocks AT)

**What to implement — COPY `aria-labelledby` / `aria-label` MDN patterns**
1. **Buttons — add `type` + `aria-label` everywhere** (copy `Header.tsx:82` as template):
   - `Header.tsx:82` `header-undo-btn` → `type="button" aria-label="Undo (Ctrl+Z)"`
   - `Header.tsx:103` `header-redo-btn` → `type="button" aria-label="Redo (Ctrl+Y)"`
   - `Header.tsx:124` `focus-mode-toggle-btn` → keep `title` but add `aria-label={isFocused ? "Exit focus mode (Escape)" : "Enter focus mode (Alt+F)"}`
   - `Header.tsx:159` `sanitize-output-toggle-btn` → `aria-label={isSanitizeActive ? "Sanitize output: on" : "Sanitize output: off"} aria-pressed={isSanitizeActive}`
   - `Header.tsx:229` `font-size-decrease-btn` / `248 increase` → `aria-label="Decrease font size"` / `"Increase font size"`
   - `Header.tsx:263` `theme-toggle-btn` → `aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}`
   - `Editor.tsx:314` `smart-cleanup-all-btn` → `type="button" aria-label="Smart cleanup all cells"`
   - `Editor.tsx:366` `editor-settings-btn` → already `aria-expanded/haspopup`, add `type="button" aria-label="Grid and layout settings" aria-controls="editor-settings-panel"`
   - `Editor.tsx:407,422,437,452,480,493` layout `1x1/2x2/Left&Right/Up&Down`, `+Col/+Row` → each `type="button" aria-label="Layout single cell"` etc, and `aria-pressed={numRows===1&&numCols===1}` for toggles
   - `EditorCell.tsx:142` warnings pill → `type="button" aria-label={`${warnings.length} syntax warnings, show details`} aria-expanded={showWarningsDrawer} aria-controls="cell-warnings-drawer-${r}-${c}"`
   - `EditorCell.tsx:181` Clean / `195` Clear / `225` dialog close / `274` Fix / `368` toggle drawer → each `type="button" aria-label="Clean cell R${r}C${c}"` etc
   - `Preview.tsx:288,303,321,415,442,458,504,519,534,548,565,579,593` — all toolbar `type="button"` + `aria-label` (`"Copy cell"`, `"Reset output"`, `"Toggle edit mode"`, `"Numbering Roman (i)"`, `"Bold"` etc). Copy strings verbatim from `title` to `aria-label`.
2. **Textareas — associate visual label** (copy MDN `aria-labelledby`):
   - `EditorCell.tsx:132-138` change `<span>` to `<span id="cell-label-${r}-${c}">` then `textarea:310` add `aria-labelledby="cell-label-${r}-${c}" aria-describedby="cell-counter-footer-${r}-${c}"` (counter at `:328`)
   - `Preview.tsx:627` `output-textarea-${r}-${c}` add `aria-label={`Edit output for ${getCellLabel(r,c)}`}` and `aria-describedby="output-footer-${r}-${c}"`
   - `Header.tsx:188-213` Font select — wrap `<label htmlFor="font-family-select">Font:</label>` replacing `<span>Font:</span>` at `:193`, keep `select:196` `id`.
3. **Icons — hide decorative**:
   - Every `lucide-react` icon inside `button` add `aria-hidden="true" focusable="false"` — e.g., `<Undo2 aria-hidden="true" focusable="false" className="w-3.5 h-3.5"/>`. Do NOT add `alt`.

**Documentation references**
- `Header.tsx:82-263`, `Editor.tsx:314-493`, `EditorCell.tsx:142-368`, `Preview.tsx:288-593` — sinks to fix
- `EditorCell.tsx:132,310,328`, `Preview.tsx:627` — label linkage
- External: MDN `aria-label`, `aria-labelledby`, `aria-pressed`, `aria-expanded`, HTML `type` attribute

**Verification checklist**
- [ ] `Select-String -Path "src\**\*.tsx" -Pattern ''<button'' | Where { $_ -notmatch ''type="button"'' }` → 0
- [ ] `Select-String -Path "src\**\*.tsx" -Pattern ''aria-label=''` → 30+ hits (was 1)
- [ ] `npx eslint .` with `eslint-plugin-jsx-a11y` (added Phase 5) → 0 `button-has-type`, `control-has-associated-label` errors
- [ ] Manual NVDA/VoiceOver: Tab to Undo → hears “Undo, button, Ctrl+Z”; Tab to textarea → hears “Left, edit, multiline”
- [ ] `grep -r ''title='' src/components/Header.tsx | grep button` — titles kept but `aria-label` present

**Anti-pattern guards**
- Do NOT duplicate `aria-label` and `title` with different text — keep same string
- Do NOT add `aria-label` to `textarea` AND `aria-labelledby` pointing to same — pick one
- Do NOT remove `title` — keep as hover tooltip, but not as sole name

**Effort:** ~45m

---

## Phase 2: High — Focus Trap & Keyboard Order

**What to implement**
1. **Settings dialog trap** `Editor.tsx:364-515` — install `focus-trap-react`:
   ```tsx
   import { FocusTrap } from ''focus-trap-react'';
   {showSettingsPanel && (
     <FocusTrap active={showSettingsPanel} focusTrapOptions={{ fallbackFocus: ''#editor-settings-panel'', onDeactivate: ()=>setShowSettingsPanel(false), clickOutsideDeactivates: true, escapeDeactivates: true }}>
       <div id="editor-settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title" ...>
         <h2 id="settings-title" class="sr-only">Layout & grid settings</h2>
         ...
       </div>
     </FocusTrap>
   )}
   ```
   Copy `focus-trap-react` README. If no lib, manual: `useEffect` on `showSettingsPanel` → `panel.querySelector(''button, [href], input, select'')?.focus()` and trap `Tab` loop, return focus to `#editor-settings-btn:367` on close.
2. **Warnings drawer** `EditorCell.tsx:211-306` — add `role="region" aria-labelledby="warnings-title-${r}-${c}"` + same trap not needed (inline), but add `aria-expanded` on toggle `142` already, ensure `Escape` closes drawer (add `onKeyDown` on drawer `Escape => setShowWarningsDrawer(false)`).
3. **Preview edit toolbar dialog** `Preview.tsx:488-621` — add `role="toolbar" aria-label="Edit mode formatting"` to `edit-mode-toolbar-${r}-${c}` div.
4. **App shortcuts** `App.tsx:67-106` — already handle `Escape` exit focus, `Alt+F` toggle, `Ctrl+Z/Y` undo/redo; add `useEffect` to announce via `aria-live` when `focusMode` changes: `showToast(`${focusMode} mode`)` with `role="status"`.
5. **Tab order** — ensure `Header` buttons tab in visual order (Undo→Redo→Focus→Sanitize→Font→Size→Theme) — current DOM order already correct, do NOT add `tabIndex`.

**Documentation references**
- `Editor.tsx:49-64` existing `mousedown`/`Escape` handlers to extend
- `EditorCell.tsx:211` drawer to add region
- `Preview.tsx:488` toolbar
- `App.tsx:67-106` shortcuts
- External: `focus-trap-react` docs, MDN `aria-modal`, `role="dialog"`

**Verification checklist**
- [ ] `npm ls focus-trap-react` shows installed (or manual trap code in `Editor.tsx:49`)
- [ ] Manual keyboard: Tab to Settings → Enter → focus moves inside dialog → Tab cycles 6 layout buttons → Shift+Tab wraps → Escape closes → focus returns to `#editor-settings-btn`
- [ ] `axe` scan `Panel > Settings` → 0 `aria-dialog-name`, `focus-order-semantics` violations
- [ ] `aria-modal="true"` present on `editor-settings-panel:390`

**Anti-pattern guards**
- Do NOT use `tabIndex={-1}` on dialog container if using `FocusTrap` — lib handles
- Do NOT add `autoFocus` to every button — only first focusable on open
- Do NOT break `App.tsx:105` global `Escape` handler — dialog `Escape` should `stopPropagation` so it doesn''t also exit focus mode.

**Effort:** ~30m

---

## Phase 3: Medium — Focus-Visible & Contrast

**What to implement — COPY Tailwind focus-visible docs**
1. **Focus ring** — add to every `button`/`select`/`textarea`:
   - Replace `focus:outline-none` on `EditorCell.tsx:317` with `focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900`
   - Same for `Preview.tsx:636` `textarea:636-639`, `Header.tsx:86-94` undo/redo, `Editor.tsx:408-503` layout buttons, `Preview.tsx:507-593` toolbar buttons
   - Keep `custom-scrollbar` class.
2. **Contrast bump** — edit Tailwind classes where `text-slate-400/500` on dark/light fails 4.5:1:
   - `Header.tsx:168-169` `text-slate-400/500` → `text-slate-300` (dark) / `text-slate-600` (light)
   - `Editor.tsx:280,508` `text-slate-400/500` → `text-slate-300/600`
   - `EditorCell.tsx:319` `placeholder:text-slate-600/400` → `placeholder:text-slate-500` (dark `text-slate-400`? check contrast; dark bg `bg-slate-900` needs `placeholder:text-slate-400` 4.6:1, not `600`)
   - Disabled `Header.tsx:92-93` `opacity-40` + `text-slate-400` → keep `opacity-100` with `text-slate-500` + `cursor-not-allowed` (higher contrast), or add `disabled:opacity-60`
   - Verify `index.css` does not override.
3. **Visible disabled state** — ensure `disabled` buttons have `aria-disabled="true"` + `disabled` attr already (`Header.tsx:85,106`).

**Documentation references**
- `EditorCell.tsx:317,636`, `Header.tsx:86-270`, `Editor.tsx:408-503` — focus rings to add
- `index.css:1-20` — global focus styles not to conflict
- External: Tailwind `focus-visible`, WCAG 1.4.3 Contrast checker

**Verification checklist**
- [ ] `grep -c "focus-visible:ring" src` → 30+ hits
- [ ] Manual keyboard: Tab through Header → every button shows 2px blue ring, not just hover
- [ ] `axe` contrast scan — 0 `color-contrast` violations (was 6+)
- [ ] `npx tsc --noEmit` pass, no visual regression in light/dark

**Anti-pattern guards**
- Do NOT use `focus:ring` alone — must be `focus-visible:ring` to avoid mouse click ring
- Do NOT set `outline:none` without replacement — always paired with `focus-visible:ring`
- Do NOT change brand colors (`blue-600`, `emerald-500`) — only bump slate grays

**Effort:** ~30m

---

## Phase 4: Medium — Live Regions & Semantics

**What to implement**
1. **Dynamic badges live** — make char/word/warning counts announce:
   - `Editor.tsx:271-282` `total-input-char-badge` / `284-298` warnings badge → add `role="status" aria-live="polite" aria-atomic="true"`
   - `Preview.tsx:255-274` `total-output-char-badge` → same `role="status" aria-live="polite"`
   - `EditorCell.tsx:326-383` footer `cell-char-count`, `cell-warnings-btn` — when `warnings.length` changes, badge already re-renders; add `aria-live="polite"` to wrapper `div.h-6:327`
   - `Editor.tsx:521-532` `cleanupNotification` already `flex` banner — add `role="status" aria-live="polite"` to outer `div:522`
   - `Preview.tsx:609-621` `cellFeedback` toast → `role="status" aria-live="assertive"` (it''s transient success message)
2. **Icon hiding**:
   - Every `lucide-react` inside `button/span` decorative → add `aria-hidden="true" focusable="false"` — e.g., `EditorCell.tsx:156` `<AlertTriangle aria-hidden="true" focusable="false" className="w-3 h-3"/>`
   - Keep `AlertCircle` inside warning `title` decorative too.
3. **Semantics**:
   - `App.tsx:226` `main` already semantic → add `id="main-content"` for skip link (Phase 5)
   - `App.tsx:243,260` `section#input-container-panel` / `#output-container-panel` → add `aria-labelledby="input-heading"` / `"output-heading"` then `Editor.tsx:256` `<span>Input</span>` → `<h2 id="input-heading">Input</h2>` and `Preview.tsx:251` `<span>Output</span>` → `<h2 id="output-heading">Output</h2>`
   - `Header.tsx:67` `h1` stays single, panels get `h2` — correct hierarchy
   - `Editor.tsx:392` dialog already `role=dialog` → add `aria-labelledby="settings-title"` + `<h2 id="settings-title" class="sr-only">Layout & grid settings</h2>` at `:398`

**Documentation references**
- `Editor.tsx:271-532`, `Preview.tsx:255-274,609-621`, `EditorCell.tsx:326-383`
- `Header.tsx:67`, `App.tsx:226-260`
- External: MDN `aria-live`, `role="status"` vs `role="alert"`, `aria-hidden`

**Verification checklist**
- [ ] `grep -c ''aria-live='' src` → 5+ hits, `grep -c ''aria-hidden='' src` → 38+ hits
- [ ] NVDA: type in `EditorCell` → hears “3 warnings” polite after debounce; click Smart Cleanup → hears “Cleaned Left: Fixed 2 syntax items”
- [ ] `axe` scan → 0 `aria-hidden-focus`, `region` violations for status
- [ ] `npx tsc --noEmit` pass

**Anti-pattern guards**
- Do NOT put `aria-live` on entire `grid` container — only on badges/toast
- Do NOT use `alert` for non-error status — `role="alert"` interrupts; use `status` polite
- Do NOT add `aria-live` to `textarea` — only to status wrappers

**Effort:** ~30m

---

## Phase 5: Low — Skip Link, Audit Tooling, Final Verify

**What to implement**
1. **Skip link** `index.html:14` — before `#root`:
   ```html
   <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded">Skip to main content</a>
   ```
   Ensure `App.tsx:226` `main id="main-content" tabIndex={-1}` so skip target focusable programmatically.
2. **Tooling** — add `npm i -D eslint-plugin-jsx-a11y axe-core @axe-core/playwright` (or `@playwright/test` already via `.playwright-mcp`):
   - `.eslintrc` or `eslint.config.js` (from Pillar 4) add `extends: [''plugin:jsx-a11y/recommended'']` — copy `eslint-plugin-jsx-a11y` docs
   - Add `npm run a11y:check` → `axe --dir dist` or Playwright `test/a11y.spec.ts` that runs `AxeBuilder` on `http://localhost:3000` — copy `@axe-core/playwright` README `new AxeBuilder({page}).analyze()`
   - Keep `.playwright-mcp` config if present
3. **Audit scan** — run `npx eslint .` (with a11y plugin) + `npx playwright test a11y.spec.ts` + manual keyboard walkthrough (Tab, Shift+Tab, Escape, Alt+F, Ctrl+Z).
4. Document `docs/pillar audit/reliability-notes.md` that `GEMINI_API_KEY` is server-injected, not client — not a11y related but keeps docs.

**Documentation references**
- `index.html:1-15` — skip link insertion before `div#root:14`
- `App.tsx:226` — `main` target
- `eslint.config.js` (Pillar 4) — to extend with `jsx-a11y`
- External: `eslint-plugin-jsx-a11y` recommended config, `@axe-core/playwright` `AxeBuilder` example, MDN skip link pattern

**Verification checklist**
- [ ] `Get-Content index.html | Select-String "Skip to main"` → 1
- [ ] Tab on fresh load → skip link appears top-left focused, Enter jumps to `main#main-content`
- [ ] `npx eslint .` → 0 `jsx-a11y` errors
- [ ] `npx playwright test --grep a11y` → 0 critical/serious violations
- [ ] `npx tsc --noEmit && npm run lint && npm run build` all green

**Anti-pattern guards**
- Do NOT add skip link inside `Header` — must be first focusable element in `body`
- Do NOT use `display:none` for `sr-only` — must be `sr-only focus:not-sr-only` Tailwind pattern
- Do NOT run `axe` only in `dist` without `vite preview` server running — must `npm run build && npm run preview` before scan

**Effort:** ~30m

---

## Final Phase: Cross-Pillar Verification

1. **Greps:**
   - `Select-String -Path "src\**\*.tsx" -Pattern "<button" | Where { $_ -notmatch ''type="button"'' }` → 0
   - `Select-String -Path "src\**\*.tsx" -Pattern ''aria-label=''` → 30+ hits
   - `Select-String -Path "src\**\*.tsx" -Pattern "focus-visible:ring"` → 30+ hits
   - `Select-String -Path "src\**\*.tsx" -Pattern ''aria-live=''` → 5+ hits
   - `Select-String -Path "index.html" -Pattern "Skip to main"` → 1
2. **Build & audit:** `npx tsc --noEmit && npm run lint && npm run build && npx playwright test --grep a11y`
3. **Manual UX:**
   - Tab through entire app — every icon button announces name, textarea announces label, focus ring visible
   - Settings dialog Tab trap works, Escape returns focus
   - Type markdown → warnings badge announces politely
   - Light & dark mode contrast passes WCAG AA (axe 0)
4. **No regression:** `Preview` formatting, `Editor` paste/numbering, `Header` sanitize toggle still work (a11y only adds attrs, no logic change)

---

## Execution Order & Dependencies

```
Phase 0 (done) -> Phase 1 (names/labels) -> Phase 2 (focus trap) -> Phase 3 (focus-visible/contrast) -> Phase 4 (live/semantics) -> Phase 5 (skip/tooling) -> Final Verify
          \-> Phase 1 must land before Phase 2 (screen reader needs names before trap testing)
           -> Phase 3 can run in parallel with Phase 4 after Phase 1
```

- Each phase self-contained with doc refs — fresh chat can execute one phase.
- If `explore` subagents restored, delegate Phase 1 button scan to 1 explore per component (`Header`, `Editor`, `EditorCell`, `Preview`).
- Estimated total: **2h45m** (45m+30m+30m+30m+30m)

---

## File Map (to create/modify)

```
docs/pillar audit/pillar-5-accessibility-plan.md            <- this file
index.html:14                                               <- modify (skip link)
src/App.tsx:226,67-106                                      <- modify (main id, aria-labelledby, live announce)
src/components/Header.tsx:82-263,193,196                    <- modify (type, aria-label, label)
src/components/Editor.tsx:314-493,256,369-393,521-532       <- modify (type/aria, h2, trap, live)
src/components/EditorCell.tsx:132,142,181,195,225,274,310-328,368 <- modify (label linkage, type/aria, drawer)
src/components/Preview.tsx:255-274,288-646,488,609-627      <- modify (aria-label, toolbar role, live, label)
src/index.css:1-20                                          <- optional (sr-only)
eslint.config.js                                            <- modify (jsx-a11y)
playwright a11y test                                        <- new (a11y.spec.ts)
```

## References

- Inline audit this chat citing `Header.tsx:82-263`, `Editor.tsx:369-493`, `EditorCell.tsx:310-323`, `Preview.tsx:288-646`, `App.tsx:67-106`
- `five-pillar-audit:standard-code-audit` — `C:\Users\danhm\.config\opencode\memory.jsonl`
- External docs (to read per phase): MDN `aria-label`/`aria-labelledby`/`aria-live`/`role="dialog"`, `focus-trap-react` README, Tailwind `focus-visible` + `sr-only`, `eslint-plugin-jsx-a11y` recommended, `@axe-core/playwright` `AxeBuilder`
