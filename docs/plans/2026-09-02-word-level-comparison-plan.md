# Word-level side-by-side comparison implementation plan

## Goal

Implement the approved design in
`docs/specs/2026-09-02-word-level-comparison-design.md`: replace the current positional,
whole-line comparison with a deterministic aligned line diff and lossless word-level highlighting,
while preserving the existing read-only wiring, modal lifecycle, theme behavior, and accessibility
contract.

## Phase 0: Documentation discovery

### Sources consulted

- `docs/specs/2026-09-02-word-level-comparison-design.md:1-152` — approved scope,
  two-stage LCS approach, aligned-row model, responsive behavior, edge cases, testing requirements,
  and acceptance criteria.
- `src/utils/lineDiff.ts:1-38` — current exported diff types and positional
  `diffLines(input, output)` implementation.
- `src/utils/__tests__/lineDiff.test.ts:1-27` — existing Vitest utility-test conventions and
  current comparison coverage.
- `src/components/ComparisonDialog.tsx:1-130` — current diff consumer, independent panels,
  add/remove styling, dialog semantics, focus trap, Escape behavior, backdrop close, inert state,
  and focus restoration.
- `src/components/AboutDialog.tsx:68-102, 123-158` — safer previous-inert-state restoration and
  backdrop/focus patterns.
- `src/components/OutputCell.tsx:201-213` — existing stable Compare control, ID, and accessible
  name.
- `src/components/Preview.tsx:256-282` — existing per-cell comparison callback threading.
- `src/App.tsx:101-102, 159-178, 318-352` — comparison selection, raw input, effective output,
  output-override precedence, trigger capture, and dialog mounting.
- `tests/a11y.spec.ts:31-100` — Playwright/Axe dialog, inert, focus, Escape, backdrop, and comparison
  regression patterns.
- `src/styles/themes.css:1-171` — existing theme variables across light and dark themes.
- `tsconfig.json:1-23` and `vite.config.ts:15-18` — ES2022 strict TypeScript and Vitest/jsdom test
  discovery.
- `package.json:6-47` and `playwright.config.ts:4-24` — available scripts, installed APIs, preview
  server, and Chromium project.
- `docs/plans/2026-08-28-workspace-comparison-release-plan.md:1-169` — repository plan structure,
  implementation-phase format, and verification precedent.
- `AGENTS.md:1-71` — repository commands, required verification order, architecture, and gotchas.

### Allowed APIs and patterns

- Preserve the public entry point `diffLines(input: string, output: string): LineDiff` while
  changing its result from independent arrays to aligned rows.
- Use pure TypeScript arrays, interfaces, loops, string operations, and deterministic
  dynamic-programming LCS tables.
- Use a Unicode-aware, lossless token pattern equivalent to
  `/\s+|[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]+/gu`; token segments must concatenate to the exact source
  line.
- Use one-based original line numbers on real sides and `null` for a missing/spacer side.
- Use React text nodes, `useEffect`, `useRef`, and optionally `useMemo`; never execute comparison
  content as HTML.
- Copy existing dialog semantics and focus behavior from `ComparisonDialog`, with the safer
  previous-inert-state restoration from `AboutDialog`.
- Use the existing theme variables and low-opacity emerald/rose line treatments, with stronger
  same-hue segment highlights and non-color change cues.
- Use Vitest for the pure diff model and Playwright/Axe for rendered interaction and accessibility
  coverage.
- Add semantic `data-*` hooks for diff rows, sides, kinds, line numbers, and segments when browser
  assertions need stable selectors.

### Explicit algorithm decisions

- `diffLines` keeps exact identity as `input === output`, matching the approved spec. LF and CRLF
  are accepted as line separators for alignment; newline-style-only differences do not fabricate
  changed content.
- An entirely empty string produces no logical lines. A non-empty string ending in LF or CRLF
  preserves its terminal empty logical line so the explicit trailing newline is represented and
  tested consistently.
- Line-LCS backtracking prefers a removal when continuation lengths tie. This makes repeated-line
  alignment deterministic.
- A contiguous non-matching line block is paired by order up to the smaller removed/added count.
  Remaining lines become addition/deletion rows with `null` on the opposite side.
- Paired replacement lines receive token LCS. Punctuation and whitespace are independent,
  preserved tokens; adjacent segments with the same changed state are coalesced.
