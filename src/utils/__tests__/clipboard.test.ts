import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyFormattedTextToClipboard } from '../sanitize';

describe('copyFormattedTextToClipboard', () => {
  const originalClipboard = navigator.clipboard;
  const originalExecCommand = document.execCommand;
  const originalClipboardItem = window.ClipboardItem;

  beforeEach(() => {
    vi.restoreAllMocks();
    (window as unknown as { ClipboardItem: unknown }).ClipboardItem = class MockClipboardItem {
      items: Record<string, Blob>;
      constructor(items: Record<string, Blob>) {
        this.items = items;
      }
      async getType(type: string): Promise<Blob> {
        return this.items[type];
      }
    };
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
    document.execCommand = originalExecCommand;
    (window as unknown as { ClipboardItem: unknown }).ClipboardItem = originalClipboardItem;
  });

  it('returns true when clipboard.write succeeds', async () => {
    const writeMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: writeMock },
      writable: true,
      configurable: true,
    });

    const success = await copyFormattedTextToClipboard('<p>Hello</p>', 'Hello');
    expect(success).toBe(true);
    expect(writeMock).toHaveBeenCalled();
  });

  it('returns false when both clipboard.write and fallback execCommand fail', async () => {
    const writeMock = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: writeMock },
      writable: true,
      configurable: true,
    });

    document.execCommand = vi.fn().mockReturnValue(false);

    const success = await copyFormattedTextToClipboard('<p>Hello</p>', 'Hello');
    expect(success).toBe(false);
  });

  it('passes multi-row text directly to clipboard without introducing extra line breaks', async () => {
    let capturedText = '';
    const writeMock = vi.fn().mockImplementation(async (items: ClipboardItem[]) => {
      const item = items[0];
      const textBlob = await item.getType('text/plain');
      capturedText = await textBlob.text();
    });

    Object.defineProperty(navigator, 'clipboard', {
      value: { write: writeMock },
      writable: true,
      configurable: true,
    });

    const rows = ['Row 1 with content', 'Row 2 with content', 'Row 3 with content'];
    const plainText = rows.join('\n');
    await copyFormattedTextToClipboard('<table>...</table>', plainText);

    expect(capturedText).toBe('Row 1 with content\nRow 2 with content\nRow 3 with content');
    expect(capturedText.split('\n')).toHaveLength(3);
  });
});
