# Standalone Comparison workspace implementation plan

## Goal

Implement the approved standalone design in
`docs/specs/2026-09-02-standalone-comparison-workspace-design.md`. Replace the per-output-cell
comparison modal with a dedicated in-app Comparison mode containing blank Left and Right editors,
an aligned word-level diff result, and reversible navigation that leaves the Formatter workspace
unchanged.

The aligned line/word engine in `src/utils/lineDiff.ts` is already implemented and tested. This
plan preserves that engine and changes only its consumer and product surface.

## Phase 0: Documentation discovery

### Sources consulted

- `docs/specs/2026-09-02-standalone-comparison-workspace-design.md:1-164` — authoritative scope,
  mode state, blank editor workflow, neutral labels, retention rules, non-modal behavior, layout,
  testing, and acceptance criteria.
- `docs/specs/2026-09-02-word-level-comparison-design.md:30-66, 94-138` — retained aligned
  line/word engine and edge-case contract.
- `docs/plans/2026-09-02-word-level-comparison-plan.md:1-352` — completed engine/renderer plan,
  reusable result-rendering locations, and verification conventions.
- `AGENTS.md:1-71` — repository architecture, responsive Header behavior, commands, and required
  verification order.
- `src/App.tsx:1-48, 235-355` — formatter state ownership, Header/body composition, current
  comparison modal state, and persistence boundaries.
- `src/components/Header.tsx:20-55, 94-164, 363-445` — Header props, desktop controls, mobile
  menu, and 44px mobile action pattern.
- `src/components/ComparisonDialog.tsx:1-229` — completed aligned renderer and modal-only behavior
  to separate/remove.
- `src/components/Preview.tsx:10-35, 250-288` and `src/components/OutputCell.tsx:11-32, 195-216`
  — per-cell comparison props and controls to remove.
- `src/utils/lineDiff.ts:1-253` and `src/utils/__tests__/lineDiff.test.ts:1-194` — stable pure
  engine API and regression matrix to retain.
- `src/hooks/useWorkspacePersistence.ts:4-87` — formatter-only storage key and state boundary.
- `tests/a11y.spec.ts:87-170` — modal-centric comparison tests to replace.
- `package.json:6-47`, `vite.config.ts:15-18`, and `playwright.config.ts:4-24` — installed APIs,
  unit-test discovery, and browser test configuration.
- `src/styles/themes.css:1-171` — theme variables available to the new workspace/result view.

### Allowed APIs and patterns

- Existing pure `diffLines(leftText, rightText)` and exported diff types from
  `src/utils/lineDiff.ts`; do not reimplement the engine.
- React `useState`, controlled `<textarea>` elements, callbacks, and optional `useMemo`.
- Native `hidden` on persistently mounted Formatter and Comparison workspace siblings so inactive
  controls leave the accessibility tree while local state survives mode changes.
- Existing Tailwind utilities, theme variables (`--bg-color`, `--panel-bg`, `--surface-bg`,
  `--border-color`, `--text-primary`, `--text-secondary`, `--primary-blue`), and Lucide icons.
- Existing Header desktop/mobile button styling and minimum 44px touch-target pattern.
- React text-node rendering for pasted source; semantic `data-diff-*` hooks for Playwright.
- Vitest for retained utility tests; Playwright and Axe for app interaction/accessibility tests.

### Explicit architecture decisions

- Add `appMode: 'formatter' | 'comparison'` to `App`.
- Keep the common Header mounted in both modes. Its app-level button toggles Comparison mode and
  exposes `aria-pressed`; the Comparison workspace also provides an explicit `Back to Formatter`
  action.
- Mount Formatter and `ComparisonWorkspace` once as sibling bodies and toggle native `hidden`.
  This preserves child state while preventing inactive controls from being keyboard- or
  screen-reader-visible.
- `ComparisonWorkspace` locally owns `leftText`, `rightText`, and `view: 'editing' | 'result'`.
  It starts blank on a fresh page load and retains values/result while the App session remains
  alive. It receives only `onBackToFormatter`.
