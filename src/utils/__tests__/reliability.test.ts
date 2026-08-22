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
