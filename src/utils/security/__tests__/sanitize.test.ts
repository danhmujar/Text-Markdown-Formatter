import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../sanitize';
import { sanitizeOutputHtml } from '../../sanitize';
import { htmlTableToMarkdown, parsePasteToGrid } from '../../tableConvert';
import { buildInlineStyledHtml } from '../../htmlBuilder';

describe('sanitizeHtml (Preview Security Boundary)', () => {
  it('strips on* event handlers', () => {
    expect(sanitizeHtml('<img src=x onerror=alert(1)>')).not.toMatch(/onerror/);
  });

  it('strips javascript: href', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toMatch(/javascript:/);
  });

  it('strips vbscript: href and data:text/html', () => {
    expect(sanitizeHtml('<a href="vbscript:msgbox(1)">x</a>')).not.toMatch(/vbscript:/);
    expect(
      sanitizeHtml('<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>'),
    ).not.toMatch(/data:text\/html/);
  });

  it('keeps safe markdown content and tags', () => {
    expect(sanitizeHtml('<p>hello <strong>world</strong></p>')).toMatch(/<strong>world<\/strong>/);
  });

  it('strips script tags', () => {
    expect(sanitizeHtml('<script>alert(1)</script><p>hi</p>')).not.toMatch(/script/);
  });

  it('strips remote image sources while retaining same-origin and data images', () => {
    expect(sanitizeHtml('<img src="https://example.invalid/tracker.png">')).not.toMatch(/src=/);
    expect(sanitizeHtml('<img src="/image.png">')).toMatch(/src="\/image.png"/);
    expect(sanitizeHtml('<img src="data:image/png;base64,AA==">')).toMatch(/src="data:image\/png/);
  });
});

describe('sanitizeOutputHtml (Copy-Path Security Boundary)', () => {
  it('strips javascript: href even when compat sanitization is disabled', () => {
    const dirty = '<a href="javascript:alert(1)">Click Me</a>';
    const cleaned = sanitizeOutputHtml(dirty, { compat: false, security: true });
    expect(cleaned).not.toMatch(/javascript:/);
    expect(cleaned).toContain('Click Me');
  });

  it('strips on* handlers even when compat sanitization is disabled', () => {
    const dirty = '<p onmouseover="alert(1)">Hover</p>';
    const cleaned = sanitizeOutputHtml(dirty, { compat: false, security: true });
    expect(cleaned).not.toMatch(/onmouseover/);
    expect(cleaned).toContain('Hover');
  });

  it('strips expression() from inline styles', () => {
    const dirty = '<div style="width: expression(alert(1)); color: red;">Styled</div>';
    const cleaned = sanitizeOutputHtml(dirty, { compat: true, security: true });
    expect(cleaned).not.toMatch(/expression/);
  });

  it('strips script tags completely', () => {
    const dirty = '<div>Safe<script>alert("xss")</script></div>';
    const cleaned = sanitizeOutputHtml(dirty, { compat: false });
    expect(cleaned).not.toMatch(/script/);
    expect(cleaned).toContain('Safe');
  });

  it('retains formatting and table tags safely', () => {
    const dirty = '<table><tbody><tr><td>Header</td></tr></tbody></table>';
    const cleaned = sanitizeOutputHtml(dirty);
    expect(cleaned).toContain('table');
    expect(cleaned).toContain('Header');
  });
});

describe('Phase 3: Table Parsing & Link Sanitization Security', () => {
  it('sanitizes malicious attributes in htmlTableToMarkdown', () => {
    const maliciousTable =
      '<table><tr><td><img src=x onerror=alert(1)>Cell</td><td>Value</td></tr></table>';
    const md = htmlTableToMarkdown(maliciousTable);
    expect(md).not.toBeNull();
    expect(md).not.toMatch(/onerror/);
    expect(md).toContain('Cell');
  });

  it('sanitizes malicious attributes in parsePasteToGrid', () => {
    const maliciousTable =
      '<table><tr><td><a href="javascript:alert(1)">Link</a></td><td><script>alert(2)</script>Text</td></tr></table>';
    const grid = parsePasteToGrid('', maliciousTable);
    expect(grid).not.toBeNull();
    expect(grid?.[0][0]).not.toMatch(/javascript:/);
    expect(grid?.[0][1]).not.toMatch(/script/);
    expect(grid?.[0][1]).toContain('Text');
  });

  it('enforces rel="noopener noreferrer" and target="_blank" on external links in buildInlineStyledHtml', () => {
    const markdown = '[External Link](https://example.com)';
    const html = buildInlineStyledHtml(markdown, {
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
    });
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('href="https://example.com"');
  });
});
