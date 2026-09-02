import { describe, expect, it } from 'vitest';
import { compareVersions, isNewerVersion, parseVersion } from '../version';

describe('version utilities', () => {
  it('parses strict semantic versions', () => {
    expect(parseVersion('1.2.30')).toEqual({ major: 1, minor: 2, patch: 30 });
    expect(() => parseVersion('v1.2.3')).toThrow();
    expect(() => parseVersion('1.2')).toThrow();
    expect(() => parseVersion('1.02.3')).toThrow();
    expect(() => parseVersion('1.2.3-beta')).toThrow();
  });

  it('compares versions by major, minor, then patch', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.1.0', '1.0.9')).toBeGreaterThan(0);
    expect(compareVersions('2.0.0', '9.9.9')).toBeLessThan(0);
    expect(isNewerVersion('0.2.5', '0.2.4')).toBe(true);
    expect(isNewerVersion('0.2.4', '0.2.4')).toBe(false);
  });
});
