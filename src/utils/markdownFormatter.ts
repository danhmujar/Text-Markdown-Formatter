import { marked } from 'marked';
import { StyleOptions } from '../types';

export const DEFAULT_PRESETS = [
  {
    id: 'user-discrepancy',
    name: 'Discrepancy Summary (Your Sample)',
    description: 'Nested discrepancies with Expected value, Recommended correction, and Citation',
    content: `### 3.2 Summary Section

**List of Discrepancies:**
*   **Column Header:** Notes
    *   **Expected value (from source):** Reima Rytsölä should be classified as independent from major shareholders, and he should not be identified as having stepped down from the role of "chair of the board".
    *   **Recommended correction:** Update the Notes field for Reima Rytsölä to state: "(i) Independence: a) Independent from the company and its management, b) independent from major shareholders. (ii) Reima Rytsölä stepped down as a member of the board on 24th of March 2026 after the financial year-end."
    *   **Supporting citation:** Stora Enso Annual Report 2025, page 4 (which explicitly lists only Håkan Buskhe and Richard Nilsson as exceptions to significant shareholder independence) and page 13 (which lists Reima Rytsölä's title as "Member of Stora Enso’s Board of Directors", not Chair).`,
  },
  {
    id: 'audit-table-and-list',
    name: 'Audit Findings with Table',
    description: 'Header, audit findings table, and nested action items',
    content: `### 4.0 Compliance Audit Findings

**Summary of Scope:** Review of Q1 2026 corporate governance and board independence.

| Finding Ref | Entity / Individual | Status | Priority | Action Due |
| :--- | :--- | :--- | :--- | :--- |
| **AUD-01** | Reima Rytsölä | Discrepancy Found | High | Immediate |
| **AUD-02** | Håkan Buskhe | Verified Exception | Low | Q2 2026 |
| **AUD-03** | Richard Nilsson | Verified Exception | Low | Q2 2026 |

**Detailed Action Items:**
*   **Board Classification Rectifications**
    *   **Action 1.1:** Correct biographical notes in the investor relations portal.
    *   **Action 1.2:** Re-publish amended schedule of committee memberships.
*   **Documentation Cross-Reference**
    *   **Source File:** Stora Enso Annual Report 2025 (Pages 4 & 13)
    *   **Auditor Sign-off:** Governance & Ethics Committee`,
  },
  {
    id: 'executive-brief',
    name: 'Executive Decision Memo',
    description: 'Key conclusions, recommendations, and evidence points',
    content: `### 1.1 Executive Summary & Key Decisions

**Critical Highlights:**
*   **Governance Status:** Independent majority threshold maintained at 83%.
    *   **Verification:** All non-executive directors verified against EU Corporate Governance Code.
    *   **Remediation:** Single disclosure typo corrected on page 4 footnotes.
*   **Next Steps for Legal & IR:**
    *   Distribute updated briefing to statutory auditors before March 31, 2026.
    *   Archive audit trail in the company secretary repository.`,
  },
];

export const FONT_OPTIONS = [
  {
    label: 'Aptos (New Microsoft Default)',
    value: `'Aptos', 'Segoe UI', Calibri, Arial, sans-serif`,
  },
  { label: 'Calibri (Classic Office)', value: `'Calibri', 'Segoe UI', Arial, sans-serif` },
  {
    label: 'Segoe UI (Modern Windows)',
    value: `'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif`,
  },
  { label: 'Arial (Universal Clean)', value: `Arial, Helvetica, sans-serif` },
  { label: 'Georgia (Editorial Serif)', value: `Georgia, 'Times New Roman', serif` },
  { label: 'Times New Roman (Formal)', value: `'Times New Roman', Times, serif` },
];

/**
 * Checks if input text contains <br> tags (<br>, <br/>, <br /> in any case).
 */
export function hasBrTags(text: string): boolean {
  if (!text) return false;
  return /<br\s*\/?>/i.test(text);
}

/**
 * Intelligently converts <br> tags to standard newlines (\n)
 * without mangling markdown code fences or tables.
 */
