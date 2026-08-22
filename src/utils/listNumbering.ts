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

export interface NextListPrefixResult {
  indent: string;
  nextPrefix: string;
  currentPrefix: string;
  isOnlyPrefix: boolean;
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
