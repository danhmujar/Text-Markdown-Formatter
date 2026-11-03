/** Repairs word-by-word tabs from copied prose without treating ordinary TSV as prose. */
export function normalizeTabbedProse(text: string): string {
  if (!text.includes('\t')) return text;
  const blocks = text.replace(/\r\n?/g, '\n').split(/(\n[ \t]*\n)/);
  let fence: { marker: string; length: number } | null = null;
  let changed = false;
  const normalized = blocks
    .map((block) => {
      if (/^\n[ \t]*\n$/.test(block)) return block;
      // Clipboard selections commonly end with a newline. Exclude empty edge
      // lines from prose checks, but preserve them in the normalized result.
      const edges = block.match(/^((?:[ \t]*\n)*)([\s\S]*?)((?:\n[ \t]*)*)$/)!;
      const lines = edges[2].split('\n');
      let protectedBlock = fence !== null;
      for (const line of lines) {
        const marker = line.match(/^ {0,3}(`{3,}|~{3,})/);
        if (marker) {
          protectedBlock = true;
          if (!fence) fence = { marker: marker[1][0], length: marker[1].length };
          else if (
            marker[1][0] === fence.marker &&
            marker[1].length >= fence.length &&
            line.slice(marker[0].length).trim() === ''
          )
            fence = null;
        }
      }
      if (
        protectedBlock ||
        lines.some((line) => /^(?:\t| {4})/.test(line)) ||
        /[`|$]/.test(block) ||
        lines.some((line) =>
          /^\s*(?:#{1,6}\s|>\s?|[*+-]\s|\d+[.)]\s|\([\da-z]+\)\s|[a-z][.)]\s)/i.test(line),
        )
      )
        return block;

      const trimmed = lines.map((line) => line.trim());
      const segments = trimmed
        .flatMap((line) => line.split('\t').map((part) => part.trim()))
        .filter(Boolean);
      const internalTabs = trimmed.reduce(
        (count, line) => count + (line.match(/\t/g)?.length ?? 0),
        0,
      );
      if (
        internalTabs < 8 ||
        block.length < 80 ||
        !/[,.!?;:]/.test(block) ||
        segments.filter((segment) => !/\s/.test(segment)).length / segments.length < 0.8
      )
        return block;

      const cleanLines = trimmed.map((line) => line.replace(/[ \t]+/g, ' '));
      if (lines.length > 1) {
        const counts = trimmed.map((line) => line.split('\t').length);
        if (new Set(counts).size === 1 || !isWrappedParagraph(cleanLines)) return block;
      }
      changed = true;
      return edges[1] + cleanLines.join(' ') + edges[3];
    })
    .join('');
  return changed ? normalized : text;
}

export function isWrappedParagraph(rawLines: string[]): boolean {
  if (rawLines.length < 2 || rawLines.length > 20) return false;
  if (rawLines.some((l) => l.trim() === '')) return false;
  if (rawLines.some((l) => /^\s*(#{1,6}\s|>\s*|```|\|.*\|)/.test(l))) return false;
  if (
    rawLines.some((l) =>
      /^\s*([*+-]\s+|\d+[\.\)]\s+|\(\d+\)\s+|\([a-zA-Z]\)\s+|\([ivxlcdm]+\)\s+)/i.test(l),
    )
  )
    return false;
  const trimmed = rawLines.map((l) => l.trim()).filter((l) => l.length > 0);
  if (trimmed.length !== rawLines.length) return false;
  const avg = trimmed.reduce((a, b) => a + b.length, 0) / trimmed.length;
  if (avg < 40) return false;
  if (trimmed.slice(0, -1).some((l) => l.length < 30)) return false;
  const nonTerm = trimmed.slice(0, -1).filter((l) => !/[.!?:;]$/.test(l)).length;
  if (nonTerm / (trimmed.length - 1) < 0.5) return false;
  return true;
}
