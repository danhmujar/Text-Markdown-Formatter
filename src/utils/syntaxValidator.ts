import { SyntaxWarning } from '../types';

/**
 * Analyzes a markdown text string and returns real-time warnings
 * for common syntax errors, unclosed tags, unbalanced formatting, and malformed structures.
 */
export function analyzeSyntaxWarnings(text: string): SyntaxWarning[] {
  if (!text || !text.trim()) {
    return [];
  }

  const warnings: SyntaxWarning[] = [];
  const lines = text.split(/\r?\n/);

  // 1. Check for Unclosed Code Fences (```)
  const codeFenceMatches = text.match(/^```/gm) || [];
  if (codeFenceMatches.length % 2 !== 0) {
    warnings.push({
      id: 'unclosed-code-fence',
      severity: 'error',
      title: 'Unclosed Code Block',
      description:
        'Triple-backtick (```) code block is opened but not closed with a matching ``` fence.',
      fixSuggestion: 'Add closing ``` on a new line.',
    });
  }

  // 2. Check for Single Backtick Inline Code Mismatch
  // Only inspect lines outside triple-backtick blocks
  let insideFence = false;
  lines.forEach((line, lineIdx) => {
    if (line.trim().startsWith('```')) {
      insideFence = !insideFence;
      return;
    }
    if (insideFence) return;

    // Remove escaped backticks
    const cleanLine = line.replace(/\\`/g, '');
    const backticks = cleanLine.match(/`/g) || [];
    if (backticks.length % 2 !== 0) {
      warnings.push({
        id: `unbalanced-backtick-line-${lineIdx + 1}`,
        severity: 'warning',
        title: 'Unclosed Inline Code (`...)',
        description: `Line ${lineIdx + 1} has an odd number of backticks (${backticks.length}), which may leave inline code unclosed.`,
        line: lineIdx + 1,
        snippet: line.trim(),
      });
    }
  });

  // 3. Check for Unclosed HTML Tags
  const voidTags = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'col', 'base', 'wbr']);
  const tagStack: { tag: string; line: number }[] = [];
  const tagRegex = /<\/?([a-zA-Z0-9_-]+)(?:\s+[^>]*?)?(\/?)>/g;

  // Also check for unclosed angle bracket tags e.g. <span style="..." at end of line without >
  lines.forEach((line, lineIdx) => {
    if (line.trim().startsWith('```')) return;

    // Check unclosed angle bracket
    const openAngleWithoutClose = /<[a-zA-Z][^>\n]*$/;
    if (openAngleWithoutClose.test(line) && !line.includes('>')) {
      warnings.push({
        id: `unclosed-angle-bracket-${lineIdx + 1}`,
        severity: 'error',
        title: 'Incomplete HTML Tag',
        description: `Line ${lineIdx + 1} contains an unclosed HTML opening tag (<tag without closing >).`,
        line: lineIdx + 1,
        snippet: line.trim(),
      });
    }

    let match: RegExpExecArray | null;
    tagRegex.lastIndex = 0;
    while ((match = tagRegex.exec(line)) !== null) {
      const fullMatch = match[0];
      const tagName = match[1].toLowerCase();
      const isSelfClosing = match[2] === '/' || fullMatch.endsWith('/>') || voidTags.has(tagName);
      const isClosing = fullMatch.startsWith('</');

      if (isSelfClosing) continue;

      if (!isClosing) {
        tagStack.push({ tag: tagName, line: lineIdx + 1 });
      } else {
        // Find matching tag in stack from the top
        const lastIdx = tagStack.map((t) => t.tag).lastIndexOf(tagName);
        if (lastIdx === -1) {
          warnings.push({
            id: `orphan-closing-tag-${tagName}-${lineIdx + 1}`,
            severity: 'warning',
            title: `Unmatched </${tagName}> Tag`,
            description: `Closing tag </${tagName}> on line ${lineIdx + 1} has no matching <${tagName}> opening tag.`,
            line: lineIdx + 1,
            snippet: line.trim(),
          });
        } else {
          tagStack.splice(lastIdx, 1);
        }
      }
    }
  });

  if (tagStack.length > 0) {
    // Group remaining unclosed tags
    tagStack.forEach(({ tag, line }) => {
      warnings.push({
        id: `unclosed-tag-${tag}-${line}`,
        severity: 'error',
        title: `Unclosed <${tag}> Tag`,
        description: `<${tag}> opened on line ${line} was not closed with </${tag}>.`,
        line,
        fixSuggestion: `Add </${tag}> to close the tag.`,
      });
    });
  }

  // 4. Check for Unbalanced Markdown Formatting (Bold ** or __, Strikethrough ~~)
  let totalAsteriskDouble = 0;
  let totalTildeDouble = 0;

  lines.forEach((line, lineIdx) => {
    if (line.trim().startsWith('```')) return;

    // Count **
    const starsDouble = line.match(/\*\*/g) || [];
    totalAsteriskDouble += starsDouble.length;

    // Count ~~
    const tildesDouble = line.match(/~~/g) || [];
    totalTildeDouble += tildesDouble.length;

    // Check if line has unbalanced ** on its own (if line is self-contained paragraph)
    if (starsDouble.length % 2 !== 0 && !line.endsWith('\\')) {
      // Check if neighboring lines could be continuing, otherwise flag line
      const hasList = /^\s*([*+-]|\d+\.)\s+/.test(line);
      if (hasList) {
        warnings.push({
          id: `unbalanced-bold-line-${lineIdx + 1}`,
          severity: 'warning',
          title: 'Unbalanced Bold Syntax (**)',
          description: `Line ${lineIdx + 1} has an odd number of ** delimiters (${starsDouble.length}). Text may stay bold unintentionally.`,
          line: lineIdx + 1,
          snippet: line.trim(),
          fixSuggestion: 'Ensure ** surrounds the target text on both sides.',
        });
      }
    }
  });

  if (
    totalAsteriskDouble % 2 !== 0 &&
    !warnings.some((w) => w.id.startsWith('unbalanced-bold-line'))
  ) {
    warnings.push({
      id: 'unbalanced-global-bold',
      severity: 'warning',
      title: 'Unclosed Bold Formatting (**)',
      description: 'Odd number of ** bold markers found across the cell.',
      fixSuggestion: 'Check for missing closing **.',
    });
  }

  if (totalTildeDouble % 2 !== 0) {
    warnings.push({
      id: 'unbalanced-strikethrough',
      severity: 'warning',
      title: 'Unclosed Strikethrough (~~)',
      description: 'Odd number of ~~ strikethrough markers found in the cell.',
      fixSuggestion: 'Check for missing closing ~~.',
    });
  }

  // 4b. Check for Glued Markdown Formatting Markers (Missing Spacing)
  lines.forEach((line, lineIdx) => {
    if (line.trim().startsWith('```')) return;
    const hasGluedBold =
      /(?:[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\u0400-\u04FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]\*\*(?!\*)[^\s*]|[^\s*]\*\*[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\u0400-\u04FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]|\*\*:[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\u0400-\u04FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF])/u.test(
        line,
      );
    if (hasGluedBold) {
      const matchSnippet =
        line.match(/(?:\S{1,15}\*\*[^*]+\*\*\S{0,15}|\S{1,15}\*\*\S{1,15})/)?.[0] ||
        line.trim().slice(0, 30);
      warnings.push({
        id: `glued-bold-line-${lineIdx + 1}`,
        severity: 'warning',
        title: 'Missing Space Around Bold (**)',
        description: `Line ${lineIdx + 1} contains bold markers (**) directly glued to adjacent words without spaces. This causes words to run together in the output.`,
        line: lineIdx + 1,
        snippet: matchSnippet,
        fixSuggestion: 'Add spaces before/after bold markers or click Clean to auto-fix.',
      });
    }
  });

  // 5. Check for Broken Markdown Links & Images
  lines.forEach((line, lineIdx) => {
    // Unclosed link target: [text](without-closing-paren
    const unclosedParenLink = /\[([^\]]+)\]\(([^)\s]+)$/;
    if (unclosedParenLink.test(line.trim())) {
      warnings.push({
        id: `unclosed-link-paren-${lineIdx + 1}`,
        severity: 'warning',
        title: 'Unclosed Link Parenthesis',
        description: `Line ${lineIdx + 1} has a link destination missing its closing parenthesis ")".`,
        line: lineIdx + 1,
        snippet: line.trim(),
      });
    }

    // Unclosed bracket: [text without closing bracket
    const unclosedBracket = /\[([^\]\n]+)$/;
    if (unclosedBracket.test(line.trim()) && !line.includes(']')) {
      warnings.push({
        id: `unclosed-link-bracket-${lineIdx + 1}`,
        severity: 'warning',
        title: 'Unclosed Link Bracket [',
        description: `Line ${lineIdx + 1} has an unclosed "[" square bracket.`,
        line: lineIdx + 1,
        snippet: line.trim(),
      });
    }

    // Empty Link e.g. [text]() or []()
    if (/\[.*?\]\(\s*\)/.test(line)) {
      warnings.push({
        id: `empty-link-url-${lineIdx + 1}`,
        severity: 'info',
        title: 'Empty Link URL',
        description: `Line ${lineIdx + 1} contains a markdown link with an empty URL ().`,
        line: lineIdx + 1,
        snippet: line.trim(),
      });
    }
  });

  // 6. Check for Malformed Markdown Lists
  let prevIndent = -1;

  lines.forEach((line, lineIdx) => {
    const listMatch = line.match(/^(\s*)([*+-]|\d+\.)\s*(.*)$/);
    if (listMatch) {
      const indent = listMatch[1].length;
      const marker = listMatch[2];
      const content = listMatch[3];

      // Empty bullet with no content
      if (!content.trim()) {
        warnings.push({
          id: `empty-list-item-${lineIdx + 1}`,
          severity: 'warning',
          title: 'Empty List Item',
          description: `Line ${lineIdx + 1} has a list bullet "${marker}" with no accompanying text.`,
          line: lineIdx + 1,
          snippet: line.trim(),
          fixSuggestion: 'Add text or remove the empty list bullet.',
        });
      }

      // Odd indentation (e.g. 1 space or 3 spaces or jumping 5+ spaces)
      if (indent > 0 && indent % 2 !== 0 && indent !== 4) {
        warnings.push({
          id: `irregular-indent-${lineIdx + 1}`,
          severity: 'info',
          title: 'Irregular List Indentation',
          description: `Line ${lineIdx + 1} has ${indent} leading spaces. Markdown sub-lists typically use 2 or 4 spaces.`,
          line: lineIdx + 1,
          snippet: line.trim(),
          fixSuggestion: 'Use 2 or 4 spaces per nesting level.',
        });
      }

      // Deep jump in indentation
      if (prevIndent >= 0 && indent > prevIndent + 4) {
        warnings.push({
          id: `deep-indent-jump-${lineIdx + 1}`,
          severity: 'info',
          title: 'Large List Indentation Jump',
          description: `Line ${lineIdx + 1} jumps from ${prevIndent} to ${indent} spaces of indentation.`,
          line: lineIdx + 1,
          snippet: line.trim(),
        });
      }

      prevIndent = indent;
    } else if (line.trim().length > 0) {
      prevIndent = -1;
    }
  });

  // 7. Check for Malformed Markdown Tables
  const tableLines: { line: string; idx: number; colCount: number }[] = [];
  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      // Count columns
      const cells = trimmed.slice(1, -1).split('|');
      tableLines.push({ line: trimmed, idx: lineIdx + 1, colCount: cells.length });
    } else {
      if (tableLines.length > 0) {
        validateTableBlock(tableLines, warnings);
        tableLines.length = 0;
      }
    }
  });
  if (tableLines.length > 0) {
    validateTableBlock(tableLines, warnings);
  }

  return warnings;
}

