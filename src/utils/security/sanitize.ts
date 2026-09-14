import DOMPurify from 'dompurify';

// Security boundary for all HTML that reaches innerHTML / clipboard.
// Runs BEFORE buildInlineStyledHtml injects trusted inline styles.
DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName.startsWith('on')) data.keepAttr = false;
  if (data.attrName === 'src' && _node.nodeName === 'IMG') {
    try {
      const url = new URL(data.attrValue, window.location.href);
      if (!/^data:/i.test(data.attrValue) && url.origin !== window.location.origin) {
        data.keepAttr = false;
      }
    } catch {
      data.keepAttr = false;
    }
  }
  if (
    data.attrName === 'href' ||
    data.attrName === 'src' ||
    data.attrName === 'xlink:href' ||
    data.attrName === 'action' ||
    data.attrName === 'formaction'
  ) {
    if (/^\s*(javascript:|vbscript:|data:text\/html|data:image\/svg\+xml)/i.test(data.attrValue)) {
      data.keepAttr = false;
    }
  }
});

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'meta', 'link'],
    // Input style attributes are untrusted; trusted styles are re-injected afterwards
    // by buildInlineStyledHtml via the DOM API, so stripping them here is lossless.
    FORBID_ATTR: ['style'],
    KEEP_CONTENT: true,
  });
}
