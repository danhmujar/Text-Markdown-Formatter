# Pillar 3 — Reliability Notes (GenAI Alignment)

**Date:** 2026-08-23
**Related plan:** `pillar-3-reliability-plan.md` Phase 5 §2
**Capability:** `metadata.json:5` `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`

## Decision

`MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` is **retained** in `metadata.json:5`. The client bundle (`src/**`) contains **no direct `@google/genai` import** (`grep @google/genai` 0 hits, `package.json` has no `@google/genai` dependency). All GenAI functionality, if enabled, is server-side only and injected at runtime via AI Studio secrets.

## Mapping

- `.env.example:4` `GEMINI_API_KEY="MY_GEMINI_API_KEY"` — placeholder. AI Studio injects the real `GEMINI_API_KEY` at Cloud Run runtime from the user's **Secrets panel**. The client never reads this key directly.
- `APP_URL` `.env.example:8` — likewise injected at runtime.
- No client code calls `genai` SDK, `fetch` to Gemini, or exposes the key. This satisfies the anti-pattern guard in the plan: *Do NOT re-introduce `@google/genai` without a server wrapper + retry/timeout*.

## If GenAI Is Re-Added Later

Must follow the plan's constraint:

- Add a **server route/proxy** that holds the key, never the browser.
- Add `fetch` retry with **exponential backoff 3×** and **`AbortController` 10s timeout**.
- Keep client sanitization (`sanitizeHtml`) on any AI-generated HTML before `dangerouslySetInnerHTML`.
- Do NOT add `window.onerror` as a replacement for `ErrorBoundary`.

## Verification

- `Get-Content metadata.json | Select-String "MAJOR_CAPABILITY"` → `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` (intentionally retained, now documented)
- `Get-ChildItem -Recurse -Include "*.ts","*.tsx" -Path src | Select-String "@google/genai"` → 0 hits
- `npm audit` → 0 vulnerabilities
- Runtime validation guard `src/hooks/useGridHistory.ts:9-11` remains.
