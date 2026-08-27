# About FAB Implementation Plan

## Goal

Implement the approved Calculator-inspired About FAB and responsive About dialog for Text & Markdown Formatter without changing editor, preview, copy, theme, or grid behavior.

## Phase 0: Documentation discovery

### Sources consulted

- `docs/specs/2026-08-28-about-fab-design.md` — approved content, interaction contract, architecture, and acceptance criteria.
- `src/App.tsx:234-319` — application shell composition and safe mount point beside Header, main panels, and ToastContainer.
- `src/components/Header.tsx:1-42, 69-95, 301-645` — header props, theme-aware styling, responsive `sm` breakpoint, and button accessibility conventions.
- `src/components/ui/EditorSettingsPanel.tsx:35-101` — existing focus capture/restore, Escape handling, Tab wrapping, and dialog attributes.
- `src/components/Editor.tsx:42-74, 237-239` — existing outside-click and keyboard interaction patterns.
- `src/components/ThemePicker.tsx:20-35` — outside-click and Escape dismissal pattern.
- `src/index.css:1-21` — Tailwind/theme entry imports and custom scrollbar rules; `src/styles/themes.css:1-180` — light/dark/theme CSS variables and body theme styling.
- `C:\AI\Project\Calculator\index.html:736-930` — About FAB markup and content grouping reference.
- `C:\AI\Project\Calculator\ui\ui.js:1-92` — About dialog focus, Escape, backdrop, inert, and focus restoration reference.
- `C:\AI\Project\Calculator\ui\styles.css:1742-1771, 1941-1977, 2076-2238` — FAB, responsive modal, overlay, and content styling reference.
- `tests/a11y.spec.ts:1-31` — Playwright/Axe test conventions.
- `src/utils/__tests__/a11y.test.ts` — existing source-level accessibility assertion convention.

### Allowed APIs and patterns

- React `useState`, `useRef`, `useEffect`, and `useCallback` for modal state and lifecycle.
- Native `HTMLElement.focus()`, `document.activeElement`, `document.addEventListener`, and `HTMLElement.inert` for focus restoration and background isolation.
- Native dialog semantics: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and `aria-hidden`.
- Existing Tailwind utilities, theme CSS variables, `lucide-react` icons, and `focus-visible:ring-2` conventions.
- Existing `sm` breakpoint for mobile behavior.
- Existing Playwright and Axe test setup for end-to-end accessibility/interaction checks.

### Anti-pattern guards

- Do not copy Calculator's vanilla JS classes, PWA/version-fetch logic, service-worker behavior, or glassmorphism CSS wholesale.
- Do not add a manifest, install prompt, or PWA icon set.
- Do not put application panels inside the inert subtree if the modal is rendered within that subtree.
- Do not let the App-level Escape handler consume modal Escape before the modal closes.
- Do not couple About state to grid history, output overrides, or clipboard state.
- Do not introduce React Testing Library or a new component test framework; use existing Playwright/source-level conventions.

## Phase 1: Component and shell integration

### What to implement

- Create a focused `AboutDialog` component under `src/components/`.
- Render a fixed circular `?` FAB and modal overlay from the application shell in `src/App.tsx`.
- Use controlled `open` state at the shell boundary and a ref for the FAB trigger.
- Render the approved sections: introduction, tech stack, security/architecture, features, limitations, and developer credit with the verified LinkedIn URL.
- Use existing theme variables for surfaces, borders, text, and accent colors; keep modal z-index above Header z-40.
- Add responsive width, max-height, and internal scrolling for mobile screens.

### Documentation references

- Copy the application-shell placement pattern from `src/App.tsx:234-319`.
- Copy dialog focus lifecycle concepts from `src/components/ui/EditorSettingsPanel.tsx:35-101`.
- Copy the FAB/modal structural pattern from `C:\AI\Project\Calculator\index.html:736-771`.
- Copy content grouping ideas from `C:\AI\Project\Calculator\index.html:775-930`, replacing all Calculator-specific text.
- Adapt Calculator responsive modal constraints from `C:\AI\Project\Calculator\ui\styles.css:1961-1977, 2077-2125` using this project's theme variables and Tailwind utilities.

### Verification checklist

- Component renders exactly one FAB with `aria-label="About this app"`.
- Dialog has the required role and accessible heading attributes.
- All approved content sections are present and no Calculator/PWA-only claims remain.
- LinkedIn URL is `https://www.linkedin.com/in/danhmujar` with `target="_blank"` and `rel="noopener noreferrer"`.
- Overlay is fixed and appears above the existing application shell.
- Mobile layout has an internally scrollable content region.

## Phase 2: Interaction and accessibility behavior

### What to implement

- Open the modal from the FAB and capture the previously focused element.
- Focus the close button after opening.
- Close from the close button, backdrop click, and Escape.
- Return focus to the FAB or previously focused trigger after closing.
- Trap Tab and Shift+Tab within modal focusable elements.
- Mark the background application content inert while open and restore it on close.
- Stop modal Escape propagation so App focus-mode handling does not interfere.
- Respect the existing theme transition behavior; do not claim a reduced-motion utility that is not present in this application.

### Documentation references

- Copy Calculator's `AboutModal.open`, `close`, and `handleTab` behavior from `C:\AI\Project\Calculator\ui\ui.js:20-92`.
- Adapt the existing focus restoration and Escape cleanup pattern from `src/components/ui/EditorSettingsPanel.tsx:35-93`.
- Follow current button keyboard focus styles from `src/components/Header.tsx:90-108`.

### Verification checklist

- Clicking FAB opens the dialog and focuses the close button.
- Escape closes the dialog without toggling App Focus Mode.
- Backdrop click closes only when the overlay itself is clicked.
- Tab cycles within the modal in both directions.
- Closing restores focus to the FAB.
- Background controls cannot receive focus while the dialog is open.
- Opening/closing repeatedly leaves no event listeners or inert attributes behind.

## Phase 3: Tests and final verification

### What to implement

- Add focused unit/source-level assertions only where existing seams support them.
- Add a Playwright interaction/accessibility test covering open, dialog semantics, focus, Escape, backdrop, and close restoration.
- Preserve existing test setup and do not add new testing dependencies.

### Documentation references

- Follow `tests/a11y.spec.ts:1-31` for Playwright and Axe setup.
- Follow `src/utils/__tests__/a11y.test.ts` for repository accessibility assertions.
- Use the existing `playwright.config.ts` preview workflow from repository guidance.

### Verification checklist

- Run focused unit/source tests for About markup if added.
- Run the focused Playwright About dialog test against the production preview.
- Run the repository verification order: lint, typecheck, test, build, and a11y check.
- Confirm no PWA manifest or install behavior was added.
- Confirm existing editor, preview, copy, theme, and grid tests remain green.

## Acceptance Criteria

1. A fixed About FAB is visible at the bottom-left of the application.
2. Activating the FAB opens an accessible About dialog.
3. The dialog includes the app introduction, tech stack, architecture/security, features, limitations, and developer credit.
4. The developer credit includes a working LinkedIn link for Danh Michael Mujar.
5. Escape, close-button, and backdrop interactions close the dialog.
6. Focus returns to the About FAB after closing.
7. The dialog works in both light and dark themes.
8. The dialog remains usable on mobile-width screens.
9. Existing editor, preview, copy, theme, and grid behavior remains unchanged.
10. No PWA manifest or install-icon behavior is added.
