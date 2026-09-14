# PWA and offline mode implementation plan

## Objective

Make Text & Markdown Formatter installable and usable after the first successful online load. Use a generated Workbox service worker for the static application shell, preserve local workspace data, and replace manifest polling with service-worker-native update prompts.

## Settled design

- Add `vite-plugin-pwa` and use its default `generateSW` strategy; do not write a custom service worker.
- Use prompted updates. Never activate a waiting worker or reload an editing session automatically.
- Reuse the existing global `showToast`/`ToastContainer` surface for offline-ready and update notifications.
- Precache only the same-origin application shell, hashed build assets, and committed PWA icons.
- Keep Google Sans Flex network-loaded and accept the existing `system-ui` fallback offline. Do not runtime-cache or self-host the font in this change.
- Treat offline support as automatic browser behavior, not a separate application mode.
- Keep `APP_VERSION`, automatic Git versioning, About, and changelog metadata. Remove `/version.json` polling and generation because the service worker becomes the sole runtime update authority.
- Preserve root deployment: manifest `id`, `start_url`, and `scope` are `/`.

## Scope exclusions

- No custom service worker or `injectManifest` strategy.
- No background sync, IndexedDB, API cache, custom offline page, manual cache names, or cache-version constants.
- No custom install button or `beforeinstallprompt` handling.
- Add an advisory offline status badge only while the browser reports offline; it is not a reachability or application-availability guarantee.
- No changes to formatter, comparison, clipboard, history, theme, or workspace-storage contracts.
- No PWA service worker in normal Vite development; validate it through the production build and preview server.

## Repository evidence and integration points

- `vite.config.ts:7-46` owns the React/Tailwind plugins and production chunking. Add `VitePWA(...)` without changing aliases, `manualChunks`, `esbuild.drop`, or the `DISABLE_HMR` guards.
- `src/App.tsx:15,29` mounts `useVersionUpdate()` once at the application root. Replace that mount with the PWA lifecycle hook so `ToastContainer` remains the single notification renderer.
- `src/components/Toast.tsx:19-31,33-149` already supports transient messages and persistent actions. The update prompt can reuse `{ duration: null, action: { label: 'Reload', onClick } }`; no provider or new notification component is needed.
- `src/hooks/useWorkspacePersistence.ts:65-106` writes the grid to `localStorage` after 400 ms. Prompted updates protect active editing from unsolicited reloads; installed and browser windows continue sharing this origin storage.
- `src/styles/themes.css:17` already falls back from Google Sans Flex to system fonts, so loss of the external font does not block offline rendering.
- `index.html:6-28` permits same-origin scripts/assets through CSP and loads the external font. A same-origin manifest and generated worker require no CSP relaxation.
- `public/text-markdown-formatter-icon.png` is a 1280×1280 source icon. Installability still requires committed 192×192 and 512×512 entries, plus a deliberately opaque maskable variant.
- `playwright.config.ts:11-17` serves the production build on `http://localhost:4173`, which is a secure-context exception where service workers can be exercised.
- `tests/a11y.spec.ts:16-34` currently tests `/version.json` polling. Replace that obsolete scenario rather than retaining two update systems.
- `package.json:7-19`, `.gitignore:4`, `scripts/generate-version-manifest.mjs`, `scripts/version-manifest.test.mjs`, `src/hooks/useVersionUpdate.ts`, `src/utils/version.ts`, and their tests exist only for manifest polling and become obsolete in the clean cutover.
- `vite-plugin-pwa@1.3.0` declares Vite 6 support and already supplies its Workbox build/window dependencies; do not add `workbox-window` separately unless package installation reports an unresolved peer.

## Phase 1 — Add generated PWA build output and manifest

### Files

- `package.json`
- `package-lock.json`
- `bun.lock`
- `vite.config.ts`
- `src/vite-env.d.ts`
- `index.html`

### Changes

1. Install `vite-plugin-pwa` as a development dependency through npm. Update `package-lock.json` through npm, then refresh `bun.lock` with Bun's lockfile-only operation so both tracked lockfiles describe the same direct dependency; do not hand-edit either lockfile.
2. Import `VitePWA` in `vite.config.ts` and append it to the existing plugin list after React and Tailwind.
3. Configure the plugin with:
   - `registerType: 'prompt'`.
   - `includeAssets` for the committed 192×192, 512×512, maskable 512×512, and Apple touch icons.
   - Manifest `id: '/'`, `name: 'Text & Markdown Formatter'`, `short_name: 'Text Formatter'`, the current application description, `start_url: '/'`, `scope: '/'`, `display: 'standalone'`, `background_color: '#ffffff'`, and `theme_color: '#2563eb'`.
   - Icon records with exact `sizes`, `type: 'image/png'`, and separate `purpose: 'any'` and `purpose: 'maskable'` records.