- Extract the aligned result into a neutral `ComparisonResult` component. Use `Left`/`Right` in
  visible labels, accessible labels, and diff-side hooks; no `Input`/`Output` terminology remains
  in the comparison surface.
- Delete `ComparisonDialog` and remove all per-cell Compare props/state/controls. Formatter input,
  output overrides, history, focus mode, and persistence APIs remain unchanged.

### Anti-pattern guards

- Do not initialize comparison sides from formatter grid cells or effective output.
- Do not retain per-cell Compare buttons, callback plumbing, row/column selection state, or modal
  trigger refs.
- Do not keep `ComparisonDialog` as a compatibility modal or carry over `inert`, focus trap,
  backdrop, Escape-close, or modal focus-restoration behavior.
- Do not conditionally unmount `ComparisonWorkspace` when Formatter is shown; native `hidden` is
  required for same-session retention.
- Do not persist comparison values in `text-markdown-formatter:workspace`, a new storage key, or
  `useGridHistory`.
- Do not label comparison sides Input/Output, add a router/popup/browser tab, or add dependencies.
- Do not create independently scrolling result columns or use `dangerouslySetInnerHTML`.
- Do not disable Compare for empty content or clear either side during Compare, Edit, Back, or
  re-entry.
- Do not modify Vite HMR/manual chunk settings or unrelated formatter behavior.

## Phase 1: Extract a neutral aligned result component

### What to implement

Copy only the pure presentation patterns from the completed
`src/components/ComparisonDialog.tsx`: label/prefix/segment helpers, per-side line rendering, and
the shared two-column aligned result grid. Create `src/components/ComparisonResult.tsx` with no
modal props or lifecycle.

The component should accept `leftText` and `rightText`, call `diffLines(leftText, rightText)`, and
render Left/Right headings, line numbers, non-color add/remove cues, stronger changed-segment
highlights, null-side spacers, identical messaging, and both-empty content. Keep a single shared
scroll container for result rows and retain stable semantic hooks (`data-diff-row`,
`data-diff-side="left|right"`, `data-diff-kind`, `data-diff-segment`, `data-line-number`).

### Task checklist

- [x] Create `src/components/ComparisonResult.tsx` from the reusable renderer portions of
  `ComparisonDialog`.
- [x] Change all visible and accessible terminology to Left and Right.
- [x] Render aligned rows from `diff.rows` with real line numbers and null-side spacer cells.
- [x] Preserve line-level add/remove backgrounds, visible prefixes, and changed word segments.
- [x] Preserve exact identical, empty-side, whitespace-only, LF/CRLF, and trailing-newline
  behavior from the utility contract.
- [x] Keep source text in React text nodes and retain semantic browser hooks.
- [x] Ensure the result uses one shared scroll region at narrow widths.
- [x] Remove modal-only props, refs, effects, dialog roles, backdrop, and close control from the
  extracted presentation.

### Documentation references

- Copy helpers from `src/components/ComparisonDialog.tsx:16-31`.
- Copy/adapt row rendering from `src/components/ComparisonDialog.tsx:81-135`.
- Copy/adapt aligned grid and empty state from `src/components/ComparisonDialog.tsx:171-225`.
- Preserve the utility contract in `src/utils/lineDiff.ts:1-253` and its tests at
  `src/utils/__tests__/lineDiff.test.ts:1-194`.
- Follow neutral-label and non-modal requirements in
  `docs/specs/2026-09-02-standalone-comparison-workspace-design.md:69-110`.

### Verification checklist

- [x] `ComparisonResult` has no `open`, `onClose`, `backgroundRef`, or `triggerRef` props.
- [x] Rendered headings and `data-diff-side` values are Left/Right only.
- [x] Result row count and spacer pairing match `diffLines` output.
- [x] No modal roles, inert mutations, focus traps, backdrops, or Escape handlers exist in the
  result component.
