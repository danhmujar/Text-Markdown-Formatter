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
  return () => window.removeEventListener(TERMINATOR_EVENT, listener);
}

export interface ListEditResult {
  text: string;
  newCursor: number;
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
): ListEditResult | null {
  const { fullLine } = splitLineAt(value, cursor);

  const romanMatch = fullLine.match(/^(\s*)\(([ivxlcdm]+)\)(\s*)(.*)$/i);
  if (romanMatch) {
    if (romanMatch[4].trim().length === 0) return null;
    const indent = romanMatch[1];
    const spacing = romanMatch[3] || ' ';
    const insertion = `${terminator}\n${indent}(${intToRoman(romanToInt(romanMatch[2]) + 1)})${spacing}`;
    return {
      text: value.substring(0, cursor) + insertion + value.substring(cursor),
      newCursor: cursor + insertion.length,
    };
  }

  const numericMatch = fullLine.match(/^(\s*)(\d+)\.(\s*)(.*)$/);
  if (numericMatch) {
    if (numericMatch[4].trim().length === 0) return null;
    const indent = numericMatch[1];
    const spacing = numericMatch[3] || ' ';
    const insertion = `${terminator}\n${indent}${parseInt(numericMatch[2], 10) + 1}.${spacing}`;
    return {
      text: value.substring(0, cursor) + insertion + value.substring(cursor),
      newCursor: cursor + insertion.length,
    };
  }

  const subMatch = fullLine.match(/^(\s+)([a-zA-Z])\.(\s*)(.*)$/);
  if (subMatch) {
    if (subMatch[4].trim().length === 0) return applyListDedent(value, cursor);
    const indent = subMatch[1];
    const spacing = subMatch[3] || ' ';
    const isUpper = subMatch[2] === subMatch[2].toUpperCase();
    const nextAlphaRaw = intToAlpha(alphaToInt(subMatch[2]) + 1);
    const insertion = `${terminator}\n${indent}${isUpper ? nextAlphaRaw.toUpperCase() : nextAlphaRaw}.${spacing}`;
    return {
      text: value.substring(0, cursor) + insertion + value.substring(cursor),
      newCursor: cursor + insertion.length,
    };
  }

  return null;
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
  const { lineStart, lineEnd, fullLine } = splitLineAt(value, cursor);

  const romanMatch = fullLine.match(/^\(([ivxlcdm]+)\)(\s*)(.*)$/i);
  const numericMatch = romanMatch ? null : fullLine.match(/^(\d+)\.(\s*)(.*)$/);
  if (romanMatch || numericMatch) {
    const spacing = romanMatch ? romanMatch[2] || ' ' : numericMatch![2] || ' ';
    const rest = romanMatch ? romanMatch[3] : numericMatch![3];
    const newLine = `   a.${spacing}${rest}`;
    return {
      text: value.substring(0, lineStart) + newLine + value.substring(lineEnd),
      newCursor: cursor + (newLine.length - fullLine.length),
    };
  }

  const subMatch = fullLine.match(/^(\s+)([a-zA-Z]\..*)$/);
  if (subMatch) {
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
  const { lineStart, lineEnd, fullLine } = splitLineAt(value, cursor);

  const subMatch = fullLine.match(/^(\s+)([a-zA-Z])\.(\s*)(.*)$/);
  if (!subMatch) return null;
  const [, indent, , , rest] = subMatch;

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
  if (!line) return null;

  // 1. Roman numerals in parentheses, e.g. (i) or (ii)
  const romanMatch = line.match(/^(\s*)\(([ivxlcdm]+)\)(\s*)(.*)$/i);
  if (romanMatch) {
    const indent = romanMatch[1];
    const romanStr = romanMatch[2];
    const spacing = romanMatch[3] || ' ';
    const rest = romanMatch[4];
    const currentNum = romanToInt(romanStr);
    const nextRoman = intToRoman(currentNum + 1);
    const currentPrefix = `(${romanStr})${spacing}`;
    const nextPrefix = `(${nextRoman})${spacing}`;
    return {
      indent,
      nextPrefix,
      currentPrefix,
      isOnlyPrefix: rest.trim().length === 0,
    };
  }

  // 2. Standard numbers with dot, e.g. 1. or 2.
  const numericDotMatch = line.match(/^(\s*)(\d+)\.(\s*)(.*)$/);
  if (numericDotMatch) {
    const indent = numericDotMatch[1];
    const num = parseInt(numericDotMatch[2], 10);
    const spacing = numericDotMatch[3] || ' ';
    const rest = numericDotMatch[4];
    const currentPrefix = `${num}.${spacing}`;
    const nextPrefix = `${num + 1}.${spacing}`;
    return {
      indent,
      nextPrefix,
      currentPrefix,
      isOnlyPrefix: rest.trim().length === 0,
    };
  }

  // 3. Numbers in parentheses, e.g. (1) or (2)
  const numericParenMatch = line.match(/^(\s*)\((\d+)\)(\s*)(.*)$/);
  if (numericParenMatch) {
    const indent = numericParenMatch[1];
    const num = parseInt(numericParenMatch[2], 10);
    const spacing = numericParenMatch[3] || ' ';
    const rest = numericParenMatch[4];
    const currentPrefix = `(${num})${spacing}`;
    const nextPrefix = `(${num + 1})${spacing}`;
    return {
      indent,
      nextPrefix,
      currentPrefix,
      isOnlyPrefix: rest.trim().length === 0,
    };
  }

  const numericClosingParenMatch = line.match(/^(\s*)(\d+)\)(\s*)(.*)$/);
  if (numericClosingParenMatch) {
    const indent = numericClosingParenMatch[1];
    const num = parseInt(numericClosingParenMatch[2], 10);
    const spacing = numericClosingParenMatch[3] || ' ';
    const rest = numericClosingParenMatch[4];
    const currentPrefix = `${num})${spacing}`;
    const nextPrefix = `${num + 1})${spacing}`;
    return {
      indent,
      nextPrefix,
      currentPrefix,
      isOnlyPrefix: rest.trim().length === 0,
    };
  }

  // 4. Alphabetical with dot, e.g. a. or b.
  const alphaDotMatch = line.match(/^(\s*)([a-zA-Z])\.(\s*)(.*)$/);
  if (alphaDotMatch) {
    const indent = alphaDotMatch[1];
    const alphaStr = alphaDotMatch[2];
    const spacing = alphaDotMatch[3] || ' ';
    const rest = alphaDotMatch[4];
    const num = alphaToInt(alphaStr);
    const isUpper = alphaStr === alphaStr.toUpperCase();
    const nextAlphaRaw = intToAlpha(num + 1);
    const nextAlpha = isUpper ? nextAlphaRaw.toUpperCase() : nextAlphaRaw;
    const currentPrefix = `${alphaStr}.${spacing}`;
    const nextPrefix = `${nextAlpha}.${spacing}`;
    return {
      indent,
      nextPrefix,
      currentPrefix,
      isOnlyPrefix: rest.trim().length === 0,
    };
  }

  // 5. Alphabetical in parentheses, e.g. (a) or (b)
  const alphaParenMatch = line.match(/^(\s*)\(([a-zA-Z])\)(\s*)(.*)$/);
  if (alphaParenMatch) {
    const indent = alphaParenMatch[1];
    const alphaStr = alphaParenMatch[2];
    const spacing = alphaParenMatch[3] || ' ';
    const rest = alphaParenMatch[4];
    const num = alphaToInt(alphaStr);
    const isUpper = alphaStr === alphaStr.toUpperCase();
    const nextAlphaRaw = intToAlpha(num + 1);
    const nextAlpha = isUpper ? nextAlphaRaw.toUpperCase() : nextAlphaRaw;
    const currentPrefix = `(${alphaStr})${spacing}`;
    const nextPrefix = `(${nextAlpha})${spacing}`;
    return {
      indent,
      nextPrefix,
      currentPrefix,
      isOnlyPrefix: rest.trim().length === 0,
    };
  }

  // 6. Bullets (*, -, +, •, ◦, ▪)
  const bulletMatch = line.match(/^(\s*)([-*+•◦▪])(\s*)(.*)$/);
  if (bulletMatch) {
    const indent = bulletMatch[1];
    const bulletChar = bulletMatch[2];
    const spacing = bulletMatch[3] || ' ';
    const rest = bulletMatch[4];
    const currentPrefix = `${bulletChar}${spacing}`;
    return {
      indent,
      nextPrefix: currentPrefix,
      currentPrefix,
      isOnlyPrefix: rest.trim().length === 0,
    };
  }

  return null;
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

  // Check if target lines are already numbered with this exact requested format (toggle off check)
  const nonBlankLines = lines.filter((l) => l.trim().length > 0);
  const isTargetAlreadyThisFormat =
    nonBlankLines.length > 0 &&
    nonBlankLines.every((line, idx) => {
      const prefix = getNumberingPrefix(format, idx).trim();
      const trimmed = line.trimStart();
      return trimmed.startsWith(prefix);
    });

  let itemIndex = 0;
  const newLines = lines.map((line) => {
    if (!line.trim()) {
      return line; // Keep empty lines intact
    }

    const leadingSpacesMatch = line.match(/^(\s*)/);
    const leadingSpaces = leadingSpacesMatch ? leadingSpacesMatch[1] : '';
    const trimmedContent = line.slice(leadingSpaces.length);

    // Strip existing list prefixes: bullets (*, -, +), numbers (1., 1)), roman ((i), (ii)), alpha (a., (a))
    const strippedContent = trimmedContent.replace(
      /^(?:[-*+•◦▪]\s+|\d+[\.\)]\s+|\(\d+\)\s+|\([a-zA-Z0-9ivxlcdmIVXLCDM]+\)\s+|[a-zA-Z][\.\)]\s+)/,
      '',
    );

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
