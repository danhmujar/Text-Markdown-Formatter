import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as markdownFormatter from '../../utils/markdownFormatter';
import * as sanitize from '@/utils/sanitize';
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
    vi.unstubAllGlobals();
  });

  function renderEditor(content: string, mode: 'edit' | 'preview' = 'edit') {
    const onChange = vi.fn();
    act(() =>
      root.render(
        <TooltipProvider>
          <FormatterCell
            rowIndex={0}
            colIndex={0}
            content={content}
            inputHadBr={content.includes('<br>')}
            options={{ ...options, theme: 'dark' }}
            mode={mode}
            isCopied={false}
            feedback={null}
            label="Cleaned Text"
            showLabel={false}
            registerTextarea={vi.fn()}
            onModeChange={vi.fn()}
            onClear={vi.fn()}
            onCopy={vi.fn()}
            onKeyDown={vi.fn()}
            onPaste={vi.fn()}
            onButtonPaste={vi.fn()}
            getPasteVersion={vi.fn()}
            onChange={onChange}
            onSmartClean={vi.fn()}
            onApplyNumbering={vi.fn()}
            onApplyInlineFormat={vi.fn()}
            listTerminator=";"
            onListTerminatorChange={vi.fn()}
          />
        </TooltipProvider>,
      ),
    );
    return { textarea: container.querySelector('textarea')!, onChange };
  }

  function copySelection(textarea: HTMLElement, clipboardData: unknown) {
    const event = new Event('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: clipboardData });
    act(() => {
      textarea.dispatchEvent(event);
    });
    return event;
  }

  it.each([false, true])(
    'uses the button clipboard writer with native fallback (denied: %s)',
    async (denied) => {
      const { textarea } = renderEditor('Before\nFirst\nSecond\nAfter');
      const selected = 'First\nSecond';
      const start = textarea.value.indexOf(selected);
      textarea.setSelectionRange(start, start + selected.length);
      vi.stubGlobal('navigator', { clipboard: {} });
      vi.stubGlobal('ClipboardItem', class {});
      const write = vi.spyOn(sanitize, 'writePreparedClipboard');
      if (denied) write.mockRejectedValue(new Error('Permission denied'));
      else write.mockResolvedValue(undefined);
      const setData = vi.fn();
      const event = copySelection(textarea, { setData });
      await act(async () => {
        await Promise.resolve();
      });
      const html = setData.mock.calls.find(([type]) => type === 'text/html')![1];
      expect(write).toHaveBeenCalledExactlyOnceWith(html, 'First<br>Second');
      expect(setData).toHaveBeenCalledWith('text/plain', 'First<br>Second');
      expect(event.defaultPrevented).toBe(true);
      expect(textarea.selectionStart).toBe(start);
      expect(textarea.selectionEnd).toBe(start + selected.length);
    },
  );

  it('copies a Preview substring with enclosing formatting and Catalyst breaks', () => {
    renderEditor('Before **selected words**\nSecond\nAfter', 'preview');
    const preview = container.querySelector<HTMLElement>('[id^="formatter-preview-"]')!;
    const strong = preview.querySelector('strong')!.firstChild!;
    const range = document.createRange();
    range.setStart(strong, 2);
    range.setEnd(strong, 8);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    const setData = vi.fn();
    const event = copySelection(preview, { setData });
    expect(event.defaultPrevented).toBe(true);
    expect(setData).toHaveBeenCalledWith('text/plain', 'lected');
    const html = setData.mock.calls.find(([type]) => type === 'text/html')![1];
    expect(html).toContain('<strong>lected</strong>');
    expect(html).not.toContain('Before');
    expect(selection.getRangeAt(0)).toBe(range);
    selection.removeAllRanges();
  });

  it('leaves Preview copy native when the selection extends outside the cell', () => {
    renderEditor('Selected', 'preview');
    const preview = container.querySelector<HTMLElement>('[id^="formatter-preview-"]')!;
    const outside = document.createTextNode('Outside');
    container.appendChild(outside);
    const range = document.createRange();
    range.setStart(preview.querySelector('p')!.firstChild!, 0);
    range.setEnd(outside, 7);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    const setData = vi.fn();
    expect(copySelection(preview, { setData }).defaultPrevented).toBe(false);
    expect(setData).not.toHaveBeenCalled();
    selection.removeAllRanges();
  });

  it.each([
    ['prefix **bold** suffix', '**bold**', '**bold**', true],
    ['prefix **bold** suffix', 'bold', 'bold', false],
    ['Before<br>First<br>Second<br>After', 'First\nSecond', 'First<br>Second', false],
    ['Before\nFirst\nSecond\nAfter', 'First\nSecond', 'First<br>Second', false],
    [
      'before\n| A | B |\n| --- | --- |\n| 1 | 2 |\nafter',
      '| A | B |\n| --- | --- |\n| 1 | 2 |',
      '| A | B |\n| --- | --- |\n| 1 | 2 |',
      false,
    ],
  ])('copies from %j using only selection %j', (content, selected, plainText, bold) => {
    const { textarea, onChange } = renderEditor(content);
    const start = textarea.value.indexOf(selected);
    textarea.focus();
    textarea.setSelectionRange(start, start + selected.length);
    const setData = vi.fn();
    const event = copySelection(textarea, { setData });
    expect(event.defaultPrevented).toBe(true);
    expect(setData).toHaveBeenCalledWith('text/plain', plainText);
    const html = setData.mock.calls.find(([type]) => type === 'text/html')![1] as string;
    const fragment = html.split('<!--StartFragment-->')[1].split('<!--EndFragment-->')[0];
    expect(fragment).not.toContain('prefix');
    expect(fragment).not.toContain('Before');
    expect(fragment.includes('<strong')).toBe(bold);
    expect(textarea.selectionStart).toBe(start);
    expect(textarea.selectionEnd).toBe(start + selected.length);
    expect(document.activeElement).toBe(textarea);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses light export styling and sanitizes selected HTML', () => {
    const buildHtml = vi
      .spyOn(markdownFormatter, 'buildInlineStyledHtml')
      .mockReturnValue('<p onclick="alert(1)">Safe<script>alert(1)</script></p>');
    const { textarea } = renderEditor('Safe');
    textarea.setSelectionRange(0, 4);
    const setData = vi.fn();
    copySelection(textarea, { setData });
    expect(buildHtml).toHaveBeenCalledWith('Safe', { ...options, theme: 'light' }, true);
    const html = setData.mock.calls.find(([type]) => type === 'text/html')![1] as string;
    expect(html).toContain('<p>Safe</p>');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('<script>');
  });

  it('leaves native copy intact without a selection or clipboard data', () => {
    const { textarea } = renderEditor('content');
    const setData = vi.fn();
    textarea.setSelectionRange(2, 2);
    expect(copySelection(textarea, { setData }).defaultPrevented).toBe(false);
    expect(setData).not.toHaveBeenCalled();
    textarea.setSelectionRange(0, 7);
    expect(copySelection(textarea, null).defaultPrevented).toBe(false);
  });

  it('leaves native copy intact if rendering or clipboard writes fail', () => {
    const { textarea } = renderEditor('content');
    textarea.setSelectionRange(0, 7);
    const setData = vi.fn(() => {
      throw new Error('Unavailable');
    });
    expect(copySelection(textarea, { setData }).defaultPrevented).toBe(false);
    vi.spyOn(markdownFormatter, 'buildInlineStyledHtml').mockImplementation(() => {
      throw new Error('Render failed');
    });
    expect(copySelection(textarea, { setData: vi.fn() }).defaultPrevented).toBe(false);
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
          onButtonPaste: vi.fn(),
          getPasteVersion: vi.fn(),
          onChange: vi.fn(),
          onSmartClean: vi.fn(),
          onApplyNumbering: vi.fn(),
          onApplyInlineFormat: vi.fn(),
          listTerminator: ';',
          onListTerminatorChange: vi.fn(),
        }),
      );

    act(() => root.render(renderCell('edit')));
    expect(buildHtml).not.toHaveBeenCalled();

    act(() => root.render(renderCell('preview')));
    expect(buildHtml).toHaveBeenCalledOnce();
    expect(container.querySelector('#formatter-preview-0-0')?.innerHTML).toBe('<p>Preview</p>');
  });

  it('returns focus to the warning toggle after Escape', () => {
    act(() =>
      root.render(
        React.createElement(
          TooltipProvider,
          null,
          React.createElement(FormatterCell, {
            rowIndex: 0,
            colIndex: 0,
            content: 'word**bold**',
            inputHadBr: false,
            options,
            mode: 'edit',
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
            onButtonPaste: vi.fn(),
            getPasteVersion: vi.fn(),
            onChange: vi.fn(),
            onSmartClean: vi.fn(),
            onApplyNumbering: vi.fn(),
            onApplyInlineFormat: vi.fn(),
            listTerminator: ';',
            onListTerminatorChange: vi.fn(),
          }),
        ),
      ),
    );

    const toggle = container.querySelector<HTMLButtonElement>('button[aria-expanded]');
    expect(toggle).not.toBeNull();
    act(() => toggle?.click());
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));

    expect(document.activeElement).toBe(toggle);
  });

  it('shows preserved HTML breaks as editable newlines', () => {
    act(() =>
      root.render(
        React.createElement(
          TooltipProvider,
          null,
          React.createElement(FormatterCell, {
            rowIndex: 0,
            colIndex: 0,
            content: 'First<br>Second',
            inputHadBr: true,
            options,
            mode: 'edit',
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
            onButtonPaste: vi.fn(),
            getPasteVersion: vi.fn(),
            onChange: vi.fn(),
            onSmartClean: vi.fn(),
            onApplyNumbering: vi.fn(),
            onApplyInlineFormat: vi.fn(),
            listTerminator: ';',
            onListTerminatorChange: vi.fn(),
          }),
        ),
      ),
    );

    expect(container.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('First\nSecond');
  });
});
