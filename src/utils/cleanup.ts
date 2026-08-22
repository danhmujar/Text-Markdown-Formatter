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
