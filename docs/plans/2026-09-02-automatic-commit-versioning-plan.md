# Automatic Commit Versioning Implementation Plan

## Goal

Implement the approved design in
`docs/specs/2026-09-02-automatic-commit-versioning-design.md`: every future commit advances the
application version, Conventional Commit types select patch/minor/major behavior, explicit release
messages can set an exact version, and all user-facing/package version surfaces remain synchronized
without creating a second commit.

## Phase 0: Documentation discovery

### Sources consulted

- `docs/specs/2026-09-02-automatic-commit-versioning-design.md:1-116` — approved goal, versioning
  grammar, hook flow, file list, safety rules, testing expectations, and acceptance criteria.
- `package.json:1-49` — current private package metadata, npm scripts, and dependency/runtime
  constraints; no existing setup, version-check, or release script is present.
- `package-lock.json:1-12` — root package version appears at the top-level and under `packages[""]`;
  both must remain synchronized.
- `src/constants/release.ts:1-25` — static `APP_VERSION` and curated `CHANGELOG_ENTRIES` consumed
  by the UI; ordinary commit hooks must not generate changelog noise.
- `README.md:1-5,38-55` — current-release line and documented script conventions.
- `.gitignore:1-11` — no exclusions for repository-managed hooks or version scripts.
- `AGENTS.md:3-18,20-27,54-70` — supported Windows development environment, strict checks, npm
  commands, and required verification order.
- Repository-wide search for `.githooks`, `scripts`, `.github/workflows`, `npm version`, Changesets,
  semantic-release, and release-please — no existing automation or local pattern was found.
- Documentation discovery report from `/root/versioning_discovery2` — confirmed the exact metadata
  locations, absent hook/CI infrastructure, and the design’s unresolved parser/rollback decisions.

### Allowed APIs and patterns

- Node ESM built-ins: `node:fs`, `node:path`, `node:child_process`, `node:os`, `node:url`, and
  `node:process`; no new runtime dependency is needed.
- Repository-managed `.githooks/commit-msg` shell entrypoint delegating to a Node `.mjs` script.
- Local Git configuration through `git config core.hooksPath .githooks`.
- JSON parsing/stringification for `package.json` and `package-lock.json`, preserving two-space
  formatting and a final newline.
- Exact text replacement for `APP_VERSION` and the README `Current release: **X.Y.Z**` line after
  a consistency check.
- `node:test` and `node:assert/strict` for script-level tests, with an npm script included in the
  normal verification path.
- Existing npm scripts and GitHub Actions checkout/setup-node actions for read-only CI validation.

### Explicit architecture decisions

- `scripts/auto-version.mjs` owns commit-message parsing, SemVer calculation/validation, synchronized
  updates, and staging. The hook remains shell glue only.
- The hook runs at `commit-msg`, after the message is available and before the commit is created.
- Ordinary commits default to a patch bump; `feat:` selects minor; `feat!:` or a `BREAKING CHANGE:`
  footer selects major; `release: vX.Y.Z` and `release: X.Y.Z` select an exact higher version.
- Version data is updated in the same commit as the user’s change. The hook never amends, creates, or
  pushes another commit.
- The package version is stored without `v`; only deliberate Git tags use the `vX.Y.Z` form.
- `src/constants/release.ts` remains the UI version/changelog module. Changelog entries remain
  curated and are not generated for ordinary commits.
- `scripts/check-version.mjs` is read-only and is the CI guard; it compares package, lockfile, app,
  and README versions but never changes the checkout.
- Git tags and remote pushes remain explicit user actions after review.

### Anti-pattern guards

- Do not add Husky, Changesets, semantic-release, or another dependency when native repository hooks
  and Node built-ins satisfy the requirement.
- Do not create a second version-bump commit from inside the hook or invoke `git commit` recursively.
- Do not update changelog entries on every commit.
- Do not silently accept malformed `release:` messages, equal versions, or downgrades.
- Do not stage files outside the known generated set (`package.json`, `package-lock.json`,
  `src/constants/release.ts`, and `README.md`).
- Do not use global Git configuration; hook setup must be repository-local and safe outside Git.
- Do not assume Unix-only shell behavior; the committed hook must run through Git for Windows and
  delegate platform-sensitive work to Node.
- Do not mutate the version if the existing version surfaces are already inconsistent; fail with a
  diagnostic so the user can repair the drift intentionally.
- Do not make CI rewrite files, create tags, or push commits.

## Phase 1: Build the versioning engine and repository hook

### What to implement

Add the pure, testable versioning logic and the repository-managed `commit-msg` hook. The Node
script should read the commit-message file, ignore comment lines, parse the subject/body according to
the approved rules, validate the current synchronized version, calculate the target version, update
only known files, and stage those generated files. Use atomic temporary-file replacement for writes
so a failed serialization or write cannot leave a partially written file.

