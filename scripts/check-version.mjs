import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertConsistentVersions, readVersionSurfaces } from './auto-version.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function checkVersion(targetRoot = rootDir) {
  return assertConsistentVersions(readVersionSurfaces(targetRoot));
}

function main() {
  try {
    const version = checkVersion();
    process.stdout.write(`Version surfaces are synchronized at ${version}.\n`);
  } catch (error) {
    process.stderr.write(
      `[version-check] ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
