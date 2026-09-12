# UI/UX Audit

## Scope

Rendered review of the formatter, mobile navigation, theme picker, and comparison workspace at 375px, 768px, 1024px, 1200px, 1280px, and 1440px viewport widths. The audit covered responsive layout, keyboard behavior, screen-reader semantics, touch targets, and theme contrast.

## Findings

### P0 — Toolbar is unusable at intermediate widths

`src/components/Header.tsx` enabled the full, non-wrapping desktop toolbar at 640px. At 768px, controls extended beyond the viewport. After controls received accessible target sizes, the toolbar extended to x=1057 at 1024px; at 1280px it fit within the 1256px-wide header content area.

**Fix:** Keep the compact navigation active below 1280px and show the full toolbar at 1280px and above.

### P1 — Six light themes fail accent-control text contrast

Small text and icons use `--primary-blue` on `--accent-bg`. Measured contrast ratios:

| Theme | Ratio |
| --- | ---: |
| Transformative Teal | 3.89:1 |
| Deep Terracotta | 2.88:1 |
| Forest Green | 4.04:1 |
| Dusty Rosewood | 2.41:1 |
| Pale Pistachio | 2.32:1 |
| Royal Purple | 3.77:1 |

All six are below the WCAG 2.1 AA minimum of 4.5:1 for normal text. Financial Blue and Slate Graphite pass.

**Fix:** Darken the affected light-theme `--primary-blue` tokens until each pairing reaches at least 4.5:1.

### P1 — Closed theme options remain keyboard-reachable

The theme picker always renders its radio buttons. Its closed state uses only opacity and pointer-event CSS, so invisible choices remain in the tab order and accessibility tree while the trigger reports `aria-expanded="false"`.

**Fix:** Render the radio group only while open and restore focus to the trigger when Escape closes it.

### P2 — Several mobile controls miss the 44px target size

Measured controls include a 34×34px quick-theme button, 38×38px menu button, 28×28px theme swatches, 40px-tall comparison actions, and an 18×18px toast close button.

**Fix:** Give interactive mobile controls a minimum 44×44px hit area without enlarging icons unnecessarily.

### P2 — Mobile navigation lacks keyboard close and focus handling

The navigation behaves like an overlay but does not close on Escape, move focus into the opened menu, restore focus on close, or prevent keyboard traversal into the obscured workspace.

**Fix:** Focus the first menu action when opened, trap Tab within the menu and its close trigger, close on Escape, restore trigger focus, and mark the workspace inert while open.

### P2 — Character counters create duplicate typing announcements

Each cell counter is a polite live region, and the aggregate input counter is another polite live region. Both update on every keystroke, which can queue repetitive screen-reader announcements during the primary editing task.

**Fix:** Keep continuously updating counters as static descriptive text rather than live regions.

## Verified strengths

- Input and Output remain visible and usable below the 1024px two-column breakpoint.
- No horizontal document overflow appeared at the tested viewport widths.
- The mobile menu exposes clearly grouped actions with 44px targets for its main action buttons.
- Input and Output use explicit region headings and labelled textareas.
- Dialog surfaces already implement focus trapping, Escape dismissal, focus restoration, and background inertness.

## Resolution

All findings were resolved:

| Finding | Resolution |
| --- | --- |
| Intermediate-width toolbar clipping | Compact navigation now remains active below 1280px; the full toolbar fits at 1280px. |
| Light-theme accent contrast | All eight light-theme token pairs now measure at least 4.5:1. |
| Hidden theme controls | The radio group mounts only while open; Escape restores trigger focus. |
| Small touch targets | Audited mobile controls now measure at least 44×44px. |
| Mobile navigation keyboard behavior | Opening focuses the first action and makes the workspace inert; Tab is contained; Escape closes and restores focus. |
| Typing announcement noise | Character counters remain textarea descriptions but are no longer live regions. |

### Verification

- `npm run lint`
- `npm run typecheck`
- `npm run test`: 94 Vitest tests and 12 versioning tests passed
- `npm run build`
- `npm run a11y:check`: 11 Playwright tests passed
- Rendered checks at 375px, 768px, 1024px, 1280px, and 1440px
