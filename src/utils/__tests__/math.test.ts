import { describe, expect, it } from 'vitest';
import { buildInlineStyledHtml } from '../htmlBuilder';
import { smartCleanupMarkdown } from '../cleanup';
import { parseMath } from '../math';
import { analyzeSyntaxWarnings } from '../syntaxValidator';
import { sanitizeOutputHtml } from '../sanitize';

describe('KaTeX math support', () => {
  it('parses all inline and display delimiters', () => {
    expect(parseMath('$x+1$ \\(y\\) $$z$$ \\[w\\]')).toHaveLength(4);
  });

  it('renders general expressions as accessible MathML in preview', () => {
    const html = buildInlineStyledHtml('Equation: $\\frac{1}{\\sqrt{x}}$');
    expect(html).toContain('class="katex"');
    expect(html).toContain('<math');
    expect(html).toContain('<mfrac');
  });

  it('preserves code, escaped dollars, currency, and invalid expressions as readable source', () => {
    expect(parseMath('`$x$` and \\$x$ and $5 and $10')).toHaveLength(0);
    expect(buildInlineStyledHtml('$\\unknowncommand{x}$')).toContain('\\unknowncommand{x}');
  });

  it('keeps math source unchanged through Smart Clean while cleaning prose', () => {
    expect(smartCleanupMarkdown('  #Title  $x_  &  y$ ').cleaned).toBe('# Title $x_  &  y$');
  });

  it('warns on unmatched delimiters and invalid KaTeX', () => {
    expect(
      analyzeSyntaxWarnings('$x').some((warning) => warning.id === 'unmatched-math-delimiter'),
    ).toBe(true);
    expect(
      analyzeSyntaxWarnings('$\\unknowncommand{x}$').some((warning) =>
        warning.id.startsWith('invalid-math-'),
      ),
    ).toBe(true);
  });

  it('retains safe rendered math classes and MathML through rich-copy sanitization', () => {
    const rendered = buildInlineStyledHtml('$$\\begin{matrix}1&2\\\\3&4\\end{matrix}$$');
    const cleaned = sanitizeOutputHtml(rendered);
    expect(cleaned).toContain('class="katex"');
    expect(cleaned).toContain('<math');
    expect(cleaned).not.toContain('<script');
  });
});
