export type NumberingFormat =
  | 'roman-parentheses'
  | 'numeric-dot'
  | 'numeric-parentheses'
  | 'alpha-dot'
  | 'alpha-parentheses'
  | 'bullet'
  | '1.'
  | '1)'
  | '(i)'
  | 'a.'
  | '(a)';

/**
 * Converts integer to lowercase Roman numeral (e.g. 1 -> 'i', 2 -> 'ii', 4 -> 'iv', 9 -> 'ix')
 */
export function intToRoman(num: number): string {
  const romanMap: [number, string][] = [
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
  let result = '';
  let n = Math.max(1, Math.floor(num));
  for (const [val, roman] of romanMap) {
    while (n >= val) {
      result += roman;
      n -= val;
    }
  }
  return result || 'i';
}

/**
 * Parses a Roman numeral string to its integer value (e.g. 'i' -> 1, 'ii' -> 2, 'iv' -> 4)
 */
export function romanToInt(roman: string): number {
  const romanMap: Record<string, number> = {
    i: 1,
    v: 5,
    x: 10,
    l: 50,
    c: 100,
    d: 500,
    m: 1000,
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };
  let total = 0;
  let prev = 0;
  const str = roman.toLowerCase();
  for (let i = str.length - 1; i >= 0; i--) {
    const val = romanMap[str[i]] || 0;
    if (val < prev) {
      total -= val;
    } else {
      total += val;
      prev = val;
    }
  }
  return total || 1;
}

/**
 * Converts integer to lowercase alphabetical index (e.g. 1 -> 'a', 2 -> 'b')
 */
export function intToAlpha(num: number): string {
  let n = Math.max(1, Math.floor(num));
  let result = '';
  while (n > 0) {
    n--;
    result = String.fromCharCode(97 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

/**
 * Parses alphabetical index string to its integer value (e.g. 'a' -> 1, 'b' -> 2, 'z' -> 26)
 */
export function alphaToInt(alpha: string): number {
  let result = 0;
  const str = alpha.toLowerCase();
  for (let i = 0; i < str.length; i++) {
    result = result * 26 + (str.charCodeAt(i) - 96);
  }
  return result || 1;
}

/**
 * Returns formatted numbering prefix given an index and style format.
 */
export function getNumberingPrefix(format: NumberingFormat, index: number): string {
  const n = index + 1;
  switch (format) {
    case 'roman-parentheses':
    case '(i)':
      return `(${intToRoman(n)}) `;
    case 'numeric-dot':
    case '1.':
      return `${n}. `;
    case 'numeric-parentheses':
    case '1)':
      return `${n}) `;
    case 'alpha-dot':
    case 'a.':
      return `${intToAlpha(n)}. `;
    case 'alpha-parentheses':
    case '(a)':
      return `(${intToAlpha(n)}) `;
    case 'bullet':
      return `* `;
    default:
      return `${n}. `;
  }
}

export type ListTerminator = ';' | ':' | '';

const TERMINATOR_KEY = 'formatter-list-terminator-v1';
const TERMINATOR_EVENT = 'formatter:list-terminator';

/** Persisted line-ending for smart list Enter; ';' by default, '' disables. */
export function getListTerminator(): ListTerminator {
  try {
    const raw = localStorage.getItem(TERMINATOR_KEY);
    if (raw === ':' || raw === '' || raw === ';') return raw;
  } catch {
    // storage unavailable (private mode) — fall through to default
  }
  return ';';
}

export function setListTerminator(terminator: ListTerminator): void {
  try {
    localStorage.setItem(TERMINATOR_KEY, terminator);
  } catch {
    // storage unavailable — setting applies to this session only
  }
  window.dispatchEvent(new Event(TERMINATOR_EVENT));
}

export function subscribeListTerminator(listener: () => void): () => void {
  window.addEventListener(TERMINATOR_EVENT, listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === TERMINATOR_KEY) listener();
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(TERMINATOR_EVENT, listener);
    window.removeEventListener('storage', handleStorage);
  };
}

export interface ListEditResult {
  text: string;
  newCursor: number;
  newSelectionStart?: number;
  newSelectionEnd?: number;
}

export interface NextListPrefixResult {
  indent: string;
  nextPrefix: string;
  currentPrefix: string;
  isOnlyPrefix: boolean;
}

function splitLineAt(
  value: string,
  cursor: number,
): { lineStart: number; lineEnd: number; fullLine: string } {
  const safeCursor = Math.max(0, Math.min(cursor, value.length));
  const lineStart = value.lastIndexOf('\n', Math.max(0, safeCursor - 1)) + 1;
  const nextNewline = value.indexOf('\n', safeCursor);
  const lineEnd = nextNewline === -1 ? value.length : nextNewline;
  return { lineStart, lineEnd, fullLine: value.substring(lineStart, lineEnd) };
}

type ParsedListLine = {
  indent: string;
  prefix: string;
  nextPrefix: string;
  content: string;
  isOnlyPrefix: boolean;
  kind: 'roman' | 'numeric-dot' | 'numeric-paren' | 'alpha-dot' | 'alpha-paren' | 'bullet';
};

function isPrecedingRoman(contextText: string, indent: string): boolean {
  const trimmed = contextText.trimEnd();
  if (!trimmed) return false;
  const lines = trimmed.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const indentMatch = line.match(/^(\s*)/)?.[1] ?? '';
    if (indentMatch !== indent) continue;
    const body = line.trim();
    if (!body) break;
    if (/^\((?:[ivxlcdm]{2,})\)/i.test(body)) return true;
    if (/^\([abefghjknopqrstuyz]\)/i.test(body)) return false;
    if (/^\(i\)/i.test(body)) return true;
    if (/^\(a\)/i.test(body)) return false;
  }
  return false;
}

function parseListLine(line: string, contextPrecedingText = ''): ParsedListLine | null {
  const match = line.match(/^(\s*)(.*)$/);
  if (!match) return null;
  const indent = match[1];
  const body = match[2];

  // 1. Parenthesized numbers: (1), (2)
  const numericParenEnclosed = body.match(/^\((\d+)\)(\s+|$)(.*)$/);
  if (numericParenEnclosed) {
    const value = numericParenEnclosed[1];
    const spacing = numericParenEnclosed[2] || ' ';
    return {
      indent,
      prefix: `(${value})${spacing}`,
      nextPrefix: `(${Number(value) + 1})${spacing}`,
      kind: 'numeric-paren',
      content: numericParenEnclosed[3],
      isOnlyPrefix: numericParenEnclosed[3].trim().length === 0,
    };
  }

  // 2. Parenthesized single-letter or Roman numeral
  const parenMatch = body.match(/^\(([a-zA-Z0-9]+)\)(\s+|$)(.*)$/);
  if (parenMatch) {
    const rawVal = parenMatch[1];
    const spacing = parenMatch[2] || ' ';
    const rest = parenMatch[3];
    const isOnlyPrefix = rest.trim().length === 0;

    // Multi-letter Roman numerals like (ii), (iv), (ix)
    if (/^[ivxlcdm]{2,}$/i.test(rawVal)) {
      return {
        indent,
        prefix: `(${rawVal})${spacing}`,
        nextPrefix: `(${intToRoman(romanToInt(rawVal) + 1)})${spacing}`,
        kind: 'roman',
        content: rest,
        isOnlyPrefix,
      };
    }

    // Single letter
    if (/^[a-zA-Z]$/.test(rawVal)) {
      const lower = rawVal.toLowerCase();
      const isRomanChar = /^[ivxlcdm]$/.test(lower);
      let isRoman = false;

      if (isRomanChar) {
        if (contextPrecedingText) {
          isRoman = isPrecedingRoman(contextPrecedingText, indent);
        } else {
          // Default disambiguation when isolated
          isRoman = lower === 'i' || lower === 'v' || lower === 'x';
        }
      }

      if (isRoman) {
        return {
          indent,
          prefix: `(${rawVal})${spacing}`,
          nextPrefix: `(${intToRoman(romanToInt(rawVal) + 1)})${spacing}`,
          kind: 'roman',
          content: rest,
          isOnlyPrefix,
        };
      }

      return {
        indent,
        prefix: `(${rawVal})${spacing}`,
        nextPrefix: `(${alphaCase(intToAlpha(alphaToInt(rawVal) + 1), rawVal)})${spacing}`,
        kind: 'alpha-paren',
        content: rest,
        isOnlyPrefix,
      };
    }
  }

  const patterns: Array<
    [
      RegExp,
      (
        value: string,
        spacing: string,
      ) => { prefix: string; nextPrefix: string; kind: ParsedListLine['kind'] },
    ]
  > = [
    [
      /^(\d+)[.)](\s+|$)(.*)$/,
      (value, spacing) => ({
        prefix: `${value}${body[value.length] === '.' ? '.' : ')'}` + spacing,
        nextPrefix: `${Number(value) + 1}${body[value.length] === '.' ? '.' : ')'}` + spacing,
        kind: body[value.length] === '.' ? 'numeric-dot' : 'numeric-paren',
      }),
    ],
    [
      /^([a-zA-Z])[.)](\s+|$)(.*)$/,
      (value, spacing) => ({
        prefix: `${value}${body[value.length] === '.' ? '.' : ')'}` + spacing,
        nextPrefix:
          `${alphaCase(intToAlpha(alphaToInt(value) + 1), value)}${body[value.length] === '.' ? '.' : ')'}` +
          spacing,
        kind: body[value.length] === '.' ? 'alpha-dot' : 'alpha-paren',
      }),
    ],
    [
      /^([-*+•◦▪])(\s+|$)(.*)$/,
      (value, spacing) => ({
        prefix: value + spacing,
        nextPrefix: value + spacing,
        kind: 'bullet',
      }),
    ],
  ];

  for (const [pattern, makePrefix] of patterns) {
    const item = body.match(pattern);
    if (!item) continue;
    const prefixInfo = makePrefix(item[1], item[2] || ' ');
    return {
      indent,
      ...prefixInfo,
      content: item[3],
      isOnlyPrefix: item[3].trim().length === 0,
    };
  }
  return null;
}

