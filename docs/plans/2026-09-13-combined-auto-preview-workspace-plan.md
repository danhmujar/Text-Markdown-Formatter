# Combined Auto-Preview Workspace Implementation Plan

## Objective

Replace the Formatter's equal Input/Output split with one workspace that follows the primary user journey:

> Paste text → remove accidental hard wraps automatically → preview the cleaned result → copy it.

The empty workspace opens in Edit mode and is ready for paste. A successful paste becomes the single stored source, switches the affected cell to formatted Preview mode, and reports how many accidental line breaks were removed. Users enter Edit mode only when they need to change the cleaned source, then return to Preview explicitly.

Comparison remains a separate app mode. Grid layouts, Markdown formatting, Word/Catalyst and Excel copy behavior, themes, typography, undo/redo, workspace persistence, syntax cleanup, and accessibility remain supported inside the combined workspace.

## Product and UX findings

### Core behavior is only partially communicated today

The automatic behavior already exists. `handlePasteOnCell` in `src/hooks/useGridActions.ts:107-147` sends plain clipboard text through `parsePasteToGrid`, then through `sanitizeInputText`; `sanitizeInputText` calls `smartCleanupMarkdown` in `src/utils/cleanup.ts:175-177`. `smartCleanupMarkdown` unwraps detected hard-wrapped paragraphs and indented list continuations before its other cleanup passes (`src/utils/cleanup.ts:180-242,262-295`).

The behavior is intentionally not “remove every newline.” `isWrappedParagraph` in `src/utils/textWrap.ts:1-19` only joins likely visual wraps when all of these conditions hold:

- The input has 2–20 non-empty lines.
- It does not look like a heading, quote, code fence, table, or list.
- Average trimmed line length is at least 40 characters.
- Non-final lines are at least 30 characters.
- At least half of the non-final lines do not end in sentence punctuation.

This protects intentional paragraph breaks, short column data, lists, code, and tables. The correct product promise is therefore:

> Paste text with unwanted line wraps. Get clean paragraphs while preserving lists, tables, headings, and intentional breaks.

The current interface does not foreground that promise. The title and placeholder describe a general Text & Markdown Formatter, while grid controls, Smart Cleanup, Output editing, copy destinations, typography, themes, Focus mode, and Comparison compete for attention. Automatic paste cleanup also has no success feedback in the ordinary single-cell path, so users cannot easily tell what changed. The manual “Smart Cleanup” action can imply that cleanup has not already happened.

### The equal split duplicates state and responsibility

`src/App.tsx:164-217` maintains input grid values and separate output overrides. `src/App.tsx:270-329` then renders two equal regions: `Editor` and `Preview`. Because paste cleanup writes the cleaned value directly into the input grid, the two regions often show the same underlying text rather than a true before/after comparison.

This creates avoidable questions:

- Which side is authoritative?
- Was the pasted text already cleaned, or must Smart Cleanup still be pressed?
- Should the user copy from Input, Output, Copy All, Catalyst, or Excel?
- If Output was edited, which value will persist and which value will Undo restore?

The output side already contains the useful combined interaction pattern. `OutputCell` defaults to formatted Preview and toggles to a textarea with one Edit/Preview button (`src/components/OutputCell.tsx:137-177,272-304`). The new workspace should reuse that behavior instead of retaining two full-height panels.

### Existing quality constraints to preserve

The resolved audit in `docs/ui-ux-audit-2026-09-12.md:56-84` establishes the following constraints:

- No horizontal document overflow at supported widths.
- Compact header navigation remains active below 1280px.
- Interactive mobile controls retain at least 44×44px targets.
- Theme controls remain keyboard-correct and all light-theme accent pairs retain WCAG 2.1 AA contrast.
- Continuously changing character counters remain descriptive text, not live regions.
- Dialog focus management and background inertness remain unchanged.

## Settled interaction design

### Empty state

- An empty cell renders its textarea immediately, even though Preview is the normal mode for populated content.
- The first empty cell is paste-ready without stealing initial focus from the skip link; invoking New focuses its textarea.
- The primary placeholder is “Paste text from PDF, Word, or email…” rather than generic Markdown-oriented copy.
- Supporting text states that accidental line wraps are removed automatically while lists, tables, headings, and intentional breaks are preserved.

### Paste and automatic preview

