import { logger } from './logger';
import { sanitizeHtml } from './security/sanitize';

export interface SanitizeOptions {
  security?: boolean;
  compat?: boolean;
  stripBackgrounds?: boolean;
  stripMetaTags?: boolean;
  stripComments?: boolean;
  ensureLegibleTextColor?: boolean;
  stripDataAttributes?: boolean;
  cleanWordXml?: boolean;
}

/**
 * Sanitize Output: Automatically strips unwanted background colors, dark mode tints,
 * meta tags, office XML artifacts, and data attributes to ensure maximum compatibility
 * across Google Sheets, Excel, Microsoft Word, Outlook, and Google Docs.
 * Security sanitization is always enforced by default.
 */
export function sanitizeOutputHtml(rawHtml: string, options: SanitizeOptions = {}): string {
  const {
    security = true,
    compat = true,
    stripBackgrounds = compat,
    stripMetaTags = true,
    stripComments = true,
    ensureLegibleTextColor = compat,
    stripDataAttributes = compat,
    cleanWordXml = true,
  } = options;

  if (!rawHtml) return '';

  let html = rawHtml;

  // Security pass: strip dangerous tags and attributes before proceeding
  if (security) {
    html = sanitizeHtml(html);
  }

  // 1. Strip conditional and generic HTML comments
  if (stripComments) {
    html = html.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '');
    html = html.replace(/<!--(?!StartFragment|EndFragment)[\s\S]*?-->/gi, '');
  }

  // 2. Strip XML namespaces, office document tags, and meta tags
  if (cleanWordXml) {
    html = html.replace(/<\/?(?:o|w|m|v|x|p):[^>]*>/gi, '');
    html = html.replace(/<xml[\s\S]*?<\/xml>/gi, '');
  }

  if (stripMetaTags) {
    html = html.replace(/<meta[^>]*>/gi, '');
    html = html.replace(/<link[^>]*>/gi, '');
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  }

  // Use DOM parser to reliably sanitize element attributes and inline styles
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstElementChild as HTMLElement;
    if (!root) return html;

    // Remove any remaining meta, link, script tags in DOM
    if (stripMetaTags || security) {
      root
        .querySelectorAll('meta, link, script, noscript, style, title, iframe, object, embed, form')
        .forEach((el) => el.remove());
    }

    const allElements = root.querySelectorAll('*');
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;

      // Security attribute sanitization: strip on*, javascript:, vbscript:, and expression() styles
      if (security) {
        Array.from(htmlEl.attributes).forEach((attr) => {
          if (attr.name.startsWith('on') || /^javascript:/i.test(attr.value)) {
            htmlEl.removeAttribute(attr.name);
          }
          if (
            ['href', 'src', 'xlink:href', 'action', 'formaction', 'cite', 'data'].includes(
              attr.name,
            )
          ) {
            if (
              /^\s*(javascript:|vbscript:|data:text\/html|data:image\/svg\+xml)/i.test(attr.value)
            ) {
              htmlEl.removeAttribute(attr.name);
            }
          }
          if (
            attr.name === 'style' &&
            (/expression\s*\(/i.test(attr.value) || /javascript:/i.test(attr.value))
          ) {
            htmlEl.removeAttribute(attr.name);
          }
        });
      }

      // 3. Strip unwanted data attributes and class names for clean spreadsheet paste
      if (stripDataAttributes) {
        Array.from(htmlEl.attributes).forEach((attr) => {
          if (
            attr.name.startsWith('data-') ||
            attr.name.startsWith('aria-') ||
            attr.name === 'id' ||
            attr.name === 'class' ||
            attr.name === 'contenteditable' ||
            attr.name === 'tabindex' ||
            attr.name === 'spellcheck'
          ) {
            htmlEl.removeAttribute(attr.name);
          }
        });
      }

      // 4. Strip unwanted bgcolor and background attributes
      if (stripBackgrounds) {
        htmlEl.removeAttribute('bgcolor');
        htmlEl.removeAttribute('background');
      }

      // 5. Clean and normalize inline styles
      if (htmlEl.getAttribute('style')) {
        let style = htmlEl.getAttribute('style') || '';

        if (stripBackgrounds) {
          const isCode = htmlEl.tagName === 'CODE' || htmlEl.tagName === 'PRE';
          const isBlockquote = htmlEl.tagName === 'BLOCKQUOTE';

          if (isCode) {
            // Keep code background clean light grey
            style = style.replace(/background(-color)?\s*:\s*[^;]+;?/gi, '');
            style = `${style}; background-color: #f1f5f9;`;
          } else if (isBlockquote) {
            style = style.replace(/background(-color)?\s*:\s*[^;]+;?/gi, '');
            style = `${style}; background-color: #f8fafc;`;
          } else {
            // Remove all dark/unwanted backgrounds
            style = style.replace(/background(-[a-z]+)?\s*:\s*[^;]+;?/gi, '');

            // For tables, rows, and cells, explicitly set transparent or clean background
            if (['TABLE', 'TR', 'TH', 'TD', 'TBODY', 'THEAD', 'TFOOT'].includes(htmlEl.tagName)) {
              style = `${style}; background-color: transparent;`;
            }
          }
        }

        if (ensureLegibleTextColor) {
          // If color is white or near-white (from dark theme), replace with dark slate for high contrast
          if (
            /color\s*:\s*(?:#fff(?:fff)?|white|rgba?\(\s*255\s*,\s*255\s*,\s*255|#f\d[a-f\d]+)/i.test(
              style,
            )
          ) {
            style = style.replace(/color\s*:\s*[^;]+;?/gi, '');
            style = `${style}; color: #0f172a;`;
          }
        }

        // Clean up redundant semicolons and whitespace
        style = style
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean)
          .join('; ');

        if (style) {
          htmlEl.setAttribute('style', `${style};`);
        } else {
          htmlEl.removeAttribute('style');
        }
      }
    });

    return root.innerHTML;
  } catch (err) {
    logger.warn('DOM sanitizeOutputHtml failed, using regex fallback:', err);
    return html
      .replace(/<meta[^>]*>/gi, '')
      .replace(/bgcolor="[^"]*"/gi, '')
      .replace(/background(-color)?:\s*[^;"]+;?/gi, '');
  }
}

export async function copyFormattedTextToClipboard(
  htmlContent: string,
  plainText: string,
  options: { sanitize?: boolean } = { sanitize: true },
): Promise<boolean> {
  try {
    // Security sanitization is always enforced (security: true); options.sanitize controls compat stripping
    const cleanHtml = sanitizeOutputHtml(htmlContent, {
      security: true,
      compat: options.sanitize !== false,
    });

    // Full standalone HTML document wrapper tailored for Microsoft Word, Excel, Google Sheets, and Outlook parsing
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  /* Standard MSO and Spreadsheet fallback rules */
  body { font-family: 'Segoe UI', 'Aptos', Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; background-color: transparent; }
  ul { margin: 4pt 0; padding-left: 20pt; }
  li { margin-top: 2pt; margin-bottom: 2pt; }
  table { border-collapse: collapse; width: 100%; background-color: transparent; }
  th, td { border: 1px solid #cbd5e1; padding: 6pt 8pt; background-color: transparent; }
</style>
</head>
<body>
<!--StartFragment-->
${cleanHtml}
<!--EndFragment-->
</body>
</html>`;

    if (navigator.clipboard && window.ClipboardItem) {
      const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      const clipboardItem = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      });
      await navigator.clipboard.write([clipboardItem]);
      return true;
    }
  } catch (err) {
    logger.warn('Navigator clipboard write failed, trying fallback execCommand copy:', err);
  }

  // Fallback for older environments or strict iframe permissions
  let container: HTMLDivElement | null = null;
  try {
    const cleanHtml = sanitizeOutputHtml(htmlContent, {
      security: true,
      compat: options.sanitize !== false,
    });
    container = document.createElement('div');
    container.setAttribute('contenteditable', 'true');
    container.innerHTML = cleanHtml;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.opacity = '0';
    document.body.appendChild(container);

    const range = document.createRange();
    range.selectNodeContents(container);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      const successful = document.execCommand('copy');
      selection.removeAllRanges();
      return successful;
    }
  } catch (fallbackErr) {
    logger.error('Fallback execCommand copy also failed:', fallbackErr);
  } finally {
    if (container && container.parentNode) {
      container.style.cssText = '';
      container.parentNode.removeChild(container);
    }
  }

  return false;
}
