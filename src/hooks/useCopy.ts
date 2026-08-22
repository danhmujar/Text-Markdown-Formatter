import { useState } from 'react';
import { StyleOptions } from '../types';
import {
  buildGridHtml,
  buildInlineStyledHtml,
  copyFormattedTextToClipboard,
  prepareCopiedText,
} from '../utils/markdownFormatter';

interface UseCopyArgs {
  grid: string[][];
  options: StyleOptions;
  getOutputContent: (rowIndex: number, colIndex: number) => string;
}

export function useCopy({ grid, options, getOutputContent }: UseCopyArgs) {
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Copy a single cell:
  // Provides rich formatted HTML for Word/Outlook and plain text with <br> reversion if input had <br>.
  const handleCopyCell = async (rowIndex: number, colIndex: number) => {
    const outputContent = getOutputContent(rowIndex, colIndex);
    const inputContent = grid[rowIndex]?.[colIndex] || '';
    const textToCopy = prepareCopiedText(outputContent, inputContent);
    const wordExportHtml = buildInlineStyledHtml(
      outputContent,
      { ...options, theme: 'light' },
      true,
    );

    const success = await copyFormattedTextToClipboard(wordExportHtml, textToCopy, {
      sanitize: options.sanitizeOutput !== false,
    });

    if (success) {
      setCopiedCell(`${rowIndex}-${colIndex}`);
      setTimeout(() => setCopiedCell(null), 2500);
    }
  };

  // Copy all containers:
  // Provides rich formatted HTML table/block for Word/Outlook and plain text with <br> reversion if input had <br>.
  const handleCopyAllGrid = async () => {
    const outputMatrix = grid.map((row, r) => row.map((_, c) => getOutputContent(r, c)));
    const preparedMatrix = grid.map((row, r) =>
      row.map((inputCell, c) => {
        const outputCell = getOutputContent(r, c);
        return prepareCopiedText(outputCell, inputCell);
      }),
    );

    const wordExportGridHtml = buildGridHtml(outputMatrix, { ...options, theme: 'light' }, true);

    let combinedText = '';
    if (preparedMatrix.length === 1 && preparedMatrix[0].length === 1) {
      combinedText = preparedMatrix[0][0];
    } else {
      combinedText = preparedMatrix.map((row) => row.join('\t')).join('\n\n');
    }

    const success = await copyFormattedTextToClipboard(wordExportGridHtml, combinedText, {
      sanitize: options.sanitizeOutput !== false,
    });

    if (success) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  return { copiedCell, copiedAll, handleCopyCell, handleCopyAllGrid };
}