function validateTableBlock(
  tableLines: { line: string; idx: number; colCount: number }[],
  warnings: SyntaxWarning[],
) {
  if (tableLines.length < 2) return;

  const headerCols = tableLines[0].colCount;
  const separatorLine = tableLines[1];
  const isSeparator = /^\|?(\s*:?-+:?\s*\|?)+$/.test(separatorLine.line);

  if (!isSeparator && tableLines.length >= 2) {
    warnings.push({
      id: `table-missing-separator-${tableLines[0].idx}`,
      severity: 'warning',
      title: 'Missing Table Separator Row',
      description: `Table on line ${tableLines[0].idx} is missing a separator row like "| :--- | :--- |" after the header.`,
      line: tableLines[0].idx,
      snippet: tableLines[0].line,
      fixSuggestion: `Add | ${new Array(headerCols).fill(':---').join(' | ')} | below the header.`,
    });
  }

  // Check column count consistency
  tableLines.forEach((row) => {
    if (row.colCount !== headerCols) {
      warnings.push({
        id: `table-col-mismatch-${row.idx}`,
        severity: 'warning',
        title: 'Table Column Count Mismatch',
        description: `Line ${row.idx} has ${row.colCount} columns, but the table header has ${headerCols} columns.`,
        line: row.idx,
        snippet: row.line,
      });
    }
  });
}
