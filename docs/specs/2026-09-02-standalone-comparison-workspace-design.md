# Standalone Comparison workspace design

## Summary

Replace the per-output-cell comparison dialog with a dedicated in-app Comparison mode. The user
activates Comparison mode from an app-level control, pastes or types independent content into
blank Left and Right editors, and activates Compare to see an aligned side-by-side diff with
word-level discrepancy highlighting.

This spec supersedes the comparison-surface and interaction portions of
`docs/specs/2026-09-02-word-level-comparison-design.md`. Its dependency-free aligned line/word diff
requirements remain the comparison engine contract unless explicitly changed here.

The normal Formatter workspace remains the default view. Entering and leaving Comparison mode does
not mutate the formatter grid, output overrides, undo/redo history, or persisted formatter
workspace.

## Goals

- Make comparison an intentional, separate workflow rather than a control repeated in every output
  cell.
- Start each new Comparison session with two blank, independent editable sides.
- Use neutral `Left` and `Right` terminology throughout the comparison UI.
- Reuse the aligned line and word-level diff engine for precise discrepancy display.
- Allow users to return to editing without losing pasted content or to return to Formatter without
  changing formatter state.
- Preserve keyboard, screen-reader, theme, and responsive quality.

## Non-goals

- Comparing formatter grid cells directly.
- Automatically copying formatter input or output into Left or Right.
- Synchronizing the two sides while typing.
- Persisting comparison content to the formatter workspace storage record.
- Opening a browser tab, popup window, or separate URL route.
- Merge, accept/reject, patch application, change navigation, or export controls.
- Character-level highlighting inside changed words.

## Entry point and mode state

Add an app-level `Comparison Mode` action in the Header, available on desktop and through the
existing mobile menu. The action switches the main app view between two modes:

- `formatter`: the existing Header plus input/output workspace.
- `comparison`: the dedicated comparison workspace.

The mode state is transient React state. It is not written to formatter workspace persistence.
The formatter grid and all related state stay mounted or are preserved by App while the comparison
view is active, so switching views cannot reset or rewrite formatter content.

The Comparison view provides a `Back to Formatter` action. It returns to the prior formatter view
and leaves both workspaces unchanged. Re-entering Comparison mode during the same App session
retains the comparison sides and current editor/result state. A full page reload starts a fresh
blank Comparison session; comparison content is not added to the existing workspace storage key.

## Comparison workspace states

`ComparisonWorkspace` owns two strings, `leftText` and `rightText`, plus a view state:

- `editing`: the initial state. Render two blank, editable textareas side by side, labeled `Left`
  and `Right`, with paste-friendly placeholders and a prominent `Compare` button.
- `result`: entered after Compare. Render the aligned diff rows in a shared two-column scroll
  region, with `Left` and `Right` headings. Preserve both strings and show an `Edit comparison`
  action that returns to `editing`.

Compare is enabled even when one or both sides are empty so users receive a clear empty/identical
result. Comparing does not clear either side. Editing either side after returning to editing marks
the comparison as needing another Compare action but never alters formatter state.

The result view reuses the approved engine behavior:

- unchanged lines appear on both sides;
- added/removed lines use distinct theme-compatible treatments and visible non-color cues;
- paired replacement lines highlight only changed words, preserving punctuation and whitespace;
- inserted or deleted lines receive a blank spacer row on the opposite side;
- real lines show one-based line numbers;
- exact identical strings show `No differences found.`;
- empty sides remain clear without fabricated content.

Comparison source text is rendered as React text nodes. Markdown or HTML-like pasted text must not
execute.

## Layout and responsive behavior

In editing state, Left and Right textareas use a shared two-column layout with equal visual weight,
theme-aware borders, and independent editing focus. On narrow screens they may stack for usable
typing space, while their labels and controls remain explicit.

In result state, use one shared scroll container and a two-column aligned-row grid. Do not create
independent vertical scroll regions for the sides. On narrow screens, preserve row correspondence
with a minimum two-column width and shared horizontal scrolling.

The view uses existing panel, border, text, focus-ring, and theme variables. It must remain legible
in every light/dark color theme.

## Accessibility and interaction

- The app-level action has an accessible name and indicates the active Comparison mode.
- Left and Right editors are real labeled textareas with keyboard focus and paste support.
- Compare, Edit comparison, and Back to Formatter are keyboard-reachable buttons with descriptive
  names.
- The result view uses headings or labeled regions for Left and Right and does not rely on color
  alone to communicate additions/removals.
- Changed segments, real line numbers, and spacer cells expose semantic labels or text sufficient
  for assistive technology to understand the side and change kind.
- Existing Formatter accessibility and focus behavior remains unchanged when Comparison mode is
  inactive.
- The comparison view is not a modal: it does not set `inert`, trap focus, or use backdrop/Escape
  modal behavior. Browser focus stays within the active app view unless the user chooses a mode
  navigation control.

## Data flow and boundaries

`App` owns the top-level mode state and renders either the existing formatter content or
`ComparisonWorkspace`. The comparison component receives only `onBackToFormatter` (and any shared
theme/options data it needs); it owns Left/Right text and result state locally.

The existing per-cell `ComparisonDialog`, per-cell Compare props, comparison row/column selection,
trigger refs, and modal focus lifecycle are removed. The pure diff utility remains independent of
React and formatter state and is called by the result view.

No new package, router, browser API, storage key, or server endpoint is needed.

## Error and edge handling

- Empty strings are valid comparison inputs and never disable Compare.
- LF and CRLF line separators are accepted consistently by the diff utility.
- Whitespace-only content is not treated as empty.
- Pasted Markdown, HTML-like text, and special characters render literally.
- If a comparison is not yet run, the editing state remains visible; no stale result is shown after
  either side changes.
- Comparison errors must not reset either side or the formatter workspace. The pure utility should
  continue to return complete text rather than silently truncating large content.

## Testing

Unit coverage retains the aligned line/word diff matrix from the prior spec.

Browser/accessibility coverage will verify:

- Comparison Mode is reachable from the Header and mobile menu.
- Entering the mode shows blank Left and Right editors and does not alter formatter text.
- Independent multiline content can be entered on both sides.
- Compare switches to the result view with correct Left/Right text, word highlights, line states,
  and spacer rows.
- Empty and identical comparisons are explicit and correct.
- Edit comparison preserves both sides and returns to editable controls.
- Back to Formatter restores the normal workspace with its original content unchanged.
- Desktop, narrow, light-theme, and dark-theme layouts remain usable.
- Axe reports no new WCAG 2.1 A/AA violations.

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
