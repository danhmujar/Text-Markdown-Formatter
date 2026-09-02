# Comparison Clear and Shared Font Size Design

## Goal

Extend the standalone in-app Comparison workspace with a `Clear` action and make Comparison use
the Formatter’s existing font-size setting. Clearing is a comparison-only action; changing the
Formatter font size remains the single source of truth for both workspaces.

## Scope

### Clear behavior

- Comparison shows a clearly labeled `Clear` button in both editing and result views.
- Activating `Clear` immediately sets both comparison sides to empty strings and returns the
  workspace to its blank editing view.
- `Clear` does not modify Formatter grid content, output overrides, history, persistence, theme,
  or focus mode.
- The button is available even when both sides are already empty and does not require a
  confirmation dialog.

### Shared font-size behavior

- `App` passes the existing `options.fontSize` value into the Comparison workspace.
- The Comparison workspace passes that value to its editable side-by-side textareas and result
  renderer.
- Comparison text uses the same numeric value and point-unit convention displayed by the
  Formatter Header.
- Comparison has no independent font-size state, controls, persistence, or keyboard shortcut.
- Existing Formatter font-size controls remain unchanged and update both Formatter output and the
  mounted Comparison view.

## Architecture

- Keep `leftText`, `rightText`, and editing/result view state local to `ComparisonWorkspace`.
- Add a local `clearComparison` handler that resets only those comparison values and view state.
- Extend `ComparisonWorkspace` props with a numeric `fontSize` and pass it to
  `ComparisonResult`.
- Extend `ComparisonResult` props with the same numeric `fontSize` and apply an inline point-size
  style to the shared diff grid text. Keep line alignment, highlights, spacer rows, and semantic
  diff hooks unchanged.
- Continue mounting Comparison persistently behind the existing native `hidden` mode boundary so
  normal mode switching retains values until the user explicitly clears them.
- Do not add a new storage key, route, popup, browser tab, dependency, or Formatter mutation path.

## Accessibility and responsive behavior

- `Clear` is a native `button` with a stable ID, visible text, an explicit `type="button"`, and a
  focus-visible indicator.
- `Clear` is keyboard reachable in both editing and result views and does not open a modal or trap
  focus.
- The shared font-size value applies at desktop and narrow widths without changing the existing
  single-scroll result layout.
- Existing Left/Right labels, textareas, result semantics, and no-modal behavior remain intact.

## Testing

- Add browser coverage that fills both sides, compares, clicks `Clear`, and verifies both blank
  textareas plus editing view.
- Add browser coverage that changes the existing Formatter font-size control, enters Comparison,
  and verifies both editor textareas reflect the shared point size; verify the result view uses the
  same value.
- Preserve existing tests for Comparison entry, retention, formatter isolation, alignment,
  responsive scrolling, and Axe checks.
- Run the repository verification order from `AGENTS.md` after implementation.

## Acceptance Criteria

1. A `Clear` control is visible in Comparison mode.
2. Clicking `Clear` empties both sides and returns to editing.
3. Formatter font-size changes are reflected in Comparison editors and results.
4. Comparison does not gain a separate font-size state or control.
5. Existing comparison retention and Formatter behavior remain intact.
6. Automated tests cover Clear and shared font-size behavior.
