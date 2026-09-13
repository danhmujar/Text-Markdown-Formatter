# Premium UI refinement implementation plan

## Objective

Make the formatter feel restrained, coherent, and task-focused in light and dark modes. Reduce decorative weight, create clearer surface hierarchy, and remove empty interface furniture without changing formatter behavior.

This plan extends `docs/ui-premium-direction.md`. Existing accessibility behavior, theme selection, workspace persistence, responsive navigation, and the `1280px` compact-header breakpoint remain unchanged.

## Scope

### Included

- Replace the illustrated desktop dark-mode slider with a compact native checkbox-based switch.
- Reduce the number of independently boxed controls in the desktop header.
- Give light mode clearer separation between page, panels, and editor surfaces.
- Remove the empty single-cell header strip when it contains no warnings or actions.
- Make unavailable cleanup actions visibly and semantically disabled.
- Verify both themes at desktop and compact widths.

### Excluded

- New themes or theme customization.
- New component libraries, icons, fonts, animation systems, or design tokens without an existing semantic role.
- Header information-architecture changes, new settings, or formatter behavior changes.
- Redesigns of Comparison, About, changelog, or editor formatting controls.

## Constraints and existing patterns

- Continue using theme variables from `src/styles/themes.css`; do not hardcode a separate light/dark palette in components.
- Continue using Lucide icons already installed and imported by `src/components/Header.tsx`.
- Preserve the native checkbox in `ThemeSlider` so keyboard and screen-reader behavior remain native.
- Preserve practical `44px` targets in compact navigation.
- Use `BUTTON_VARIANTS` only where an existing variant matches; do not add a general button abstraction for this local cleanup.
- Keep theme transitions subtle and honor `prefers-reduced-motion` if the retained switch animates.

## Phase 1 — Simplify the appearance control

### Files

- `src/components/ThemeSlider.tsx`
- `src/styles/themes.css`
- `src/components/Header.tsx`

### Changes

1. Replace the decorative day/night SVG scene in `ThemeSlider` with one track, one thumb, and a small Lucide `Sun` or `Moon` indicator.
2. Keep the existing checkbox, `checked`, `onChange`, and dynamic accessible label.
3. Size the desktop switch to fit the header without becoming its focal point. Use neutral surface and border tokens at rest; use `--primary-blue` for the checked state and focus ring only.
4. Remove obsolete slider illustration variables and CSS selectors: cloud/star backgrounds, glow shadows, bouncing easing, and day/night SVG positioning.
5. Use a short transform/color transition; disable nonessential movement under `prefers-reduced-motion: reduce`.
6. Keep the adjacent `Light`/`Dark` text in `Header` as the explicit current-state label.
7. Reuse the already-refined `44px` compact theme button below `1280px`; do not render a second switch there.

## Phase 2 — Reduce desktop header chrome

### File

- `src/components/Header.tsx`

### Changes

1. Preserve three visual zones: brand, workspace actions, and formatting/appearance controls.
2. Keep `New` and `Comparison` as standalone actions, but make inactive secondary actions neutral rather than accent-colored.
3. Keep Undo/Redo and font-size controls as segmented groups because their controls are related.
4. Remove redundant shadows and filled backgrounds from inactive groups. Use one group border instead of a border around every inner action.
5. Keep one primary emphasis at most. On the empty formatter, no header action should appear primary.
6. Preserve current IDs, labels, titles, disabled semantics, event handlers, focus order, and responsive behavior.
7. Do not extract new components solely to shorten `Header.tsx`; the controls are local and already functional.

## Phase 3 — Clarify theme surface hierarchy

### File

- `src/styles/themes.css`

### Changes

1. Adjust light-theme semantic variables so the page canvas is lightly tinted while `--panel-bg` remains near-neutral and `--surface-bg` provides a subtle secondary level.
2. Keep the selected theme visible through `--primary-blue`, `--accent-bg`, borders, focus, and active states rather than tinting every large surface equally.
3. Preserve sufficient contrast for `--text-primary`, `--text-secondary`, borders, placeholders, and disabled controls.
4. Keep dark themes structurally consistent with light themes: canvas darkest, panels raised, secondary surfaces distinct without bright outlines.
5. Review all eight theme pairs because the variables are global. Make the smallest token changes that establish hierarchy; do not restyle individual screens to compensate for weak tokens.

## Phase 4 — Remove empty formatter furniture

### Files

- `src/components/FormatterCell.tsx`
- `src/components/FormatterWorkspace.tsx`

### Changes

1. Derive whether the cell header has visible content from existing state: multi-cell positional label, warnings, or content actions.
2. In the empty `1 × 1` state, omit the visible cell-header strip entirely.
3. Retain the screen-reader-only `Cleaned Text` label and its existing `aria-labelledby` connection to the textarea.
4. Restore the header automatically when content creates edit/copy/clear actions, warnings appear, or the layout contains multiple cells.
5. Do not add state for header visibility; derive it during render.
6. Keep the editor footer because it communicates character, word, line, and mode state.
7. Disable `Smart Cleanup` when `totalStats.totalChars === 0`, using the existing disabled visual convention and native `disabled` attribute. Keep Layout available on an empty workspace.

## Phase 5 — Verification

Run repository checks in the documented order:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`
5. `npm run a11y:check`

Then inspect the built application at these representative states:

- Desktop light mode at approximately `1568px` width, empty `1 × 1` workspace.
- Desktop dark mode at approximately `1568px` width, empty `1 × 1` workspace.
- Desktop light and dark modes with content, confirming cell actions and the cell header return.
- A multi-cell layout, confirming positional labels remain visible.
- Compact width below `1280px`, confirming matched `44px` theme/menu buttons and menu focus behavior.
- Keyboard focus on the theme switch, menu trigger, Smart Cleanup, Layout, and editor.
- Reduced-motion mode, confirming the appearance switch remains understandable without animation.

## Acceptance criteria

- **AC-1:** The desktop appearance control uses a restrained switch without scenic SVG artwork, glow, or an oversized accent outline.
- **AC-2:** Light mode has visibly distinct canvas, panel, and secondary surfaces without covering the entire interface in the accent hue.
- **AC-3:** Dark mode retains clear depth without bright borders competing with content.
- **AC-4:** The desktop header has recognizable control groups and fewer independently boxed elements while preserving all actions.
- **AC-5:** An empty `1 × 1` workspace has no blank cell-header strip; its textarea remains named `Cleaned Text` to assistive technology.
- **AC-6:** Cell headers and actions return when content, warnings, or a multi-cell layout require them.
- **AC-7:** Smart Cleanup is disabled when there is no text and enabled when cleanup can act on content.
- **AC-8:** Theme selection, dark-mode persistence, keyboard behavior, responsive navigation, and existing formatter behavior remain unchanged.
- **AC-9:** Lint, type checking, automated tests, production build, and WCAG 2.1 AA Playwright checks pass.

## Risks and guards

- Global theme-token changes can affect dialogs, Comparison, toast, and settings surfaces. Inspect representative shared surfaces before accepting token changes.
- Removing the single-cell header must not remove the textarea accessible name. Verify the accessibility tree, not only visual output.
- Do not replace the native checkbox with a clickable `div`; that would regress keyboard and form semantics.
- Avoid adding shared primitives or new dependencies. This refinement needs less CSS and markup, not a new design system.
