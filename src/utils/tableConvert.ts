import { sanitizeInputText } from './cleanup';
import { logger } from './logger';
import { sanitizeHtml } from './security/sanitize';
import { isWrappedParagraph } from './textWrap';

export function isMarkdownTable(text: string): boolean {
  if (!text || !text.includes('|')) return false;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) return false;
  // Look for a table separator line e.g. | --- | --- | or |:---|:---| or :--- | ---:
  const hasSeparator = lines.some((line) => /^\|?(\s*:?-{3,}:?\s*\|?)+\s*\|?$/.test(line));
  const hasPipeRows = lines.filter((line) => line.includes('|')).length >= 2;
  return hasSeparator && hasPipeRows;
}

export function tsvToMarkdownTable(tsv: string): string {
  if (!tsv) return '';
  const lines = tsv.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) return tsv;

  // Check if at least one line contains a tab
  const hasTabs = lines.some((line) => line.includes('\t'));
  if (!hasTabs) return tsv;

  const rows = lines.map((line) =>
    line.split('\t').map((cell) => cell.trim().replace(/\|/g, '\\|')),
  );
  const maxCols = Math.max(1, ...rows.map((r) => r.length));
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
  if (!html || (!html.includes('<table') && !html.includes('<tr') && !html.includes('<td') && !html.includes('<th'))) return null;
  try {
    const dirtyHtml = html.includes('<table') ? html : `<table><tbody>${html}</tbody></table>`;
    const sanitizedHtml = sanitizeHtml(dirtyHtml);
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizedHtml, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return null;

    const rows: string[][] = [];
    table.querySelectorAll('tr').forEach((tr) => {
      const cells: string[] = [];
      tr.querySelectorAll('th, td').forEach((cell) => {
        let inner = cell.innerHTML;
        inner = inner.replace(/<\/p>\s*<p[^>]*>/gi, '<br>');
        inner = inner.replace(/<\/?p[^>]*>/gi, '');
        inner = inner.replace(/<br\s*\/?>/gi, '<br>');
        inner = inner.replace(/\r?\n/g, ' ').trim();
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sanitizeHtml(inner);
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
    logger.warn('Could not parse HTML table:', err);
    return null;
  }
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

function hasBrTags(text: string): boolean {
  if (!text) return false;
  return /<br\s*\/?>/i.test(text);
}

export function parsePasteToGrid(text: string, html?: string): string[][] | null {
  // First check HTML table or row fragments if available
  if (html && (html.includes('<table') || html.includes('<tr') || html.includes('<td') || html.includes('<th'))) {
    try {
      const dirtyHtml = html.includes('<table') ? html : `<table><tbody>${html}</tbody></table>`;
      const sanitizedHtml = sanitizeHtml(dirtyHtml);
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitizedHtml, 'text/html');
      const table = doc.querySelector('table');
      if (table) {
        const rows: string[][] = [];
        table.querySelectorAll('tr').forEach((tr) => {
          const cells: string[] = [];
          tr.querySelectorAll('th, td').forEach((cell) => {
            let cellHtml = cell.innerHTML;
            cellHtml = cellHtml.replace(/<\/p>\s*<p[^>]*>/gi, '<br>');
            cellHtml = cellHtml.replace(/<\/?p[^>]*>/gi, '');
            cellHtml = cellHtml.replace(/<br\s*\/?>/gi, '<br>');
            cellHtml = cellHtml.replace(/\r?\n/g, ' ').trim();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = sanitizeHtml(cellHtml);
            let cleanedCell = tempDiv.innerHTML.trim();
            cleanedCell = cleanedCell.replace(/(?:<br>\s*)+/gi, '<br>');
            cells.push(cleanedCell);
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
      logger.warn('HTML table parsing failed:', e);
    }
  }

  // Check text with tabs or multiple lines
  if (text) {
    const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    // Trim trailing empty lines if any
    while (rawLines.length > 1 && rawLines[rawLines.length - 1].trim() === '') {
      rawLines.pop();
    }

    const hasTabs = rawLines.some((line) => line.includes('\t'));

    if (hasTabs) {
      // It's a tab-separated grid (e.g. copied left and right cells or multi-column table)
      const rows = rawLines.map((line) => line.split('\t').map((c) => c.trim()));
      const maxCols = Math.max(1, ...rows.map((r) => r.length));
      return rows.map((r) => {
        const copy = [...r];
        while (copy.length < maxCols) copy.push('');
        return copy;
      });
    } else if (rawLines.length > 1) {
      // If text contains document-level markdown constructs, keep it intact in a single cell
      if (isLikelyMarkdownDocument(text, rawLines)) {
        return null;
      }

      // If text is a hard-wrapped continuous paragraph (e.g. from PDF copy), keep in single cell
      if (isWrappedParagraph(rawLines)) {
        return null;
      }

      // If text contains intra-cell <br> tags without document markers, each line represents a row
      if (hasBrTags(text)) {
        return rawLines.filter((l) => l.trim().length > 0).map((l) => [l.trim()]);
      }

      // If pure double-spaced empty lines from HTML copy e.g. "Row 1\n\nRow 2\n\nRow 3" without document markers
      const nonEmptyLines = rawLines.filter((l) => l.trim().length > 0);
      if (
        nonEmptyLines.length > 1 &&
        nonEmptyLines.length <= 50 &&
        !isWrappedParagraph(nonEmptyLines)
      ) {
        return nonEmptyLines.map((l) => [l.trim()]);
      }

      // Multiple lines without tabs -> treat each line as a single-col row
      return rawLines.map((l) => [l.trim()]);
    }
  }

  return null;
}

function isLikelyMarkdownDocument(text: string, rawLines: string[]): boolean {
  // 1. Headings (#, ##, ###, etc.)
  if (rawLines.some((l) => /^\s*#{1,6}\s/.test(l))) return true;

  // 2. Horizontal rules (---, ***, ___)
  if (rawLines.some((l) => /^\s*(\*\*\*|___|---)\s*$/.test(l))) return true;

  // 3. Blockquotes (> ...)
  if (rawLines.some((l) => /^\s*>/.test(l))) return true;

  // 4. Code fences (```)
  if (rawLines.some((l) => /^\s*```/.test(l))) return true;

  // 5. Pipe table alongside other prose or headers
  const hasPipeTable = rawLines.some((l) => /^\s*\|.*\|\s*$/.test(l));
  const hasNonPipeText = rawLines.some(
    (l) => !/^\s*\|.*\|\s*$/.test(l) && l.trim().length > 0 && !/^\s*[-:]+[-| :]*$/.test(l),
  );
  // A standalone Markdown table is a document, not a tabular grid paste. Keep
  // the complete source in the current editor cell so Markdown formatting and
  // all table columns remain intact.
  if (hasPipeTable && !hasNonPipeText && isMarkdownTable(text)) return true;
  if (hasPipeTable && hasNonPipeText) return true;

  // 6. Markdown bullet lists (* item, - item, + item)
  const bulletCount = rawLines.filter((l) => /^\s*[*+-]\s+/.test(l)).length;
  if (bulletCount >= 2) return true;

  // 7. Bold headers / sections like **1. Stefan Müller...**, **Verification:**,
  //    or ordered sections like 1. **Stefan Müller...**
  const boldSectionCount = rawLines.filter((l) => /^\s*(?:\d+[.)]\s+)?\*\*[^*]+\*\*/.test(l)).length;
  if (boldSectionCount >= 2) return true;

  // 8. Multiple paragraphs separated by blank lines
  if (text.includes('\n\n')) {
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    if (paragraphs.length >= 2 && paragraphs.some((p) => p.includes('\n') || p.trim().length > 80)) {
      return true;
    }
  }

  return false;
}
