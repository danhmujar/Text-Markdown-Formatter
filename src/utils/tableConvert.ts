import { sanitizeInputText } from './cleanup';
import { logger } from './logger';
import { sanitizeHtml } from './security/sanitize';
import { isWrappedParagraph } from './textWrap';

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
  if (!html || !html.includes('<table')) return null;
  try {
    const sanitizedHtml = sanitizeHtml(html);
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizedHtml, 'text/html');
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
        tempDiv.innerHTML = sanitizeHtml(text);
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

export function parsePasteToGrid(text: string, html?: string): string[][] | null {
  // First check HTML table if available
  if (html && html.includes('<table')) {
    try {
      const sanitizedHtml = sanitizeHtml(html);
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitizedHtml, 'text/html');
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
            tempDiv.innerHTML = sanitizeHtml(cellHtml);
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
      logger.warn('HTML table parsing failed:', e);
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
      const maxCols = Math.max(1, ...rows.map((r) => r.length));
      return rows.map((r) => {
        const copy = [...r];
        while (copy.length < maxCols) copy.push('');
        return copy;
      });
    } else if (rawLines.length > 1) {
      if (isLikelyMarkdownDocument(text, rawLines)) {
        return null;
      }
      if (isWrappedParagraph(rawLines)) {
        return null;
      }
      // Multiple lines without tabs -> treat each line as a single-col row
      return rawLines.map((l) => [l]);
    }
  }

  return null;
}

function isLikelyMarkdownDocument(text: string, rawLines: string[]): boolean {
  if (text.includes('\n\n')) return true;

  if (rawLines.some((l) => /^\s*#{1,6}\s/.test(l))) return true;

  if (rawLines.some((l) => /^\s*(\*\*\*|___|---)\s*$/.test(l))) return true;

  if (rawLines.some((l) => /^\s*>/.test(l))) return true;

  if (rawLines.some((l) => /^\s*```/.test(l))) return true;

  const listLikeCount = rawLines.filter((l) =>
    /^\s*([*+-]\s+|\d+[\.\)]\s+|\(\d+\)\s+|\([a-zA-Z]\)\s+|\([ivxlcdm]+\)\s+)/i.test(l),
  ).length;
  if (listLikeCount >= 2) return true;

  const boldLines = rawLines.filter((l) => {
    const stars = (l.match(/\*\*/g) || []).length;
    const underscores = (l.match(/__/g) || []).length;
    return stars >= 2 || underscores >= 2;
  }).length;
  if (boldLines >= 2) return true;

  if (rawLines.some((l) => l.trim().length > 120)) return true;

  if (rawLines.length > 5) {
    const avgLen = rawLines.reduce((sum, l) => sum + l.trim().length, 0) / rawLines.length;
    if (avgLen > 60 && rawLines.some((l) => l.trim().length > 80)) return true;
  }

  return false;
}
