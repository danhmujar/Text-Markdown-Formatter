import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, '..');
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

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

export function generateVersionManifest(rootDir = DEFAULT_ROOT) {
  const packagePath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const version = packageJson.version;
  if (typeof version !== 'string' || !VERSION_PATTERN.test(version)) {
    throw new Error(`Invalid package version: ${String(version)}`);
  }

  const publicDir = path.join(rootDir, 'public');
  fs.mkdirSync(publicDir, { recursive: true });
  const manifestPath = path.join(publicDir, 'version.json');
  writeAtomic(manifestPath, `${JSON.stringify({ version })}\n`);
  return { version, manifestPath };
}

function main() {
  try {
    const result = generateVersionManifest();
    process.stdout.write(
      `Generated ${path.relative(DEFAULT_ROOT, result.manifestPath)} for ${result.version}.\n`,
    );
  } catch (error) {
    process.stderr.write(
      `[version-manifest] ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