export function convertBrToNewlines(text: string): string {
  if (!text) return '';
  if (!hasBrTags(text)) return text;

  // Replace <br> followed immediately by an existing \r?\n so we don't produce double blank lines,
  // and then replace any standalone <br> with \n
  return text.replace(/<br\s*\/?>\r?\n/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
}

/**
 * Converts newlines in text back into <br> tags.
 * Replaces newlines (\n) with <br> tags without adding a trailing <br> at the end of the text.
 */
export function convertNewlinesToBr(text: string): string {
  if (!text) return '';
  // Normalize Windows \r\n to \n
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Convert newlines directly into <br>
  // e.g. "Hello\nworld" -> "Hello<br>world"
  return normalized.replace(/\n/g, '<br>');
}

/**
 * Prepares the output text for copying:
 * If the original input contained <br> tags, converts the edited output's line breaks back to <br>.
 * Otherwise, returns the edited output as-is.
 */
export function prepareCopiedText(outputText: string, originalInputText: string): string {
  if (!outputText) return '';
  const inputHadBr = hasBrTags(originalInputText);

  if (inputHadBr) {
    return convertNewlinesToBr(outputText);
  }
  return outputText;
}

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

export function tsvToMarkdownTable(tsv: string): string {
  const lines = tsv
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
  if (lines.length === 0) return tsv;

  // Check if at least one line contains a tab
  const hasTabs = lines.some((line) => line.includes('\t'));
  if (!hasTabs) return tsv;

  const rows = lines.map((line) =>
    line.split('\t').map((cell) => cell.trim().replace(/\|/g, '\\|')),
  );
  const maxCols = Math.max(...rows.map((r) => r.length));
  if (maxCols < 1) return tsv;

  // Normalize all rows to maxCols
  const normalizedRows = rows.map((r) => {
    const copy = [...r];
    while (copy.length < maxCols) copy.push('');
    return copy;
  });

  // If only 1 row was copied with multiple columns (e.g. 2 cells per row), treat it as header or provide column headers
  if (normalizedRows.length === 1 && maxCols >= 2) {
    const headerRow = normalizedRows[0];
    const separatorRow = new Array(maxCols).fill(':---');
    return `| ${headerRow.join(' | ')} |\n| ${separatorRow.join(' | ')} |`;
  }

  const headerRow = normalizedRows[0];
  const separatorRow = new Array(maxCols).fill(':---');
  const dataRows = normalizedRows.slice(1);

  let md = `| ${headerRow.join(' | ')} |\n| ${separatorRow.join(' | ')} |\n`;
  if (dataRows.length > 0) {
    md += dataRows.map((r) => `| ${r.join(' | ')} |`).join('\n');
  }

  return md;
}

export function htmlTableToMarkdown(html: string): string | null {
  if (!html || !html.includes('<table')) return null;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return null;

    const rows: string[][] = [];
    table.querySelectorAll('tr').forEach((tr) => {
      const cells: string[] = [];
      tr.querySelectorAll('th, td').forEach((cell) => {
        const text = cell.innerHTML
          .replace(/<br\s*\/?>/gi, '<br>')
          .replace(/\n/g, ' ')
          .trim();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        cells.push(tempDiv.textContent?.trim().replace(/\|/g, '\\|') || '');
      });
      if (cells.length > 0) {
        rows.push(cells);
      }
    });

    if (rows.length === 0) return null;
    const maxCols = Math.max(...rows.map((r) => r.length));
    const normalizedRows = rows.map((r) => {
      const copy = [...r];
      while (copy.length < maxCols) copy.push('');
      return copy;
    });

    if (normalizedRows.length === 1) {
      const headerRow = normalizedRows[0];
      const separatorRow = new Array(maxCols).fill(':---');
      return `| ${headerRow.join(' | ')} |\n| ${separatorRow.join(' | ')} |`;
    }

    const headerRow = normalizedRows[0];
    const separatorRow = new Array(maxCols).fill(':---');
    const dataRows = normalizedRows.slice(1);

    let md = `| ${headerRow.join(' | ')} |\n| ${separatorRow.join(' | ')} |\n`;
    if (dataRows.length > 0) {
      md += dataRows.map((r) => `| ${r.join(' | ')} |`).join('\n');
    }

    return md;
  } catch (err) {
    console.warn('Could not parse HTML table:', err);
    return null;
  }
}

export function sanitizeInputText(raw: string): string {
  if (!raw) return '';
  return smartCleanupMarkdown(raw).cleaned;
}

export interface SmartCleanupReport {
  cleaned: string;
  hasChanges: boolean;
  fixesCount: number;
  details: {
    spacesCleaned: boolean;
    quotesStandardized: boolean;
    markdownFixed: boolean;
    entitiesCleaned: boolean;
  };
}

/**
 * Smart Cleanup Tool:
 * 1. Automatically detects and removes redundant whitespaces, zero-width chars, trailing spaces, and excessive blank lines.
 * 2. Standardizes quote characters (smart quotes, curly apostrophes, guillemets -> straight quotes).
 * 3. Fixes common Markdown syntax errors (headings without spaces, bullets without spaces, bold/italic inner spaces, broken tables, etc.).
 */
