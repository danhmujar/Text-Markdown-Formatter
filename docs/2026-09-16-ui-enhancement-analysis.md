# UI Enhancement Analysis — shadcn + Animotion

Date: 2026-09-16
Status: Analysis only, nothing installed. Both MCP servers (shadcn, animotion)
are configured globally and verified working.

## 1. Current state inventory

Hand-rolled UI in `src/` (all working, all tested):

| Area                                        | Implementation                                   | Tests                                        |
| ------------------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| Toast notifications (`Toast.tsx`)           | Custom `app-toast` event bus + container, pill   | `Toast.test.tsx`, `usePwaUpdate.test.tsx`    |
| About / Changelog dialogs                   | Custom focus trap + `inert` save/restore        | Playwright a11y specs                        |
| Layout settings (`EditorSettingsPanel.tsx`) | Custom absolute dropdown, manual outside/Escape | Covered via workspace specs                  |
| Tooltips                                    | 20+ native `title=` attributes (EditToolbar, Header, ThemePicker, EditorSettingsPanel) | — |
| Copy feedback                               | `active:scale-95`, inline `Copied` label swap    | `FormatterCell.test.tsx`                     |

Existing utilities that lower shadcn setup friction: `clsx`, `tailwind-merge`,
and `src/utils/cn.ts` are already installed.

## 2. Key finding: dead animation classes

`Toast.tsx`, `Header.tsx` (mobile menu), and `EditorSettingsPanel.tsx` use
`animate-in slide-in-from-bottom-2` / `fade-in` classes, but **no animation
library is installed** (`package.json` has no `tailwindcss-animate`,
`tw-animate-css`, or motion package). These enter/exit animations currently do
nothing. Any animation work starts by filling this gap, not by adding effects.

Constraints that shape every recommendation:

- `index.html:8` CSP is strict (`default-src 'self'`) — no external scripts or
  styles. Pure-CSS and bundled-JS solutions only.
- Tailwind CSS 4 via the Vite plugin, no `tailwind.config.js`.
- React 19 + strict TypeScript (`noUnusedLocals`, `noUnusedParameters`).
- Verification order: `lint` → `typecheck` → `test` → `build` → `a11y:check`.

## 3. Ranked recommendations

### 1. Animotion enter/exit animations (do first)

Replace the dead `animate-in` classes with real Animotion CSS utilities
(`animotion-fade-in`, slide-ins) on Toast, the mobile header menu, and the
settings panel. Pure CSS, zero dependencies, CSP-safe by construction, and
`prefers-reduced-motion` support is built in.

- Effort: ~30 minutes. Risk: none — no logic changes, no test breakage.

### 2. shadcn `tooltip` (high value, additive)

Upgrade the 20+ native `title=` attributes to styled, instant,
keyboard-accessible tooltips, starting with EditToolbar (7 formatting buttons
with long delay-prone native hints) and the Header icon controls.

- Effort: ~1 hour. Risk: low — purely additive, nothing deleted.

### 3. shadcn `dialog` (medium value, deletes ~100 lines)

AboutDialog + ChangelogDialog hand-roll focus trapping and `inert`
save/restore. Radix-based dialog provides the same behavior battle-tested, and
removes custom code that must be maintained against axe-core specs.

- Effort: an afternoon including Playwright re-verification. Risk: medium —
  must preserve the `inert`-restore contract the a11y suite asserts.

### 4. shadcn `popover` for Layout settings

`EditorSettingsPanel` re-implements outside-click dismissal and Escape handling
around an absolutely positioned panel. Popover absorbs that logic.

- Effort: half a day with tests. Risk: low-medium — covered by workspace specs.

### 5. Skip: `sonner` toast replacement

The toast bus (`app-toast` events, persistent Reload action with
`duration: null`, 4s default timeout) is pinned by unit and PWA integration
tests. Rewriting those contracts for cosmetic gain is not worth it. Style the
existing pill via Animotion (item 1) instead.

## 4. Setup cost (only if items 2–4 proceed)

- Add `components.json` (shadcn registry config).
- Add `class-variance-authority` plus one Radix package per component used
  (`@radix-ui/react-tooltip`, `-dialog`, `-popover`).
- No Tailwind config changes needed (v4 supported); React 19 supported.

## 5. Decision log

- 2026-09-16: shadcn + Animotion MCP servers added globally (free, MIT, no
  credentials). Analysis written before any install, per request.
- Open question: which ranked item to implement first (recommendation: item 1).
- 2026-09-16: item 1 done. Animotion E01/E02/E03 keyframes vendored into
  `src/styles/animations.css` (durations shortened to 0.15s/0.2s/0.25s for UI
  feedback, with a `prefers-reduced-motion` guard) and wired to the four
  previously dead spots: Toast (`animotion-fade-in-up`), mobile header menu and
  Layout panel (`animotion-fade-in-down`), EditToolbar feedback
  (`animotion-fade-in`). Verified live via computed `animation-name` in
  Chromium; lint, typecheck, Prettier, and unit tests pass.
