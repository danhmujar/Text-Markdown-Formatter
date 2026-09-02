import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  assertConsistentVersions,
  bumpVersion,
  calculateNextVersion,
  parseCommitIntent,
  readVersionSurfaces,
  updateVersionFiles,
} from './auto-version.mjs';
import { checkVersion } from './check-version.mjs';
import { configureGitHooks } from './setup-git-hooks.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function writeFixture(rootDir, version = '0.2.0') {
  fs.mkdirSync(path.join(rootDir, 'src', 'constants'), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, 'package.json'),
    `${JSON.stringify({ name: 'fixture', private: true, version }, null, 2)}${os.EOL}`,
  );
  fs.writeFileSync(
    path.join(rootDir, 'package-lock.json'),
    `${JSON.stringify(
      {
        name: 'fixture',
        version,
        lockfileVersion: 3,
        packages: { '': { name: 'fixture', version } },
      },
      null,
      2,
    )}${os.EOL}`,
  );
  fs.writeFileSync(
    path.join(rootDir, 'src', 'constants', 'release.ts'),
    `export const APP_VERSION = '${version}';\nexport const CHANGELOG_ENTRIES = [];\n`,
  );
  fs.writeFileSync(
    path.join(rootDir, 'README.md'),
    `# Fixture\n\nCurrent release: **${version}**.\n`,
  );
}

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'formatter-versioning-'));
}