- An unpaired added or removed line is wholly changed. A same line has one unchanged segment when
  non-empty and no segments when empty.

### Anti-pattern guards

- Do not add a diff or component-testing dependency.
- Do not retain independent left/right arrays or independently scrolling columns.
- Do not compare lines only by their array index or globally diff words across newline boundaries.
- Do not pair replacements across an unchanged-line anchor.
- Do not collapse whitespace or punctuation with `split(/\s+/)` or similar tokenization.
- Do not fabricate text, line number `0`, or a fake line object for spacer cells.
- Do not rely on emerald/rose color alone; retain visible prefixes and accessible change labels.
- Do not use `dangerouslySetInnerHTML`, make spacers focusable, or couple utility data to Tailwind
  classes.
- Do not mutate grid/output state, add merge controls, truncate large comparisons, or change
  App/Preview/OutputCell APIs without a demonstrated need.
- Do not force `background.inert = false` during cleanup; restore the value present before the
  dialog opened.
- Do not modify Vite HMR guards or manual chunk configuration.

## Phase 1: Aligned diff model and unit tests

### What to implement

Copy the existing exported entry-point pattern from `src/utils/lineDiff.ts:14`, then replace its
parallel `input`/`output` result with an explicit aligned model:

- `DiffSegment { text: string; changed: boolean }`.
- `DiffLine { kind; text; lineNumber; segments }`.
- `AlignedDiffRow { left: DiffLine | null; right: DiffLine | null }`.
- `LineDiff { identical; inputEmpty; outputEmpty; rows }`.

Build small private helpers for line splitting, LCS-table construction/backtracking, change-block
pairing, tokenization, token-segment diffing, and adjacent-segment coalescing. Keep these helpers
pure and colocated in `src/utils/lineDiff.ts` unless implementation size makes one focused helper
module materially clearer.

Write the result contract in tests before completing the algorithm so alignment, token
reconstruction, tie-breaking, and empty/newline behavior cannot drift.

### Task checklist

- [x] Replace the independent-array types in `src/utils/lineDiff.ts` with aligned row, line, and
  segment types while retaining the `diffLines(input, output)` signature.
- [x] Add exact unit assertions for identical multiline input and one-based line numbers.
- [x] Add replacement tests proving unchanged context and changed words are segmented correctly.
- [x] Add punctuation/repeated-whitespace tests proving joined segments exactly reconstruct each
  original line.
- [x] Add middle insertion and deletion tests proving unchanged anchors remain aligned and the
  opposite side is `null`.
- [x] Add unequal replacement-block and repeated-line tests that lock down ordered pairing and the
  removal-first LCS tie-break.
- [x] Add empty-left, empty-right, both-empty, LF, CRLF, and trailing-newline tests.
- [x] Implement deterministic line LCS and primitive same/removed/added operations.
- [x] Implement per-block replacement pairing and spacer-row emission.
- [x] Implement lossless token LCS and adjacent-segment coalescing.
- [x] Add invariants for purity/determinism and `segments.map(...).join('') === line.text`.
- [x] Run `npx vitest run src/utils/__tests__/lineDiff.test.ts`.

### Documentation references

- Copy the public function boundary from `src/utils/lineDiff.ts:14-38`.
- Follow Vitest imports and suite structure from `src/utils/__tests__/lineDiff.test.ts:1-27`.
- Implement the approved line/token flow from
  `docs/specs/2026-09-02-word-level-comparison-design.md:30-66`.
- Implement empty/newline behavior from
  `docs/specs/2026-09-02-word-level-comparison-design.md:94-104`.
- Respect strict compilation constraints from `tsconfig.json:1-23`.

### Verification checklist

- [x] Identical rows populate both sides with `same`, exact text, and correct line numbers.
- [x] An insertion or deletion leaves all following unchanged anchors aligned.
- [x] Replacement blocks pair only within their own non-matching block.
- [x] Unequal blocks use `null` spacers without fabricated content or line numbers.
- [x] Changed segments isolate replacement words while retaining unchanged context.
- [x] Every real line reconstructs exactly from its segments, including Unicode, punctuation, and
  repeated whitespace.
- [x] Repeated inputs return deeply equal results and repeated-line cases follow the documented
  tie-break.
- [x] Empty flags, exact identity, LF/CRLF splitting, and terminal blank-line behavior match the
  explicit decisions above.

### Acceptance criteria covered

