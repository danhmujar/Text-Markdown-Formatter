import { describe, expect, it } from 'vitest';
import { analyzeSyntaxWarnings } from '../syntaxValidator';

describe('analyzeSyntaxWarnings glued bold markers', () => {
  it('does not warn when bold closes before punctuation', () => {
    const warnings = analyzeSyntaxWarnings('**Compensation**, **Membership**.');

    expect(warnings.some((warning) => warning.id.startsWith('glued-bold-line'))).toBe(false);
  });
  it.each(['word**bold**', '**bold**word', '**Title**:Text'])(
    'warns for actual glued words: %s',
    (input) => {
      const warnings = analyzeSyntaxWarnings(input);

      expect(warnings.some((warning) => warning.id === 'glued-bold-line-1')).toBe(true);
    },
  );

  it.each(['"**bold**"', '(**bold**)', '**Title**: Text'])(
    'does not warn for punctuation-adjacent bold: %s',
    (input) => {
      const warnings = analyzeSyntaxWarnings(input);

      expect(warnings.some((warning) => warning.id.startsWith('glued-bold-line'))).toBe(false);
    },
  );

  it('accepts the three-space indentation generated for alphabetic sub-items', () => {
    const warnings = analyzeSyntaxWarnings('1. Parent\n   a. Child');

    expect(warnings.some((warning) => warning.id === 'irregular-indent-2')).toBe(false);
  });

  it('ignores escaped pipes when counting table columns', () => {
    const warnings = analyzeSyntaxWarnings('| Name | Notes |\n| --- | --- |\n| A | one \\| two |');

    expect(warnings.some((warning) => warning.id === 'table-col-mismatch-3')).toBe(false);
  });
});
