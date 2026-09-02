# Automatic Commit Versioning Design

## Goal

Make every future Git commit advance the application version automatically while keeping the
package metadata and user-facing release metadata synchronized. Normal commits should be
hands-off; intentional feature, breaking-change, and exact-release commits should still be able to
choose the appropriate SemVer level.

## Scope

This design covers local Git hook installation, commit-time version calculation, synchronized file
updates, explicit release overrides, changelog boundaries, and CI drift detection. It does not
publish npm packages, create a GitHub release, or push commits/tags automatically.

## Versioning rules

The hook reads the Conventional Commit type from the commit message and applies one version change
to the current version before the commit is finalized:

| Commit message | Version change |
| --- | --- |
| `fix:`, `docs:`, `chore:`, and other ordinary commits | patch (`0.2.0` → `0.2.1`) |
| `feat:` | minor (`0.2.1` → `0.3.0`) |
| `feat!:` or a `BREAKING CHANGE:` footer | major (`0.3.0` → `1.0.0`) |
| `release: v1.0.0` (or `release: 1.0.0`) | exact version override (`1.0.0`) |

The `v` prefix is accepted in release messages but is not stored in package or application
metadata. Git tags are outside the automatic hook’s scope; a release tag can be created and pushed
deliberately after reviewing the resulting commit.

The hook rejects malformed versions, downgrades, equal-version overrides, and exact-version
overrides that do not represent a valid SemVer release. A normal commit always advances the
version, including commits that only change documentation. Changelog entries are not generated for
every commit; they remain curated release notes in `src/constants/release.ts` so the in-app changelog
stays readable.

## Architecture

### Repository-managed hook

Store a portable `post-commit` hook under `.githooks/` and configure Git to use that directory. Add
an npm setup/prepare script that runs `git config core.hooksPath .githooks` when a local Git
checkout is available, while safely doing nothing in source archives or non-Git environments.

The hook delegates all version logic to a Node script under `scripts/`, keeping shell glue minimal
and making the calculation testable on Windows and Unix-like systems.

### Commit-time flow

1. Git creates the user’s commit and invokes `.githooks/post-commit`.
2. The Node script reads the new commit message from `HEAD` and the current package version.
3. It calculates the next patch/minor/major version or validates an exact `release:` override.
4. It updates the package version, lockfile root version, `APP_VERSION`, and the README release line.
5. It stages only those generated version files.
6. It amends the just-created commit with `--no-edit`; an environment guard prevents the amend from
   recursively invoking the versioning logic. The final history contains one logical user commit.

The script must be idempotent for a single hook invocation and must not create a second logical
commit. If a file update, version parse, staging, or amend command fails, the original commit remains
and the generated files stay staged with a diagnostic so the user can inspect and recover the
working tree.

### CI consistency check

Add a read-only version check command that compares the package version, lockfile root version,
`APP_VERSION`, and README release line. Run it in the repository’s CI workflow on pull requests and
pushes. CI verifies synchronization but never changes files or creates releases.

## File and data changes

- `.githooks/post-commit` — invokes the versioning script after the commit is created.
- `scripts/auto-version.mjs` — parses commit intent, computes/validates SemVer, updates files, and
  stages generated changes.
- `scripts/check-version.mjs` — read-only consistency validation used locally and in CI.
- `scripts/setup-git-hooks.mjs` — configures `core.hooksPath` when appropriate.
- `package.json` — adds setup and version-check scripts without adding a runtime dependency.
- `package-lock.json` — remains synchronized by the updater.
- `src/constants/release.ts` — remains the single UI-facing version/changelog module.
- `README.md` — keeps its current-release line synchronized.
- `tests/` — tests import or derive the current app version rather than hard-coding a release number,
  plus unit coverage for parsing and bump rules.
- `.github/workflows/version-consistency.yml` — CI invokes the read-only consistency check on pull
  requests and pushes; the workflow must not mutate the checkout.

## Error handling and safety

- Refuse to run when the just-created `HEAD` message is missing or unreadable.
- Refuse malformed Conventional Commit release syntax and invalid exact versions.
- Refuse an exact version lower than the current version.
- Preserve the user’s staged content; only known generated version files may be staged by the hook.
- Never create or push a second logical commit from inside the hook; the post-commit implementation
  may amend the just-created commit once with a recursion guard.
- Make hook setup a no-op outside a Git checkout and report a concise setup warning rather than
  failing dependency installation.
- Keep changelog editing out of ordinary commit hooks; release notes remain intentional and reviewable.

## Testing and verification

- Unit-test commit-message parsing for ordinary, `feat`, breaking-change, and exact-release cases.
- Unit-test SemVer patch/minor/major calculations, pre-1.0 behavior, invalid versions, and
  downgrade rejection.
- Test the read-only consistency check against matching and deliberately mismatched fixtures.
- Exercise the updater against a temporary fixture and verify that only the expected files change and
  are staged.
- Verify the hook setup script both inside and outside a Git checkout.
- Run the project’s standard lint, typecheck, unit-test, build, and accessibility checks; browser
  checks remain environment-dependent.

## Acceptance Criteria

1. A normal commit automatically bumps the patch version and includes the synchronized version-file changes in that same commit.
2. A `feat:` commit automatically bumps the minor version, and a `feat!:` or `BREAKING CHANGE:` commit automatically bumps the major version.
3. A `release: vX.Y.Z` or `release: X.Y.Z` commit message can set an explicit valid version without creating a second commit.
4. `package.json`, the lockfile root package, `APP_VERSION`, and the README current-release line remain equal after every successful versioned commit.
5. The repository-managed hook is installed through npm setup and works from the project’s supported Windows development environment.
6. Malformed or regressive version updates fail safely, and failed updates do not modify unrelated user files or create a second logical commit.
7. Changelog entries remain curated release notes and are not generated for every ordinary commit.
8. A read-only CI check detects version drift without mutating the checkout.
