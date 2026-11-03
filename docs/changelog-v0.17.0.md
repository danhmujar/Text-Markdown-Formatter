# v0.17.0 — Help, clipboard paste, and editing improvements

Date: 3 November 2026

Status: Approved release notes

Release: 0.17.0

## Added

### Help guide and shortcut reference

- The existing bottom-left **?** button now opens **Help**.
- **Getting started** explains the Formatter workflow: paste text, edit or clean it, review Preview, and copy formatted content to Catalyst.
- The guide explains **Keep in one cell** and **Split into cells**, including that splitting tabular data replaces the workspace grid.
- It describes automatic repair of recognized tab-separated prose and how Undo can recover the original paste.
- Comparison guidance covers the independent Left and Right drafts, Compare, Edit comparison, and Clear.
- **Keyboard shortcuts** documents the existing browser copy/cut/paste/select-all shortcuts, contextual Undo/Redo, Formatter Alt+N, list Enter/Tab/Shift+Tab, Shift+Enter, and Escape.
- Shortcut descriptions distinguish browser editing history from Formatter workspace history and recommend the visible Undo/Redo buttons for workspace changes.
- The guide explains the Bold and Italic toolbar buttons without introducing Ctrl+B or Ctrl+I bindings.
- **About this app** retains the developer credit, LinkedIn link, app version, feature information, and limitations.
- The changelog remains accessible from Help and About, with a new **Back to Help** action.

### Visible Paste buttons

- Added a labeled **Paste** button to every Formatter cell, including empty cells and populated cells in Edit or Preview.
- Added separate **Paste** buttons to the Left and Right Comparison editors.
- Paste replaces selected text or inserts at the editor's last recorded cursor position. It appends when no cursor position has been recorded.
- Successful Formatter button paste from Preview switches the workspace to Edit and focuses the destination editor.
- After insertion, the cursor is placed immediately after the inserted text.
- Clipboard reading prefers plain text and available HTML from the same clipboard item, with plain-text fallback when rich clipboard reading is unsupported.
- Buttons show **Pasting…** while a read is pending and prevent duplicate requests from the same button.
- If the workspace changes while clipboard reading is pending, or the destination workspace is hidden, the result is discarded with a message asking the user to paste again.
- Empty or non-text clipboard content and oversized pastes produce feedback without changing editor content.
- Blocked clipboard access produces instructions for right-click Paste or Ctrl+V / ⌘V.

## Changed

### Lettered list spacing

- Tab conversion from a Roman or numeric-dot item now creates a flush-left `a.` item instead of adding three leading spaces.
- Further Tab presses on a flush-left lettered item leave its text and cursor unchanged.
- Enter continues the letter sequence, such as `a.` to `b.`, while preserving the configured list terminator.
- Shift+Tab returns a flush-left lettered item to the next preceding Roman or numeric parent marker.
- Enter on an empty lettered item returns to the next parent marker when one exists; without a parent, it exits the list.
- Cursor positioning is clamped to the current line when a shorter replacement marker is inserted.
- Existing indented lists and multi-line selection indentation retain their previous behavior. Saved documents are not automatically reindented.

Example:

```text
(i) Main item
a. First detail
b. Second detail
(ii) Next main item
```

### Automatic repair of tab-separated prose

- Recognized paragraphs copied with tabs between individual words now paste into one cell with ordinary spaces instead of becoming a large grid.
- Likely visual line wraps within those paragraphs are joined into a continuous paragraph.
- This repair applies in both Formatter paste modes, including Edit mode when general automatic cleanup is disabled.
- Explicit Clean uses the same prose recognition helper.
- The detector uses tab density, mostly single-word segments, sentence punctuation, and wrapped-paragraph checks. Multi-line tabular input with consistent segment counts is preserved.
- Blank paragraph boundaries and empty lines at the edges of recognized prose are retained by the normalization helper; ordinary Preview cleanup still follows its existing trimming behavior.
- Code, Markdown tables, headings, lists, blockquotes, and ambiguous short inputs are excluded from this automatic prose repair.
- Valid rich HTML tables retain priority over plain-text prose detection.
- Repair preserves wording and punctuation. It does not rewrite sentences, correct spelling, or infer missing words; general Preview cleanup continues its existing quote-standardization behavior.
- Formatter history retains the original pasted text before normalization so Undo can restore its spacing.
- Comparison paste remains plain text and does not apply Formatter prose cleanup.

## Fixed

- A trailing newline no longer makes an otherwise recognized tab-separated paragraph fail prose detection.
- The supplied financial-report sample beginning **“Unless otherwise stipulated…”** now stays in one Formatter cell instead of producing the reported **6 × 35** word grid.
- Added regression coverage for that sample and the earlier energy-transition paragraph, including Windows line endings and empty edge lines.
- Formatter button paste now restores focus after React mounts the Edit textarea, resolving a Preview-to-Edit focus timing issue.
- Formatter-wide keyboard shortcuts no longer act on the workspace while Help/About or the changelog is open.

## Accessibility and interaction

- Help uses the existing modal dialog system, with focus trapping, Escape/backdrop dismissal, background inertness, and focus restoration to the **?** trigger.
- Help content is keyboard-scrollable and fits narrow viewports. Changing its section resets the scrollable content region.
- New Paste controls and Help navigation use visible labels, accessible names, keyboard focus indicators, theme colors, and at least 44px touch targets.
- The changelog close control now has a 44px minimum touch target.
- Keyboard navigation tests account for the new Paste button before the empty Formatter editor.
- Clipboard reading occurs only after a Paste button is activated; no background clipboard polling was added.

## Validation completed

- ESLint passed.
- TypeScript strict typecheck passed.
- Prettier checks passed for the files changed by the Help/Paste work.
- All **184 unit tests** passed.
- All **10 versioning tests** passed.
- The production build, including service-worker generation, passed.
- All **27 Chromium browser tests** passed.
- Browser coverage includes selection replacement, Preview-to-Edit focus, rich-table splitting, independent Comparison paste, denied access, empty clipboard, oversized content, pending/stale reads, raw-paste Undo, Help navigation, mobile scrolling, and automated accessibility checks.
- Captured and visually reviewed the mobile Help layout and desktop Formatter/Comparison Paste controls.

## Review notes

- Browser clipboard permissions and secure-context requirements still apply. Automated clipboard failure/success scenarios use controlled test doubles; platform-specific permission prompts were not manually tested across browsers.
- Prose recognition is intentionally conservative. Ambiguous input may retain its original formatting or follow the existing table-splitting behavior.
- No dependencies, new formatting shortcuts, or persisted preferences were added.
- Existing unrelated presentation and planning documents are outside this release.
- The in-app changelog summarizes these release notes. Version metadata is synchronized by the repository's automatic versioning hook.