function alphaCase(value: string, source: string): string {
  return source === source.toUpperCase() ? value.toUpperCase() : value;
}

function renumberFollowingList(text: string, lineStart: number, parsed: ParsedListLine): string {
  const lines = text.split('\n');
  let offset = 0;
  let found = false;
  for (let index = 0; index < lines.length; index++) {
    const lineEnd = offset + lines[index].length;
    if (offset === lineStart) found = true;
    if (found && offset > lineStart) {
      const current = parseListLine(lines[index]);
      if (!current || current.indent !== parsed.indent || current.kind !== parsed.kind) break;
      const next = parseListLine(`${parsed.indent}${parsed.nextPrefix}${current.content}`);
      if (!next) break;
      lines[index] = `${current.indent}${next.nextPrefix}${current.content}`;
      parsed = { ...next, content: current.content };
    }
    offset = lineEnd + 1;
  }
  return lines.join('\n');
}

/**
 * Smart Enter for roman- and numeric-led lists: appends the terminator
 * (";" or ":", '' disables) at the cursor and continues with the next
 * marker. "(i) Test" becomes "(i) Test;" plus "(ii) "; "1. Test" becomes
 * "1. Test;" plus "2. ". Tab-created "   a. sub" lines continue with "   b. ".
 * Returns null for prefix-only lines (caller falls through to the
 * existing exit/dedent behavior) and for unrelated list styles.
 */
