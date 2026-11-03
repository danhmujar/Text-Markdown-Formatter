import { describe, expect, it } from 'vitest';
import { normalizeTabbedProse } from '../textWrap';
import { smartCleanupMarkdown } from '../cleanup';
import { parsePasteToGrid } from '../tableConvert';
import { financialProse, normalizedProse, tabbedProse } from './fixtures/tabbedProse';

describe('tabbed prose normalization', () => {
  it('recognizes pasted prose with empty edge lines and preserves those breaks', () => {
    for (const [before, after] of [
      ['', '\n'],
      ['\n', '\n'],
      ['', '\r\n'],
    ]) {
      const input = before + tabbedProse + after;
      expect(normalizeTabbedProse(input)).toBe(before + normalizedProse + '\n');
      expect(parsePasteToGrid(input)).toBeNull();
    }
  });

  it('keeps the financial-report sample with its trailing newline out of the grid', () => {
    const expected = financialProse.trim().replace(/\s+/g, ' ') + '\n';
    expect(normalizeTabbedProse(financialProse)).toBe(expected);
    expect(parsePasteToGrid(financialProse)).toBeNull();
  });

  it('repairs the energy-transition example and keeps it in one cell', () => {
    expect(normalizeTabbedProse(tabbedProse)).toBe(normalizedProse);
    expect(parsePasteToGrid(tabbedProse)).toBeNull();
    const report = smartCleanupMarkdown(tabbedProse);
    expect(report.cleaned).toBe(normalizedProse);
    expect(report.hasChanges).toBe(true);
    expect(report.details.spacesCleaned).toBe(true);
  });

  it('handles Windows line endings, single-line prose, and paragraph breaks', () => {
    expect(normalizeTabbedProse(tabbedProse.replace(/\n/g, '\r\n'))).toBe(normalizedProse);
    expect(normalizeTabbedProse(tabbedProse.replace(/\n/g, ' '))).toBe(normalizedProse);
    expect(normalizeTabbedProse(`${tabbedProse}\n\n${tabbedProse}`)).toBe(
      `${normalizedProse}\n\n${normalizedProse}`,
    );
    expect(normalizeTabbedProse(normalizedProse)).toBe(normalizedProse);
  });

  it('preserves ambiguous short inputs and rectangular TSV', () => {
    for (const text of [
      'one\ttwo\tthree',
      'Name\tValue\nEnergy\t100',
      Array(3)
        .fill('Long\tcolumn\tnames\twith\tseveral\twords\tand\tmany\tother\tcolumns.')
        .join('\n'),
    ]) {
      expect(normalizeTabbedProse(text)).toBe(text);
    }
    expect(parsePasteToGrid('Name\tValue\nEnergy\t100')).toEqual([
      ['Name', 'Value'],
      ['Energy', '100'],
    ]);
  });

  it('protects code, lists, headings, quotes, and Markdown tables', () => {
    for (const text of [
      `\t${tabbedProse}`,
      `    ${tabbedProse}`,
      `# ${tabbedProse}`,
      `- ${tabbedProse}`,
      `(i) ${tabbedProse}`,
      `a. ${tabbedProse}`,
      `> ${tabbedProse}`,
      `| ${tabbedProse} |`,
      `\`code\` ${tabbedProse}`,
      `\`\`\`text\n${tabbedProse}\n\`\`\``,
      `~~~\n\n${tabbedProse}\n\n~~~`,
    ])
      expect(normalizeTabbedProse(text)).toBe(text);
  });

  it('gives real HTML tables priority over prose-like plain text', () => {
    expect(
      parsePasteToGrid(tabbedProse, '<table><tr><td>Left</td><td>Right</td></tr></table>'),
    ).toEqual([['Left', 'Right']]);
  });
});
