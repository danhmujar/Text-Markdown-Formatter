import { marked } from 'marked';
import { StyleOptions } from '../types';
import { THEME_COLORS } from '../constants/theme';
import { preprocessMarkdownWithTsv } from './tableConvert';
import { sanitizeHtml } from './security/sanitize';
import { logger } from './logger';

export function buildGridHtml(
  grid: string[][],
  options: StyleOptions = {} as StyleOptions,
  isForWordCopy: boolean = false,
): string {
  const numRows = grid.length;
  const numCols = Math.max(...grid.map((r) => r.length), 1);

  if (numRows === 1 && numCols === 1) {
    return buildInlineStyledHtml(grid[0][0] || '', options, isForWordCopy);
  }

  const isDarkTheme = options?.theme === 'dark';
  const tableBorder =
    isDarkTheme && !isForWordCopy ? THEME_COLORS.tableBorder.dark : THEME_COLORS.tableBorder.light;
  const fontFam = options?.fontFamily || 'Calibri, sans-serif';
  const baseSize = options?.fontSize || 11;

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

// LRU Cache for parsed styled HTML to avoid re-parsing identical blocks on keystrokes/toggles
const htmlCache = new Map<string, string>();
const MAX_CACHE_SIZE = 20;

export function buildInlineStyledHtml(
  rawMarkdown: string,
  options: StyleOptions = {} as StyleOptions,
  isForWordCopy: boolean = false,
): string {
  if (!rawMarkdown) return '';

  const cacheKey = `${rawMarkdown}|${options?.theme || 'light'}|${options?.fontFamily || ''}|${options?.fontSize || 11}|${options?.lineHeight || 1.15}|${options?.bulletLevel1 || 'disc'}|${options?.bulletLevel2 || 'circle'}|${options?.bulletLevel3 || 'square'}|${options?.tableBorderColor || ''}|${options?.tableHeaderBg || ''}|${options?.tableHeaderColor || ''}|${options?.primaryColor || ''}|${options?.tableAlternateBg !== false}|${options?.highlightBoldKeys !== false}|${isForWordCopy}`;
  if (htmlCache.has(cacheKey)) {
    const cached = htmlCache.get(cacheKey)!;
    htmlCache.delete(cacheKey);
    htmlCache.set(cacheKey, cached);
    return cached;
  }

  try {
    const processedMarkdown = preprocessMarkdownWithTsv(rawMarkdown);
    // Sanitize marked output before any DOM manipulation: single security point for both
    // the preview (dangerouslySetInnerHTML) and the Word/Sheets copy paths.
    const dirtyHtml = marked.parse(processedMarkdown, { gfm: true, breaks: true }) as string;
    const rawHtml = sanitizeHtml(dirtyHtml);
    if (!rawHtml) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
    const container = doc.body.firstElementChild as HTMLElement;
    if (!container) return '';

    const isDarkTheme = options?.theme === 'dark';

    // Theme color definitions
    const textColor =
      isDarkTheme && !isForWordCopy ? THEME_COLORS.text.dark : THEME_COLORS.text.light;
    const headingColor =
      isDarkTheme && !isForWordCopy ? THEME_COLORS.heading.dark : THEME_COLORS.heading.light;
    const tableBorder =
      isDarkTheme && !isForWordCopy
        ? THEME_COLORS.tableBorder.dark
        : THEME_COLORS.tableBorder.light;
    const codeBg =
      isDarkTheme && !isForWordCopy ? THEME_COLORS.codeBg.dark : THEME_COLORS.codeBg.light;
    const codeColor =
      isDarkTheme && !isForWordCopy ? THEME_COLORS.codeText.dark : THEME_COLORS.codeText.light;
    const strongColor =
      isDarkTheme && !isForWordCopy ? THEME_COLORS.strong.dark : THEME_COLORS.strong.light;

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

      const listItems = Array.from(listEl.children).filter(
        (child) => child.tagName.toLowerCase() === 'li',
      );
      listItems.forEach((child, index) => {
        const li = child as HTMLElement;
        const itemMargin = isOrdered && level === 1 ? '0 0 4pt 0' : '0';
        li.style.cssText = `margin: ${itemMargin}; line-height: ${lineH}; font-size: ${baseSize}pt; color: ${textColor}; font-family: ${fontFam};`;

        // Check for nested lists
        li.querySelectorAll(':scope > ul, :scope > ol').forEach((nested) => {
          processList(nested as HTMLElement, level + 1);
        });

        // Word/Outlook commonly ignores list-item margins. Keep the spacing
        // structural and copy-only, without changing the preview layout.
        if (isForWordCopy && isOrdered && level === 1 && index < listItems.length - 1) {
          li.append(doc.createElement('br'));
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

    // Style Links & enforce noopener noreferrer for security
    container.querySelectorAll('a').forEach((link) => {
      const a = link as HTMLAnchorElement;
      const href = a.getAttribute('href') || '';
      if (/^https?:\/\//i.test(href)) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
      const linkColor =
        options.primaryColor || (isDarkTheme && !isForWordCopy ? '#60a5fa' : '#2563eb');
      a.style.cssText = `color: ${linkColor}; text-decoration: underline;`;
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

    const outputHtml = container.innerHTML;
    if (htmlCache.size >= MAX_CACHE_SIZE) {
      const firstKey = htmlCache.keys().next().value;
      if (firstKey !== undefined) {
        htmlCache.delete(firstKey);
      }
    }
    htmlCache.set(cacheKey, outputHtml);

    return outputHtml;
  } catch (err) {
    logger.warn('Error formatting markdown into styled HTML:', err);
    try {
      const fallbackParsed = marked.parse(
        `*Error rendering formatted preview — showing fallback:*\n\n` + rawMarkdown.slice(0, 500),
      ) as string;
      return sanitizeHtml(fallbackParsed);
    } catch {
      return sanitizeHtml(`<p>${rawMarkdown.slice(0, 500)}</p>`);
    }
  }
}
