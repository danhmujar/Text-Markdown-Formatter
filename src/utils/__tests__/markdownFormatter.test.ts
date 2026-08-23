import { describe, it, expect } from 'vitest';
import { smartCleanupMarkdown, prepareCopiedText } from '../cleanup';
import { tsvToMarkdownTable, isMarkdownTable } from '../tableConvert';
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

describe('isMarkdownTable and prepareCopiedText', () => {
  it('detects valid markdown tables accurately', () => {
    const table = '| Header 1 | Header 2 |\n| :--- | :--- |\n| Cell 1 | Cell 2 |';
    expect(isMarkdownTable(table)).toBe(true);
    expect(isMarkdownTable('Just regular\ntext with | single pipe')).toBe(false);
  });

  it('suppresses <br> reversion if the content is a markdown table', () => {
    const tableWithNewlines = '| Header 1 | Header 2 |\n| :--- | :--- |\n| Line 1\nLine 2 | Cell 2 |';
    const inputWithBr = '| Header 1 | Header 2 |<br>| :--- | :--- |<br>| Line 1<br>Line 2 | Cell 2 |';
    // When table is detected, prepareCopiedText keeps newlines intact and doesn't convert to <br>
    const result = prepareCopiedText(tableWithNewlines, inputWithBr);
    expect(result).toBe(tableWithNewlines);
  });

  it('converts newlines back to <br> for non-table text with <br> in input', () => {
    const output = 'Line 1\nLine 2';
    const inputWithBr = 'Line 1<br>Line 2';
    const result = prepareCopiedText(output, inputWithBr);
    expect(result).toBe('Line 1<br>Line 2');
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
