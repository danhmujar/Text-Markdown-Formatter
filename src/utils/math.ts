import katex from 'katex';

export interface MathToken {
  raw: string;
  expression: string;
  display: boolean;
  start: number;
  end: number;
}

const DELIMITERS = [
  { open: '$$', close: '$$', display: true },
  { open: '\\[', close: '\\]', display: true },
  { open: '\\(', close: '\\)', display: false },
  { open: '$', close: '$', display: false },
] as const;

function isEscaped(source: string, index: number): boolean {
  let slashes = 0;
  for (let i = index - 1; i >= 0 && source[i] === '\\'; i--) slashes++;
  return slashes % 2 === 1;
}

export function parseMath(source: string): MathToken[] {
  const tokens: MathToken[] = [];
  const protectedRanges: Array<[number, number]> = [];
  const codePattern = /(`+)[\s\S]*?\1/g;
  let code: RegExpExecArray | null;
  while ((code = codePattern.exec(source)))
    protectedRanges.push([code.index, code.index + code[0].length]);
  const fencePattern = /^\s{0,3}(```+|~~~+)[\s\S]*?^\s{0,3}\1[^\n]*(?:\n|$)/gm;
  let fence: RegExpExecArray | null;
  while ((fence = fencePattern.exec(source)))
    protectedRanges.push([fence.index, fence.index + fence[0].length]);

  let cursor = 0;
  while (cursor < source.length) {
    if (protectedRanges.some(([start, end]) => cursor >= start && cursor < end)) {
      const range = protectedRanges.find(([start, end]) => cursor >= start && cursor < end)!;
      cursor = range[1];
      continue;
    }
    const delimiter = DELIMITERS.find(({ open }) => source.startsWith(open, cursor));
    if (!delimiter || isEscaped(source, cursor)) {
      cursor++;
      continue;
    }
    const contentStart = cursor + delimiter.open.length;
    let closeAt = -1;
    for (let index = contentStart; index < source.length; index++) {
      if (protectedRanges.some(([start, end]) => index >= start && index < end)) continue;
      if (source.startsWith(delimiter.close, index) && !isEscaped(source, index)) {
        closeAt = index;
        break;
      }
    }
    if (closeAt < 0) {
      cursor += delimiter.open.length;
      continue;
    }
    const expression = source.slice(contentStart, closeAt);
    const before = source[cursor - 1] || '';
    const after = source[closeAt + delimiter.close.length] || '';
    const invalidInlineDollar =
      delimiter.open === '$' &&
      (!expression ||
        /^\s|\s$/.test(expression) ||
        (/\d/.test(before) && /\d/.test(after)) ||
        (/^\d/.test(expression) && /\d/.test(after) && /\s/.test(expression)));
    if (!delimiter.display && invalidInlineDollar) {
      cursor = closeAt + delimiter.close.length;
      continue;
    }
    const end = closeAt + delimiter.close.length;
    tokens.push({
      raw: source.slice(cursor, end),
      expression,
      display: delimiter.display,
      start: cursor,
      end,
    });
    cursor = end;
  }
  return tokens;
}

export function renderMath(token: MathToken): string {
  try {
    return katex.renderToString(token.expression, {
      displayMode: token.display,
      throwOnError: true,
      trust: false,
      maxExpand: 100,
      maxSize: 10,
      macros: {},
      output: 'htmlAndMathml',
    });
  } catch {
    return escapeHtml(token.raw);
  }
}

export function mathParseError(token: MathToken): boolean {
  try {
    katex.renderToString(token.expression, {
      throwOnError: true,
      trust: false,
      maxExpand: 100,
      maxSize: 10,
      macros: {},
    });
    return false;
  } catch {
    return true;
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
