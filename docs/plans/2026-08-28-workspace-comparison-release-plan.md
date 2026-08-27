# Workspace, Comparison, and Release Information Implementation Plan

## Goal

Implement the approved enhancements in `docs/specs/2026-08-28-workspace-comparison-release-design.md`: local workspace persistence, side-by-side comparison, and version/changelog information.

## Phase 0: Documentation discovery

### Sources consulted

- `docs/specs/2026-08-28-workspace-comparison-release-design.md:1-88` — approved scope, data contracts, dialog behavior, and acceptance criteria.
- `src/App.tsx:1-30, 67-106, 158-221, 234-320` — grid/history state, clear/new behavior, effective output resolution, overrides, reset, and shell composition.
- `src/hooks/useGridHistory.ts:1-25, 105-160, 162-234` — `GridHistoryState`, cloning, debounced history, `updateGrid`, `updateOutputOverrides`, `updateAll`, undo, and redo APIs.
- `src/hooks/useTheme.ts:1-68` — safe localStorage read/parse/validation and effect persistence pattern.
- `src/components/Preview.tsx:11-24, 249-318` — Preview props and per-cell effective output wiring.
- `src/components/OutputCell.tsx:10-31, 120-250` — output cell props and header control placement.
- `src/components/AboutDialog.tsx:1-74` — existing About FAB, dialog semantics, focus lifecycle, inert isolation, and mobile scrolling.
- `src/components/ui/EditorSettingsPanel.tsx:1-105` — existing focus, Escape, Tab, and dialog conventions.
- `tests/a11y.spec.ts:1-61` — Playwright and Axe conventions for dialog semantics and focus behavior.
- `src/hooks/__tests__/useGridHistory.test.ts:1-115` — jsdom hook testing with React roots and fake timers.
- `src/utils/__tests__/markdownFormatter.test.ts:1-81` — Vitest utility test conventions.
- `package.json:1-50` — package version (`0.0.0`), scripts, and available dependencies.
- `README.md:1-17, 68-74, 103-116` — documented stack and feature claims.

### Allowed APIs and patterns

- React hooks already used by the app: `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`.
- `localStorage.getItem`, `setItem`, and `removeItem` wrapped in `try/catch`, following `src/hooks/useTheme.ts:3-12, 42-54`.
- Existing `useGridHistory` update APIs and `getOutputContent` override precedence from `src/App.tsx:158-221`.
- Existing OutputCell/Preview callback props from `src/components/Preview.tsx:11-24` and `src/components/OutputCell.tsx:10-31`.
- Existing dialog accessibility/focus patterns from `src/components/AboutDialog.tsx:24-46` and `src/components/ui/EditorSettingsPanel.tsx:35-93`.
- Existing Vitest jsdom hook tests and Playwright/Axe tests.
- Existing package version as the current local release value; no unverified runtime version API exists.

### Anti-pattern guards

- Do not persist undo/redo history, theme settings, or transient dialog state in the workspace record.
- Do not save on every keystroke; debounce writes and clean up timers.
- Do not use `JSON.parse` without validation or let storage failures block startup.
- Do not compare only the raw grid when an output override exists; use `getOutputContent` precedence.
- Do not mutate input/output state from the comparison dialog.
- Do not add a diff dependency when a focused deterministic line-level utility is sufficient.
- Do not create nested competing inert/focus lifecycles; dialogs must coordinate ownership of background isolation.
- Do not fetch version or changelog data at runtime, add PWA behavior, or claim a version API that does not exist.
- Update About limitations so they no longer imply all session data disappears on refresh once persistence is added.

## Phase 1: Local workspace persistence

### What to implement

- Add `src/hooks/useWorkspacePersistence.ts` with a versioned storage key and a typed workspace record containing `grid` and `outputOverrides`.
- Read and validate saved data lazily on initialization; fall back to `[['']]` and `{}` for missing/invalid data.
- Expose restored initial state, a persistence effect or save callback, and a clear-storage callback with a small, explicit API.
- Integrate persistence with the existing App grid/history initialization without bypassing `useGridHistory`.
- Debounce writes and ensure timer cleanup on unmount.
- Extend `handleClearAll` so New/Clear removes the saved workspace.

### Documentation references

- Copy safe storage handling from `src/hooks/useTheme.ts:3-12, 42-54`.
- Copy state shape and cloning assumptions from `src/hooks/useGridHistory.ts:3-25`.
- Copy clear/new semantics from `src/App.tsx:87-105`.

### Verification checklist

- Fresh startup uses a blank one-cell workspace.
- Valid saved grid and overrides restore after reload.
- Malformed JSON, wrong version, invalid grid, and invalid overrides fall back safely.
- Typing and output edits eventually persist without a write per keystroke.
- New/Clear removes storage and resets current state.
- Undo/redo behavior remains session-local and unchanged.

