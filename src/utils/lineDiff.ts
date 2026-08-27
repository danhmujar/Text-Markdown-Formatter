export type DiffLineKind = 'same' | 'added' | 'removed';
export interface DiffLine {
  kind: DiffLineKind;
  text: string;
}
export interface LineDiff {
  identical: boolean;
  inputEmpty: boolean;
  outputEmpty: boolean;
  input: DiffLine[];
  output: DiffLine[];
}

export function diffLines(input: string, output: string): LineDiff {
  const left = input ? input.split(/\r?\n/) : [];
  const right = output ? output.split(/\r?\n/) : [];
  const inputLines: DiffLine[] = [];
  const outputLines: DiffLine[] = [];
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (a !== undefined && b !== undefined && a === b) {
      inputLines.push({ kind: 'same', text: a });
      outputLines.push({ kind: 'same', text: b });
    } else {
      if (a !== undefined) inputLines.push({ kind: 'removed', text: a });
      if (b !== undefined) outputLines.push({ kind: 'added', text: b });
    }
  }
  return {
    identical: input === output,
    inputEmpty: !input,
    outputEmpty: !output,
    input: inputLines,
    output: outputLines,
  };
}
