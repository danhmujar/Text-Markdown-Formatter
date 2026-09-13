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
    expect(readWorkspace()).toEqual({ grid: [['']] });
    localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({ version: WORKSPACE_STORAGE_VERSION + 1, grid: [['saved']] }),
    );
    expect(readWorkspace()).toEqual({ grid: [['']] });
  });

  it('restores a valid version two grid', () => {
    localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({ version: WORKSPACE_STORAGE_VERSION, grid: [['saved']] }),
    );
    expect(readWorkspace()).toEqual({ grid: [['saved']] });
  });

  it('migrates valid version one output overrides into the source grid', () => {
    localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        grid: [
          ['source', 'keep'],
          ['other', 'value'],
        ],
        outputOverrides: { '0-0': 'edited', '1-1': '', '9-9': 'ignored' },
      }),
    );

    expect(readWorkspace()).toEqual({
      grid: [
        ['edited', 'keep'],
        ['other', ''],
      ],
    });
  });
});
