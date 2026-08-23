# Pillar 3 — Reliability Notes (GenAI Alignment + Markdown-Paste Hotfix)

**Date:** 2026-08-23 (hotfix 2026-08-23 markdown-paste)
**Related plan:** `pillar-3-reliability-plan.md` Phases 4-5
**Capability:** `metadata.json:5` `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`
**Hotfix:** `src/utils/tableConvert.ts:204` `isLikelyMarkdownDocument`

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

## Hotfix 2026-08-23 — Markdown Paste → Table Regression

**Root cause:** `pillar-3-reliability-plan.md` Phase 4 added vertical-paste `parsePasteToGrid:192` `else if(rawLines.length>1) return rawLines.map(l=>[l])` to support Excel single-column paste. It lacked markdown detection, so every multi-line paste — including case digests (`***`, `### `, `**1. FACTS**`, `*   Whether...`, blank `\n\n`, `>120` chars) — became `N×1` grid → `useGridActions.ts:118` replaced grid → `htmlBuilder.ts:26` outer `<table>` destroyed formatting.

**Fix:** `src/utils/tableConvert.ts:193-235` adds `isLikelyMarkdownDocument(text,rawLines)` before vertical split. Returns `null` (stay 1×1 cell) for docs with `\n\n`, `#{1,6} `, `***`/`---`, `>`, ```` ``` ````, `[*+-] `×2, `**`×2 on ≥2 lines, `len>120`, or `>5` lines with `avg>60 && some>80`. `hasTabs` and HTML `<table>` still force grid. Plain `Line 1\nLine 2` still creates grid; `(i) test\n(ii) test` now correctly stays markdown (`marked` `breaks:true` → `<p>(i) test<br>(ii)...</p>`).

**Verification:**
- `Select-String -Pattern "isLikelyMarkdown" src/utils/tableConvert.ts` → 2 hits `193,204`
- `npm test` 42/42, `npx tsc --noEmit`, `npm run lint/build` green
- Manual: paste digest → 1×1 styled markdown; paste `a\nb\nc` → 3 rows; paste `a\tb` → 2 cols; paste `(i) test\n(ii) test` → single cell no table

## Verification

- `Get-Content metadata.json | Select-String "MAJOR_CAPABILITY"` → `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` (intentionally retained, now documented)
- `Get-ChildItem -Recurse -Include "*.ts","*.tsx" -Path src | Select-String "@google/genai"` → 0 hits
- `npm audit` → 0 vulnerabilities
- Runtime validation guard `src/hooks/useGridHistory.ts:9-11` remains.
- `npx tsc --noEmit && npm run lint && npm test && npm run build` → all green (hotfix verified)
