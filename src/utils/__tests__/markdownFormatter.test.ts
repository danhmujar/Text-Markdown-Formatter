import { describe, it, expect } from 'vitest';
import { smartCleanupMarkdown, prepareCopiedText } from '../cleanup';
import { tsvToMarkdownTable, isMarkdownTable, preprocessMarkdownWithTsv } from '../tableConvert';
import { getNextListPrefix } from '../listNumbering';

describe('smartCleanupMarkdown', () => {
  it('keeps inline pipes in nested-list prose intact', () => {
    const input = `4. **Nationality**
   a. *What was omitted/captured incorrectly:* Dr. Alexandra Gatzemeyer's **Nationality** was captured as "Russian Federation".
   b. *Correct Capture & Why:* The source lists her nationality as dual ("German | Russian"). Per the guidelines, if two nationalities apply, we must select the first disclosed. Therefore, this should be **Germany**.
   c. *Citation:* *"Nationality: German | Russian"* (Sartorius AG Annual Report 2025, p. 63)`;

    expect(smartCleanupMarkdown(input).cleaned).toBe(input);
  });

  it('preserves valid markdown tables', () => {
    const table = '| Header | Value |\n| :--- | :--- |\n| One | Two |';

    expect(smartCleanupMarkdown(table).cleaned).toBe(table);
  });

  it('repairs missing outer pipes in confirmed markdown table blocks', () => {
    const malformedTable = 'Header | Value\n:--- | :---\nOne | Two';

    expect(smartCleanupMarkdown(malformedTable).cleaned).toBe(
      '| Header | Value |\n| :--- | :--- |\n| One | Two |',
    );
  });

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

  it('fixes missing spaces around bold delimiters when words are directly glued to **', () => {
    const rawInput =
      '**Dispositive Portion:**The Supreme Court**AFFIRMED with MODIFICATION**the RTC Decision. Romeo Molina y Flores was found**GUILTY of MURDER**, and his sentence was reduced from Death to **reclusion perpetua**, the generic aggravating circumstance of dwelling having been offset by the mitigating circumstance of vindication of a grave offense. The award of ₱50,000.00 as civil indemnity, ₱40,000.00 as actual damages, and ₱200,000.00 as moral damages was sustained.';

    const report = smartCleanupMarkdown(rawInput);

    expect(report.cleaned).toContain('**Dispositive Portion:** The Supreme Court');
    expect(report.cleaned).toContain(
      'Supreme Court **AFFIRMED with MODIFICATION** the RTC Decision',
    );
    expect(report.cleaned).toContain('was found **GUILTY of MURDER**, and');
    expect(report.cleaned).toContain('to **reclusion perpetua**, the');
    expect(report.cleaned).toContain('₱50,000.00');
    expect(report.hasChanges).toBe(true);
  });

  it('fixes glued colon and bold tags e.g. **Title**:Text', () => {
    const report = smartCleanupMarkdown('**Title**:Text and **Note:**Please read');
    expect(report.cleaned).toBe('**Title**: Text and **Note:** Please read');
  });
  it('leaves valid bold followed by punctuation unchanged', () => {
    const report = smartCleanupMarkdown('**Compensation**, **Membership**.');

    expect(report.cleaned).toBe('**Compensation**, **Membership**.');
    expect(report.hasChanges).toBe(false);
    expect(report.fixesCount).toBe(0);
  });
  it('cleans actual glued words on both sides of bold markers', () => {
    const leftGlued = smartCleanupMarkdown('word**bold**');
    const rightGlued = smartCleanupMarkdown('**bold**word');

    expect(leftGlued.cleaned).toBe('word **bold**');
    expect(leftGlued.hasChanges).toBe(true);
    expect(rightGlued.cleaned).toBe('**bold** word');
    expect(rightGlued.hasChanges).toBe(true);
  });

  it('fixes missing spaces around italic and strikethrough delimiters', () => {
    const report = smartCleanupMarkdown('Check*this*out and ~~old~~new text');
    expect(report.cleaned).toBe('Check *this* out and ~~old~~ new text');
  });
});

describe('isMarkdownTable and prepareCopiedText', () => {
  it('detects valid markdown tables accurately', () => {
    const table = '| Header 1 | Header 2 |\n| :--- | :--- |\n| Cell 1 | Cell 2 |';
    expect(isMarkdownTable(table)).toBe(true);
    expect(isMarkdownTable('Just regular\ntext with | single pipe')).toBe(false);
  });

  it('suppresses <br> reversion if the content is a markdown table', () => {
    const tableWithNewlines =
      '| Header 1 | Header 2 |\n| :--- | :--- |\n| Line 1\nLine 2 | Cell 2 |';
    const inputWithBr =
      '| Header 1 | Header 2 |<br>| :--- | :--- |<br>| Line 1<br>Line 2 | Cell 2 |';
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

  it('only converts TSV during preview preprocessing without cleaning incomplete markdown', () => {
    expect(preprocessMarkdownWithTsv('**unfinished\n```')).toBe('**unfinished\n```');
    expect(preprocessMarkdownWithTsv('a\tb\n1\t2')).toBe('| a | b |\n| :--- | :--- |\n| 1 | 2 |');
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
