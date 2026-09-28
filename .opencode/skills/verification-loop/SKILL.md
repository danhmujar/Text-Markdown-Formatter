---
name: verification-loop
description: Use when verifying code changes in Text Markdown Formatter, especially before declaring a fix complete or after a failed check; run the project checks, diagnose failures, fix the cause, and rerun affected checks.
---

# Project verification loop

Use this loop after implementation work in this repository. Read `AGENTS.md` and `package.json` for the current commands and constraints before running checks.

1. Inspect the changed files and existing work with `git status --short` and `git diff`. Keep unrelated changes intact. Choose focused tests for the changed behavior when available.
2. Run focused tests while iterating. After relevant code changes, run the repository checks in order: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, then `npm run a11y:check` for UI, accessibility, PWA, or browser-facing changes. Run `npm run format:check` for touched formatted files and `npm run version:check` when version surfaces change. Note that `a11y:check` builds again and runs the full Playwright suite against the production preview on port 4173.
3. On a failure, record the command and diagnostic, determine whether it is caused by the change, an existing issue, missing browser/dependency setup, or an environment restriction. Fix failures caused by the change; rerun the failed check and any downstream checks affected by the fix. Continue until the relevant checks pass. Do not hide failures by weakening tests or skipping checks.
4. Before reporting completion, inspect `git status --short` and `git diff` again. Summarize the change, checks that passed, and any check that could not run with its reason.

## Windows execution

- Use the installed local dependencies. Do not install or upgrade packages without asking first.
- If `node`, `npm`, or `npx` is missing from PATH, use the portable Node directory at `C:\Users\Danh24667\Downloads\AI projects\.tools\node-v24.20.0-win-x64` by prepending it to the **current process** PATH only. For Git, use the portable executable at `C:\Users\Danh24667\Downloads\AI projects\.tools\git\cmd\git.exe` if needed.
- If a Node-based check fails due to child-process sandbox denial such as `spawn EPERM`, retry that exact command with narrowly scoped per-command sandbox approval where available. Treat that separately from a project failure; do not change system settings or request administrator elevation.
- Playwright browser tests require a built `dist` and a working Chromium installation. Report an unavailable browser or sandbox permission as a blocked check rather than a passing test.
