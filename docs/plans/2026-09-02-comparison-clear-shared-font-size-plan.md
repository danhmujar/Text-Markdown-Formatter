# Comparison Clear and Shared Font Size Implementation Plan

## Goal

Implement the approved follow-up in
`docs/specs/2026-09-02-comparison-clear-shared-font-size-design.md`: add a `Clear` action that
empties both Comparison sides and returns to blank editing, and make Comparison use the existing
Formatter `options.fontSize` setting without adding a second font-size state or control.

## Phase 0: Documentation discovery

### Sources consulted

- `docs/specs/2026-09-02-comparison-clear-shared-font-size-design.md:1-73` — controlling scope,
  state flow, units, accessibility, testing, and acceptance criteria.
- `src/components/ComparisonWorkspace.tsx:1-158` — local state, editing/result branches, and
  existing control IDs.
- `src/components/ComparisonResult.tsx:1-153` — result props, diff hooks, labels, and shared
  scroll region.
- `src/App.tsx:18-69,238-334` — `StyleOptions`, `options.fontSize`, and persistent workspace
  mounting.
- `src/components/Header.tsx:20-57,325-373,599-651` — existing desktop/mobile font-size controls,
  bounds, and `pt` display convention.
- `src/types.ts:5-19` — `StyleOptions.fontSize: number`.
- `src/utils/htmlBuilder.ts:99-104` — Formatter point-unit convention (`font-size: ...pt`).
- `tests/a11y.spec.ts:87-193` — current standalone Comparison browser selectors and flows.
- `AGENTS.md:3-18,20-27,54-70` — strict checks, responsive conventions, and verification order.

### Allowed APIs and patterns

- React `useState`, controlled textareas, normal buttons, and existing component props.
- Existing numeric `options.fontSize` passed through `App`, `ComparisonWorkspace`, and
  `ComparisonResult`.
- Inline point-size styles (`fontSize: \`${fontSize}pt\``) alongside existing Tailwind classes.
- Existing `data-diff-*` hooks and `aria-label="Side-by-side comparison"` region.
- Existing Header `+` controls and their 9–24 bounds; no Header API or control changes.
- Existing Playwright/Axe setup and stable Comparison IDs.
- Existing Lucide icons if a Clear icon is useful; no dependency additions.

### Explicit architecture decisions

- `ComparisonWorkspace` remains the owner of `leftText`, `rightText`, and `view`.
- `Clear` is a local handler that sets both strings to `''` and `view` to `'editing'`; it is
  available in both editing and result branches and does not require confirmation.
- `fontSize` is a read-only prop from Formatter state. No local font-size state, persistence, or
  Comparison-specific control is introduced.
- Apply the shared point size to editable textareas and the diff line text wrapper/rows, while
  leaving headings/status text and existing diff semantics unchanged.
- Existing mounted-but-hidden workspace boundaries, Formatter state, and no-modal behavior remain
  unchanged.

### Anti-pattern guards

- Do not add a second Comparison font-size control or state.
- Do not alter Header’s existing font-size bounds, labels, or behavior.
- Do not clear Formatter grid, output overrides, history, persistence, theme, or focus mode.
- Do not add a new storage key or persist Comparison values.
- Do not clear only one side, leave the result view active, or require a confirmation dialog.
- Do not change the diff algorithm, row alignment, line numbers, spacers, or `data-diff-*` hooks.
- Do not scale unrelated Comparison headings/status text unintentionally.
- Do not add modal behavior, routing, popups, browser tabs, or dependencies.

## Phase 1: Add Clear and shared font-size plumbing

### What to implement

Extend the existing Comparison components using the exact prop and control patterns discovered in
Phase 0. Add `fontSize: number` to both component prop interfaces, pass `options.fontSize` from
`App`, and apply point-size styles to both editable textareas and diff rows. Add one `Clear` button
with stable ID `comparison-clear-btn` to each view; both buttons invoke the same local clear handler.

### Task checklist

- [ ] Add `fontSize: number` to `ComparisonWorkspaceProps` and `ComparisonResultProps`.
- [ ] Pass `fontSize={options.fontSize}` from the existing `App` Comparison mount.
- [ ] Add a local `clearComparison` handler that clears both strings and returns to editing.
- [ ] Render `comparison-clear-btn` with visible `Clear` text, `type="button"`, and focus styles
      in editing and result controls.
- [ ] Apply `${fontSize}pt` to both Comparison textareas without changing placeholders or labels.
- [ ] Apply `${fontSize}pt` to diff line text while preserving line numbers, prefixes, highlights,
      spacers, empty states, and shared scrolling.
- [ ] Keep the Formatter Header controls and all persistence/history wiring unchanged.

### Documentation references