4. Rely on `generateSW` defaults for revisioned precaching, navigation fallback, and outdated-cache cleanup. Do not add `runtimeCaching`, `navigateFallback`, `globPatterns`, `skipWaiting`, `clientsClaim`, or `devOptions` unless a production-browser check demonstrates a concrete default mismatch.
5. Add the plugin's React client type reference to `src/vite-env.d.ts`.
6. Add same-origin `theme-color` and Apple touch icon metadata to `index.html`. Keep the existing favicon and CSP unchanged.

### Guardrails

- Do not enable the worker under `npm run dev`; stale development caches create false failures and unnecessary cleanup work.
- Do not cache Google Fonts, arbitrary HTTPS requests, or future API routes.
- Do not alter Vite's existing manual chunks or root-relative deployment assumption.

## Phase 2 — Generate and commit the minimum icon set

### Files

- `public/pwa-192x192.png`
- `public/pwa-512x512.png`
- `public/pwa-maskable-512x512.png`
- `public/apple-touch-icon.png`
- Existing source: `public/text-markdown-formatter-icon.png`

### Changes

1. Produce 192×192 and 512×512 regular icons and a 180×180 Apple touch icon from the existing 1280×1280 source. Preserve transparency for the regular icons.
2. Produce a separate 512×512 maskable icon on an opaque `#2563eb` background. Keep all meaningful artwork inside the standardized central safe circle and leave the outer region disposable under platform masks.
3. Use one-time image tooling already available in the implementation environment or a throwaway Playwright/canvas conversion script. Commit only the PNG outputs; do not add or retain an asset-generator dependency or script.
4. Verify decoded dimensions, alpha behavior, and mask-safe cropping before referencing the files in the manifest.

### Guardrails

- Do not declare the current transparent source image maskable without creating the opaque variant.
- Do not duplicate the 1280×1280 bytes under misleading 192×192 or 512×512 names.
- Do not replace the existing favicon unless visual inspection shows that the new regular icon is strictly equivalent at favicon sizes.

## Phase 3 — Replace manifest polling with service-worker lifecycle updates

### Files

- Add `src/hooks/usePwaUpdate.ts`
- Add `src/hooks/__tests__/usePwaUpdate.test.tsx`
- Modify `src/App.tsx`
- Modify `src/components/__tests__/Toast.test.tsx`
- Remove `src/hooks/useVersionUpdate.ts`
- Remove `src/hooks/__tests__/useVersionUpdate.test.tsx`
- Remove `src/utils/version.ts`
- Remove `src/utils/__tests__/version.test.ts`

### Changes

1. Add one root-level `usePwaUpdate` hook using `virtual:pwa-register/react`.
2. Use the virtual hook's `offlineReady`, `needRefresh`, `updateServiceWorker`, and registered-worker callback/state rather than calling `navigator.serviceWorker.register` directly.
3. When `offlineReady` becomes true, dispatch one ordinary success toast: `App is ready to work offline.` Clear the virtual flag after dispatch so React Strict Mode cannot duplicate it.
4. When `needRefresh` becomes true, dispatch one persistent informational toast: `A new version is available.` Its **Reload** action must call `updateServiceWorker(true)`; closing the toast leaves the current worker and page active. Clear the virtual flag after dispatch while retaining the action callback.
5. Preserve the useful part of the current long-lived update behavior: keep the registered `ServiceWorkerRegistration`, request `registration.update()` when a hidden tab becomes visible, and schedule one check every 30 minutes while visible. Prevent overlapping checks, ignore browser/update errors, and remove timers/listeners on unmount.
6. Replace `useVersionUpdate()` with `usePwaUpdate()` in `App`. Keep the hook at the same root ownership level; do not place update logic in `Header`, `ToastContainer`, or individual workspaces.
7. Remove the old manifest fetch, SemVer comparison, notification storage key, and their tests. The browser service-worker state becomes the single source of truth for whether deployable content is waiting.
8. Retarget the existing toast unit assertion from the obsolete semantic-version message to the generic PWA update message while preserving its real contract: the action toast remains until acted on or closed and invokes its callback once.
9. Add focused hook coverage by mocking `virtual:pwa-register/react`: prove offline-ready dispatch, persistent update dispatch, `updateServiceWorker(true)` after the Reload action, visibility/30-minute registration updates, overlap prevention, and cleanup. Do not assert Workbox internals.

### Guardrails

- Never use `registerType: 'autoUpdate'`, `skipWaiting`, or an unconditional `window.location.reload()`.
- Do not preserve `/version.json` as a fallback path; two update authorities can produce duplicate prompts and stale reloads.
- Do not create a PWA context/provider or separate toast UI.
- Do not clear or migrate formatter workspace storage during worker updates.