export function applySmartListEnter(
  value: string,
  cursor: number,
  terminator: ListTerminator = ';',
  selectionEnd = cursor,
): ListEditResult | null {
  const { lineStart, fullLine } = splitLineAt(value, cursor);
  const precedingText = value.substring(0, lineStart);
  const parsed = parseListLine(fullLine, precedingText);
  if (!parsed || parsed.isOnlyPrefix) {
    if (parsed?.isOnlyPrefix && parsed.kind === 'alpha-dot' && parsed.indent) {
      return applyListDedentSelection(value, cursor, selectionEnd);
    }
    return null;
  }
  const beforeCursor = value.substring(lineStart, cursor).replace(/\s+$/, '');
  const lineTerminator =
    parsed.kind === 'bullet' ? '' : terminator && /[;:]$/.test(beforeCursor) ? '' : terminator;
  const insertion = `${lineTerminator}\n${parsed.indent}${parsed.nextPrefix}`;
  const selectedEnd = Math.max(cursor, selectionEnd);
  const textBefore = value.substring(0, cursor) + insertion + value.substring(selectedEnd);
  const insertedLineStart = cursor + lineTerminator.length + 1;
  const text = renumberFollowingList(textBefore, insertedLineStart, parsed);
  const newCursor = cursor + insertion.length;
  return { text, newCursor };
}