- [x] Existing aligned diff unit tests remain green.
- [x] `npx eslint src/components/ComparisonResult.tsx` and targeted Prettier checks pass.

### Acceptance criteria covered

AC3, AC5, AC6, AC9, AC10.

## Phase 2: Build the standalone Comparison workspace

### What to implement

Create `src/components/ComparisonWorkspace.tsx` with local `leftText`, `rightText`, and
`view: 'editing' | 'result'` state. The editing state starts with two blank, controlled textareas
and labels/placeholders using only Left and Right terminology. Compare remains enabled for all
content states and switches to the result state without clearing values.

The result state composes `ComparisonResult`, provides `Edit comparison` to return to editing with
both values intact, and provides `Back to Formatter` that only invokes its navigation callback.
Editing state may stack Left and Right on narrow screens; result state must retain a shared
horizontal scroll grid. The component does not receive formatter data, persistence, history, mode,
or modal refs.

### Task checklist

- [ ] Add `ComparisonWorkspace` with local blank Left/Right text and editing/result state.
- [ ] Render accessible `label`/`textarea` pairs with stable IDs
  `comparison-left-textarea` and `comparison-right-textarea`.
- [ ] Add paste-friendly placeholders, Compare, Edit comparison, and Back to Formatter controls.
- [ ] Keep Compare enabled for empty, one-sided, whitespace-only, and populated text.
- [ ] Preserve both sides when entering result, returning to edit, navigating back, and re-entering
  during the same App session.
- [ ] Ensure no stale result remains visible while editing.
- [ ] Compose `ComparisonResult` with Left/Right labels and aligned row hooks.
- [ ] Keep editing usable on narrow screens and result rows in one shared scroll container.
- [ ] Use theme variables and React text nodes; add no persistence or formatter-state calls.

### Documentation references

- Follow state and boundary requirements in
  `docs/specs/2026-09-02-standalone-comparison-workspace-design.md:43-68, 112-126`.
- Follow controlled textarea structure from `src/components/EditorCell.tsx:369-386`.
- Follow existing button/focus styling from `src/components/OutputCell.tsx:140-213` and
  `src/components/Header.tsx:94-164`.
- Reuse the result component from Phase 1 and pure engine from `src/utils/lineDiff.ts:218-253`.

### Verification checklist

- [ ] Fresh mount shows blank Left and Right textareas.
- [ ] Filling one side never changes the other side.
- [ ] Compare switches to a result without changing either string.
- [ ] Edit comparison returns to both textareas with exact values preserved.
- [ ] Back to Formatter calls only the supplied navigation callback.
- [ ] Re-entering while mounted preserves text and current editing/result view.
- [ ] The workspace has no `role="dialog"`, `aria-modal`, inert mutation, backdrop, focus trap,
  or modal Escape handling.
- [ ] Empty and identical result states remain explicit.

### Acceptance criteria covered

AC2, AC3, AC4, AC5, AC6, AC7, AC9, AC10.

## Phase 3: Integrate app mode and remove the per-cell surface

### What to implement

Add `appMode` to `App` and pass a mode-aware toggle callback into the common Header. Keep the
existing Header mounted and add the app-level Comparison Mode action in both desktop controls and
the mobile navigation menu. It must expose its active state through `aria-pressed` or equivalent
semantics and preserve the mobile menu’s close-after-action behavior.

Mount the existing Formatter body and `ComparisonWorkspace` as persistent sibling bodies. Toggle
native `hidden` so both local workspaces survive mode changes while inactive controls disappear
from the accessibility tree. `Back to Formatter` changes only `appMode`.

Remove the old per-cell comparison state, props, callback threading, modal rendering, and
`ComparisonDialog.tsx`. Do not modify formatter data flow, output override precedence, history,
persistence, or theme behavior.

### Task checklist

