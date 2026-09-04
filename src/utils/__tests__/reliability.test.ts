import { describe, it, expect } from 'vitest';
import { parsePasteToGrid, tsvToMarkdownTable } from '../tableConvert';
import { smartCleanupMarkdown } from '../cleanup';

describe('Pillar 3: Reliability & Edge Cases', () => {
  describe('parsePasteToGrid', () => {
    it('parses vertical multi-line text without tabs as a multi-row grid', () => {
      const result = parsePasteToGrid('Line 1\nLine 2\nLine 3');
      expect(result).toEqual([['Line 1'], ['Line 2'], ['Line 3']]);
    });

    it('parses tab-delimited multi-line text as rectangular grid', () => {
      const result = parsePasteToGrid('A1\tB1\nA2\tB2');
      expect(result).toEqual([
        ['A1', 'B1'],
        ['A2', 'B2'],
      ]);
    });

    it('returns null for single line text without tabs', () => {
      const result = parsePasteToGrid('single line text');
      expect(result).toBeNull();
    });

    it('returns null for hard-wrapped single paragraph (PDF copy) to avoid 4×1 grid', () => {
      const wrappedParagraph = `Since 2008, the Company has adhered to the French corporate\ngovernance code for listed companies published by Afep and\nMedef (the “Afep‑Medef Code”), available on the following\nwebsites: www.lafep.org and www.medef.com.`;
      const result = parsePasteToGrid(wrappedParagraph);
      expect(result).toBeNull();
    });

    it('keeps standalone Markdown tables in the current cell', () => {
      const markdownTable = `| Metric | Threshold | Target | Maximum |\n| :--- | :---: | :---: | :---: |\n| Return on Tangible Equity | 8 | 10 | 14 |`;

      expect(parsePasteToGrid(markdownTable)).toBeNull();
    });

    it('still parses short column data as grid (avg <40)', () => {
      const result = parsePasteToGrid('apple\nbanana\ncherry');
      expect(result).toEqual([['apple'], ['banana'], ['cherry']]);
    });

    it('still parses tab data with wrapped-like lines as grid', () => {
      const result = parsePasteToGrid('a\tb\nc\td');
      expect(result).not.toBeNull();
    });

    it('parses bare HTML row fragments (tr/td) into multi-row grid', () => {
      const htmlFragment = '<tr><td>Row 1</td></tr><tr><td>Row 2</td></tr><tr><td>Row 3</td></tr>';
      const result = parsePasteToGrid('Row 1\nRow 2\nRow 3', htmlFragment);
      expect(result).toEqual([['Row 1'], ['Row 2'], ['Row 3']]);
    });

    it('parses multi-column HTML row fragments into 2D grid', () => {
      const htmlFragment = '<tr><td>A1</td><td>B1</td></tr><tr><td>A2</td><td>B2</td></tr>';
      const result = parsePasteToGrid('A1\tB1\nA2\tB2', htmlFragment);
      expect(result).toEqual([
        ['A1', 'B1'],
        ['A2', 'B2'],
      ]);
    });

    it('parses plain text with double line breaks from copied HTML elements into rows', () => {
      const text = 'First Item\n\nSecond Item\n\nThird Item';
      const result = parsePasteToGrid(text);
      expect(result).toEqual([['First Item'], ['Second Item'], ['Third Item']]);
    });

    it('parses multi-row records with <br> tags and bullet/roman numeral prefixes into distinct cells', () => {
      const row1 =
        '(i) STI / Deferral -<br>a. The target bonus amounted to 10 monthly salaries for all Executive Board members. <br>b. 50% of the STI payout is deferred over 3 years in shares without additional performance conditions.<br>c. Deferred Bonus Vesting - This pertains to the annual bonus deferred in 2022, which expired on December 31, 2025. The resulting amount disbursed is limited to 150% of the initial value.<br> (iii) Other - [Overall Cap] - The maximum remuneration under the remuneration system stands at k€ 3,100 for regular Executive Board members.';
      const row2 =
        '(i) STI / Deferral -<br>a. The target bonus amounted to 10 monthly salaries for all Executive Board members. <br>b. 50% of the STI payout is deferred over 3 years in shares without additional performance conditions.';
      const row3 =
        '(i) STI / Deferral -<br>a. The target bonus amounted to 10 monthly salaries for all Executive Board members.';

      const multiRowText = `${row1}\n${row2}\n${row3}`;
      const result = parsePasteToGrid(multiRowText);
      expect(result).toHaveLength(3);
      expect(result?.[0][0]).toBe(row1);
      expect(result?.[1][0]).toBe(row2);
      expect(result?.[2][0]).toBe(row3);
    });

    it('retains complex markdown document with headings, tables with <br>, and lists as single cell (returns null)', () => {
      const doc = `### Phase 1: Corrected Notes in Horizontal Table Format

In accordance with the Data Capture Guidelines, standard notes are applied to capture any intra-year movements in board and committee roles.

| Incumbent Name | Notes |
| :--- | :--- |
| Hans-Hermann Lotter | Blank |
| Stefan Müller | (i) Stefan Müller became chair.<br>(ii) Stefan Müller was chair. |
| Britta Lehfeldt | (i) Britta Lehfeldt became member.<br>(ii) Britta Lehfeldt became member. |

---

### Phase 2: Validation and Verification of Generated Notes

The generated notes have been systematically verified against **Annual Report 2025 (pages 14, 24, and 44)**.

**Verification of Rule Application:**
*   *Guideline Rule:* "Indicate if a member had position changes."
*   *Guideline Templates:* \`[Name] became chair\`; \`[Name] was chair\`.

**1. Stefan Müller (Status: Role Change)**
*   **Board Movement:** Served as interim Chairman.
`;
      const result = parsePasteToGrid(doc);
      expect(result).toBeNull();
    });
 
    it('returns null for numbered bold sections with multi-paragraph prose', () => {
      const doc = `1. **Executive Summary**
This section explains the overall outcome in prose.

2. **Key Findings**
These findings provide additional context and supporting details.`;
      const result = parsePasteToGrid(doc);
      expect(result).toBeNull();
    });
  });

  describe('wrapped paragraph unwrapping', () => {
    it('smartCleanup unwraps hard-wrapped lines into single paragraph', () => {
      const wrapped = `Since 2008, the Company has adhered to the French corporate\ngovernance code for listed companies published by Afep and\nMedef (the “Afep‑Medef Code”), available on the following\nwebsites: www.lafep.org and www.medef.com.`;
      const report = smartCleanupMarkdown(wrapped);
      expect(report.cleaned).not.toContain('\n');
      expect(report.cleaned).toContain('Since 2008');
      expect(report.cleaned).toContain('www.lafep.org');
      expect(report.cleaned).toContain('French corporate governance code');
      // Smart quotes should be normalized
      expect(report.cleaned).toContain('"Afep');
    });

    it('does not unwrap intentional line breaks ending with punctuation', () => {
      const lines = `Hello world.\nThis is test.\nAnother line.`;
      const report = smartCleanupMarkdown(lines);
      expect(report.cleaned).toBe(lines);
    });

    it('does not unwrap markdown list', () => {
      const list = `* item one is a very long line that exceeds forty characters easily\n* item two is also very long and should not be unwrapped`;
      const result = parsePasteToGrid(list);
      expect(result).toBeNull(); // markdown guard, not wrapped
      const report = smartCleanupMarkdown(list);
      expect(report.cleaned).toContain('\n');
    });

    it('unwraps indented visual wraps within a list item', () => {
      const list = `- Award Type: Changed from LTC to PS. The award is delivered
  55% in shares and 45% in cash, and is tracked as an equity
  instrument.
- Vesting Period: Retained at 3 years.`;

      expect(smartCleanupMarkdown(list).cleaned).toBe(
        '- Award Type: Changed from LTC to PS. The award is delivered 55% in shares and 45% in cash, and is tracked as an equity instrument.\n- Vesting Period: Retained at 3 years.',
      );
    });

    it('preserves intentional completed-sentence breaks inside a list item', () => {
      const list = `- Summary of results.
  This sentence intentionally starts a new paragraph.`;

      expect(smartCleanupMarkdown(list).cleaned).toBe(list);
    });
  });

  describe('tsvToMarkdownTable edge inputs', () => {
    it('handles single tab without crashing', () => {
      expect(() => tsvToMarkdownTable('\t')).not.toThrow();
      const res = tsvToMarkdownTable('\t');
      expect(res).toBe('|  |  |\n| :--- | :--- |');
    });

    it('handles empty string safely', () => {
      expect(tsvToMarkdownTable('')).toBe('');
    });
  });

  describe('smartCleanupMarkdown typing vs non-typing mode', () => {
    it('does not auto-close uncompleted bold mid-typing', () => {
      const report = smartCleanupMarkdown('**incomplete bold', { isTyping: true });
      expect(report.cleaned).toBe('**incomplete bold');
    });

    it('auto-closes unbalanced bold during full cleanup / non-typing', () => {
      const report = smartCleanupMarkdown('**incomplete bold', { isTyping: false });
      expect(report.cleaned).toBe('**incomplete bold**');
    });
  });
});
