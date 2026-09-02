import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, '..');

export const GENERATED_VERSION_FILES = [
  'package.json',
  'package-lock.json',
  'src/constants/release.ts',
  'README.md',
];

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function filePath(rootDir, relativePath) {
  return path.join(rootDir, relativePath);
}

function readText(rootDir, relativePath) {
  return fs.readFileSync(filePath(rootDir, relativePath), 'utf8');
}

function lineEnding(source) {
  return source.includes('\r\n') ? '\r\n' : '\n';
}

function writeAtomic(targetPath, content) {
  const temporaryPath = path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.tmp`,
  );
  fs.writeFileSync(temporaryPath, content, 'utf8');
  try {
    fs.renameSync(temporaryPath, targetPath);
  } catch (error) {
    if (process.platform !== 'win32') {
      fs.rmSync(temporaryPath, { force: true });
      throw error;
    }
    fs.copyFileSync(temporaryPath, targetPath);
    fs.rmSync(temporaryPath, { force: true });
  }
}

export function parseVersion(value) {
  if (typeof value !== 'string' || !VERSION_PATTERN.test(value)) {
    throw new Error(`Invalid SemVer version: ${String(value)}`);
  }
  const [, major, minor, patch] = VERSION_PATTERN.exec(value);
  return { major: Number(major), minor: Number(minor), patch: Number(patch) };
}

export function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

export function compareVersions(left, right) {
  const a = typeof left === 'string' ? parseVersion(left) : left;
  const b = typeof right === 'string' ? parseVersion(right) : right;
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

export function bumpVersion(currentVersion, level) {
  const current = parseVersion(currentVersion);
  if (level === 'major') return formatVersion({ major: current.major + 1, minor: 0, patch: 0 });
  if (level === 'minor')
    return formatVersion({ major: current.major, minor: current.minor + 1, patch: 0 });
  if (level === 'patch')
    return formatVersion({ major: current.major, minor: current.minor, patch: current.patch + 1 });
  throw new Error(`Unknown version bump level: ${String(level)}`);
}

function meaningfulLines(message) {
  return message
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith('#'));
}

export function parseCommitIntent(message) {
  if (typeof message !== 'string') throw new Error('Commit message must be text.');
  const lines = meaningfulLines(message);
  const subject = lines[0] ?? '';
  const releasePrefix = /^release\s*:\s*(.*)$/i.exec(subject);

  if (releasePrefix) {
    const candidate = releasePrefix[1].trim();
    const exactMatch = /^v?(\d+\.\d+\.\d+)$/.exec(candidate);
    if (!exactMatch) {
      throw new Error('Invalid release commit message. Use "release: vX.Y.Z" or "release: X.Y.Z".');
    }
    const version = candidate.replace(/^v/i, '');
    parseVersion(version);
    return { kind: 'exact', version };
  }

  const conventional = /^([a-z][\w-]*)(?:\([^\r\n)]+\))?(!)?:\s+\S/i.exec(subject);
  const breakingFooter = /(^|\n)\s*BREAKING CHANGE\s*:/m.test(message);
  if (breakingFooter || conventional?.[2]) return { kind: 'major' };
  if (conventional?.[1].toLowerCase() === 'feat') return { kind: 'minor' };
  return { kind: 'patch' };
}

export function readVersionSurfaces(rootDir = DEFAULT_ROOT) {
  const packageJson = JSON.parse(readText(rootDir, 'package.json'));
  const packageLock = JSON.parse(readText(rootDir, 'package-lock.json'));
  const releaseSource = readText(rootDir, 'src/constants/release.ts');
  const readme = readText(rootDir, 'README.md');
  const appMatch = /APP_VERSION\s*=\s*['"]([^'"]+)['"]/.exec(releaseSource);
  const readmeMatch = /Current release:\s*\*\*([^*]+)\*\*/.exec(readme);

  if (!appMatch) throw new Error('Could not find APP_VERSION in src/constants/release.ts.');
  if (!readmeMatch) throw new Error('Could not find the README current-release line.');

  return {
    packageJson: packageJson.version,
    packageLock: packageLock.version,
    packageLockRoot: packageLock.packages?.['']?.version,
    appVersion: appMatch[1],
    readmeVersion: readmeMatch[1],
  };
}

export function assertConsistentVersions(surfaces) {
  const entries = Object.entries(surfaces);
  if (!entries.length) throw new Error('No version surfaces were provided.');
  const parsed = entries.map(([name, value]) => {
    try {
      return [name, parseVersion(value)];
    } catch (error) {
      throw new Error(`${name} has an invalid version: ${String(value)}`, { cause: error });
    }
  });
  const [, first] = parsed[0];
  const mismatches = parsed
    .filter(([, version]) => compareVersions(version, first) !== 0)
    .map(([name]) => name);
  if (mismatches.length) {
    throw new Error(`Version surfaces are inconsistent: ${mismatches.join(', ')}.`);
  }
  return formatVersion(first);
}

export function calculateNextVersion(currentVersion, intent) {
  parseVersion(currentVersion);
  if (intent.kind === 'exact') {
    parseVersion(intent.version);
    if (compareVersions(intent.version, currentVersion) <= 0) {
      throw new Error(`Release version ${intent.version} must be greater than ${currentVersion}.`);
    }
    return intent.version;
  }
  return bumpVersion(currentVersion, intent.kind);
}

function replaceRequired(source, pattern, replacement, label) {
  if (!pattern.test(source)) throw new Error(`Could not update ${label}.`);
  return source.replace(pattern, replacement);
}

export function updateVersionFiles(rootDir, targetVersion, { stage = true } = {}) {
  parseVersion(targetVersion);
  const currentVersion = assertConsistentVersions(readVersionSurfaces(rootDir));
  if (compareVersions(targetVersion, currentVersion) <= 0) {
    throw new Error(`Target version ${targetVersion} must be greater than ${currentVersion}.`);
  }

  const packageJsonPath = filePath(rootDir, 'package.json');
  const packageSource = readText(rootDir, 'package.json');
  const packageJson = JSON.parse(packageSource);
  packageJson.version = targetVersion;

  const packageLockPath = filePath(rootDir, 'package-lock.json');
  const packageLockSource = readText(rootDir, 'package-lock.json');
  const packageLock = JSON.parse(packageLockSource);
  if (!packageLock.packages?.['']) {
    throw new Error('Could not find the root package in package-lock.json.');
  }
  packageLock.version = targetVersion;
  packageLock.packages[''].version = targetVersion;

  const releaseSource = replaceRequired(
    readText(rootDir, 'src/constants/release.ts'),
    /(APP_VERSION\s*=\s*['"])[^'"]+(['"])/,
    `$1${targetVersion}$2`,
    'APP_VERSION',
  );
  const readme = replaceRequired(
    readText(rootDir, 'README.md'),
    /(Current release:\s*\*\*)[^*]+(\*\*)/,
    `$1${targetVersion}$2`,
    'README current-release line',
  );

  writeAtomic(
    packageJsonPath,
    `${JSON.stringify(packageJson, null, 2)}${lineEnding(packageSource)}`,
  );
  writeAtomic(
    packageLockPath,
    `${JSON.stringify(packageLock, null, 2)}${lineEnding(packageLockSource)}`,
  );
  writeAtomic(filePath(rootDir, 'src/constants/release.ts'), releaseSource);
  writeAtomic(filePath(rootDir, 'README.md'), readme);

  if (stage) {
    execFileSync('git', ['add', '--', ...GENERATED_VERSION_FILES], {
      cwd: rootDir,
      stdio: 'ignore',
    });
  }
  return { currentVersion, targetVersion, files: [...GENERATED_VERSION_FILES] };
}

export function runAutoVersionMessage(message, rootDir = DEFAULT_ROOT) {
  const currentVersion = assertConsistentVersions(readVersionSurfaces(rootDir));
  const intent = parseCommitIntent(message);
  const targetVersion = calculateNextVersion(currentVersion, intent);
  return updateVersionFiles(rootDir, targetVersion);
}

export function runAutoVersion(messageFile, rootDir = DEFAULT_ROOT) {
  if (!messageFile) throw new Error('Git did not provide a commit-message file.');
  const message = fs.readFileSync(messageFile, 'utf8');
  return runAutoVersionMessage(message, rootDir);
}

export function runPostCommit(rootDir = DEFAULT_ROOT) {
  if (process.env.TEXT_MARKDOWN_FORMATTER_AMENDING === '1') return null;
  const message = execFileSync('git', ['log', '-1', '--format=%B', 'HEAD'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const result = runAutoVersionMessage(message, rootDir);
  execFileSync('git', ['commit', '--amend', '--no-edit', '--no-verify'], {
    cwd: rootDir,
    env: { ...process.env, TEXT_MARKDOWN_FORMATTER_AMENDING: '1' },
    stdio: 'inherit',
  });
  return result;
}

function main() {
  if (process.env.TEXT_MARKDOWN_FORMATTER_SKIP === '1') return;
  if (process.env.TEXT_MARKDOWN_FORMATTER_AMENDING === '1') return;
  try {
    const result =
      process.argv[2] === '--post-commit' ? runPostCommit() : runAutoVersion(process.argv[2]);
    if (result) {
      process.stdout.write(`Auto-versioned ${result.currentVersion} → ${result.targetVersion}.\n`);
    }
  } catch (error) {
    process.stderr.write(
      `[auto-version] ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
