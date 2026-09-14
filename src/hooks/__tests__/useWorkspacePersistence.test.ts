import { beforeEach, describe, expect, it } from 'vitest';
import {
  readWorkspace,
  WORKSPACE_STORAGE_KEY,
  WORKSPACE_STORAGE_VERSION,
} from '../useWorkspacePersistence';
import { MAX_GRID_CELL_CHARACTERS, MAX_GRID_TOTAL_CHARACTERS } from '../../utils/tableConvert';

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

  it('falls back when a saved grid exceeds workspace limits', () => {
    localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({ version: WORKSPACE_STORAGE_VERSION, grid: Array(101).fill(['saved']) }),
    );
    expect(readWorkspace()).toEqual({ grid: [['']] });
  });

  it('restores valid content at the total-character limit despite JSON overhead', () => {
    const grid = [
      Array(MAX_GRID_TOTAL_CHARACTERS / MAX_GRID_CELL_CHARACTERS).fill(
        'x'.repeat(MAX_GRID_CELL_CHARACTERS),
      ),
    ];
    localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({ version: WORKSPACE_STORAGE_VERSION, grid }),
    );
    expect(readWorkspace()).toEqual({ grid });
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