AC3, AC5, AC6, AC7, AC8, AC11.

## Phase 2: Shared aligned comparison renderer

### What to implement

Replace the current `panel(title, lines, empty)` abstraction and independent panel lists in
`ComparisonDialog` with one shared scroll region. Its inner layout keeps two columns visible and
maps each `diff.rows` entry to one two-cell row, so the taller wrapped cell defines the shared row
height.

Render column headings, one-based line numbers for real lines, unchanged/add/remove prefixes,
line-level backgrounds, stronger changed-segment highlights, and noninteractive spacer cells.
Keep both columns in the same minimum-width grid on narrow screens and allow the shared container
to scroll horizontally; do not stack the entire input panel above the output panel.

Preserve the current dialog shell and lifecycle. Copy `AboutDialog`'s `wasInert` save/restore
pattern so cleanup restores previous state rather than unconditionally clearing it. Keep all
source content in React text nodes.

### Task checklist

- [ ] Replace independent panel mapping in `src/components/ComparisonDialog.tsx` with one shared
  aligned-row grid and shared vertical/horizontal scroll region.
- [ ] Add fixed column headings for `Input Markdown` and `Effective Output` inside the aligned
  comparison structure.
- [ ] Render real one-based line numbers and visible same/add/remove prefixes.
- [ ] Render line-level rose/emerald states and stronger highlights only around changed segments.
- [ ] Render `null` sides as visually blank, nonfocusable spacers with an accessible corresponding-
  line description and no fabricated line number.
- [ ] Add stable semantic hooks such as `data-diff-row`, `data-diff-side`, `data-diff-kind`,
  `data-diff-segment`, and `data-line-number`.
- [ ] Preserve the identical message and implement explicit both-empty `No content` cells.
- [ ] Keep raw Markdown/HTML-like text as escaped React text nodes.
- [ ] Copy prior-inert-state preservation from `AboutDialog` while retaining focus trap, Escape,
  backdrop close, close-button focus, and trigger focus restoration.
- [ ] Confirm mobile uses a shared horizontally scrollable two-column view, not two stacked or
  independently scrolling panels.

### Documentation references

- Replace the independent renderer at `src/components/ComparisonDialog.tsx:55-83, 123-125`.
- Copy the modal bounds, semantics, and focus lifecycle from
  `src/components/ComparisonDialog.tsx:25-53, 85-117`.
- Copy previous-inert-state preservation from `src/components/AboutDialog.tsx:68-102`.
- Reuse theme styles and non-color prefixes from `src/components/ComparisonDialog.tsx:58-78`.
- Implement aligned responsive rendering and accessibility from
  `docs/specs/2026-09-02-word-level-comparison-design.md:68-92`.

### Verification checklist

- [ ] Each DOM diff row contains exactly one input cell and one output cell.
- [ ] Changed lines remain aligned when one side wraps or is a spacer.
- [ ] Changed word spans are stronger than their line background and unchanged text is not given
  changed-segment styling.
- [ ] Addition/removal meaning remains available without color through prefixes and accessible
  labels.
- [ ] Real rows expose correct line numbers; spacers expose neither text nor a fake number.
- [ ] Identical, one-side-empty, and both-empty states are legible and correctly aligned.
- [ ] Narrow viewport content remains usable through one shared scroll region.
- [ ] Dialog content cannot execute Markdown or HTML-like source text.

### Acceptance criteria covered

AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC10.

## Phase 3: Integration and browser regression coverage

### What to implement

Preserve the existing Compare action and callback/data flow. Extend the current Playwright
comparison coverage with semantic assertions for raw/effective column content, aligned rows,
changed segments, spacers, empty/identical states, inert isolation, Tab wrapping, Escape,
backdrop close, focus restoration, and narrow-screen usability.

Set source/output content through stable application controls. Verify an edited effective output
is compared on the right without changing the raw left input, and verify opening/closing the
dialog does not mutate either value.

### Task checklist

- [ ] Retain `OutputCell`'s existing Compare ID and accessible name.
- [ ] Retain the Preview callback route and App's raw-input/effective-output operand selection.
- [ ] Extend `tests/a11y.spec.ts` or add a focused Playwright spec using semantic diff hooks rather
  than Tailwind class-string ordering.
- [ ] Verify raw input appears only in the input column and an edited effective override appears in
  the output column.
