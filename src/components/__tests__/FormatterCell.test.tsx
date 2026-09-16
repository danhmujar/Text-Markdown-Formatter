import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as markdownFormatter from '../../utils/markdownFormatter';
import type { StyleOptions } from '../../types';
import { FormatterCell } from '../FormatterCell';
import { TooltipProvider } from '../ui';

const options: StyleOptions = {
  fontFamily: 'Calibri',
  fontSize: 11,
  lineHeight: 1.15,
  bulletLevel1: 'disc',
  bulletLevel2: 'circle',
  bulletLevel3: 'square',
  tableBorderColor: '#cbd5e1',
  tableHeaderBg: '#f1f5f9',
  tableHeaderColor: '#0f172a',
  tableAlternateBg: true,
  highlightBoldKeys: true,
  primaryColor: '#2563eb',
  theme: 'light',
};

describe('FormatterCell', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    // @ts-expect-error React act flag for test runners
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('builds formatted HTML only in Preview mode', () => {
    const buildHtml = vi
      .spyOn(markdownFormatter, 'buildInlineStyledHtml')
      .mockReturnValue('<p>Preview</p>');
    const renderCell = (mode: 'edit' | 'preview') =>
      React.createElement(
        TooltipProvider,
        null,
        React.createElement(FormatterCell, {
          rowIndex: 0,
          colIndex: 0,
          content: '**content**',
          inputHadBr: false,
          options,
          mode,
          isCopied: false,
          feedback: null,
          label: 'Cleaned Text',
          showLabel: false,
          registerTextarea: vi.fn(),
          onModeChange: vi.fn(),
          onClear: vi.fn(),
          onCopy: vi.fn(),
          onKeyDown: vi.fn(),
          onPaste: vi.fn(),
          onChange: vi.fn(),
          onSmartClean: vi.fn(),
          onApplyNumbering: vi.fn(),
          onApplyInlineFormat: vi.fn(),
        }),
      );

    act(() => root.render(renderCell('edit')));
    expect(buildHtml).not.toHaveBeenCalled();

    act(() => root.render(renderCell('preview')));
    expect(buildHtml).toHaveBeenCalledOnce();
    expect(container.querySelector('#formatter-preview-0-0')?.innerHTML).toBe('<p>Preview</p>');
  });
});