/** Finds the nearest column-0 roman or numeric marker above the given offset. */
function findPrecedingTopMarker(
  value: string,
  lineStart: number,
): { kind: 'roman' | 'numeric'; num: number } | null {
  const lines = value.substring(0, lineStart).split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const roman = lines[i].match(/^\(([ivxlcdm]+)\)\s/i);
    if (roman) return { kind: 'roman', num: romanToInt(roman[1]) };
    const numeric = lines[i].match(/^(\d+)\.\s/);
    if (numeric) return { kind: 'numeric', num: parseInt(numeric[1], 10) };
  }
  return null;
}

/** Formats the marker after the given top-level marker. */
function formatNextTopMarker(marker: { kind: 'roman' | 'numeric'; num: number }): string {
  return marker.kind === 'roman' ? `(${intToRoman(marker.num + 1)}) ` : `${marker.num + 1}. `;
}

/**
 * Tab on a top-level "(ii) " or "2. " line swaps it to a "   a. " sub-item;
 * Tab on an already-indented sub-item adds one more 3-space level.
 * Returns null for unrelated lines (caller leaves default behavior).
 */
export function applyListIndent(value: string, cursor: number): ListEditResult | null {
  return applyListIndentLine(value, cursor);
}

export function applyListIndentSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): ListEditResult | null {
  const { lineStart } = splitLineAt(value, selectionStart);
  const endLine = splitLineAt(value, selectionEnd);
  const target = value.substring(lineStart, endLine.lineEnd);
  const lines = target.split('\n');
  if (!lines.some((line) => parseListLine(line))) return null;
  const newText = lines.map((line) => `   ${line}`).join('\n');
  const text = value.substring(0, lineStart) + newText + value.substring(endLine.lineEnd);
  return {
    text,
    newCursor: selectionEnd + 3 * lines.length,
    newSelectionStart: selectionStart + 3,
    newSelectionEnd: selectionEnd + 3 * lines.length,
  };
}

function applyListIndentLine(value: string, cursor: number): ListEditResult | null {
  const { lineStart, lineEnd, fullLine } = splitLineAt(value, cursor);

  const parsed = parseListLine(fullLine);
  if (parsed && (parsed.kind === 'roman' || parsed.kind === 'numeric-dot')) {
    const rest = parsed.content;
    const spacing = parsed.prefix.replace(/^(?:\([^)]+\)|\d+[.)]|[a-zA-Z][.)])/, '') || ' ';
    const newLine = `   a.${spacing}${rest}`;
    return {
      text: value.substring(0, lineStart) + newLine + value.substring(lineEnd),
      newCursor: cursor + (newLine.length - fullLine.length),
    };
  }

  if (parsed && parsed.kind === 'alpha-dot' && parsed.indent) {
    const newLine = `   ${fullLine}`;
    return {
      text: value.substring(0, lineStart) + newLine + value.substring(lineEnd),
      newCursor: cursor + 3,
    };
  }

  return null;
}