- [ ] Verify replacement rows contain changed-word segments on both sides.
- [ ] Verify insertion and deletion rows contain one real side and one spacer side.
- [ ] Verify `No differences found.` appears only for exact identity and empty states remain clear.
- [ ] Verify `#app-background` is inert while open and returns to its prior state after close.
- [ ] Verify initial close focus, Tab/Shift+Tab wrapping, Escape, backdrop close, and Compare-trigger
  focus restoration.
- [ ] Verify the aligned grid remains usable at a narrow viewport.
- [ ] Verify input and output values are unchanged after the dialog closes.

### Documentation references

- Preserve the Compare control at `src/components/OutputCell.tsx:201-213`.
- Preserve callback threading at `src/components/Preview.tsx:256-282`.
- Preserve trigger capture and raw/effective operands at `src/App.tsx:318-321, 344-352`.
- Extend Playwright patterns from `tests/a11y.spec.ts:31-100`.
- Use stable editor/output control IDs from `src/components/EditorCell.tsx:369-386` and
  `src/components/OutputCell.tsx:287-307` when preparing browser state.

### Verification checklist

- [ ] Every output cell still exposes the accessible Compare action.
- [ ] Normal and overridden output both supply the correct comparison operands.
- [ ] Browser assertions prove alignment, word highlights, spacers, and empty/identical states.
- [ ] Opening and closing comparison leaves workspace input and output unchanged.
- [ ] Axe finds no new WCAG 2.1 A/AA violations.
- [ ] Existing modal keyboard and focus behavior passes at desktop and narrow viewport sizes.

### Acceptance criteria covered

AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11.

## Phase 4: Full verification and reconciliation

### What to implement

Run focused checks, then the repository's required full verification order. Inspect the final diff
for accidental scope expansion. Update README or release copy only if existing wording becomes
incorrect; the comparison feature is already documented, so no copy change is expected.

### Task checklist

- [ ] Run `npx vitest run src/utils/__tests__/lineDiff.test.ts`.
- [ ] Run `npm run format:check` and correct formatting only in touched source/test files.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run a11y:check` against the built preview server.
- [ ] Run `git diff --check`.
- [ ] Review `git diff -- src/utils/lineDiff.ts src/utils/__tests__/lineDiff.test.ts
  src/components/ComparisonDialog.tsx tests/a11y.spec.ts`.
- [ ] Confirm no dependency, package-lock, Vite configuration, App/Preview/OutputCell API, or
  unrelated documentation change was introduced.
- [ ] Manually inspect desktop, narrow viewport, light-theme, and dark-theme comparison states for
  alignment and legibility.

### Documentation references

- Follow repository verification order from `AGENTS.md:18`.
- Use scripts from `package.json:6-17`.
- Respect the built preview/server contract from `playwright.config.ts:14-18`.
- Reconcile the completed result against
  `docs/specs/2026-09-02-word-level-comparison-design.md:140-152`.

### Verification checklist

- [ ] Focused and full unit suites pass.
- [ ] Lint and strict TypeScript pass without suppressions added for this feature.
- [ ] Production build succeeds without a new dependency or chunk change.
- [ ] Full Playwright/Axe suite passes against the built app.
- [ ] Final diff contains only the approved comparison enhancement and its tests.
- [ ] Every acceptance criterion below has direct unit, browser, or manual evidence.

### Acceptance criteria covered

AC1 through AC11.

## Consolidated task list

- [x] Phase 1: Implement and unit-test the aligned line/word diff model.
- [ ] Phase 2: Render aligned rows, word highlights, line numbers, and spacers in the dialog.
- [ ] Phase 3: Preserve integration and add browser/accessibility regression coverage.
- [ ] Phase 4: Run the complete verification sequence and inspect the final result.

## Acceptance Criteria

1. Every output cell retains an accessible Compare action.
2. Compare displays the raw input on the left and effective output on the right.
3. Corresponding unchanged and changed lines remain horizontally aligned.
4. Added and deleted lines use visually distinct, theme-compatible highlighting.
5. Replacement lines highlight the changed words rather than only the whole line.
6. Inserted or deleted lines produce a blank spacer row on the opposite side.
7. Identical content displays “No differences found.”
8. Empty input or output is represented clearly without breaking alignment.
9. Comparison never changes input or output state.
10. The dialog retains its existing keyboard, focus, responsive, and accessibility behavior.
11. Automated tests cover line alignment and word-level discrepancy highlighting.