## Phase 2: Side-by-side comparison

### What to implement

- Add a deterministic line-level diff utility under `src/utils/` with an explicit result for identical, changed, and empty content.
- Add a focused `ComparisonDialog` component under `src/components/` using the About dialog’s semantics and focus lifecycle.
- Add a Compare action to `OutputCell` and thread its callback through `Preview` to `App`.
- At App level, open comparison state by row/column and derive input from the grid plus effective output through `getOutputContent`.
- Render raw input Markdown and effective output in side-by-side panels with changed lines visibly marked.
- Show a no-differences state for identical content and clear empty states for missing sides.
- Keep comparison read-only and restore focus to the initiating Compare control after close.
- Update About/feature copy only if needed to describe the new comparison capability.

### Documentation references

- Copy per-cell prop placement from `src/components/OutputCell.tsx:10-31, 120-250`.
- Copy Preview callback threading from `src/components/Preview.tsx:11-24, 249-318`.
- Copy effective override precedence from `src/App.tsx:158-188`.
- Copy dialog interaction from `src/components/AboutDialog.tsx:24-46, 48-74`.

### Verification checklist

- Every output cell exposes an accessible Compare action.
- Compare shows the correct raw input and effective output for a normal cell.
- Manual output overrides are compared instead of the unedited source.
- Identical, empty-input, and empty-output cases render explicit states.
- Changed lines have distinguishable add/remove/change treatment.
- Escape, close button, backdrop, Tab wrapping, inert background, and focus restoration work.
- Opening comparison does not change grid or override state.
- Mobile dialog content remains scrollable and both sides remain usable.

## Phase 3: Version and changelog information

### What to implement

- Add local app metadata under `src/constants/` with the current package version value and product name.
- Add local changelog entries under `src/constants/` with dates/titles/descriptions for the approved initial release notes.
- Extend `AboutDialog` with a version line and accessible View changelog action.
- Add a focused `ChangelogDialog` with accessible semantics, focus trap, Escape/backdrop/close handling, and mobile scrolling.
- Coordinate About and Changelog dialog state so only the active dialog owns inert background isolation and focus restoration.
- Update About limitations to describe local persistence accurately.

### Documentation references

- Copy current About content structure from `src/components/AboutDialog.tsx:54-74`.
- Copy dialog focus behavior from `src/components/AboutDialog.tsx:24-46`.
- Copy package version source from `package.json:1-7`; keep the local metadata aligned because no JSON import/version API is configured.
- Copy safe external link attributes from `src/components/AboutDialog.tsx:64`.

### Verification checklist

- About shows the current version.
- View changelog opens the separate changelog dialog.
- Changelog contains all approved initial entries and no Calculator/PWA claims.
- Changelog close paths restore focus and background inert state correctly.
- About and Changelog cannot leave stale listeners or inert attributes.
- Light/dark and mobile layouts remain legible and scrollable.

## Phase 4: Verification and cleanup

### What to implement

- Add focused hook/utility tests for persistence validation/debounce and line-level diff behavior.
- Extend Playwright accessibility coverage for persistence reload, Compare dialog, About version/changelog, focus, inert state, Escape, backdrop, and mobile behavior where practical.
- Update README only if the existing feature list materially omits the shipped enhancements.

### Documentation references

- Follow `src/hooks/__tests__/useGridHistory.test.ts:1-115` for hook test setup.
- Follow `src/utils/__tests__/markdownFormatter.test.ts:1-81` for utility tests.
- Follow `tests/a11y.spec.ts:1-61` for Playwright/Axe dialog checks.
- Follow repository verification order in `AGENTS.md`: lint, typecheck, test, build, a11y check.

### Verification checklist

- Run focused unit tests for persistence and diff utility.
- Run full lint, typecheck, unit tests, production build, and accessibility suite.
- Exercise reload persistence and New/Clear storage behavior in a real browser.
- Exercise Compare for normal and overridden output in a real browser.
- Exercise About version/changelog open/close paths in a real browser.
- Confirm no backend, cloud sync, PWA manifest, install behavior, or unrelated state persistence was added.

## Acceptance criteria

1. Workspace grid content survives a browser reload through local storage.
2. Output overrides survive a browser reload through local storage.
3. Invalid or incompatible saved workspace data is ignored safely.
4. Clearing or starting a new workspace removes persisted workspace content.
5. A Compare action is available for each output container.
6. Compare presents input Markdown and effective output side by side.
7. Changed lines are visibly distinguished, and identical content shows a no-differences state.
8. Comparison handles manually edited output overrides correctly.
9. The About dialog displays the current app version.
10. The About dialog provides a View changelog action.
11. Changelog opens in a separate accessible in-app dialog.
12. Existing About, editor, preview, copy, theme, and grid behavior remains unchanged.
13. No backend, cloud synchronization, PWA manifest, or install-icon behavior is added.
