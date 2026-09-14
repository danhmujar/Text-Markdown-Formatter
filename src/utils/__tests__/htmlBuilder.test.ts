import { describe, expect, it } from 'vitest';
import { StyleOptions } from '../../types';
import { buildInlineStyledHtml } from '../htmlBuilder';

const options: StyleOptions = {
  theme: 'dark',
  fontFamily: 'Calibri, sans-serif',
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
  primaryColor: '#000000',
};

describe('buildInlineStyledHtml list spacing', () => {
  it('separates the final paragraph of top-level ordered items', () => {
    const html = buildInlineStyledHtml('1. a\n\n   b\n\n   c\n2. d', options);
    const container = document.createElement('div');
    container.innerHTML = html;

    const orderedItems = container.querySelectorAll(':scope > ol > li');

    expect(orderedItems).toHaveLength(2);
    expect(orderedItems[0].textContent).toContain('c');
    expect(orderedItems[1].textContent).toContain('d');
    expect(orderedItems[0].getAttribute('style')).toContain('margin: 0px 0px 4pt;');
    expect(orderedItems[1].getAttribute('style')).toContain('margin: 0px 0px 4pt;');
  });

  it('adds structural breaks only between top-level ordered items for Word copy', () => {
    const markdown = '1. First item\n   - Nested detail\n2. Second item\n3. Third item';
    const container = document.createElement('div');
    container.innerHTML = buildInlineStyledHtml(markdown, options, true);

    const orderedItems = container.querySelectorAll(':scope > ol > li');
    const spacingBreaks = container.querySelectorAll(':scope > ol > li > br');
    const nestedItems = container.querySelectorAll(':scope > ol > li > ul > li');

    expect(orderedItems).toHaveLength(3);
    expect(spacingBreaks).toHaveLength(2);
    expect(orderedItems[0].lastElementChild?.tagName).toBe('BR');
    expect(orderedItems[1].lastElementChild?.tagName).toBe('BR');
    expect(orderedItems[2].lastElementChild?.tagName).not.toBe('BR');
    expect(nestedItems[0].querySelector('br')).toBeNull();
  });

  it('does not add structural list breaks to preview HTML', () => {
    const html = buildInlineStyledHtml('1. First item\n2. Second item', options);
    const container = document.createElement('div');
    container.innerHTML = html;

    expect(container.querySelectorAll(':scope > ol > li > br')).toHaveLength(0);
  });

  it('keeps nested list items compact', () => {
    const html = buildInlineStyledHtml(
      '1. First item\n   - Nested detail\n2. Second item',
      options,
    );
    const container = document.createElement('div');
    container.innerHTML = html;

    const nestedItem = container.querySelector(':scope > ol > li > ul > li');

    expect(nestedItem?.getAttribute('style')).toContain('margin: 0px');
  });
});