/**
 * Shift+Tab on a one-level "   a. " sub-item converts it back to the next
 * parent roman marker (e.g. after "(i)" it becomes "(ii) "); deeper levels
 * lose one 3-space indent. Returns null when there is nothing to dedent.
 */
export function applyListDedent(value: string, cursor: number): ListEditResult | null {
  return applyListDedentSelection(value, cursor, cursor);
}

export function applyListDedentSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): ListEditResult | null {
  if (selectionStart !== selectionEnd) {
    const { lineStart } = splitLineAt(value, selectionStart);
    const endLine = splitLineAt(value, selectionEnd);
    const lines = value.substring(lineStart, endLine.lineEnd).split('\n');
    if (!lines.some((line) => /^\s{3}/.test(line))) return null;
    const newText = lines.map((line) => (line.startsWith('   ') ? line.slice(3) : line)).join('\n');
    const selectionStartDelta = lines[0].startsWith('   ') ? -3 : 0;
    const selectionEndDelta = newText.length - (endLine.lineEnd - lineStart);
    const text = value.substring(0, lineStart) + newText + value.substring(endLine.lineEnd);
    return {
      text,
      newCursor: Math.max(lineStart, selectionEnd + selectionEndDelta),
      newSelectionStart: Math.max(lineStart, selectionStart + selectionStartDelta),
      newSelectionEnd: Math.max(lineStart, selectionEnd + selectionEndDelta),
    };
  }
  return applyListDedentLine(value, selectionStart);
}

function applyListDedentLine(value: string, cursor: number): ListEditResult | null {
  const { lineStart, lineEnd, fullLine } = splitLineAt(value, cursor);

  const parsed = parseListLine(fullLine);
  if (!parsed || parsed.kind !== 'alpha-dot' || !parsed.indent) return null;
  const { indent, content: rest } = parsed;

  let newLine: string;
  if (indent.length <= 3) {
    const prev = findPrecedingTopMarker(value, lineStart);
    newLine = prev === null ? fullLine.trimStart() : `${formatNextTopMarker(prev)}${rest}`;
  } else {
    newLine = fullLine.slice(3);
  }
  return {
    text: value.substring(0, lineStart) + newLine + value.substring(lineEnd),
    newCursor: Math.max(lineStart, cursor + (newLine.length - fullLine.length)),
  };
}

/**
 * Analyzes a line of text to determine if it has a list/numbering prefix,
 * and calculates the subsequent numbering prefix for auto-continuation on Enter.
 */
export function getNextListPrefix(line: string): NextListPrefixResult | null {
  const parsed = parseListLine(line);
  if (!parsed) return null;
  return {
    indent: parsed.indent,
    nextPrefix: parsed.nextPrefix,
    currentPrefix: parsed.prefix,
    isOnlyPrefix: parsed.isOnlyPrefix,
  };
}

/**
 * Applies line-by-line numbering ((i) (ii), 1. 2., a. b., etc.) to text or selection.
 * Automatically cleans existing bullets/numbers and toggles off if already formatted.
 */
