import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { generateVersionManifest } from './generate-version-manifest.mjs';

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'formatter-manifest-'));
}

function writePackage(rootDir, version) {
  fs.writeFileSync(
    path.join(rootDir, 'package.json'),
    `${JSON.stringify({ name: 'fixture', private: true, version }, null, 2)}\n`,
  );
}

test('generates the current version manifest and creates public', () => {
  const rootDir = makeTempRoot();
  try {
    writePackage(rootDir, '0.2.4');
    const result = generateVersionManifest(rootDir);
    assert.equal(result.version, '0.2.4');
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(rootDir, 'public', 'version.json'), 'utf8')),
      { version: '0.2.4' },
    );
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});

test('rejects an invalid package version without writing a manifest', () => {
  const rootDir = makeTempRoot();
  try {
    writePackage(rootDir, '0.2');
    assert.throws(() => generateVersionManifest(rootDir), /Invalid package version/);
    assert.equal(fs.existsSync(path.join(rootDir, 'public', 'version.json')), false);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });
  }
});