## Phase 3a — Add an advisory offline connectivity badge

### Files

- Add `src/hooks/useOnlineStatus.ts`
- Add `src/hooks/__tests__/useOnlineStatus.test.tsx`
- Modify `src/components/Header.tsx`
- Modify `tests/pwa.spec.ts`
- Modify `README.md`
- Modify `AGENTS.md`

### Changes

1. Add a focused `useOnlineStatus` hook that initializes from `navigator.onLine` and follows browser
   `online`/`offline` events, removing both listeners on unmount. Its boolean expresses the browser's
   reported connection state only.
2. Render a compact, static `Offline` status in `Header` only when that hook reports offline. Reuse
   existing semantic colors/tokens and `role="status"`; do not add a new component, state store, toast,
   persistence key, request, service-worker behavior, or animation.
3. Keep the badge visually subordinate to the formatter title and header actions at desktop and compact
   widths. It must not obscure controls, change focus order, claim the formatter is unavailable, or
   replace the existing offline-ready toast.
4. Add unit coverage for initial state, browser events, and listener cleanup. Extend the production PWA
   browser scenario to toggle browser offline/online state after service-worker control, assert the
   advisory badge appears and clears, then separately prove the service-worker offline reload.
5. Document that `Offline` means the browser reports no network connection; cached formatter features
   may still work and an Online state does not prove that a request will succeed.

### Guardrails

- Do not use the badge to enable, disable, or alter formatting, editing, copying, persistence, updates,
  or installation.
- Do not present it as an error, alert, retry control, connectivity test, or proof of offline cache
  readiness.
- Do not add polling, runtime caching, background sync, or a network probe.

## Phase 4 — Remove obsolete manifest-generation surfaces

### Files

- `package.json`
- `.gitignore`
- Remove `scripts/generate-version-manifest.mjs`
- Remove `scripts/version-manifest.test.mjs`
- Remove generated `public/version.json` from the working tree if present

### Changes

1. Remove `predev`, `prebuild`, and `version:manifest`; Vite PWA generation runs as part of the existing Vite build.
2. Keep `test:versioning`, but narrow it to `scripts/auto-version.test.mjs` after deleting the manifest-generator test.
3. Remove `public/version.json` from `.gitignore` and delete the generated local file.
4. Leave `scripts/auto-version.mjs`, `.githooks`, `version:check`, `APP_VERSION`, release entries, and synchronized package/README version surfaces unchanged.
5. Confirm no source, script, test, or documentation reference to `/version.json`, `VERSION_UPDATE_STORAGE_KEY`, `checkForVersionUpdate`, `useVersionUpdate`, `compareVersions`, or `version:manifest` remains.

## Phase 5 — Add production offline coverage

### Files

- Add `tests/pwa.spec.ts`
- Modify `tests/a11y.spec.ts`

### Changes

1. Remove the obsolete Playwright test that intercepts `/version.json` and expects a semantic-version toast.
2. Add one production-browser PWA scenario against the existing preview server:
   - Load `/` online.
   - Read the linked web manifest and assert the settled name, root scope/start URL, standalone display, and required regular/maskable icon records.
   - Fetch each declared same-origin icon and assert a successful image response.
   - Wait for `navigator.serviceWorker.ready`, reload once online, and assert the page has an active controller.
   - Enter formatter content, wait beyond the 400 ms persistence debounce, and confirm preview output.
   - Set the Playwright browser context offline and reload.
   - Assert the formatter renders, the persisted content is restored, a further offline edit still produces formatted preview output, and Undo restores the pre-edit content.
   - Restore network state in cleanup so a failure does not contaminate later tests.
3. Keep accessibility coverage for the existing reusable toast action/close controls. The PWA test proves offline behavior; it should not duplicate the entire formatter or axe suite.

### Guardrails

- Do not mock Cache Storage, service workers, or `navigator.onLine` for the offline contract; exercise the built worker in Chromium.
- Do not run the PWA scenario against the Vite development server.
- Do not assert generated Workbox filenames or cache names; those are implementation details.

## Phase 6 — Documentation, release note, and cleanup

### Files

- `README.md`
- `AGENTS.md`
- `src/constants/release.ts`

### Changes

