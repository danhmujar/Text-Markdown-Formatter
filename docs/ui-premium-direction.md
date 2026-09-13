# Premium UI direction

## Scope

Refine the compact header controls and formatter workspace to remove the visual noise shown in the supplied screenshots. Preserve the existing functionality, accessibility, theme tokens, responsive breakpoint, and interaction model.

## Decisions

### Mobile theme and navigation controls

- Use matching `44px` icon buttons with the same border, radius, icon size, and interaction states.
- Keep controls neutral at rest; use the active theme color only for focus and the open menu state.
- Do not use a large cyan outline, an oversized icon container, or different visual treatment for paired controls.

### Formatter workspace

- Retain one compact header: `Cleaned text` followed by the grid-dimension badge.
- Keep the explanatory line but prevent it from competing with the heading or clipping at narrow widths.
- Remove the decorative blue dot from cell titles. For the single-cell layout, keep its duplicate “Cleaned Text” label available only to assistive technology; multi-cell layouts retain their positional labels.
- Use the existing surface, border, text, and primary-color tokens. Accent color is reserved for actions, selection, and focus.
- Preserve the existing editor height and controls; do not add decorative cards, status labels, or new abstractions.

## Acceptance criteria

- **AC-1:** At widths below `1280px`, the theme toggle and menu toggle are visually matched `44px` icon buttons.
- **AC-2:** The menu toggle has an accent treatment only while its menu is open; the theme toggle remains neutral unless focused or hovered.
- **AC-3:** The workspace header presents a clear title, dimensions, and secondary guidance without clipping or competing visual labels.
- **AC-4:** Single-cell layouts present “Cleaned text” only as the workspace heading. The equivalent cell label remains available to assistive technology; multi-cell positional labels, warnings, and editor actions remain available.
- **AC-5:** Existing keyboard labels, focus rings, and touch targets remain intact.

## Verification

Build and inspect the rendered formatter at a compact viewport and desktop viewport. Exercise the mobile theme toggle and navigation-menu open state.