export function applyNumberingToText(
  fullText: string,
  selectionStart: number,
  selectionEnd: number,
  format: NumberingFormat,
): { text: string; newSelectionStart: number; newSelectionEnd: number } {
  if (!fullText) {
    const prefix = getNumberingPrefix(format, 0);
    return { text: prefix, newSelectionStart: prefix.length, newSelectionEnd: prefix.length };
  }

  const hasSelection = selectionStart !== selectionEnd;

  // Determine line boundaries
  const lineStart = fullText.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1;
  let lineEnd = fullText.indexOf('\n', selectionEnd);
  if (lineEnd === -1) lineEnd = fullText.length;

  // If user selected specific text, apply only to the selected lines; otherwise apply across whole text
  const targetStart = hasSelection ? lineStart : 0;
  const targetEnd = hasSelection ? lineEnd : fullText.length;

  const before = fullText.substring(0, targetStart);
  const targetText = fullText.substring(targetStart, targetEnd);
  const after = fullText.substring(targetEnd);

  const lines = targetText.split(/\r?\n/);

  const isStructuralLine = (line: string) =>
    /^\s*(?:#{1,6}(?:\s|$)|\||```|~~~|---|>\s?)/.test(line);

  // Check if target lines are already numbered with this exact requested format (toggle off check)
  const candidateLines = lines.filter((l) => l.trim().length > 0 && !isStructuralLine(l));
  const isTargetAlreadyThisFormat =
    candidateLines.length > 0 &&
    candidateLines.every((line, idx) => {
      const prefix = getNumberingPrefix(format, idx).trim();
      const trimmed = line.trimStart();
      return trimmed.startsWith(prefix);
    });

  let itemIndex = 0;
  const newLines = lines.map((line) => {
    if (!line.trim() || isStructuralLine(line)) {
      return line; // Keep empty lines and structural Markdown intact
    }

    const leadingSpacesMatch = line.match(/^(\s*)/);
    const leadingSpaces = leadingSpacesMatch ? leadingSpacesMatch[1] : '';
    const trimmedContent = line.slice(leadingSpaces.length);

    // Strip existing list prefixes: bullets (*, -, +), numbers (1., 1)), roman ((i), (ii)), alpha (a., (a))
    const parsed = parseListLine(trimmedContent);
    const strippedContent = parsed ? parsed.content : trimmedContent;

    if (isTargetAlreadyThisFormat) {
      // Toggle off: remove the numbering
      return leadingSpaces + strippedContent;
    } else {
      // Apply new numbering prefix
      const prefix = getNumberingPrefix(format, itemIndex);
      itemIndex++;
      return leadingSpaces + prefix + strippedContent;
    }
  });

  const replacedText = newLines.join('\n');
  const resultText = before + replacedText + after;
  const newSelectionStart = targetStart;
  const newSelectionEnd = targetStart + replacedText.length;

  return {
    text: resultText,
    newSelectionStart,
    newSelectionEnd,
  };
}

/**
 * Wraps or unwraps selection with inline markdown markers (e.g. **bold**, *italic*, etc.)
 */
export function applyInlineFormatToText(
  fullText: string,
  selectionStart: number,
  selectionEnd: number,
  wrapper: string,
): { text: string; newSelectionStart: number; newSelectionEnd: number } {
  const before = fullText.substring(0, selectionStart);
  const selected = fullText.substring(selectionStart, selectionEnd);
  const after = fullText.substring(selectionEnd);

  if (
    selected.startsWith(wrapper) &&
    selected.endsWith(wrapper) &&
    selected.length >= wrapper.length * 2
  ) {
    // Unwrap
    const unwrapped = selected.slice(wrapper.length, selected.length - wrapper.length);
    return {
      text: before + unwrapped + after,
      newSelectionStart: selectionStart,
      newSelectionEnd: selectionStart + unwrapped.length,
    };
  }

  if (before.endsWith(wrapper) && after.startsWith(wrapper)) {
    const unwrappedBefore = before.slice(0, -wrapper.length);
    const unwrappedAfter = after.slice(wrapper.length);
    return {
      text: unwrappedBefore + selected + unwrappedAfter,
      newSelectionStart: selectionStart - wrapper.length,
      newSelectionEnd: selectionEnd - wrapper.length,
    };
  }

  const defaultPlaceholder =
    wrapper === '**'
      ? 'bold text'
      : wrapper === '*'
        ? 'italic text'
        : wrapper === '~~'
          ? 'strikethrough'
          : 'text';
  const contentToWrap = selected || defaultPlaceholder;
  const wrapped = `${wrapper}${contentToWrap}${wrapper}`;

  return {
    text: before + wrapped + after,
    newSelectionStart: selectionStart + wrapper.length,
    newSelectionEnd: selectionStart + wrapper.length + contentToWrap.length,
  };
}