Add `scripts/setup-git-hooks.mjs` and a `prepare` npm script. Setup should detect a Git checkout,
set the repository-local `core.hooksPath` to `.githooks`, and no-op with a concise warning outside a
checkout. Add the executable `.githooks/commit-msg` shim that passes Git’s message-file argument to
`scripts/auto-version.mjs`.

### Task checklist

- [ ] Add strict Conventional Commit subject/footer parsing, including malformed `release:` rejection.
- [ ] Add SemVer parsing and patch/minor/major calculation for current pre-1.0 and 1.x versions.
- [ ] Add exact release override parsing for `release: vX.Y.Z` and `release: X.Y.Z`, requiring a
      strictly higher valid version.
- [ ] Add synchronized-version reading for `package.json`, both lockfile root locations,
      `APP_VERSION`, and the README release line.
- [ ] Add atomic updates for the four generated files and stage only those paths.
- [ ] Add the repository-local `.githooks/commit-msg` shim and the Node hook entrypoint.
- [ ] Add `scripts/setup-git-hooks.mjs` and `prepare` so `npm install` installs the hook when a Git
      checkout is available.
- [ ] Handle missing message files, invalid versions, inconsistent surfaces, failed writes, and
      failed staging with non-zero exits and actionable messages.
- [ ] Keep the user’s original commit message unchanged and never invoke a nested commit.

### Documentation references

- Version grammar and exact bump rules: `docs/specs/2026-09-02-automatic-commit-versioning-design.md:18-35`.
- Hook flow and staging boundary: `docs/specs/2026-09-02-automatic-commit-versioning-design.md:42-62`.
- Generated file list: `docs/specs/2026-09-02-automatic-commit-versioning-design.md:70-82`.
- Package script insertion point: `package.json:6-17`.
- Package/lockfile version locations: `package.json:4`, `package-lock.json:3,9`.
- UI and README version locations: `src/constants/release.ts:2`, `README.md:5`.

### Verification checklist

- [ ] Script-level tests cover ordinary, `feat`, `feat!`, breaking-footer, exact-release, malformed,
      equal, downgrade, and inconsistent-surface inputs.
- [ ] A temporary fixture test proves only the four generated files are updated and staged.
- [ ] Hook setup tests succeed inside a Git checkout and safely no-op outside one.
- [ ] A real local commit in a disposable repository proves the bump is included in the same commit
      and no extra commit is created.
- [ ] Windows-compatible hook invocation is exercised through the project’s supported shell/runtime.
- [ ] `git diff --check` reports no generated whitespace errors.

### Acceptance criteria covered

AC1, AC2, AC3, AC4, AC5, AC6.

## Phase 2: Add consistency checking, CI, and developer-facing commands

### What to implement

Add the read-only `scripts/check-version.mjs` command and expose it as an npm script. It should
compare all synchronized version surfaces and exit non-zero with file-specific diagnostics when any
value differs. Add a GitHub Actions workflow at
`.github/workflows/version-consistency.yml` that checks out the repository and runs this command on
pull requests and pushes without mutating the checkout.

Document the local setup and commit conventions in `README.md` and `AGENTS.md`, including the
`prepare` behavior, `--no-verify` caveat, examples for patch/minor/major/exact release commits, and
the explicit tag/push step. Keep release notes guidance clear: ordinary commits bump the version,
but changelog entries are curated for intentional releases.

### Task checklist

- [ ] Add `npm run version:check` and a script-level test for matching/mismatched metadata.
- [ ] Add `.github/workflows/version-consistency.yml` using the project’s Node/npm conventions and
      the read-only check only.
- [ ] Add README instructions showing setup, ordinary commit behavior, Conventional Commit examples,
      exact `release: v1.0.0` overrides, and deliberate tag/push commands.
- [ ] Update AGENTS architecture, commands, gotchas, and verification notes for the managed hook and
      consistency check.
- [ ] Explain that `git commit --no-verify` bypasses the local hook and that CI is the safety net.
- [ ] Keep changelog guidance aligned with the approved curated-entry boundary.

### Documentation references

- CI and read-only check requirement: `docs/specs/2026-09-02-automatic-commit-versioning-design.md:64-65,81-82`.
- Error/safety requirements: `docs/specs/2026-09-02-automatic-commit-versioning-design.md:84-92`.
- Existing documentation structure: `README.md:31-137`, `AGENTS.md:3-71`.
- Existing npm scripts and preview/test conventions: `package.json:6-17`, `AGENTS.md:3-18`.

### Verification checklist

- [ ] `npm run version:check` passes on a synchronized checkout.
- [ ] Deliberately mismatching each of the four surfaces causes a non-zero check with a useful path.
- [ ] CI workflow is valid YAML, runs on pull requests and pushes, and contains no write/tag/push step.
- [ ] README and AGENTS examples use the same parser grammar and version terminology as the hook.
- [ ] Repository-wide stale searches find no obsolete “manual-only versioning” guidance.

