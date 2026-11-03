import { MAX_GRID_TOTAL_CHARACTERS } from '@/utils/tableConvert';

export interface ClipboardPayload {
  text: string;
  html?: string;
}

export interface PasteSelection {
  start: number;
  end: number;
}

export async function readClipboard(): Promise<ClipboardPayload> {
  if (!window.isSecureContext || !navigator.clipboard) throw new Error('blocked');
  const clipboard = navigator.clipboard;
  if (typeof clipboard.read === 'function') {
    try {
      const items = await clipboard.read();
      for (const item of items) {
        if (!item.types.includes('text/plain')) continue;
        const plain = await item.getType('text/plain');
        if (plain.size > MAX_GRID_TOTAL_CHARACTERS * 4) throw new Error('too-large');
        const text = await plain.text();
        let html: string | undefined;
        if (item.types.includes('text/html')) {
          const rich = await item.getType('text/html');
          if (rich.size <= MAX_GRID_TOTAL_CHARACTERS * 4) html = await rich.text();
        }
        if (text.length > MAX_GRID_TOTAL_CHARACTERS) throw new Error('too-large');
        return { text, html };
      }
      return { text: '' };
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'NotSupportedError') throw error;
    }
  }
  if (typeof clipboard.readText !== 'function') throw new Error('blocked');
  const text = await clipboard.readText();
  if (text.length > MAX_GRID_TOTAL_CHARACTERS) throw new Error('too-large');
  return { text };
}