- Prop and mount locations: `src/components/ComparisonWorkspace.tsx:5-17`,
  `src/components/ComparisonResult.tsx:5-34`, `src/App.tsx:329-331`.
- Clear control insertion points: `src/components/ComparisonWorkspace.tsx:117-152`.
- Existing font-size control convention: `src/components/Header.tsx:325-373,599-651`.
- Point-unit rendering convention: `src/utils/htmlBuilder.ts:99-104`.

### Verification checklist

- [ ] TypeScript accepts the new required props at every call site.
- [ ] Both editing and result views expose exactly one visible Clear control.
- [ ] Clear resets both values and view without touching Formatter state.
- [ ] Computed textarea and diff-line styles use the shared `fontSize` in `pt` units.
- [ ] No new font-size control, storage key, or formatter mutation path exists.
- [ ] Targeted lint and Prettier checks pass.

### Acceptance criteria covered

AC1, AC2, AC3, AC4, AC5.

## Phase 2: Extend browser regression coverage

### What to implement

Extend `tests/a11y.spec.ts` using its existing standalone Comparison flow. Verify Clear from result
and editing states, exact blank values, and return to editing. Verify the existing Formatter
font-size increase control changes Comparison textarea and diff row computed styles, while the
Comparison UI exposes no separate font-size controls and existing retention/isolation behavior
continues to pass.

### Task checklist

- [ ] Add a Clear flow after comparing populated Left/Right content and verify both blank textareas
      plus editing controls are restored.
- [ ] Verify Clear is available and harmless for already-empty sides.
- [ ] Increase Formatter font size through `#font-size-increase-btn`, enter Comparison, and assert
      both textareas use the matching point size.
- [ ] Compare content and assert diff line text uses the same point size.
- [ ] Assert no Comparison-specific font-size control or duplicate font-size state is exposed.
- [ ] Preserve existing mode-entry, retention, formatter-isolation, responsive, and Axe coverage.

### Documentation references

- Existing Comparison flow/selectors: `tests/a11y.spec.ts:87-193`.
- Formatter desktop font-size control: `src/components/Header.tsx:338-362`.
- Existing point-size output behavior: `src/utils/htmlBuilder.ts:99-104`.
- Built-preview configuration: `playwright.config.ts:4-24`.

### Verification checklist

- [ ] Clear assertions prove both sides are empty and result content is gone.
- [ ] Font-size assertions prove `14pt → 15pt` (or current value plus one) in editors and diff rows.
- [ ] No new Comparison font-size control is present.
- [ ] Existing browser tests remain green at desktop and narrow widths.
- [ ] Axe reports no new violations.

### Acceptance criteria covered

AC1 through AC6.

## Phase 3: Full verification and reconciliation

### What to implement

Run focused checks, then the repository-required verification order. Inspect the final diff for
accidental Formatter changes, stale reset wording, unintended font-size state, and generated test
artifacts. Update this plan’s checkboxes only after evidence exists.

### Task checklist

- [ ] Run focused Comparison/browser tests and inspect results.
- [ ] Run targeted Prettier checks and `git diff --check`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run a11y:check` against the built preview.
- [ ] Confirm no dependency, route, popup, storage, or Formatter API changes were introduced.
- [ ] Confirm Clear and shared font-size behavior in desktop/narrow light/dark states.
- [ ] Remove generated test artifacts and inspect final status/stat.

### Documentation references

- Verification order: `AGENTS.md:18`.
- Scripts and preview setup: `package.json:6-17`, `playwright.config.ts:14-18`.
- Stale-surface searches: `ComparisonDialog`, `compare-cell-btn`, `onCompareCell`, `Input Markdown`,
  `Effective Output`, `resetComparison`, and Comparison-local font-size controls.

### Verification checklist

- [ ] Focused and full unit suites pass.
- [ ] Lint and strict TypeScript pass.
- [ ] Production build succeeds without dependency/chunk changes.
- [ ] Full Playwright/Axe suite passes.
- [ ] Final source has no stale per-cell/modal contract or separate font-size state.
- [ ] Clear and shared font-size behavior is manually usable at desktop/narrow and light/dark.
- [ ] Every acceptance criterion has direct browser, source, or manual evidence.

### Acceptance criteria covered

AC1 through AC6.

## Consolidated task list

- [ ] Phase 1: Add Clear and shared font-size plumbing.
- [ ] Phase 2: Extend browser regression coverage.
- [ ] Phase 3: Run full verification and reconcile documentation.

## Acceptance Criteria

1. A `Clear` control is visible in Comparison mode.
2. Clicking `Clear` empties both sides and returns to editing.
3. Formatter font-size changes are reflected in Comparison editors and results.
4. Comparison does not gain a separate font-size state or control.
5. Existing comparison retention and Formatter behavior remain intact.
6. Automated tests cover Clear and shared font-size behavior.
