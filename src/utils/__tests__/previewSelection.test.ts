import { afterEach, describe, expect, it } from 'vitest';
import { getPreviewSelection } from '@/utils/previewSelection';

afterEach(() => {
  window.getSelection()?.removeAllRanges();
  document.body.replaceChildren();
});

function select(html: string, selector?: string, start = 0, end?: number) {
  const preview = document.createElement('div');
  preview.innerHTML = html;
  document.body.appendChild(preview);
  const range = document.createRange();
  if (selector) {
    const node = preview.querySelector(selector)!.firstChild!;
    range.setStart(node, start);
    range.setEnd(node, end ?? node.textContent!.length);
  } else range.selectNodeContents(preview);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  return { preview, selection, result: getPreviewSelection(preview, selection) };
}

describe('rendered Preview selection', () => {
  it.each(['strong', 'em', 'a'])('retains enclosing %s for a partial selection', (tag) => {
    const { result } = select(
      `<p>Before <${tag} href="https://example.com">selected</${tag}> after</p>`,
      tag,
      2,
      6,
    );
    expect(result?.text).toBe('lect');
    expect(result?.html).toContain(`<${tag}`);
    expect(result?.html).not.toContain('Before');
    if (tag === 'a') expect(result?.html).toContain('href="https://example.com"');
  });

  it('preserves prose and paragraph boundaries as Catalyst breaks without Markdown parsing', () => {
    const { result } = select('<p>*literal*<br>Second</p>\n<br><p>Third</p>');
    expect(result?.text).toBe('*literal*<br>Second<br><br>Third');
  });

  it('retains original numbering when only later list items are selected', () => {
    const { result } = select(
      '<ol start="4"><li>Four</li><li><strong>Five</strong></li></ol>',
      'strong',
    );
    expect(result?.text).toBe('5. Five');
    expect(result?.html).toContain('value="5"');
  });

  it('copies list markers and nested alphabetic numbering once', () => {
    const { result } = select(
      '<ol><li>One<ol style="list-style-type: lower-alpha"><li>Nested</li></ol></li><li>Two</li></ol><ul><li>Bullet</li></ul>',
    );
    expect(result?.text).toContain('1. One<br>a. Nested<br>2. Two');
    expect(result?.text).toContain('• Bullet');
  });

  it('keeps zero starts, explicit item values, and reversed numbering', () => {
    expect(select('<ol start="0"><li>Zero</li><li value="8">Eight</li></ol>').result?.text).toBe(
      '0. Zero<br>8. Eight',
    );
    expect(select('<ol reversed><li>Two</li><li>One</li></ol>').result?.text).toBe(
      '2. Two<br>1. One',
    );
  });

  it('copies selected tables as tab-delimited cells and newline-delimited rows', () => {
    const { result } = select(
      '<table><tbody><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></tbody></table>',
    );
    expect(result?.text).toBe('A\tB\n1\t2');
    expect(result?.html).toContain('<table>');
  });

  it('keeps partial table cells within their table structure', () => {
    const { result } = select(
      '<table><tbody><tr><td>Before</td><td><em>Selected</em></td></tr></tbody></table>',
      'em',
      0,
      4,
    );
    expect(result?.text).toBe('Sele');
    expect(result?.html).toContain('<table>');
    expect(result?.html).not.toContain('Before');
  });

  it('does not duplicate formula accessibility markup or TeX annotations', () => {
    const { result } = select(
      '<p>Formula <span class="katex"><span class="katex-mathml"><math><semantics><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow><annotation>x+1</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">x+1</span></span></p>',
    );
    expect(result?.text).toBe('Formula x+1');
  });

  it('preserves code indentation and literal line breaks', () => {
    const { result } = select('<pre><code>First\n  indented\n\nLast</code></pre>');
    expect(result?.text).toBe('First\n  indented\n\nLast');
  });

  it('ignores missing, collapsed, and outside selections', () => {
    const { preview, selection } = select('<p>Inside</p>');
    expect(getPreviewSelection(preview, null)).toBeNull();
    selection.collapseToStart();
    expect(getPreviewSelection(preview, selection)).toBeNull();
    const outside = document.createTextNode('Outside');
    document.body.appendChild(outside);
    const range = document.createRange();
    range.setStart(preview.firstChild!.firstChild!, 0);
    range.setEnd(outside, 7);
    selection.removeAllRanges();
    selection.addRange(range);
    expect(getPreviewSelection(preview, selection)).toBeNull();
  });
});