export function smartCleanupMarkdown(raw: string): SmartCleanupReport {
  if (!raw) {
    return {
      cleaned: '',
      hasChanges: false,
      fixesCount: 0,
      details: {
        spacesCleaned: false,
        quotesStandardized: false,
        markdownFixed: false,
        entitiesCleaned: false,
      },
    };
  }

  let text = raw;
  let fixesCount = 0;
  let spacesCleaned = false;
  let quotesStandardized = false;
  let markdownFixed = false;
  let entitiesCleaned = false;

  // 1. Strip zero-width and invisible unicode characters
  const originalBeforeZero = text;
  text = text.replace(/[\u200B\u200C\u200D\uFEFF\u2060\u200E\u200F]/g, '');
  text = text.replace(/[\u00A0\u202F\u3000]/g, ' '); // Non-breaking spaces to regular spaces
  if (text !== originalBeforeZero) {
    spacesCleaned = true;
    fixesCount++;
  }

  // 2. Clean HTML metadata wrappers and office artifacts
  const beforeMetadata = text;
  text = text.replace(/<meta\s+[^>]*>/gi, '');
  text = text.replace(/<!--\s*StartFragment\s*-->/gi, '');
  text = text.replace(/<!--\s*EndFragment\s*-->/gi, '');
  text = text.replace(/<\/?(?:html|head|body)[^>]*>/gi, '');
  if (text !== beforeMetadata) {
    entitiesCleaned = true;
    fixesCount++;
  }

  // 3. Decode escaped HTML entities
  const beforeEntities = text;
  text = text.replace(/&amp;lt;br\s*\/?&amp;gt;/gi, '<br>');
  text = text.replace(/&lt;br\s*\/?&gt;/gi, '<br>');
  text = text.replace(/&lt;\s*br\s*\/?\s*&gt;/gi, '<br>');
  text = text.replace(/&amp;nbsp;/gi, ' ');
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;quot;/gi, '"');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&amp;apos;/gi, "'");
  text = text.replace(/&apos;/gi, "'");
  text = text.replace(/&#39;/gi, "'");
  text = text.replace(/&amp;amp;/gi, '&');
  if (text !== beforeEntities) {
    entitiesCleaned = true;
    fixesCount++;
  }

  // 4. Standardize Quote Characters
  const beforeQuotes = text;
  // Standardize double curly quotes, primes, and guillemets to straight ASCII "
  text = text.replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB\u2033\u2036]/g, '"');
  // Standardize single curly quotes, curly apostrophes, and primes to straight ASCII '
  text = text.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035\u2039\u203A]/g, "'");
  if (text !== beforeQuotes) {
    quotesStandardized = true;
    fixesCount++;
  }

  // 5. Line-by-Line Markdown Syntax Fixes & Whitespace Normalization
  // Protect code blocks from syntax rewriting
  const lines = text.split(/\r?\n/);
  let inCodeBlock = false;
  const processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Check code fence
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      processedLines.push(line.replace(/\s+$/, ''));
      continue;
    }

    if (inCodeBlock) {
      processedLines.push(line);
      continue;
    }

    const originalLine = line;

    // A. Strip trailing spaces
    line = line.replace(/\s+$/, '');

    // B. Fix Markdown Headings (e.g. #Heading -> # Heading)
    if (/^(\s*#{1,6})([^\s#].*)$/.test(line)) {
      line = line.replace(/^(\s*#{1,6})([^\s#].*)$/, '$1 $2');
      markdownFixed = true;
      fixesCount++;
    }

    // C. Fix Bullet points without space (e.g. *Item -> * Item, -Item -> - Item, +Item -> + Item)
    if (/^(\s*)([*+-])([^\s*+-].*)$/.test(line) && !/^(\s*[-*+]{3,})$/.test(line)) {
      line = line.replace(/^(\s*)([*+-])([^\s*+-].*)$/, '$1$2 $3');
      markdownFixed = true;
      fixesCount++;
    }

    // D. Fix Numbered lists without space (e.g. 1.Item -> 1. Item, 2)Item -> 2) Item)
    if (/^(\s*\d+[\.\)])([^\s\d].*)$/.test(line)) {
      line = line.replace(/^(\s*\d+[\.\)])([^\s\d].*)$/, '$1 $2');
      markdownFixed = true;
      fixesCount++;
    }

    // E. Fix Checkbox list item spacing (e.g. -[] -> - [ ], -[x] -> - [x], - [ ]Item -> - [ ] Item)
    if (/^(\s*[-*+]\s*)\[\s*\](\S)/.test(line)) {
      line = line.replace(/^(\s*[-*+]\s*)\[\s*\](\S)/, '$1[ ] $2');
      markdownFixed = true;
      fixesCount++;
    } else if (/^(\s*[-*+]\s*)\[[xX]\](\S)/.test(line)) {
      line = line.replace(/^(\s*[-*+]\s*)\[[xX]\](\S)/, '$1[x] $2');
      markdownFixed = true;
      fixesCount++;
    }

    // F. Fix Blockquote without space (e.g. >Quote -> > Quote)
    if (/^(\s*>+)([^\s>].*)$/.test(line)) {
      line = line.replace(/^(\s*>+)([^\s>].*)$/, '$1 $2');
      markdownFixed = true;
      fixesCount++;
    }

    // G. Fix Link & Image spacing (e.g. [text] (https://...) -> [text](https://...))
    if (/(!?\[.*?\])\s+(\(https?:\/\/[^\s\)]+\))/.test(line)) {
      line = line.replace(/(!?\[.*?\])\s+(\(https?:\/\/[^\s\)]+\))/g, '$1$2');
      markdownFixed = true;
      fixesCount++;
    }

    // H. Fix Bold & Italic spacing glitches (e.g. ** bold ** -> **bold**, __ text __ -> __text__)
    if (/\*\*\s+([^\*]+?)\s+\*\*/.test(line)) {
      line = line.replace(/\*\*\s+([^\*]+?)\s+\*\*/g, '**$1**');
      markdownFixed = true;
      fixesCount++;
    }
    if (/__\s+([^_]+?)\s+__/.test(line)) {
      line = line.replace(/__\s+([^_]+?)\s+__/g, '__$1__');
      markdownFixed = true;
      fixesCount++;
    }

    // Auto-close unbalanced bold (**) on self-contained lines (e.g., list items or bullet lines)
    const lineStars = line.match(/\*\*/g) || [];
    if (lineStars.length % 2 !== 0 && !line.endsWith('\\')) {
      // If the line opens a bold tag without closing it, close it at the end of the line
      line = `${line}**`;
      markdownFixed = true;
      fixesCount++;
    }

    // Auto-close unbalanced strikethrough (~~)
    const lineTildes = line.match(/~~/g) || [];
    if (lineTildes.length % 2 !== 0) {
      line = `${line}~~`;
      markdownFixed = true;
      fixesCount++;
    }

    // I. Normalize redundant internal spaces (preserve leading indentation and table row spacing)
    if (!line.includes('|')) {
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';
      const rest = line.slice(indent.length);
      const cleanedRest = rest.replace(/[ \t]{2,}/g, ' ');
      line = indent + cleanedRest;
    }

    if (line !== originalLine && !markdownFixed && !quotesStandardized) {
      spacesCleaned = true;
    }

    processedLines.push(line);
  }

  // 6. Fix Markdown Table Structure (ensure rows with | have bounding pipes if they are in a table block)
  for (let i = 0; i < processedLines.length; i++) {
    const curr = processedLines[i].trim();
    // Check if line is a table separator like |---|---| or contains multiple pipes
    if (curr.includes('|') && !curr.startsWith('```')) {
      // If line doesn't start with |, add it
      let fixedLine = processedLines[i].trim();
      let tableModified = false;

      if (!fixedLine.startsWith('|')) {
        fixedLine = '| ' + fixedLine;
        tableModified = true;
      }
      if (!fixedLine.endsWith('|')) {
        fixedLine = fixedLine + ' |';
        tableModified = true;
      }

      if (tableModified) {
        processedLines[i] = fixedLine;
        markdownFixed = true;
        fixesCount++;
      }
    }
  }

  // 7. Collapse excessive consecutive blank lines (more than 2 down to 2)
  let joined = processedLines.join('\n');
  const beforeBlankCollapse = joined;
  joined = joined.replace(/\n{3,}/g, '\n\n');
  if (joined !== beforeBlankCollapse) {
    spacesCleaned = true;
    fixesCount++;
  }

  // 8. Global Check: If odd number of ** remains across entire text, append closing **
  const remainingDoubleStars = joined.match(/\*\*/g) || [];
  if (remainingDoubleStars.length % 2 !== 0) {
    joined = `${joined}**`;
    markdownFixed = true;
    fixesCount++;
  }

  // If unclosed code fence remains, close it
  if (inCodeBlock) {
    joined = `${joined}\n\`\`\``;
    markdownFixed = true;
    fixesCount++;
  }

  const finalCleaned = joined.trim();
  const hasChanges = finalCleaned !== raw.trim();

  return {
    cleaned: finalCleaned,
    hasChanges,
    fixesCount: hasChanges && fixesCount === 0 ? 1 : fixesCount,
    details: {
      spacesCleaned,
      quotesStandardized,
      markdownFixed,
      entitiesCleaned,
    },
  };
}

