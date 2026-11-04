import type { ClipboardPayload } from '@/utils/clipboard';

const BLOCKS = /^(P|DIV|H[1-6]|BLOCKQUOTE|PRE|UL|OL|LI|TABLE|HR)$/;

function ordinal(value: number, style: string): string {
  if (!Number.isFinite(value)) return '';
  if (style.endsWith('alpha') && value > 0) {
    let letters = '';
    for (let number = value; number > 0; number = Math.floor((number - 1) / 26)) {
      letters = String.fromCharCode(97 + ((number - 1) % 26)) + letters;
    }
    return style.startsWith('upper') ? letters.toUpperCase() : letters;
  }
  if (style.endsWith('roman') && value > 0 && value < 4000) {
    let remaining = value;
    let result = '';
    const numerals: [number, string][] = [
      [1000, 'm'],
      [900, 'cm'],
      [500, 'd'],
      [400, 'cd'],
      [100, 'c'],
      [90, 'xc'],
      [50, 'l'],
      [40, 'xl'],
      [10, 'x'],
      [9, 'ix'],
      [5, 'v'],
      [4, 'iv'],
      [1, 'i'],
    ];
    for (const [amount, numeral] of numerals) {
      while (remaining >= amount) {
        result += numeral;
        remaining -= amount;
      }
    }
    return style.startsWith('upper') ? result.toUpperCase() : result;
  }
  return String(value);
}

/** Extracts only a single cell's rendered selection without changing the live DOM. */
export function getPreviewSelection(
  preview: HTMLElement,
  selection: Selection | null,
): ClipboardPayload | null {
  if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return null;
  const range = selection.getRangeAt(0);
  if (!preview.contains(range.startContainer) || !preview.contains(range.endContainer)) return null;

  let fragment: Node = range.cloneContents();
  let ancestor = range.commonAncestorContainer;
  if (ancestor.nodeType === Node.TEXT_NODE) ancestor = ancestor.parentNode!;
  while (ancestor !== preview) {
    const wrapper = ancestor.cloneNode(false);
    wrapper.appendChild(fragment);
    fragment = wrapper;
    ancestor = ancestor.parentNode!;
  }
  const container = document.createElement('div');
  container.appendChild(fragment);

  // A partial list must retain the original numbering rather than restart at one.
  const selectedItems = Array.from(preview.querySelectorAll('li')).filter((item) =>
    range.intersectsNode(item),
  );
  container.querySelectorAll('li').forEach((item, index) => {
    const original = selectedItems[index];
    const list = original?.parentElement;
    if (!list || list.tagName !== 'OL') return;
    let number = (list as HTMLOListElement).start;
    const reversed = list.hasAttribute('reversed');
    if (reversed && !list.hasAttribute('start')) number = list.children.length;
    for (const sibling of Array.from(list.children)) {
      if (sibling.hasAttribute('value')) number = Number(sibling.getAttribute('value'));
      if (sibling === original) break;
      number += reversed ? -1 : 1;
    }
    item.setAttribute('value', String(number));
  });

  const verbatim: string[] = [];
  let tokenPrefix = '\uE000';
  while (container.textContent?.includes(tokenPrefix)) tokenPrefix += '\uE000';
  const visit = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE)
      return (node.textContent || '').replace(/[\t\r\n ]+/g, ' ');
    if (!(node instanceof Element)) return '';
    if (node.matches('script, style, annotation')) return '';
    if (node.matches('.katex')) {
      const math = (node.querySelector('.katex-mathml') ?? node).cloneNode(true) as Element;
      math.querySelectorAll('annotation').forEach((annotation) => annotation.remove());
      return math.textContent || '';
    }
    if (node.tagName === 'BR') return '\n';
    if (node.tagName === 'PRE') {
      verbatim.push(node.textContent || '');
      return `\n${tokenPrefix}${verbatim.length - 1}\uE001\n`;
    }
    if (node.tagName === 'TABLE') {
      return (
        '\n' +
        Array.from(node.querySelectorAll('tr'))
          .map((row) =>
            Array.from(row.children)
              .filter((cell) => /^(TD|TH)$/.test(cell.tagName))
              .map((cell) => Array.from(cell.childNodes).map(visit).join('').trim())
              .join('\t'),
          )
          .join('\n') +
        '\n'
      );
    }
    const children = Array.from(node.childNodes).map(visit).join('');
    if (/^(UL|OL)$/.test(node.tagName)) return `\n${children.replace(/\n[ \t]*\n+/g, '\n')}\n`;
    if (node.tagName === 'LI') {
      const list = node.parentElement;
      const ordered = list?.tagName === 'OL';
      const marker = ordered
        ? ordinal(
            Number(node.getAttribute('value') || 1),
            (list as HTMLElement).style.listStyleType,
          ) + '.'
        : (list as HTMLElement)?.style.listStyleType === 'square'
          ? '▪'
          : (list as HTMLElement)?.style.listStyleType === 'circle'
            ? '◦'
            : '•';
      return `\n${marker} ${children.replace(/^\n+|\n+$/g, '')}\n`;
    }
    if (BLOCKS.test(node.tagName)) return `\n${children}\n`;
    return children;
  };

  let text = Array.from(container.childNodes)
    .map(visit)
    .join('')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  // Remove only the structural boundaries introduced by the outer block wrapper.
  if (container.firstElementChild && BLOCKS.test(container.firstElementChild.tagName))
    text = text.replace(/^\n+/, '');
  if (container.lastElementChild && BLOCKS.test(container.lastElementChild.tagName))
    text = text.replace(/\n+$/, '');
  verbatim.forEach((value, index) => {
    text = text.replace(`${tokenPrefix}${index}\uE001`, () => value);
  });
  if (!text) return null;
  // Rendered content has no Markdown structure to protect. Prose breaks are all Catalyst tags.
  if (!container.querySelector('table, pre')) text = text.replace(/\n/g, '<br>');
  return { text, html: `<div>${container.innerHTML}</div>` };
}