- [ ] Add `AppMode` and `appMode` state to `src/App.tsx`.
- [ ] Keep Header common and add an app-level Comparison Mode callback/active-state prop.
- [ ] Add a desktop Comparison Mode action near existing Header session actions.
- [ ] Add the same action to the mobile menu with a minimum 44px target and menu dismissal.
- [ ] Mount Formatter and `ComparisonWorkspace` once and toggle native `hidden` wrappers.
- [ ] Wire `Back to Formatter` to switch only `appMode`.
- [ ] Remove `ComparisonDialog` import, state, trigger ref, callback, and JSX from `App.tsx`.
- [ ] Remove `onCompareCell` from `Preview` and `onCompare` from `OutputCell` plus the per-cell
  Compare button.
- [ ] Delete `src/components/ComparisonDialog.tsx` after its renderer is transferred.
- [ ] Verify no `Compare input and output`, `Input Markdown`, or `Effective Output` comparison
  labels remain in production code.
- [ ] Leave `getOutputContent`, `useGridHistory`, `useWorkspacePersistence`, formatter grid, and
  output override behavior unchanged.

### Documentation references

- Add mode state around `src/App.tsx:33-41` and preserve common shell composition at
  `src/App.tsx:235-355`.
- Add Header callback props at `src/components/Header.tsx:20-35`.
- Copy desktop action structure from `src/components/Header.tsx:140-180`.
- Copy mobile action structure and menu dismissal from `src/components/Header.tsx:363-445`.
- Remove per-cell contracts at `src/components/Preview.tsx:10-35, 250-288` and
  `src/components/OutputCell.tsx:11-32, 195-216`.
- Preserve formatter persistence boundary from `src/hooks/useWorkspacePersistence.ts:4-87`.

### Verification checklist

- [ ] Comparison Mode is reachable from desktop Header and mobile menu.
- [ ] Active mode is communicated with `aria-pressed` or equivalent.
- [ ] Formatter content survives entering and leaving Comparison mode unchanged.
- [ ] Comparison state survives hide/re-enter within one App session.
- [ ] Inactive workspace controls are absent from the accessibility tree via native `hidden`.
- [ ] No per-cell Compare controls or modal comparison identifiers remain.
- [ ] No formatter persistence/history APIs receive comparison values.
- [ ] Existing formatter behavior is unchanged outside the new mode.

### Acceptance criteria covered

AC1, AC3, AC8, AC10.

## Phase 4: Replace browser regression coverage

### What to implement

Replace the modal-centric comparison tests in `tests/a11y.spec.ts` with standalone workspace flows.
Keep the global Axe test and unrelated dialog tests intact. Use stable IDs/roles for Header,
mobile navigation, Left/Right textareas, Compare, Edit comparison, Back to Formatter, and semantic
diff hooks.

The main flow should enter Comparison from a populated Formatter workspace, verify blank comparison
editors on first entry, fill independent content, compare, assert word/line/spacer states, edit
again, navigate back, and prove the original Formatter value remains unchanged. Add empty/identical,
mobile, no-modal, and re-entry retention coverage.

### Task checklist

- [ ] Remove assertions for per-cell Compare buttons, modal role, inert state, backdrop, Escape
  closure, and trigger-focus restoration.
- [ ] Assert the desktop app-level Comparison Mode action and absence of per-cell Compare controls.
- [ ] Assert mobile menu exposes Comparison Mode and closes after activation.
- [ ] Assert first entry presents blank, independently labeled Left and Right textareas.
- [ ] Fill independent multiline values and assert Compare produces Left/Right aligned output,
  changed segments, line kinds, and spacer rows.
- [ ] Assert exact identical and empty-side states.
- [ ] Assert Edit comparison preserves both values and restores editable controls.
- [ ] Assert Back to Formatter preserves formatter input/output and re-entry preserves comparison
  session state.
- [ ] Assert comparison is not a dialog, does not set `inert`, and does not trap Tab.
- [ ] Assert narrow editing layout and shared-scroll result behavior.
- [ ] Run targeted `npm run test:a11y -- --grep comparison` or the repository-equivalent filter
  against a built preview.

### Documentation references

