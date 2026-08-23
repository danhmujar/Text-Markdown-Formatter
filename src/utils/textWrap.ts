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

export function unwrapWrappedParagraph(text: string): string {
  const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (!isWrappedParagraph(rawLines)) return text;
  return rawLines.map((l) => l.trim()).join(' ');
}
