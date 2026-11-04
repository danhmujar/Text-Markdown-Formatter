import type { ClipboardEvent } from 'react';
import { prepareClipboardHtml, writePreparedClipboard } from '@/utils/sanitize';
import { logger } from '@/utils/logger';

/** Native event data is the fallback; the async writer matches Copy to Catalyst. */
export function copySelection(event: ClipboardEvent, html: string, plainText: string): void {
  if (!event.clipboardData) return;
  const preparedHtml = prepareClipboardHtml(html);
  event.clipboardData.setData('text/plain', plainText);
  event.clipboardData.setData('text/html', preparedHtml);
  event.preventDefault();
  if (navigator.clipboard && window.ClipboardItem) {
    void writePreparedClipboard(preparedHtml, plainText).catch((error: unknown) => {
      logger.warn('Selection clipboard write failed, keeping native copy:', error);
    });
  }
}