export function preprocessMarkdownWithTsv(raw: string): string {
  if (!raw) return '';
  const sanitized = sanitizeInputText(raw);
  if (!sanitized.includes('\t')) return sanitized;

  const lines = sanitized.split(/\r?\n/);
  const result: string[] = [];
  let tsvBuffer: string[] = [];

  const flushTsv = () => {
    if (tsvBuffer.length > 0) {
      const converted = tsvToMarkdownTable(tsvBuffer.join('\n'));
      result.push(converted);
      tsvBuffer = [];
    }
  };

  for (const line of lines) {
    if (line.includes('\t')) {
      tsvBuffer.push(line);
    } else {
      flushTsv();
      result.push(line);
    }
  }
  flushTsv();

  return result.join('\n');
}

export function parsePasteToGrid(text: string, html?: string): string[][] | null {
  // First check HTML table if available
  if (html && html.includes('<table')) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const table = doc.querySelector('table');
      if (table) {
        const rows: string[][] = [];
        table.querySelectorAll('tr').forEach((tr) => {
          const cells: string[] = [];
          tr.querySelectorAll('th, td').forEach((cell) => {
            const cellHtml = cell.innerHTML
              .replace(/<br\s*\/?>/gi, '<br>')
              .replace(/\r?\n/g, ' ')
              .trim();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cellHtml;
            cells.push(tempDiv.innerHTML.trim());
          });
          if (cells.length > 0) {
            rows.push(cells);
          }
        });
        if (rows.length > 0) {
          const maxCols = Math.max(...rows.map((r) => r.length));
          if (rows.length > 1 || maxCols > 1) {
            return rows.map((r) => {
              const copy = [...r];
              while (copy.length < maxCols) copy.push('');
              return copy;
            });
          }
        }
      }
    } catch (e) {
      console.warn('HTML table parsing failed:', e);
    }
  }

  // Check text with tabs or multiple lines
  if (text) {
    const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    // Trim trailing empty line if any
    if (rawLines.length > 1 && rawLines[rawLines.length - 1].trim() === '') {
      rawLines.pop();
    }

    const hasTabs = rawLines.some((line) => line.includes('\t'));

    if (hasTabs) {
      // It's a tab-separated grid (e.g. copied left and right cells or multi-column table)
      const rows = rawLines.map((line) => line.split('\t').map((c) => c.trim()));
      const maxCols = Math.max(...rows.map((r) => r.length));
      return rows.map((r) => {
        const copy = [...r];
        while (copy.length < maxCols) copy.push('');
        return copy;
      });
    } else if (rawLines.length > 1) {
      // Multiple lines without tabs -> can be treated as vertical cells (up and down) if pasted as grid
      // If user pasted multiple lines, we can check if it looks like distinct items or just multi-line text
      // We will provide a helper function or trigger
    }
  }

  return null;
}

