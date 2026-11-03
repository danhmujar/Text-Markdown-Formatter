import { afterEach, describe, expect, it, vi } from 'vitest';
import { readClipboard } from '@/utils/clipboard';

afterEach(() => vi.unstubAllGlobals());

function clipboard(value: object) {
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('navigator', { clipboard: value });
}

describe('clipboard reader', () => {
  it('reads plain text and HTML from the same item', async () => {
    clipboard({
      read: async () => [
        {
          types: ['text/plain', 'text/html'],
          getType: async (type: string) => ({
            size: 20,
            text: async () => (type === 'text/plain' ? 'text' : '<b>text</b>'),
          }),
        },
      ],
    });
    await expect(readClipboard()).resolves.toEqual({ text: 'text', html: '<b>text</b>' });
  });
  it('falls back to plain text when rich reading is unavailable', async () => {
    clipboard({ readText: async () => 'plain' });
    await expect(readClipboard()).resolves.toEqual({ text: 'plain' });
    clipboard({
      read: async () => {
        throw new DOMException('', 'NotSupportedError');
      },
      readText: async () => 'fallback',
    });
    await expect(readClipboard()).resolves.toEqual({ text: 'fallback' });
  });
  it('does not retry denied access', async () => {
    const readText = vi.fn();
    clipboard({
      read: async () => {
        throw new DOMException('', 'NotAllowedError');
      },
      readText,
    });
    await expect(readClipboard()).rejects.toThrow();
    expect(readText).not.toHaveBeenCalled();
  });
  it('handles image-only and oversized clipboard content', async () => {
    clipboard({ read: async () => [{ types: ['image/png'] }] });
    await expect(readClipboard()).resolves.toEqual({ text: '' });
    clipboard({ readText: async () => 'x'.repeat(500_001) });
    await expect(readClipboard()).rejects.toThrow('too-large');
  });
  it('rejects oversized blobs before reading them', async () => {
    const text = vi.fn();
    clipboard({
      read: async () => [
        { types: ['text/plain'], getType: async () => ({ size: 2_000_001, text }) },
      ],
    });
    await expect(readClipboard()).rejects.toThrow('too-large');
    expect(text).not.toHaveBeenCalled();
  });
  it('requires a secure context', async () => {
    clipboard({ readText: async () => 'text' });
    vi.stubGlobal('isSecureContext', false);
    await expect(readClipboard()).rejects.toThrow('blocked');
  });
});
