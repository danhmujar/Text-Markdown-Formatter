import { describe, it, expect } from 'vitest';
import { smartCleanupMarkdown } from '../cleanup';
import { tsvToMarkdownTable } from '../tableConvert';
import { getNextListPrefix } from '../listNumbering';

describe('smartCleanupMarkdown', () => {
  it('fixes headings without spaces and strips zero-width characters', () => {
    const report = smartCleanupMarkdown('#Heading\u200B');
    expect(report.cleaned).toBe('# Heading');
    expect(report.hasChanges).toBe(true);
  });

  it('standardizes curly quotes to straight ASCII quotes', () => {
    const report = smartCleanupMarkdown('say \u201Chello\u201D');
    expect(report.cleaned).toContain('"hello"');
    expect(report.details.quotesStandardized).toBe(true);
  });
});

describe('tsvToMarkdownTable', () => {
  it('converts TSV rows into a markdown table with header separator', () => {
    const md = tsvToMarkdownTable('a\tb\n1\t2');
    expect(md).toBe('| a | b |\n| :--- | :--- |\n| 1 | 2 |');
  });

  it('returns input unchanged when no tabs are present', () => {
    expect(tsvToMarkdownTable('plain text')).toBe('plain text');
  });
});

describe('getNextListPrefix', () => {
  it('continues roman numeral lists with the next prefix', () => {
    const next = getNextListPrefix('(i) First item');
    expect(next?.nextPrefix).toBe('(ii) ');
    expect(next?.isOnlyPrefix).toBe(false);
  });

  it('flags prefix-only lines so Enter exits the list', () => {
    const next = getNextListPrefix('1.');
    expect(next?.isOnlyPrefix).toBe(true);
    expect(next?.nextPrefix).toBe('2. ');
  });
});