export function buildGridHtml(
  grid: string[][],
  options: StyleOptions,
  isForWordCopy: boolean = false,
): string {
  const numRows = grid.length;
  const numCols = Math.max(...grid.map((r) => r.length), 1);

  if (numRows === 1 && numCols === 1) {
    return buildInlineStyledHtml(grid[0][0] || '', options, isForWordCopy);
  }

  const isDarkTheme = options.theme === 'dark';
  const tableBorder = isDarkTheme && !isForWordCopy ? '#374151' : '#cbd5e1';
  const fontFam = options.fontFamily;
  const baseSize = options.fontSize;

  let tableHtml = `<table style="border-collapse: collapse; width: 100%; font-family: ${fontFam}; font-size: ${baseSize}pt; border: 1px solid ${tableBorder}; margin: 8pt 0;">\n<tbody>\n`;

  for (let r = 0; r < numRows; r++) {
    tableHtml += `  <tr>\n`;
    for (let c = 0; c < numCols; c++) {
      const cellContent = grid[r] && grid[r][c] ? grid[r][c] : '';
      const renderedCell = buildInlineStyledHtml(cellContent, options, isForWordCopy);
      tableHtml += `    <td style="border: 1px solid ${tableBorder}; padding: 10pt 12pt; vertical-align: top; width: ${Math.round(100 / numCols)}%;">\n${renderedCell}\n    </td>\n`;
    }
    tableHtml += `  </tr>\n`;
  }

  tableHtml += `</tbody>\n</table>`;
  return tableHtml;
}

