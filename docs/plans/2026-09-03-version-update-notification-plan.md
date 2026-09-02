# Version Update Notification Implementation Plan

## Phase 0: Documentation discovery and allowed APIs

### Sources consulted

- Approved design: `docs/specs/2026-09-03-version-update-notification-design.md:3-119`.
- Repository guidance: `AGENTS.md:3-71`.
- Existing scripts and lifecycle: `package.json:4-20`.
- Vite configuration and test discovery: `vite.config.ts:7-45`.
- Vite entry and global mount: `src/main.tsx:1-8`, `src/App.tsx:20-45,329-337`.
- Existing toast API and rendering: `src/components/Toast.tsx:4-110` and `src/utils/toast.ts:1`.
- Storage patterns: `src/hooks/useTheme.ts:4-55` and `src/hooks/useWorkspacePersistence.ts:4-89`.
- Browser test conventions: `tests/a11y.spec.ts:1-270` and `playwright.config.ts:3-24`.
- Formatting/lint rules: `.prettierrc`, `.prettierignore`, and `eslint.config.js`.
- Official Vite public assets: [Vite static asset handling](https://vite.dev/guide/assets.html).
- Official npm lifecycle behavior: [npm lifecycle scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts/).
- Official Vite build behavior: [Vite build guide](https://vite.dev/guide/build).

### Concrete findings

- Vite serves files from `public/` at the root in development and copies them unchanged into the
  root of `dist/` during production builds. The repository already has `public/` and uses the default
  root base path.
- `npm run dev` and `npm run build` have no pre-scripts yet. npm automatically runs `predev` and
  `prebuild` before those scripts; direct `vite` invocation bypasses the lifecycle.
- The app mounts exactly one `ToastContainer` in `App`, and all current callers use the two-argument
  `showToast(message, type)` API. Toasts currently use `role="alert"` for errors, `role="status"`
  otherwise, and a four-second timeout.
- Existing storage code uses named versioned keys, `try/catch`, and silent failure. Vitest uses jsdom,
  fake timers are available, and Playwright can intercept `/version.json*` before navigation.
- The current CSP permits same-origin connections; a relative manifest request requires no CSP change.

### Allowed APIs and patterns

- Node built-ins (`node:fs`, `node:path`, `node:url`) for a build-time manifest generator.
- npm `predev`, `prebuild`, and a named `version:manifest` script.
- Vite `public/` root assets and `/version.json` fetches.
- Browser `fetch` with `cache: 'no-store'`, `AbortController`, `setTimeout`, and
  `document.visibilitychange`.
- Existing `showToast(message, type)` event API, extended only with additive optional action/duration
  fields.
- Existing guarded `localStorage` conventions and React hook cleanup patterns.
- Vitest jsdom/fake timers and Playwright `page.route('**/version.json*', ...)` interception.

### Gaps and decisions carried into implementation

- Use a five-second abort timeout; this is short enough not to hold resources and long enough for a
  local/static deployment response.
- Use `text-markdown-formatter:last-notified-version:v1` as the notification key.
- Keep the design’s root-relative `/version.json` URL because the current Vite base is `/`; revisit if
  deployment later adopts a non-root base.
- Test reload through an injectable action callback or a controlled mock rather than relying on jsdom
  navigation behavior.

## Phase 1: Generate and serve the version manifest

### What to implement

Copy the validated-version pattern from `scripts/auto-version.mjs:16,48-54` into a focused
`scripts/generate-version-manifest.mjs`. Read `package.json`, validate strict `major.minor.patch`,
create `public/` when needed, and atomically write `{ "version": "X.Y.Z" }` to
`public/version.json`. Keep this file generated output only.

Add `version:manifest`, `predev`, and `prebuild` entries to `package.json` following the existing
script table at `package.json:6-20`. Add `public/version.json` to `.gitignore`. Do not add the
manifest to `scripts/auto-version.mjs`’s generated version surfaces.

### Documentation references

- Design manifest contract: `docs/specs/2026-09-03-version-update-notification-design.md:33-48`.
- Vite public-directory behavior: `https://vite.dev/guide/assets.html`.
- npm pre-script behavior: `https://docs.npmjs.com/cli/v11/using-npm/scripts/`.
- Existing atomic/write and SemVer patterns: `scripts/auto-version.mjs:16-46,48-75`.

### Verification checklist

- [x] `npm run version:manifest` creates a valid ignored `public/version.json` with the current
      package version.
- [x] `npm run dev` and `npm run build` invoke the generator through `predev`/`prebuild`.
- [x] `dist/version.json` exists after build and contains only the expected version field.
- [x] An invalid package version produces a non-zero generator exit without a malformed manifest.
- [x] Node tests cover successful generation, directory creation, invalid input, and output shape.

### Anti-pattern guards

- Do not commit `public/version.json` or add it to the auto-version surface list.
- Do not call a remote release API or add a backend/service worker.
- Do not silently generate a manifest from an invalid package version.
- Do not bypass npm lifecycle conventions by replacing the existing `dev`/`build` commands with
  duplicated shell chains.

## Phase 2: Add browser-safe comparison and update-check lifecycle

### What to implement

Copy the strict numeric SemVer grammar from the approved design into `src/utils/version.ts`, keeping
it browser-safe and independent from Node imports. Export focused parse/compare helpers and test
invalid, equal, older, patch, minor, and major values.

Add `src/hooks/useVersionUpdate.ts` and mount `useVersionUpdate()` once near the top-level state setup
in `src/App.tsx:20-45`. The hook should:

1. Skip non-browser and hidden-document checks.
2. Fetch `/version.json` with a timestamp query, `cache: 'no-store'`, and a five-second abort timer.
3. Validate `response.ok`, JSON shape, and strict version syntax.
4. Compare remote version with `APP_VERSION` and stop for equal/older values.
5. Read/write `text-markdown-formatter:last-notified-version:v1` with guarded storage helpers.
6. Suppress a version already recorded, record a newer version, and dispatch the update toast.
7. Schedule one 30-minute timer and run an immediate check on visible `visibilitychange`.
8. Abort requests, clear timers, and remove listeners during cleanup; prevent overlapping requests.

Follow the cleanup style from `src/hooks/useGridHistory.ts` and storage error handling from
`src/hooks/useTheme.ts:4-14,48-55`. Keep all update failures silent.

### Documentation references

- Design lifecycle/data flow: `docs/specs/2026-09-03-version-update-notification-design.md:50-68`.
- Design safety requirements: `docs/specs/2026-09-03-version-update-notification-design.md:75-85`.
- App global ownership: `src/App.tsx:20-45,329-337`.
- Storage conventions: `src/hooks/useTheme.ts:4-14,48-55` and `src/hooks/useWorkspacePersistence.ts:4-42`.

### Verification checklist

- [x] Utility tests prove strict SemVer parsing and numeric comparison.
- [x] Hook tests prove startup, visibility-return, and 30-minute scheduling behavior.
- [x] Hook tests prove equal/older/no-manifest/network/timeout/malformed responses are silent.
- [x] Hook tests prove one notification per remote version and notification for a later higher version.
- [x] Hook tests prove in-flight requests, timers, listeners, and storage failures are cleaned up safely.
- [x] Strict typecheck and lint pass with no Node-only imports in browser modules.

### Anti-pattern guards

- Do not import `scripts/auto-version.mjs` into client code.
- Do not fetch while hidden, create overlapping intervals, or leave an abort/timer/listener after
  unmount.
- Do not notify for equal/older versions or record invalid/older manifest values.
- Do not clear workspace storage or execute any manifest-provided value.
- Do not make the remote URL configurable or external to the same origin.

## Phase 3: Extend the toast surface and expose Reload

### What to implement

Copy the existing event-based API from `src/components/Toast.tsx:6-20` and add optional
`ToastAction` and `duration` fields without changing the existing two-argument call contract. Update
`ToastContainer` at `src/components/Toast.tsx:22-110` to:

- Skip timer creation for `duration: null` while retaining the four-second default for existing calls.
- Track timer IDs and clear them when a toast is removed or the container unmounts.
- Render an accessible `button type="button"` for an optional action with a visible focus ring.
- Remove the toast before invoking its action; the update action invokes `window.location.reload()`.
- Preserve current icon/color mapping, roles, close control, max-stack behavior, and no focus theft.

The update hook dispatches an informational persistent toast with the message and Reload action from
`docs/specs/2026-09-03-version-update-notification-design.md:70-73`. Existing `App`, copy, and grid
callers remain unchanged.

### Documentation references

- Toast API/rendering: `src/components/Toast.tsx:4-110`.
- Existing callers: `src/App.tsx:94,103`, `src/hooks/useCopy.ts`, `src/hooks/useGridActions.ts`.
- Design UX and compatibility: `docs/specs/2026-09-03-version-update-notification-design.md:16-31,70-85`.
- Accessibility test pattern: `src/utils/__tests__/a11y.test.ts:103-108`.

### Verification checklist

- [x] Existing two-argument `showToast` callers compile and retain four-second behavior.
- [x] Persistent update toast stays visible until action/close and removes cleanly.
- [x] Reload and close controls have accessible names, keyboard focus, and visible focus styles.
- [x] Timer cleanup prevents updates after dismissal/unmount.
- [x] Existing toast roles, colors, and error behavior remain unchanged.

### Anti-pattern guards

- Do not replace the event-based toast API with a new provider or state architecture.
- Do not make ordinary toasts persistent or alter their default duration.
- Do not steal focus when an update toast appears.
- Do not invoke reload before removing the toast or pass unsafe manifest text into executable content.

## Phase 4: Regression coverage, documentation, and final verification

### What to implement

Add focused Vitest coverage under `src/utils/__tests__/` and hook tests following the rendered-hook
patterns in `src/hooks/__tests__/useGridHistory.test.ts`. Add Node tests for the manifest generator
and include them in the existing `npm run test` path. Add deterministic Playwright coverage to
`tests/a11y.spec.ts` by routing `**/version.json*` before `page.goto('/')`, verifying the visible
update toast, Reload/close controls, and unchanged startup behavior when the manifest matches.

Update `README.md` and `AGENTS.md` with the generated-manifest lifecycle, update-check timing,
deduplication key, silent-failure behavior, and test commands. Keep changelog policy unchanged.

### Documentation references

- Design testing requirements: `docs/specs/2026-09-03-version-update-notification-design.md:99-107`.
- Acceptance criteria: `docs/specs/2026-09-03-version-update-notification-design.md:109-119`.
- Existing test commands: `package.json:15-20`, `AGENTS.md:3-18`.
- Existing Playwright tests: `tests/a11y.spec.ts:1-270`.

### Verification checklist

- [x] Unit tests cover manifest generation, comparison, update/no-update, deduplication, failures,
      visibility, timers, toast actions, and reload dispatch.
- [x] Browser tests cover the visible update toast, accessible controls, no focus theft, and matching
      manifest behavior.
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes, including Node manifest/versioning tests.
- [x] `npm run build` produces `dist/version.json` with the current version.
- [x] `npm run version:check` passes and the generated manifest remains ignored.
- [x] `npm run a11y:check` passes against the built preview.
- [x] Targeted Prettier checks and `git diff --check` pass.
- [x] Final searches find no external manifest URL, committed `public/version.json`, duplicate hook
      mounts, stale update wording, or test artifacts.

### Anti-pattern guards

- Do not weaken existing accessibility assertions to make the new toast pass.
- Do not add a second notification system or a release/changelog mutation.
- Do not commit generated output or test artifacts.
- Do not change Vite base/CSP/build chunk settings unless a verified test requires it.

## Consolidated task list

- [x] Phase 1: Generate and serve the version manifest.
- [x] Phase 2: Add browser-safe comparison and update-check lifecycle.
- [x] Phase 3: Extend the toast surface and expose Reload.
- [x] Phase 4: Add regression coverage, documentation, and final verification.

## Acceptance Criteria

1. A generated same-origin `/version.json` contains the validated package version in dev and production builds.
2. The app checks for updates on startup, when returning to a visible tab, and at most every 30 minutes.
3. Only a valid manifest version greater than the bundled `APP_VERSION` triggers an update notification.
4. The update notification is an accessible persistent info toast with a working **Reload** action and close control.
5. Each browser profile is notified at most once for a given remote version, while a later higher version can notify again.
6. Missing, stale, malformed, timed-out, or unavailable manifests fail silently without interrupting editing.
7. Existing toast callers retain their current four-second default behavior and accessible status/error roles.
8. The update check uses only a cache-busted same-origin request and does not execute manifest-provided code or clear workspace data.
9. Automated tests cover manifest generation, SemVer comparison, update/no-update decisions, deduplication, error paths, reload behavior, and accessibility.