### Acceptance criteria covered

AC4, AC7, AC8.

## Phase 3: Regression tests and integration hardening

### What to implement

Add script-level tests with Node’s built-in test runner and include them in the normal npm test path.
Use isolated temporary repositories/fixtures so tests can prove commit-time behavior without
changing the project’s real Git history. Replace hard-coded app-version assertions in
`tests/a11y.spec.ts` with a value derived from the app’s release metadata, so future bumps never
require hand-editing a test expectation.

Add integration coverage for the hook’s staging boundary, same-commit result, explicit minor/major
selection, exact `v1.0.0` release, malformed input refusal, and version-check failures. Keep the
existing browser accessibility tests focused on UI behavior; browser launching remains environment-
dependent as documented in `AGENTS.md`.

### Task checklist

- [ ] Add Node `node:test` coverage for parser and SemVer helpers.
- [ ] Add fixture tests for synchronized writes, staging scope, commit-message preservation, and
      no nested commit creation.
- [ ] Add exact release, minor, major, malformed, equal, and downgrade integration cases.
- [ ] Replace hard-coded `Version 0.2.0` browser assertion with a shared/current version source.
- [ ] Include versioning tests in the standard `npm run test` command or document the required paired
      command unambiguously.
- [ ] Verify hook bypass does not corrupt files and CI check catches any resulting drift.

### Documentation references

- Script test requirements: `docs/specs/2026-09-02-automatic-commit-versioning-design.md:94-101`.
- Existing browser assertion: `tests/a11y.spec.ts:64-67`.
- Existing Vitest and Playwright configuration: `vite.config.ts:15-18`, `playwright.config.ts:4-24`.
- Required verification order and test conventions: `AGENTS.md:3-18,54-70`.

### Verification checklist

- [ ] Script unit and fixture tests pass on Windows with Node’s built-in runner.
- [ ] `npm run test` includes both existing Vitest coverage and versioning coverage.
- [ ] A disposable Git repository shows one user commit containing the generated version updates.
- [ ] A disposable Git repository shows `feat:` → minor, `feat!:`/footer → major, and exact release
      override behavior.
- [ ] Existing 92 Vitest tests remain green and no comparison behavior changes.

### Acceptance criteria covered

AC1, AC2, AC3, AC4, AC6.

## Phase 4: Full verification and reconciliation

### What to implement

Run focused script tests first, then the repository-required checks in order. Inspect the final diff
for accidental user-file staging, recursive hook behavior, stale version literals, untracked
generated artifacts, and documentation inconsistencies. Update this plan’s checkboxes only after
evidence exists.

### Task checklist

- [ ] Run focused version parser/updater/checker tests.
- [ ] Run `npm run version:check`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run a11y:check` against the built preview.
- [ ] Run targeted Prettier checks and `git diff --check`.
- [ ] Search for stale hard-coded app versions and obsolete manual-versioning guidance.
- [ ] Confirm the final generated-file set is limited to intended files and no test artifacts remain.

### Documentation references

- Verification order: `AGENTS.md:18`.
- Script/build/test commands: `package.json:6-17`, `README.md:38-55`.
- Final safety and testing requirements: `docs/specs/2026-09-02-automatic-commit-versioning-design.md:84-101`.

### Verification checklist

- [ ] All focused versioning tests pass.
- [ ] Lint, strict typecheck, Vitest, and production build pass.
- [ ] The read-only consistency check passes on the final tree.
- [ ] Browser accessibility checks pass or are clearly attributed to host-level environment limits.
- [ ] No nested commit, tag, push, dependency, or unrelated file mutation is present.
- [ ] Every acceptance criterion has direct test, source, CI, or documentation evidence.

### Acceptance criteria covered

AC1 through AC8.

## Consolidated task list

- [ ] Phase 1: Build the versioning engine and repository hook.
- [ ] Phase 2: Add consistency checking, CI, and developer-facing commands.
- [ ] Phase 3: Add regression tests and integration hardening.
- [ ] Phase 4: Run full verification and reconcile documentation.

## Acceptance Criteria

1. A normal commit automatically bumps the patch version and includes the synchronized version-file changes in that same commit.
2. A `feat:` commit automatically bumps the minor version, and a `feat!:` or `BREAKING CHANGE:` commit automatically bumps the major version.
3. A `release: vX.Y.Z` or `release: X.Y.Z` commit message can set an explicit valid version without creating a second commit.
4. `package.json`, the lockfile root package, `APP_VERSION`, and the README current-release line remain equal after every successful versioned commit.
5. The repository-managed hook is installed through npm setup and works from the project’s supported Windows development environment.
6. Malformed, regressive, or failed version updates stop the commit before it is created and do not modify unrelated user files.
7. Changelog entries remain curated release notes and are not generated for every ordinary commit.
8. A read-only CI check detects version drift without mutating the checkout.
