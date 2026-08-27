import { beforeEach, describe, expect, it } from 'vitest';
import {
  readWorkspace,
  WORKSPACE_STORAGE_KEY,
  WORKSPACE_STORAGE_VERSION,
} from '../useWorkspacePersistence';

describe('readWorkspace', () => {
  beforeEach(() => localStorage.clear());
  it('falls back for malformed or incompatible records', () => {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, '{bad json');
    expect(readWorkspace()).toEqual({ grid: [['']], outputOverrides: {} });
    localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        version: WORKSPACE_STORAGE_VERSION + 1,
        grid: [['saved']],
        outputOverrides: {},
      }),
    );
    expect(readWorkspace()).toEqual({ grid: [['']], outputOverrides: {} });
  });
  it('restores valid grid and overrides', () => {
    localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        version: WORKSPACE_STORAGE_VERSION,
        grid: [['saved']],
        outputOverrides: { '0-0': 'edited' },
      }),
    );
    expect(readWorkspace()).toEqual({ grid: [['saved']], outputOverrides: { '0-0': 'edited' } });
  });
});