- Paste is handled by the application rather than relying on the browser's default insertion path. This keeps selection replacement, sanitization, history, mode switching, and feedback deterministic.
- Plain text is inserted at the current selection, then passed through the existing parse/sanitize pipeline.
- Likely table or matrix clipboard data retains the existing grid expansion behavior.
- The affected populated cell switches to Preview after paste.
- Feedback says “Removed 1 accidental line break” or “Removed N accidental line breaks” when the cleaned result contains fewer logical newlines than the raw pasted value.
- Other automatic cleanup may use the existing concise cleanup feedback, but must not claim that a line break was removed when none was removed.
- The raw pasted state is retained as the immediately preceding history snapshot. One Undo restores the uncleaned paste; another Undo restores the state that existed before the paste.

### Preview mode

- Preview is the default for every populated or restored cell.
- The cleaned source is rendered through the existing sanitized `buildInlineStyledHtml` pipeline.
- Copy is the primary action and remains available in Preview.
- Catalyst/Word and Excel variants retain their current clipboard semantics, including `<br>` and table handling.
- Preview content is selectable and keyboard-focusable but not directly editable or paste-replaceable. Users choose Edit or New before changing existing content; this avoids accidental destructive replacement.

### Edit mode

- Edit replaces Preview in the same cell; it does not open a second panel.
- The textarea edits the same grid cell that Preview renders. There is no output override or second editable value.
- The visible mode control says Edit while previewing and Preview while editing, with `aria-pressed` and accessible names matching the active state.
- Manual formatting tools and Smart Cleanup remain available in Edit mode.
- Cleanup does not run on every keystroke. It runs automatically on paste and manually through Smart Cleanup.
- Returning to Preview does not create a second copy of the content.

### Workspace-level behavior

- Grid layout settings remain available because pasted matrices and multi-cell workflows already depend on them.
- New clears the single grid source, returns to one empty cell in Edit mode, clears persisted workspace data, and focuses the textarea.
- The old split-panel Focus mode and its `Alt+F` shortcut are removed because there is no second Formatter panel to maximize. Comparison remains unchanged.
- Undo/redo tracks source edits, paste cleanup, grid changes, and formatting changes. View mode itself is transient and is not persisted or added to history.

## Implementation plan

### Phase 1: Collapse persisted and historical state to one source

Modify `src/hooks/useGridHistory.ts` so `GridHistoryState` contains only `grid`. Remove `outputOverrides`, `updateOutputOverrides`, and the two-state update path. Preserve the existing 60-snapshot limit, 500 ms typing debounce, uncommitted-live-state Undo behavior, cloning, and the >500,000-character comparison fast path.

Add the smallest explicit history operation needed to commit a raw pasted grid followed by its cleaned grid without timers or rendering an intermediate frame. This operation must make the raw paste the first Undo target and the pre-paste workspace the second Undo target. Do not implement a generic command framework or reducer for this one transition.

Modify `src/hooks/useWorkspacePersistence.ts` to persist version 2 as `{ version: 2, grid }`. Preserve existing guarded `localStorage` access, the 400 ms debounce, and Clear behavior. Read existing version-1 workspaces once and migrate them without data loss: for each valid in-bounds `outputOverrides["row-col"]`, use the override as that cell's version-2 source value, including an intentionally empty override. Ignore malformed or out-of-bounds keys. Persist only version 2 after the migrated state changes.

Update `src/hooks/__tests__/useGridHistory.test.ts` and `src/hooks/__tests__/useWorkspacePersistence.test.ts` for the grid-only contract. Add focused cases proving the two-step paste Undo sequence and version-1 override migration. Do not retain compatibility aliases for removed output APIs.

### Phase 2: Make paste cleanup deterministic and observable

Refactor `handlePasteOnCell` in `src/hooks/useGridActions.ts` to own every non-empty paste:

1. Read plain text and HTML clipboard representations.
2. Build the raw post-paste grid using the textarea selection or parsed matrix.
3. Run the existing `parsePasteToGrid` and `sanitizeInputText` behavior.
4. Commit raw and cleaned grids through the paste-history operation.
5. Count logical newline removal using CRLF/CR normalization, without changing the cleanup heuristic.
6. Publish accurate cleanup feedback.
7. Notify the cell to return to Preview after the state commit.

Keep the existing table-parse failure toast and matrix sanitization. Preserve Markdown tables, lists, headings, code fences, intentional blank lines, and short column data exactly as constrained by `src/utils/textWrap.ts`, `src/utils/tableConvert.ts`, and the reliability tests. Do not broaden the heuristic or replace it with unconditional newline removal.

Attach this handler to the combined cell's Edit textarea. Empty clipboard text remains a no-op. Pasting over a selection replaces only that selection before cleanup. Paste is unavailable from the non-editable Preview surface.

Extend the existing reliability coverage only where the underlying cleanup contract is not already represented. The lasting UI regression should be an end-to-end scenario rather than a test that merely asserts handlers or props were wired.

