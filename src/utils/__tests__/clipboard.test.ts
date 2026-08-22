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
});