1. Replace README claims about manifest polling with installability, first-load requirements, offline-local behavior, prompted updates, and the production-preview verification path.
2. Remove `version:manifest`, generated-manifest files, and `useVersionUpdate` from README commands, structure, testing, configuration, and invariants.
3. Update `AGENTS.md` commands, architecture, versioning, tests, and gotchas: document generated `manifest.webmanifest`/worker output, production-only registration, root scope, update prompt behavior, system-font fallback, and that generated `dist` worker files are never committed.
4. Add one curated changelog entry describing installability, app-shell offline support, local workspace continuity, and user-controlled updates. Do not manually change `APP_VERSION`; repository automatic versioning owns synchronized version surfaces.
5. Remove any throwaway icon-generation or two-build smoke-test files and ensure no generated `public/version.json`, preview output, or service-worker artifact is staged outside `dist`.

## Verification sequence

Run repository checks in the documented order:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm run build`
5. `npm run a11y:check`
6. `npm run version:check`
7. `npm run format:check`

Then perform production-specific checks:

1. Inspect `dist/manifest.webmanifest`, `dist/sw.js`, Workbox output, and icon files. Confirm `dist/version.json` is absent and the worker precache contains the same-origin app shell without Google Fonts.
2. Run the `tests/pwa.spec.ts` Chromium scenario against `npm run preview -- --port 4173` and retain its successful offline reload as the primary behavioral proof.
3. Exercise a real update at one origin with two successive production builds. Keep an editing session open on build A, serve build B with a temporary visible source change, trigger `registration.update()` or return the tab to visibility, confirm the persistent update toast, select **Reload**, and verify build B appears with the persisted workspace intact. Revert the temporary source change and rebuild before final validation.
4. Inspect the manifest and icon safe area in Chromium DevTools Application panel. Confirm installability, standalone launch, correct normal icon, and acceptable circle/squircle mask crops.
5. With network disabled, confirm the UI uses a system font rather than failing or blocking render.

## Acceptance-criterion mapping

| Criterion | Verification |
| --- | --- |
| **AC-1:** The browser recognizes the app as installable with the correct name, standalone display, and valid regular/maskable icons. | Built-manifest assertions in `tests/pwa.spec.ts`; DevTools installability and icon-mask inspection. |
| **AC-2:** After one completed online load, an offline reload renders the complete formatter. | Real Chromium service-worker readiness, controller assertion, offline context, and reload in `tests/pwa.spec.ts`. |
| **AC-3:** Editing, formatting, previewing, history operations, and persisted workspace restoration work without a network connection. | Offline browser scenario for restore/edit/preview plus existing formatter/history test suite. |
| **AC-4:** Missing Google Fonts does not block rendering and uses the current system-font fallback. | Existing CSS fallback review and offline production-browser inspection. |
| **AC-5:** A newly deployed build prompts persistently and reloads only after the user selects **Reload**. | Focused `usePwaUpdate` unit test plus two-build production smoke test. |
| **AC-6:** Old precache entries are cleaned after activation of a newer build. | Use `generateSW` defaults and inspect Cache Storage after the two-build activation; no custom cleanup override. |
| **AC-7:** No custom worker, background sync, offline database, custom install prompt, or third-party runtime cache is introduced. | Configuration/code review and final targeted search. |
| **AC-8:** When the browser reports offline, a non-blocking advisory `Offline` badge appears without implying cached formatter availability; it clears on the next online event. | Unit event/cleanup coverage and browser offline/online emulation after production service-worker control. |

## Primary risks

- **Stale update path:** retaining `/version.json` alongside Workbox would create conflicting reload behavior. The plan removes it completely.
- **Data loss on update:** automatic activation can reload during editing. Prompted activation and existing workspace persistence keep the user in control.
- **False offline confidence:** service workers only help after successful installation. The browser test explicitly waits for readiness and control before disabling network.
- **Development cache interference:** enabling the worker in Vite development can serve stale bundles. Registration remains production-only.
- **Maskable icon clipping:** transparent padding is not a maskable treatment. A separate opaque, safe-zone-checked asset is required.
- **Lockfile drift:** both lockfiles are tracked even though npm drives scripts. Regenerate both with their package managers after adding the plugin.
- **Root-path coupling:** `/` scope matches current root-relative assets and `/version.json` history. If deployment later moves under a subpath, base, manifest URLs, and worker scope must change together; do not generalize that now.

## Authoritative references

- Vite PWA setup and generated manifest/worker: <https://vite-pwa-org.netlify.app/guide/>
- Generated versus custom service workers and prompt behavior: <https://vite-pwa-org.netlify.app/guide/service-worker-strategies-and-behaviors.html>
- Prompted update registration API: <https://vite-pwa-org.netlify.app/guide/prompt-for-update.html>
- React virtual registration module: <https://vite-pwa-org.netlify.app/frameworks/react.html>
- Chrome installability requirements: <https://web.dev/articles/install-criteria>
- Maskable icon safe-area guidance: <https://web.dev/articles/maskable-icon>

