import { describe, it, expect } from 'vitest';
import { buildInlineStyledHtml } from '../htmlBuilder';
import { StyleOptions } from '../../types';

describe('Pillar 2: Performance Verification', () => {
  const defaultOptions: StyleOptions = {
    theme: 'dark',
    fontFamily: 'Calibri',
    fontSize: 11,
    lineHeight: 1.15,
    bulletLevel1: 'disc',
    bulletLevel2: 'circle',
    bulletLevel3: 'square',
    tableBorderColor: '#cbd5e1',
    tableHeaderBg: '#f1f5f9',
    tableHeaderColor: '#0f172a',
    primaryColor: '#000000',
    tableAlternateBg: true,
    highlightBoldKeys: true,
    sanitizeOutput: true,
  };

  it('buildInlineStyledHtml renders large 500-line markdown efficiently and leverages LRU cache', () => {
    const lines = Array.from(
      { length: 500 },
      (_, i) =>
        `### Heading ${i}\n\nThis is paragraph **${i}** with *emphasis* and [link](https://example.com).`,
    );
    const largeMarkdown = lines.join('\n\n');

    const startFresh = performance.now();
    const htmlFirst = buildInlineStyledHtml(largeMarkdown, defaultOptions);
    const timeFresh = performance.now() - startFresh;

    expect(htmlFirst).toContain('Heading 499');
    // First parse of 500 markdown blocks should complete within reasonable bounds for virtual container
    expect(timeFresh).toBeLessThan(3500);

    // Second parse must hit LRU cache and return near-instantaneously (< 5ms)
    const startCached = performance.now();
    const htmlCached = buildInlineStyledHtml(largeMarkdown, defaultOptions);
    const timeCached = performance.now() - startCached;

    expect(htmlCached).toBe(htmlFirst);
    expect(timeCached).toBeLessThan(10);
  });

  it('handles repeated small edits with low parsing latency', () => {
    const markdown =
      '# Sample Title\n\n- Bullet item 1\n- Bullet item 2\n\n| Col A | Col B |\n|---|---|\n| 1 | 2 |';

    // Warm up
    buildInlineStyledHtml(markdown, defaultOptions);

    const iterations = 50;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      buildInlineStyledHtml(markdown, defaultOptions);
    }
    const duration = performance.now() - start;
    const avgPerCall = duration / iterations;

    // Cached calls should be sub-millisecond
    expect(avgPerCall).toBeLessThan(1);
  });
});
