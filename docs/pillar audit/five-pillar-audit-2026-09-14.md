# Five-Pillar Audit Remediation Plan

**Project:** Text Markdown Formatter  
**Date:** 2026-09-14  
**Status:** Implemented and verified
**Pillars:** Code quality, security, performance, accessibility, and UX  
**Scope:** Current React/Vite application, supporting scripts, tests, configuration, and documentation

## Executive Summary

The audit found no critical issues and no known production dependency vulnerabilities. Work should prioritize dark-theme contrast, typing responsiveness, destructive layout actions, mobile grid usability, and large-document history correctness.

| Pillar | Current status | Highest severity |
| --- | --- | --- |
| Code quality | Needs work | Medium |
| Security | Good baseline | Medium |
| Performance | Needs work | High |
| Accessibility | Needs work | High |
| UX | Needs work | High |

## Baseline Verification

At audit time:

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run test` passed: 97 Vitest tests and 12 versioning tests.
- `npm run build` passed.
- `npm run a11y:check` passed: 12 Playwright tests.
- `npm audit --omit=dev` reported zero production vulnerabilities.
- Full `npm audit` reported one low-risk development advisory through `js-yaml@4.3.1`.
- `npm run format:check` failed on 18 tracked files.

Passing accessibility tests do not invalidate the accessibility findings. The current automated scan does not cover populated cells, dark themes, comparison results, dialogs, menus, or destructive flows.

## Phase 1: High-Priority User Impact

### 1.1 Generate Preview HTML Only When Needed

**Pillars:** Performance, code quality  
**Severity:** High  
**References:** `src/components/FormatterCell.tsx:74-82`, `src/utils/htmlBuilder.ts:58-77`

`buildInlineStyledHtml` currently runs after every edit even when the cell is in Edit mode and the generated HTML is hidden. A representative 46 KB document took about 434 ms for an uncached render.

**Implementation:** Skip HTML generation while `isEditMode` is true. Generate it when the user switches to Preview. Keep the existing render failure state.

**Acceptance criteria:**

- [x] Typing in Edit mode does not call `buildInlineStyledHtml`.
- [x] Switching a populated cell to Preview generates and displays its formatted HTML.
- [x] Preview rendering errors still show the existing failure message.
- [x] A regression test proves formatting is skipped in Edit mode and runs in Preview mode.
- [x] Existing formatting, clipboard, lint, typecheck, and unit tests pass.

### 1.2 Correct Dark-Theme Contrast

**Pillars:** Accessibility, UX  
**Severity:** High  
**References:** `src/styles/themes.css:14-171`, `src/components/FormatterCell.tsx:153-178`, `src/components/ComparisonWorkspace.tsx:157-164`, `src/components/ComparisonResult.tsx:67-71`

White text against several dark-theme primary colors measures roughly 2.20:1 to 3.68:1. Diff highlights also produce insufficient text contrast.

**Implementation:** Adjust semantic foreground/background combinations rather than adding component-specific overrides. Use a dark foreground on light primary colors or darken backgrounds where white text must remain. Add appropriate dark-mode diff colors.

**Acceptance criteria:**

- [x] Text and icons on primary controls meet WCAG 2.1 AA contrast of at least 4.5:1 in every dark theme.
- [x] Non-text control boundaries and focus indicators meet at least 3:1 contrast where applicable.
- [x] Added and removed diff text meets at least 4.5:1 in light and dark modes.
- [x] Information in diff output does not depend on color alone.
- [x] Axe scans cover populated Formatter, Comparison editing, and Comparison results in at least one dark theme.

### 1.3 Prevent Layout Presets From Losing Content

**Pillars:** UX, code quality  
**Severity:** High  
**References:** `src/hooks/useGridActions.ts:144-156`, `src/components/ui/EditorSettingsPanel.tsx:233-237`

Grid presets retain only selected positions and silently discard other cells while the panel says that presets keep content.

**Implementation:** Before applying a smaller preset, detect non-empty cells that would be removed and require explicit confirmation. Keep Undo available as secondary recovery. Correct the explanatory copy.

**Acceptance criteria:**

- [x] Applying a preset that preserves all non-empty cells requires no confirmation.
- [x] Applying a preset that would remove non-empty cells requires explicit confirmation.
- [x] Cancelling confirmation leaves the grid and history unchanged.
- [x] Confirming applies the selected layout and Undo restores the previous grid.
- [x] Settings copy accurately describes when content can be removed.

### 1.4 Keep Expanded Grids Usable

**Pillars:** UX, accessibility, performance  
**Severity:** High  
**References:** `src/hooks/useGridActions.ts:157-162`, `src/components/FormatterWorkspace.tsx:234-240`

Rows and columns currently compress into the fixed workspace. On a 390px viewport, a 5x5 grid reduced cells to approximately 64x96 px and textareas to approximately 62x32 px.

**Implementation:** Give cells practical minimum dimensions and allow the grid container to scroll. Do not introduce virtualization unless measured cell counts require it.

**Acceptance criteria:**

- [x] Adding rows or columns does not shrink editors below the agreed usable minimum dimensions.
- [x] Overflow is reachable with pointer, touch, and keyboard scrolling.
- [x] The document body does not gain unintended horizontal overflow.
- [x] A 5x5 grid remains editable at 390x800 and 1440x900 viewports.
- [x] Focused cells and controls remain visible or can be scrolled into view.

## Phase 2: Correctness and Data Safety

### 2.1 Fix Large-Document Undo

**Pillars:** Code quality, performance  
**Severity:** Medium  
**References:** `src/hooks/useGridHistory.ts:25-36`, `src/hooks/useGridHistory.ts:108-129`, `src/hooks/useGridHistory.ts:155-160`

`areGridsEqual` always returns false above 500,000 characters. Undo can repeatedly restore an identical clone without moving to the previous snapshot.

**Implementation:** Replace JSON serialization and the size cutoff with direct row, column, and cell string comparisons.

**Acceptance criteria:**

- [x] Equal grids above 500,000 characters are recognized as equal.
- [x] Different grids above 500,000 characters are recognized as different.
- [x] One Undo after committing a large document reaches the preceding snapshot.
- [x] Repeated no-op updates do not add duplicate history entries.
- [x] A regression test uses at least one 500,001-character cell.

### 2.2 Make New Start a New History Session

**Pillars:** Code quality, UX  
**Severity:** Medium  
**References:** `src/App.tsx:58-64`, `src/hooks/useGridHistory.ts:60-80`, `src/hooks/useWorkspacePersistence.ts:70-102`

New clears persisted data but records the blank grid through normal history, allowing Undo to restore and repersist the previous workspace.

**Implementation:** Add the smallest history reset operation that replaces history with one blank snapshot, and use it for New.

**Acceptance criteria:**

- [x] Activating New clears the visible workspace and its persisted entry.
- [x] Undo is unavailable immediately after New.
- [x] Previous workspace content cannot return through Undo or Redo.
- [x] Reloading after New restores a blank workspace.
- [x] Existing ordinary Clear and Undo behavior remains unchanged.

### 2.3 Stop Preview Preprocessing From Rewriting Source Semantics

**Pillars:** Code quality, UX  
**Severity:** Medium  
**References:** `src/utils/tableConvert.ts:115-118`, `src/utils/cleanup.ts:486-503`, `src/utils/htmlBuilder.ts:68-73`, `src/hooks/useCopy.ts:24-39`

Preview and rich-copy pass source through the complete cleanup pipeline. Incomplete Markdown can therefore render or copy differently from the editor value.

**Implementation:** Restrict preview preprocessing to TSV conversion. Keep cleanup in paste handling and the explicit Smart Cleanup action.

**Acceptance criteria:**

- [x] Preview does not auto-close incomplete bold, strikethrough, or code fences.
- [x] Rich-copy HTML and plain-text representations derive from the same source content.
- [x] Explicit Smart Cleanup retains its current behavior.
- [x] Paste cleanup retains its current raw-then-cleaned Undo behavior.
- [x] Tests cover incomplete Markdown, fenced code, and TSV conversion.

### 2.4 Protect Comparison Drafts

**Pillars:** UX  
**Severity:** High  
**References:** `src/components/ComparisonWorkspace.tsx:35-39`, `src/components/ComparisonWorkspace.tsx:66-79`

Comparison Clear permanently removes both drafts without confirmation, Undo, or persistence.

**Implementation:** Request confirmation only when either side contains non-whitespace text.

**Acceptance criteria:**

- [x] Clear acts immediately when both inputs are empty.
- [x] Clear requests confirmation when either input contains text.
- [x] Cancelling preserves both inputs and the current result state.
- [x] Confirming clears both inputs and returns to the blank editing state.
- [x] The confirmation is keyboard accessible and restores focus to Clear when cancelled.

## Phase 3: Security and Resource Boundaries

### 3.1 Prevent Automatic Remote Image Requests

**Pillar:** Security  
**Severity:** Medium  
**References:** `index.html:6-9`, `src/utils/security/sanitize.ts:20-28`, `src/components/FormatterCell.tsx:270-280`

Previewing Markdown can load images from arbitrary HTTPS hosts, disclosing network metadata without an explicit navigation.

**Implementation:** Remove remote HTTPS images from the default policy. Prefer CSP `img-src 'self' data:` if remote images are not a product requirement. Otherwise require explicit user opt-in before loading them.

**Acceptance criteria:**

- [x] Previewing `![x](https://example.invalid/tracker.png)` makes no remote image request by default.
- [x] Same-origin and supported data images continue to follow the documented policy.
- [x] Broken or blocked images do not make the editor unusable.
- [x] A browser-level test verifies the remote request is blocked.
- [x] Existing XSS sanitizer tests continue to pass.

### 3.2 Add Input and Workspace Limits

**Pillars:** Security, performance, code quality  
**Severity:** Medium  
**References:** `src/hooks/useGridActions.ts:97-110`, `src/utils/tableConvert.ts:150-245`, `src/hooks/useWorkspacePersistence.ts:8-16`

Clipboard input and restored state have no character, row, column, or cell limits. Oversized data can freeze the main thread, exhaust memory, or fail during rendering.

**Implementation:** Define conservative limits at paste and persistence trust boundaries. Reject oversized matrices with a recoverable message or retain them as one plain-text cell. Replace spread-based maximum calculations with iteration.

**Acceptance criteria:**

- [x] Oversized clipboard and HTML-table input is rejected or safely reduced before matrix construction.
- [x] Oversized or malformed persisted state does not mount an unbounded grid.
- [x] Rejected input remains available to the user or produces a clear recovery message without silent data loss.
- [x] Maximum row, column, cell, and total-character limits are covered by boundary tests.
- [x] Limit handling does not trigger the application error boundary.

### 3.3 Refresh the Development Dependency Lockfiles

**Pillar:** Security  
**Severity:** Low  
**References:** `package-lock.json`, `bun.lock`

The locked development graph includes `js-yaml@4.3.1`, affected by a CPU denial-of-service advisory through ESLint tooling.

**Acceptance criteria:**

- [x] Both tracked lockfiles resolve `js-yaml` to `4.3.2` or newer.
- [x] Full `npm audit` reports no known vulnerabilities.
- [x] Lint, typecheck, tests, and build pass after the lockfile refresh.
- [x] No unrelated dependency upgrades are included.

## Phase 4: Interaction Accessibility

### 4.1 Correct Settings Panel Semantics

**Pillar:** Accessibility  
**Severity:** Medium  
**References:** `src/components/ui/EditorSettingsPanel.tsx:38-101`, `src/components/FormatterWorkspace.tsx:79-86`

The settings surface declares itself modal and traps focus while outside pointer interaction remains available and closes it.

**Implementation:** Treat it as a non-modal popover. Remove `aria-modal` and the focus trap while retaining naming, Escape dismissal, and focus restoration.

**Acceptance criteria:**

- [x] The panel no longer exposes `aria-modal="true"`.
- [x] Keyboard users can leave the panel without an artificial focus loop.
- [x] Escape closes the panel and restores focus to its trigger.
- [x] Clicking outside closes the panel consistently.
- [x] Automated tests assert the chosen non-modal interaction model.

### 4.2 Restore Focus After Workspace Changes

**Pillar:** Accessibility  
**Severity:** Medium  
**References:** `src/App.tsx:122-150`, `src/components/ComparisonWorkspace.tsx:23-31`

After leaving Comparison, focus remains on the removed Back button.

**Acceptance criteria:**

- [x] Entering Comparison places focus on its heading or first editor.
- [x] Returning to Formatter places focus on `#main-content` or the first formatter editor.
- [x] No mode transition leaves `document.activeElement` inside removed content.
- [x] A Playwright test covers keyboard entry and exit.

### 4.3 Use Native Radio Behavior for Theme Choices

**Pillar:** Accessibility  
**Severity:** Medium  
**References:** `src/components/ThemePicker.tsx:61-88`, `src/components/Header.tsx:627-650`, `src/components/ThemeSlider.tsx:13-20`

Button-based theme radios lack arrow-key behavior, and desktop/mobile slider instances create duplicate IDs.

**Implementation:** Prefer native radio inputs for theme choices. Give each theme slider instance a unique ID.

**Acceptance criteria:**

- [x] Arrow keys move selection within each theme radiogroup.
- [x] Only the active radio participates in normal Tab navigation.
- [x] Checked state is announced correctly by screen readers.
- [x] No duplicate IDs exist when the mobile menu is open.
- [x] Desktop and mobile theme controls retain their current visual behavior.

### 4.4 Make Changelog Overflow Keyboard Scrollable

**Pillar:** Accessibility  
**Severity:** Medium  
**References:** `src/components/ChangelogDialog.tsx:4-50`, `src/components/ChangelogDialog.tsx:83-94`

On small screens, the overflowing changelog pane is not focusable and cannot be scrolled with Page Down from the dialog's only focus target.

**Acceptance criteria:**

- [x] The changelog scroll pane is keyboard focusable and has an accessible name.
- [x] Arrow keys, Page Up, Page Down, Home, and End scroll content when the pane is focused.
- [x] Dialog focus trapping, Escape dismissal, and trigger restoration continue to work.
- [x] A 390x500 Playwright test reaches the final changelog entry using only the keyboard.

### 4.5 Name the Aggregate Warning Badge

**Pillar:** Accessibility  
**Severity:** Low  
**Reference:** `src/components/FormatterWorkspace.tsx:121-131`

**Acceptance criteria:**

- [x] The badge exposes an accessible name such as "3 syntax warnings," including correct singular wording.
- [x] Decorative warning icons remain hidden from assistive technology.
- [x] Visual appearance remains unchanged.

## Phase 5: Remaining Performance, UX, and Delivery Gaps

### 5.1 Reduce Whole-Grid Work During Typing

**Pillar:** Performance  
**Severity:** Medium  
**References:** `src/hooks/useGridActions.ts:29-54`, `src/components/FormatterWorkspace.tsx:259-282`

Every edit clones the full matrix, recalculates aggregate statistics, and creates callbacks that prevent unchanged memoized cells from skipping renders.

**Implementation:** Measure after Phase 1.1. If input latency remains material, defer aggregate statistics with `useDeferredValue` and pass stable handlers to cells. Do not introduce a new state framework.

**Acceptance criteria:**

- [x] Unchanged cells do not rerender for edits in another cell.
- [x] Aggregate counts and warning totals settle to the correct values after typing.
- [x] Typing remains responsive on a representative large grid.
- [x] A focused performance regression check exercises sequential edits rather than cache hits.

### 5.2 Bound Comparison Complexity

**Pillars:** Performance, UX  
**Severity:** Medium  
**References:** `src/utils/lineDiff.ts:44-85`, `src/utils/lineDiff.ts:122-124`, `src/utils/lineDiff.ts:214-220`

Accepted input can still allocate expensive line-level and word-level LCS matrices.

**Acceptance criteria:**

- [x] Comparison rejects work exceeding an aggregate LCS-cell budget before matrix allocation.
- [x] Existing supported comparison fixtures remain supported.
- [x] Rejection explains how the user can reduce the input.
- [x] Near-limit accepted and rejected cases have deterministic tests.
- [x] Comparison calculation stays within the documented performance budget on the test machine.

### 5.3 Improve Blank Comparison State

**Pillar:** UX  
**Severity:** Medium  
**References:** `src/components/ComparisonWorkspace.tsx:157-168`, `src/components/ComparisonResult.tsx:85-87`

Comparing two blank inputs currently reports "No differences found."

**Acceptance criteria:**

- [x] Compare is disabled while both sides are blank, or activation shows an explicit prompt for content.
- [x] The disabled or error state explains the required next action.
- [x] Equal non-empty inputs still report no differences.
- [x] Keyboard and screen-reader behavior is covered by a test.

### 5.4 Remove Unused Font Requests

**Pillar:** Performance  
**Severity:** Low  
**Reference:** `index.html:29-36`

**Acceptance criteria:**

- [x] Stylesheets for Google Sans Code and Google Symbols are removed if repository-wide search confirms they remain unused.
- [x] The configured Google Sans Flex typography remains unchanged.
- [x] The production build and visual smoke check pass.

### 5.5 Strengthen CI and Accessibility Coverage

**Pillars:** Code quality, accessibility  
**Severity:** Medium  
**References:** `.github/workflows/version-consistency.yml`, `package.json:13-23`, `tests/a11y.spec.ts`

The tracked workflow checks version synchronization only. `a11y:check` can also run against stale `dist` output.

**Implementation:** Add required CI jobs for install, lint, typecheck, tests, and build. Make the accessibility command build before Playwright or guarantee a fresh build in its CI job.

**Acceptance criteria:**

- [x] Pull requests run `npm ci`, lint, typecheck, unit/versioning tests, and build.
- [x] Accessibility checks always run against the current source build.
- [x] Axe coverage includes dark mode, populated Formatter, Comparison results, menus, and dialogs.
- [x] CI fails when any required command fails.
- [x] The local command table in `AGENTS.md` matches actual package scripts.

## Documentation and Formatting

### 6.1 Update Contributor Documentation

**Pillar:** Code quality  
**Severity:** Low  
**Reference:** `README.md`

**Acceptance criteria:**

- [x] Removed components and behaviors are no longer documented as current.
- [x] Persistence version and architecture descriptions match the implementation.
- [x] Test documentation avoids a hard-coded count or uses the current count.
- [x] File references resolve to existing files.

### 6.2 Restore Formatting Compliance

**Pillar:** Code quality  
**Severity:** Low

**Acceptance criteria:**

- [x] `npm run format:check` passes.
- [x] Formatting-only changes are isolated from behavioral changes where practical.
- [x] No generated `dist` or `public/version.json` output is committed.

## Definition of Done

The remediation plan is complete when:

- [x] Every acceptance criterion above is satisfied or explicitly deferred with an owner and rationale.
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.
- [x] `npm run a11y:check` passes against a fresh build.
- [x] `npm run format:check` passes.
- [x] `npm audit --omit=dev` reports no production vulnerabilities.
- [x] Desktop and mobile smoke checks cover Formatter, Comparison, settings, themes, dialogs, Undo, New, Clear, copy, and paste.

## Recommended Execution Order

1. Preview generation and dark-theme contrast.
2. Destructive layout actions, grid overflow, Comparison Clear, and large-document Undo.
3. Preview/source consistency, New history reset, remote images, and resource limits.
4. Focus, settings semantics, theme controls, changelog scrolling, and warning naming.
5. Remaining performance work, comparison limits, CI coverage, documentation, and formatting.

Keep each fix in the smallest shared layer that covers every caller. Do not add new dependencies or abstractions unless the existing platform and installed packages cannot satisfy an acceptance criterion.