function git(rootDir, args) {
  return execFileSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function setupHookRepository(rootDir) {
  writeFixture(rootDir);
  fs.mkdirSync(path.join(rootDir, '.githooks'));
  fs.mkdirSync(path.join(rootDir, 'scripts'));
  fs.copyFileSync(
    path.join(repositoryRoot, 'scripts', 'auto-version.mjs'),
    path.join(rootDir, 'scripts', 'auto-version.mjs'),
  );
  const hookPath = path.join(rootDir, '.githooks', 'post-commit');
  fs.copyFileSync(path.join(repositoryRoot, '.githooks', 'post-commit'), hookPath);
  fs.chmodSync(hookPath, 0o755);

  git(rootDir, ['init', '-q']);
  git(rootDir, ['config', 'user.email', 'versioning-test@example.com']);
  git(rootDir, ['config', 'user.name', 'Versioning Test']);
  git(rootDir, ['add', '.']);
  git(rootDir, ['update-index', '--chmod=+x', '.githooks/post-commit']);
  git(rootDir, ['commit', '--no-verify', '-m', 'chore: fixture baseline']);
  git(rootDir, ['config', 'core.hooksPath', '.githooks']);
}

test('parses default, feature, breaking, and exact release intent', () => {
  assert.deepEqual(parseCommitIntent('fix: correct spacing'), { kind: 'patch' });
  assert.deepEqual(parseCommitIntent('feat(comparison): add export'), { kind: 'minor' });
  assert.deepEqual(parseCommitIntent('feat!: change the format'), { kind: 'major' });
  assert.deepEqual(parseCommitIntent('chore: prepare\n\nBREAKING CHANGE: remove old API'), {
    kind: 'major',
  });
  assert.deepEqual(parseCommitIntent('release: v1.0.0'), { kind: 'exact', version: '1.0.0' });
  assert.deepEqual(parseCommitIntent('# comment\n\nfix: ignore comments'), { kind: 'patch' });
});

test('rejects malformed exact release messages', () => {
  assert.throws(() => parseCommitIntent('release: v1'), /Invalid release commit message/);
  assert.throws(() => parseCommitIntent('release: 01.0.0'), /Invalid SemVer version/);
});

test('calculates patch, minor, major, and exact versions', () => {
  assert.equal(bumpVersion('0.2.0', 'patch'), '0.2.1');
  assert.equal(bumpVersion('0.2.1', 'minor'), '0.3.0');
  assert.equal(bumpVersion('0.3.0', 'major'), '1.0.0');
  assert.equal(calculateNextVersion('0.2.0', { kind: 'exact', version: '1.0.0' }), '1.0.0');
  assert.throws(
    () => calculateNextVersion('1.0.0', { kind: 'exact', version: '1.0.0' }),
    /must be greater/,
  );
  assert.throws(
    () => calculateNextVersion('1.0.0', { kind: 'exact', version: '0.9.0' }),
    /must be greater/,
  );
});

test('updates only synchronized version surfaces', () => {
  const rootDir = makeTempRoot();
  try {
    writeFixture(rootDir);
    const result = updateVersionFiles(rootDir, '0.2.1', { stage: false });
    assert.equal(result.currentVersion, '0.2.0');
    assert.equal(assertConsistentVersions(readVersionSurfaces(rootDir)), '0.2.1');
    assert.match(
      fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8'),
      /Current release: \*\*0\.2\.1\*\*/,
    );
    assert.deepEqual(result.files, [
      'package.json',
      'package-lock.json',
      'src/constants/release.ts',
      'README.md',
    ]);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test('rejects inconsistent version surfaces before writing', () => {
  const rootDir = makeTempRoot();
  try {
    writeFixture(rootDir);
    fs.writeFileSync(path.join(rootDir, 'README.md'), '# Fixture\n\nCurrent release: **0.1.9**.\n');
    assert.throws(() => updateVersionFiles(rootDir, '0.2.1', { stage: false }), /inconsistent/);
    assert.match(
      fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'),
      /"version": "0\.2\.0"/,
    );
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test('checks synchronized versions and reports drift', () => {
  const rootDir = makeTempRoot();
  try {
    writeFixture(rootDir);
    assert.equal(checkVersion(rootDir), '0.2.0');
    fs.writeFileSync(path.join(rootDir, 'README.md'), '# Fixture\n\nCurrent release: **0.1.9**.\n');
    assert.throws(() => checkVersion(rootDir), /inconsistent/);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test('configures repository-local hooks and rejects non-Git directories', () => {
  const rootDir = makeTempRoot();
  const outsideDir = makeTempRoot();
  try {
    writeFixture(rootDir);
    git(rootDir, ['init', '-q']);
    assert.equal(configureGitHooks(rootDir), rootDir);
    assert.equal(git(rootDir, ['config', '--local', 'core.hooksPath']).trim(), '.githooks');
    assert.throws(() => configureGitHooks(outsideDir));
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
    fs.rmSync(outsideDir, { recursive: true, force: true });
  }
});

test('post-commit hook bumps one user commit without creating another commit', () => {
  const rootDir = makeTempRoot();
  try {
    setupHookRepository(rootDir);

    fs.writeFileSync(path.join(rootDir, 'notes.txt'), 'changed\n');
    git(rootDir, ['add', 'notes.txt']);
    git(rootDir, ['commit', '-m', 'fix: update fixture']);

    assert.equal(assertConsistentVersions(readVersionSurfaces(rootDir)), '0.2.1');
    assert.equal(git(rootDir, ['rev-list', '--count', 'HEAD']).trim(), '2');
    const changedFiles = git(rootDir, ['show', '--format=', '--name-only', 'HEAD'])
      .split(/\r?\n/)
      .filter(Boolean);
    assert.deepEqual(
      changedFiles.sort(),
      [
        'README.md',
        'notes.txt',
        'package-lock.json',
        'package.json',
        'src/constants/release.ts',
      ].sort(),
    );
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test('post-commit hook applies minor, major, and exact release intent', () => {
  const rootDir = makeTempRoot();
  try {
    setupHookRepository(rootDir);
    for (const [message, expectedVersion, fileName] of [
      ['feat: add fixture capability', '0.3.0', 'feature.txt'],
      ['feat!: change fixture contract', '1.0.0', 'breaking.txt'],
      ['release: v1.2.0', '1.2.0', 'release.txt'],
    ]) {
      fs.writeFileSync(path.join(rootDir, fileName), `${message}\n`);
      git(rootDir, ['add', fileName]);
      git(rootDir, ['commit', '-m', message]);
      assert.equal(assertConsistentVersions(readVersionSurfaces(rootDir)), expectedVersion);
    }
    assert.equal(git(rootDir, ['rev-list', '--count', 'HEAD']).trim(), '4');
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
