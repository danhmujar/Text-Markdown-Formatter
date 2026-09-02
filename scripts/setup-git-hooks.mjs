import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function configureGitHooks(cwd = process.cwd()) {
  const rootDir = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  execFileSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], {
    cwd: rootDir,
    stdio: 'ignore',
  });
  return path.resolve(rootDir);
}

function main() {
  try {
    configureGitHooks();
    process.stdout.write('Git hooks configured at .githooks.\n');
  } catch {
    process.stderr.write(
      'Git checkout not detected; automatic commit versioning was not configured.\n',
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
