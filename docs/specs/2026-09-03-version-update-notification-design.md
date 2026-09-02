# Version Update Notification Design

## Goal

Notify a user when the deployed application has a newer version than the copy currently loaded in
their browser. The notification should be useful but quiet: it must not interrupt editing, repeat
for the same release, or make the app depend on an external service.

## Scope

This design covers a same-origin version manifest, build/dev generation, client-side version
comparison, update-toast behavior, persistence, error handling, and regression tests. It does not
perform a background update, change the user’s workspace, publish releases, or modify the existing
curated changelog policy.

## User experience

When a newer valid version is detected, the app shows an informational toast:

> Version 0.2.3 is available.

The toast includes a **Reload** action and a close control. Reload invokes the browser’s normal page
reload so the deployed bundle and manifest are fetched together. The update toast remains visible
until the user reloads or dismisses it; ordinary application toasts retain their existing four-second
behavior. The toast is positioned with the existing global notification surface, does not steal
focus, and remains usable at narrow widths.

The app stores the last notified remote version under a versioned local-storage key. A version is
recorded when a valid newer manifest is detected, so dismissing the toast does not cause it to reappear
on every startup. A later, higher version is eligible for a new notification. If the browser already
has the latest version, no notification is shown.

## Version manifest

Add `scripts/generate-version-manifest.mjs`. It reads the validated `package.json` version and writes
an ignored `public/version.json` containing only the current deployed version:

```json
{ "version": "0.2.3" }
```

Add an npm `version:manifest` script and invoke it through `predev` and `prebuild`. This ensures the
Vite dev server and production `dist/` output both expose a manifest without adding a fifth
auto-versioning surface to Git. `public/version.json` is generated output and is ignored by Git.

The client requests `/version.json` with a current-timestamp query parameter and `cache: 'no-store'`, keeping the endpoint
same-origin and avoiding stale browser/proxy responses. Deployment configuration may additionally
set `Cache-Control: no-cache` for the manifest, but the feature does not require a backend.

## Client architecture and data flow

Add a browser-safe SemVer comparator under `src/utils/version.ts` (or an equivalent focused utility)
that accepts the project’s strict `major.minor.patch` form and compares numeric components. Do not
import the Node-only versioning script into the browser bundle.

Add `src/hooks/useVersionUpdate.ts`. The hook:

1. Returns immediately during server-side/non-browser execution or while the document is hidden.
2. Fetches the cache-busted same-origin manifest with a short abort timeout.
3. Validates the response shape and strict version string.
4. Compares the manifest version with `APP_VERSION`.
5. Stops without side effects when the remote version is equal to or older than the bundled version.
6. Checks the last-notified version in local storage and suppresses duplicates.
7. Records the remote version and dispatches an update toast with a Reload action when it is newer.
8. Schedules the next check for 30 minutes and triggers a check when the document becomes visible.

Mount the hook once from `App` so Formatter and Comparison views share one update notification. The
hook owns update-check timing and deduplication; `ToastContainer` owns presentation and dismissal.

Extend the existing toast message/event shape with an optional action and an optional persistent
duration. Existing `showToast(message, type)` callers remain source-compatible. The update caller
uses an informational toast with `{ label: 'Reload', onClick: () => window.location.reload() }` and
no automatic timeout. Clicking Reload or the close control removes the toast.

## Error handling and safety

- Missing manifests, non-OK responses, timeouts, malformed JSON, invalid versions, and storage errors
  are silent no-ops; editing must continue normally.
- A hidden document does not start a fetch. A visibility change back to visible performs an immediate
  check, and the interval remains bounded to one scheduled check at a time.
- Only a relative `/version.json` URL is used; no remote URL or manifest-provided code is executed.
- The update action performs a normal reload only. It does not clear local workspace data or alter
  Git/version metadata.
- Existing error/info/success toasts preserve their current colors, roles, close behavior, and
  four-second default timeout.

## Files and responsibilities

- `scripts/generate-version-manifest.mjs` — validates the package version and writes generated output.
- `public/version.json` — generated, ignored manifest copied/served by Vite.
- `src/utils/version.ts` — browser-safe strict SemVer parsing/comparison.
- `src/hooks/useVersionUpdate.ts` — fetch lifecycle, scheduling, visibility handling, and deduplication.
- `src/components/Toast.tsx` — optional action/persistent-duration support while preserving existing API.
- `src/App.tsx` — mounts the update hook once.
- `src/utils/__tests__/version.test.ts` and relevant hook/toast tests — unit and behavior coverage.
- `package.json` / `.gitignore` — manifest script and generated-file handling.
- `README.md` / `AGENTS.md` — developer-facing manifest/update behavior and verification guidance.

## Testing and verification

Unit tests cover strict version parsing/comparison, manifest generation and invalid package versions,
toast action/duration compatibility, update detection, duplicate suppression, newer-version detection,
malformed responses, network failures, hidden-document behavior, and reload action dispatch.

Browser tests cover the visible update toast, accessible Reload and close controls, no focus theft,
and the unchanged existing toast behavior. Existing Vitest, lint, typecheck, build, and accessibility
checks remain required.

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