export function buildInlineStyledHtml(
  rawMarkdown: string,
  options: StyleOptions,
  isForWordCopy: boolean = false,
): string {
  marked.setOptions({
    gfm: true,
    breaks: true,
  });

  const processedMarkdown = preprocessMarkdownWithTsv(rawMarkdown);
  const rawHtml = marked.parse(processedMarkdown) as string;
  if (!rawHtml) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
  const container = doc.body.firstElementChild as HTMLElement;
  if (!container) return '';

  const isDarkTheme = options.theme === 'dark';

  // Theme color definitions
  const textColor = isDarkTheme && !isForWordCopy ? '#f3f4f6' : '#1e293b';
  const headingColor = isDarkTheme && !isForWordCopy ? '#ffffff' : '#0f172a';
  const tableBorder = isDarkTheme && !isForWordCopy ? '#374151' : '#cbd5e1';
  const codeBg = isDarkTheme && !isForWordCopy ? '#262f3d' : '#f1f5f9';
  const codeColor = isDarkTheme && !isForWordCopy ? '#e2e8f0' : '#0f172a';
  const strongColor = isDarkTheme && !isForWordCopy ? '#ffffff' : '#0f172a';

  const fontFam = options.fontFamily;
  const baseSize = options.fontSize;
  const lineH = options.lineHeight;

  // Style container
  container.style.cssText = `font-family: ${fontFam}; font-size: ${baseSize}pt; line-height: ${lineH}; color: ${textColor}; word-break: break-word;`;

  // Style Headings
  container.querySelectorAll('h1').forEach((el) => {
    (el as HTMLElement).style.cssText =
      `font-family: ${fontFam}; font-size: ${baseSize + 8}pt; font-weight: 700; color: ${headingColor}; margin: 0; line-height: 1.25;`;
  });
  container.querySelectorAll('h2').forEach((el) => {
    (el as HTMLElement).style.cssText =
      `font-family: ${fontFam}; font-size: ${baseSize + 5}pt; font-weight: 700; color: ${headingColor}; margin: 0; line-height: 1.3;`;
  });
  container.querySelectorAll('h3').forEach((el) => {
    (el as HTMLElement).style.cssText =
      `font-family: ${fontFam}; font-size: ${baseSize + 2.5}pt; font-weight: 700; color: ${headingColor}; margin: 0; line-height: 1.3;`;
  });
  container.querySelectorAll('h4, h5, h6').forEach((el) => {
    (el as HTMLElement).style.cssText =
      `font-family: ${fontFam}; font-size: ${baseSize + 1}pt; font-weight: 600; color: ${headingColor}; margin: 0; line-height: 1.3;`;
  });

  // Style Paragraphs
  container.querySelectorAll('p').forEach((el) => {
    (el as HTMLElement).style.cssText =
      `font-family: ${fontFam}; font-size: ${baseSize}pt; line-height: ${lineH}; color: ${textColor}; margin: 0;`;
  });

  // Style Strong / Bold
  container.querySelectorAll('strong, b').forEach((el) => {
    (el as HTMLElement).style.cssText = `font-weight: 700; color: ${strongColor};`;
  });

  // Style Lists & Nested Lists with clear distinct bullets
  // Level 1: Disc (•)
  // Level 2: Circle (◦)
  // Level 3: Square (▪)
  const processList = (listEl: HTMLElement, level: number) => {
    const isOrdered = listEl.tagName.toLowerCase() === 'ol';

    let listStyle = 'disc';
    if (isOrdered) {
      listStyle = level === 1 ? 'decimal' : level === 2 ? 'lower-alpha' : 'lower-roman';
    } else {
      listStyle =
        level === 1
          ? options.bulletLevel1
          : level === 2
            ? options.bulletLevel2
            : options.bulletLevel3;
    }

    const paddingLeft = level === 1 ? '20pt' : '18pt';

    listEl.style.cssText = `margin: 0; padding-left: ${paddingLeft}; list-style-type: ${listStyle}; color: ${textColor};`;

    const children = Array.from(listEl.children);
    children.forEach((child) => {
      if (child.tagName.toLowerCase() === 'li') {
        const li = child as HTMLElement;
        li.style.cssText = `margin: 0; line-height: ${lineH}; font-size: ${baseSize}pt; color: ${textColor}; font-family: ${fontFam};`;

        // Check for nested lists
        li.querySelectorAll(':scope > ul, :scope > ol').forEach((nested) => {
          processList(nested as HTMLElement, level + 1);
        });
      }
    });
  };

  container.querySelectorAll(':scope > ul, :scope > ol').forEach((rootList) => {
    processList(rootList as HTMLElement, 1);
  });

  // Style Tables (Clean, uncolored table format - explicit #ffffff overrides default spreadsheet grey)
  const copyBg = isForWordCopy ? '#ffffff' : 'transparent';
  container.querySelectorAll('table').forEach((tbl) => {
    tbl.style.cssText = `border-collapse: collapse; width: 100%; margin: 0; font-family: ${fontFam}; font-size: ${baseSize - 0.5}pt; border: 1px solid ${tableBorder}; background-color: ${copyBg};`;

    const ths = tbl.querySelectorAll('th');
    ths.forEach((th) => {
      th.style.cssText = `border: 1px solid ${tableBorder}; color: ${headingColor}; padding: 6pt 10pt; font-weight: 700; text-align: left; vertical-align: middle; background-color: ${copyBg};`;
    });

    const rows = tbl.querySelectorAll('tr');
    rows.forEach((row) => {
      (row as HTMLElement).style.cssText = `background-color: ${copyBg};`;
      row.querySelectorAll('td').forEach((td) => {
        td.style.cssText = `border: 1px solid ${tableBorder}; color: ${textColor}; padding: 6pt 10pt; vertical-align: top; background-color: ${copyBg};`;
      });
    });
  });

  // Style Blockquotes
  container.querySelectorAll('blockquote').forEach((bq) => {
    const borderColor = isDarkTheme && !isForWordCopy ? '#4b5563' : '#94a3b8';
    const bqBg = isDarkTheme && !isForWordCopy ? '#1e2633' : '#f8fafc';
    bq.style.cssText = `margin: 0; padding: 6pt 12pt; border-left: 3.5pt solid ${borderColor}; background-color: ${bqBg}; color: ${textColor}; font-style: italic;`;
  });

  // Style Code blocks
  container.querySelectorAll('pre').forEach((pre) => {
    pre.style.cssText = `background-color: ${codeBg}; padding: 8pt 10pt; border-radius: 4pt; font-family: Consolas, 'Courier New', monospace; font-size: ${baseSize - 1}pt; color: ${codeColor}; overflow-x: auto; margin: 0;`;
  });

  container.querySelectorAll(':not(pre) > code').forEach((code) => {
    (code as HTMLElement).style.cssText =
      `background-color: ${codeBg}; padding: 1.5pt 4pt; border-radius: 3pt; font-family: Consolas, 'Courier New', monospace; font-size: ${baseSize - 1}pt; color: ${codeColor};`;
  });

  // Style HR
  container.querySelectorAll('hr').forEach((hr) => {
    hr.style.cssText = `border: none; border-top: 1px solid ${tableBorder}; margin: 0;`;
  });

  // Insert explicit <br> tags between adjacent block elements to ensure universal spacing
  // across Browsers, Microsoft Word, and Google Sheets, eliminating margin collapse issues.
  const blockTags = [
    'P',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'UL',
    'OL',
    'BLOCKQUOTE',
    'PRE',
    'TABLE',
    'HR',
  ];
  container.querySelectorAll(blockTags.join(', ')).forEach((block) => {
    const next = block.nextElementSibling;
    if (next && blockTags.includes(next.tagName)) {
      const br = doc.createElement('br');
      block.after(br);
    }
  });

  return container.innerHTML;
}