- Replace old comparison tests at `tests/a11y.spec.ts:87-170`.
- Follow test selectors and Playwright configuration from `tests/a11y.spec.ts:1-30` and
  `playwright.config.ts:4-24`.
- Use Editor/Output IDs only to establish unchanged Formatter state; comparison selectors come
  from the new component contract.
- Verify browser behavior against
  `docs/specs/2026-09-02-standalone-comparison-workspace-design.md:128-143`.

### Verification checklist

- [ ] Desktop and mobile mode-entry flows pass.
- [ ] Blank Left/Right, independent editing, Compare, Edit, Back, and re-entry assertions pass.
- [ ] Diff result assertions prove word highlights and spacer rows.
- [ ] Formatter state is unchanged after all mode transitions.
- [ ] No-modal semantics are asserted and Axe reports no new violations.
- [ ] Narrow layout has usable editing and one shared result scroll region.

### Acceptance criteria covered

AC1 through AC11.

## Phase 5: Full verification and reconciliation

### What to implement

Run focused unit/browser checks, then the repository-required verification order. Review the final
diff for stale modal/per-cell terminology and accidental formatter-state changes. Do not update
README or release copy unless existing claims become incorrect; this is a surface change to the
already documented comparison capability.

### Task checklist

- [ ] Run `npx vitest run src/utils/__tests__/lineDiff.test.ts`.
- [ ] Run targeted Prettier checks on all touched source/test files and inspect the Markdown plan.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run a11y:check` against the built preview.
- [ ] Run `git diff --check` and inspect the final diff/stat.
- [ ] Confirm no new dependency, route, popup, storage key, or formatter API change exists.
- [ ] Manually inspect desktop/narrow and light/dark Comparison editing/result states.
- [ ] Record any pre-existing repository-wide formatting warnings without reformatting unrelated
  files.

### Documentation references

- Follow verification order in `AGENTS.md:18` and scripts in `package.json:6-17`.
- Follow built preview requirements in `playwright.config.ts:14-18`.
- Use stale-surface searches for `ComparisonDialog`, `compare-cell-btn`, `onCompareCell`,
  `Input Markdown`, and `Effective Output`.
- Reconcile against the controlling acceptance criteria at
  `docs/specs/2026-09-02-standalone-comparison-workspace-design.md:146-158`.

### Verification checklist

- [ ] Focused and full unit suites pass.
- [ ] Lint and strict TypeScript pass.
- [ ] Production build succeeds without dependency/chunk changes.
- [ ] Full Playwright/Axe suite passes.
- [ ] Final source has no stale per-cell/modal comparison contract.
- [ ] Desktop, narrow, light, and dark states are manually usable.
- [ ] Every acceptance criterion has direct unit, browser, or manual evidence.

### Acceptance criteria covered

AC1 through AC11.

## Consolidated task list

- [x] Phase 1: Extract the neutral aligned result component.
- [ ] Phase 2: Build the standalone Comparison workspace.
- [ ] Phase 3: Integrate app mode and remove the per-cell modal surface.
- [ ] Phase 4: Replace browser/accessibility coverage with standalone flows.
- [ ] Phase 5: Run full verification and reconcile stale documentation/terminology.

## Acceptance Criteria

1. Comparison mode is launched from a dedicated app-level action, not from individual output cells.
2. Entering Comparison mode displays blank editable Left and Right containers.
3. The comparison UI labels the sides Left and Right rather than Input and Output.
4. Users can paste or type independent content into both sides.
5. Compare displays an aligned side-by-side diff with line and word-level discrepancy highlighting.
6. Inserted or deleted lines produce blank spacer rows on the opposite side.
7. Users can return to editing without losing either pasted side.
8. Users can return to Formatter mode without changing the formatter workspace.
9. The comparison view works at desktop and narrow responsive widths.
10. Comparison controls and editable regions remain keyboard and screen-reader accessible.
11. Automated tests cover entering the mode, editing both sides, comparing, editing again, and returning to Formatter mode.