### Phase 3: Replace the split Formatter with one auto-preview workspace

Rename `src/components/Preview.tsx` to a role-accurate combined workspace component and `src/components/OutputCell.tsx` to a role-accurate workspace-cell component using LSP file rename so imports are updated safely. Reuse their formatted-preview rendering, copy controls, Edit/Preview toggle, statistics, formatting toolbar, and per-cell feedback.

Move the grid actions and layout settings currently owned by `src/components/Editor.tsx` into the combined workspace. The workspace component should:

- Render one grid rather than parallel Input and Output grids.
- Read and write the same `grid` source.
- Treat an empty cell as Edit regardless of its previous transient mode.
- Set a pasted cell to Preview after the paste commit.
- Keep populated/restored cells in Preview by default.
- Expose Smart Cleanup, warnings, layout settings, Copy, and Excel without duplicating toolbar actions.
- Use one clear heading such as “Cleaned Text,” with concise purpose copy near the empty state.

Update the cell component to remove `isOverridden`, Reset-to-input behavior, and output-specific wording. Retain the existing sanitized rendering, accessible focusable preview region, Edit toolbar, cell copy actions, table-specific Excel action, character/word/line statistics, and visible focus treatment.

Delete obsolete `src/components/Editor.tsx` and `src/components/EditorCell.tsx` after all behavior has moved. Reuse `src/components/ui/EditorSettingsPanel.tsx`; rename it only if the old name is visible in public component semantics or materially misleading. Avoid introducing a second workspace state hook or a compatibility wrapper around the deleted split components.

### Phase 4: Simplify App and Header ownership

Modify `src/App.tsx` to render the combined workspace once. Remove `outputOverrides`, output reset/change callbacks, split layout markup, `focusMode`, `activePanel`, Focus-mode announcements, and `Alt+F`. Simplify `getOutputContent` to derive copy/preview content from the single grid while preserving `<br>` conversion behavior.

Modify `src/components/Header.tsx` to remove desktop and mobile Focus controls and their props. Preserve New, Undo, Redo, Comparison, typography, theme controls, the compact-below-1280px breakpoint, mobile focus management, and dialog interactions. Remove `FocusMode` from `src/types.ts` when no references remain.

Update `handleClearAll` for the grid-only history API. New must reset to `[['']]`, clear storage, return the Formatter to an empty editable cell, and leave Comparison's independent transient state unchanged.

Keep `src/hooks/useCopy.ts`, `src/utils/htmlBuilder.ts`, and `src/utils/sanitize.ts` as the single copy/render security path. Adapt their call sites, not their established sanitization contract.

### Phase 5: Update interface language and release surfaces

Update visible formatter copy so the primary promise is explicit and accurate:

- Empty placeholder: “Paste text from PDF, Word, or email…”
- Supporting statement: accidental wraps are removed automatically while intentional structure is preserved.
- Primary post-paste action: Copy.
- Mode labels: Edit and Preview.
- Feedback: exact removed-line-break count when non-zero.

Update `src/components/AboutDialog.tsx`, `index.html` metadata, and `src/constants/release.ts` only where they currently describe the old split Input/Output workflow or omit the new primary workflow. Do not add onboarding, a tour, settings, dependencies, or a new design system.

## Tests and verification

### Automated behavior

Update `tests/a11y.spec.ts` selectors and formatter scenarios to cover observable behavior:

- A new workspace exposes a labelled, paste-ready textarea; invoking New focuses it without breaking the skip link’s first-focus position on page load.
- Pasting a hard-wrapped paragraph stores the cleaned paragraph, reports the exact removed-line-break count, and switches to formatted Preview.
- Edit reveals the same cleaned source; Preview returns to the rendered result without creating a second value.
- One Undo after automatic cleanup restores the raw wrapped paste; a second Undo restores the prior workspace.
- Structured Markdown and table/matrix paste remain structured.
- New clears the workspace and restores the empty Edit state.
- Comparison mode still preserves Formatter state when switching away and back.
- Copy remains keyboard-operable from Preview.
- Axe reports no WCAG 2.1 A/AA violations in empty Edit, populated Preview, populated Edit, settings, and mobile-menu states.

Update unit tests only for durable state and migration contracts:

- `src/hooks/__tests__/useGridHistory.test.ts`: grid-only undo/redo, debounced typing, history cap, and raw→clean paste history.
- `src/hooks/__tests__/useWorkspacePersistence.test.ts`: version-2 restore/fallback plus lossless valid version-1 override migration.
- `src/utils/__tests__/reliability.test.ts`: retain existing wrapped-paragraph, list, document, table, and short-column cases; add only a missing boundary exposed during implementation.
- `src/utils/__tests__/clipboard.test.ts` and `src/utils/__tests__/htmlBuilder.test.ts`: run unchanged unless the single-source call-site cutover exposes a real contract change.