export interface SanitizeOptions {
  stripBackgrounds?: boolean;
  stripMetaTags?: boolean;
  stripComments?: boolean;
  ensureLegibleTextColor?: boolean;
  stripDataAttributes?: boolean;
  cleanWordXml?: boolean;
}

/**
 * Sanitize Output: Automatically strips unwanted background colors, dark mode tints,
 * meta tags, office XML artifacts, and data attributes to ensure maximum compatibility
 * across Google Sheets, Excel, Microsoft Word, Outlook, and Google Docs.
 */
export function sanitizeOutputHtml(rawHtml: string, options: SanitizeOptions = {}): string {
  const {
    stripBackgrounds = true,
    stripMetaTags = true,
    stripComments = true,
    ensureLegibleTextColor = true,
    stripDataAttributes = true,
    cleanWordXml = true,
  } = options;

  if (!rawHtml) return '';

  let html = rawHtml;

  // 1. Strip conditional and generic HTML comments
  if (stripComments) {
    html = html.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '');
    html = html.replace(/<!--(?!StartFragment|EndFragment)[\s\S]*?-->/gi, '');
  }

  // 2. Strip XML namespaces, office document tags, and meta tags
  if (cleanWordXml) {
    html = html.replace(/<\/?(?:o|w|m|v|x|p):[^>]*>/gi, '');
    html = html.replace(/<xml[\s\S]*?<\/xml>/gi, '');
  }

  if (stripMetaTags) {
    html = html.replace(/<meta[^>]*>/gi, '');
    html = html.replace(/<link[^>]*>/gi, '');
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  }

  // Use DOM parser to reliably sanitize element attributes and inline styles
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstElementChild as HTMLElement;
    if (!root) return html;

    // Remove any remaining meta, link, script tags in DOM
    if (stripMetaTags) {
      root
        .querySelectorAll('meta, link, script, noscript, style, title')
        .forEach((el) => el.remove());
    }

    const allElements = root.querySelectorAll('*');
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;

      // 3. Strip unwanted data attributes and class names for clean spreadsheet paste
      if (stripDataAttributes) {
        Array.from(htmlEl.attributes).forEach((attr) => {
          if (
            attr.name.startsWith('data-') ||
            attr.name.startsWith('aria-') ||
            attr.name === 'id' ||
            attr.name === 'class' ||
            attr.name === 'contenteditable' ||
            attr.name === 'tabindex' ||
            attr.name === 'spellcheck'
          ) {
            htmlEl.removeAttribute(attr.name);
          }
        });
      }

      // 4. Strip unwanted bgcolor and background attributes
      if (stripBackgrounds) {
        htmlEl.removeAttribute('bgcolor');
        htmlEl.removeAttribute('background');
      }

      // 5. Clean and normalize inline styles
      if (htmlEl.getAttribute('style')) {
        let style = htmlEl.getAttribute('style') || '';

        if (stripBackgrounds) {
          const isCode = htmlEl.tagName === 'CODE' || htmlEl.tagName === 'PRE';
          const isBlockquote = htmlEl.tagName === 'BLOCKQUOTE';

          if (isCode) {
            // Keep code background clean light grey
            style = style.replace(/background(-color)?\s*:\s*[^;]+;?/gi, '');
            style = `${style}; background-color: #f1f5f9;`;
          } else if (isBlockquote) {
            style = style.replace(/background(-color)?\s*:\s*[^;]+;?/gi, '');
            style = `${style}; background-color: #f8fafc;`;
          } else {
            // Remove all dark/unwanted backgrounds
            style = style.replace(/background(-[a-z]+)?\s*:\s*[^;]+;?/gi, '');

            // For tables, rows, and cells, explicitly set transparent or clean background
            if (['TABLE', 'TR', 'TH', 'TD', 'TBODY', 'THEAD', 'TFOOT'].includes(htmlEl.tagName)) {
              style = `${style}; background-color: transparent;`;
            }
          }
        }

        if (ensureLegibleTextColor) {
          // If color is white or near-white (from dark theme), replace with dark slate for high contrast
          if (
            /color\s*:\s*(?:#fff(?:fff)?|white|rgba?\(\s*255\s*,\s*255\s*,\s*255|#f\d[a-f\d]+)/i.test(
              style,
            )
          ) {
            style = style.replace(/color\s*:\s*[^;]+;?/gi, '');
            style = `${style}; color: #0f172a;`;
          }
        }

        // Clean up redundant semicolons and whitespace
        style = style
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean)
          .join('; ');

        if (style) {
          htmlEl.setAttribute('style', `${style};`);
        } else {
          htmlEl.removeAttribute('style');
        }
      }
    });

    return root.innerHTML;
  } catch (err) {
    console.warn('DOM sanitizeOutputHtml failed, using regex fallback:', err);
    return html
      .replace(/<meta[^>]*>/gi, '')
      .replace(/bgcolor="[^"]*"/gi, '')
      .replace(/background(-color)?:\s*[^;"]+;?/gi, '');
  }
}

export async function copyFormattedTextToClipboard(
  htmlContent: string,
  plainText: string,
  options: { sanitize?: boolean } = { sanitize: true },
): Promise<boolean> {
  try {
    // Automatically sanitize HTML output to strip unwanted backgrounds and meta tags
    const cleanHtml = options.sanitize !== false ? sanitizeOutputHtml(htmlContent) : htmlContent;

    // Full standalone HTML document wrapper tailored for Microsoft Word, Excel, Google Sheets, and Outlook parsing
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  /* Standard MSO and Spreadsheet fallback rules */
  body { font-family: 'Segoe UI', 'Aptos', Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; background-color: transparent; }
  ul { margin: 4pt 0; padding-left: 20pt; }
  li { margin-top: 2pt; margin-bottom: 2pt; }
  table { border-collapse: collapse; width: 100%; background-color: transparent; }
  th, td { border: 1px solid #cbd5e1; padding: 6pt 8pt; background-color: transparent; }
</style>
</head>
<body>
<!--StartFragment-->
${cleanHtml}
<!--EndFragment-->
</body>
</html>`;

    if (navigator.clipboard && window.ClipboardItem) {
      const htmlBlob = new Blob([fullHtml], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      const clipboardItem = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      });
      await navigator.clipboard.write([clipboardItem]);
      return true;
    }
  } catch (err) {
    console.warn('Navigator clipboard write failed, trying fallback execCommand copy:', err);
  }

  // Fallback for older environments or strict iframe permissions
  try {
    const cleanHtml = options.sanitize !== false ? sanitizeOutputHtml(htmlContent) : htmlContent;
    const container = document.createElement('div');
    container.setAttribute('contenteditable', 'true');
    container.innerHTML = cleanHtml;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.opacity = '0';
    document.body.appendChild(container);

    const range = document.createRange();
    range.selectNodeContents(container);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      const successful = document.execCommand('copy');
      selection.removeAllRanges();
      document.body.removeChild(container);
      return successful;
    }
  } catch (fallbackErr) {
    console.error('Fallback execCommand copy also failed:', fallbackErr);
  }

  return false;
}