### Rendered verification

Exercise the actual built application at 375px, 768px, 1024px, 1280px, and 1440px:

- Empty, paste-cleaned Preview, Edit, multi-cell grid, long content, table, settings-open, mobile-menu-open, dark theme, and at least one non-blue light theme.
- No horizontal document overflow, clipped toolbar controls, layout shift, or nested unusable scroll regions.
- Preview/Edit state and Copy remain obvious at every width.
- Mobile interactive targets remain at least 44×44px.
- Keyboard order remains logical; focus moves into Edit when requested and returns to the mode control when Preview is selected.
- Screen readers receive one concise cleanup status, not character-counter announcements on every keystroke.

Run the repository verification order after the targeted scenarios pass:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`
5. `npm run a11y:check`

## Risks and anti-pattern guards

- **Data loss:** Never discard version-1 output overrides; fold valid overrides into the migrated source grid.
- **Destructive ambiguity:** Never allow paste replacement from the read-only Preview surface.
- **False cleanup claims:** Never report removed line breaks by using the generic cleanup fix count.
- **Structural corruption:** Never replace `isWrappedParagraph` with unconditional newline removal.
- **Dual state returning:** Do not keep output overrides, reset-to-input controls, hidden mirror values, or compatibility aliases after migration.
- **Mode/history coupling:** Do not persist Preview/Edit mode or add mode switches to Undo history.
- **Security regression:** Do not bypass `buildInlineStyledHtml`, output sanitization, or the existing clipboard sanitizer.
- **Responsive regression:** Do not restore the old 640px full-toolbar breakpoint or reduce audited touch targets.
- **Scope growth:** Do not add onboarding, drag-and-drop, a new state library, a component framework, or new copy destinations.

## Acceptance criteria

- **AC-1:** An empty Formatter workspace displays one paste-ready Edit surface rather than separate Input and Output columns; invoking New focuses that surface.
- **AC-2:** Pasting a detected hard-wrapped paragraph automatically stores the cleaned text, switches to formatted Preview, and reports the exact number of removed accidental line breaks.
- **AC-3:** Lists, headings, code fences, Markdown tables, intentional paragraph breaks, short column data, and parsed table matrices retain their established structure.
- **AC-4:** Preview and Edit operate on one grid value; no output override, reset-to-input state, or duplicate editable source remains.
- **AC-5:** One Undo after paste cleanup restores the raw pasted text, and the next Undo restores the workspace state from before the paste.
- **AC-6:** Populated and restored cells default to Preview; empty cells default to Edit; mode state is transient and excluded from persistence/history.
- **AC-7:** Preview keeps sanitized formatted rendering, Catalyst/Word copy, Excel copy, selectable content, keyboard access, and visible focus.
- **AC-8:** New clears persisted Formatter content, returns to one empty focused Edit cell, and does not alter Comparison's independent state.
- **AC-9:** Existing version-1 workspaces migrate to the grid-only version-2 format without losing valid manually edited output values.
- **AC-10:** Split Formatter Focus mode and its controls/shortcut are removed; Comparison, grid layouts, Smart Cleanup, formatting tools, themes, typography, undo/redo, and settings remain available.
- **AC-11:** The visible interface states the automatic-wrap-cleanup purpose and presents Copy as the primary post-paste action.
- **AC-12:** Automated and rendered verification passes with no WCAG 2.1 A/AA violation, horizontal overflow, toolbar clipping, or sub-44px mobile target regression.

## Criterion-to-verification mapping

| Criteria | Verification |
| --- | --- |
| AC-1, AC-2, AC-6, AC-11 | Playwright empty-state and hard-wrapped-paste scenario at desktop and mobile widths |
| AC-3 | Existing reliability suite plus targeted paste scenarios for lists and tables |
| AC-4 | Typecheck with removed override APIs; Edit/Preview Playwright scenario; workspace persistence payload assertion |
| AC-5 | Grid-history unit test and Playwright two-step Undo scenario |
| AC-7 | Existing clipboard/HTML tests, keyboard interaction, and Axe scan in Preview |
| AC-8 | New/Comparison Playwright state-preservation scenario |
| AC-9 | Version-1-to-version-2 persistence migration unit tests |
| AC-10 | Typecheck/reference cleanup plus grid, formatting, Comparison, and Header scenarios |
| AC-12 | Full verification command sequence and rendered viewport matrix |
