export type DiffLineKind = 'same' | 'added' | 'removed';

export interface DiffSegment {
  text: string;
  changed: boolean;
}

export interface DiffLine {
  kind: DiffLineKind;
  text: string;
  lineNumber: number;
  segments: DiffSegment[];
}

export interface AlignedDiffRow {
  left: DiffLine | null;
  right: DiffLine | null;
}

export interface LineDiff {
  identical: boolean;
  inputEmpty: boolean;
  outputEmpty: boolean;
  rows: AlignedDiffRow[];
}

interface IndexedLine {
  text: string;
  lineNumber: number;
}

type LineOperation =
  | { kind: 'same'; left: IndexedLine; right: IndexedLine }
  | { kind: 'removed'; left: IndexedLine }
  | { kind: 'added'; right: IndexedLine };

type TokenOperation =
  | { kind: 'same'; text: string }
  | { kind: 'removed'; text: string }
  | { kind: 'added'; text: string };

const WORD_TOKEN_PATTERN = /\s+|[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]+/gu;

const MAX_COMPARISON_LINES = 1_000;
const MAX_COMPARISON_TOKENS = 10_000;
const MAX_REPLACEMENT_TOKENS = 1_000;

function splitLines(text: string): string[] {
  return text ? text.split(/\r?\n/) : [];
}

function tokenize(text: string): string[] {
  return text.match(WORD_TOKEN_PATTERN) ?? [];
}

export function isDiffSupported(input: string, output: string): boolean {
  const left = splitLines(input);
  const right = splitLines(output);

  return (
    left.length <= MAX_COMPARISON_LINES &&
    right.length <= MAX_COMPARISON_LINES &&
    tokenize(input).length <= MAX_COMPARISON_TOKENS &&
    tokenize(output).length <= MAX_COMPARISON_TOKENS &&
    left.every((line) => tokenize(line).length <= MAX_REPLACEMENT_TOKENS) &&
    right.every((line) => tokenize(line).length <= MAX_REPLACEMENT_TOKENS)
  );
}

function buildLcsTable(left: string[], right: string[]): number[][] {
  const table = Array.from({ length: left.length + 1 }, () =>
    Array<number>(right.length + 1).fill(0),
  );

  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      table[leftIndex][rightIndex] =
        left[leftIndex] === right[rightIndex]
          ? table[leftIndex + 1][rightIndex + 1] + 1
          : Math.max(table[leftIndex + 1][rightIndex], table[leftIndex][rightIndex + 1]);
    }
  }

  return table;
}

function diffLineOperations(left: IndexedLine[], right: IndexedLine[]): LineOperation[] {
  const table = buildLcsTable(
    left.map((line) => line.text),
    right.map((line) => line.text),
  );
  const operations: LineOperation[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex].text === right[rightIndex].text) {
      operations.push({ kind: 'same', left: left[leftIndex], right: right[rightIndex] });
      leftIndex += 1;
      rightIndex += 1;
    } else if (table[leftIndex + 1][rightIndex] >= table[leftIndex][rightIndex + 1]) {
      operations.push({ kind: 'removed', left: left[leftIndex] });
      leftIndex += 1;
    } else {
      operations.push({ kind: 'added', right: right[rightIndex] });
      rightIndex += 1;
    }
  }

  while (leftIndex < left.length) {
    operations.push({ kind: 'removed', left: left[leftIndex] });
    leftIndex += 1;
  }
  while (rightIndex < right.length) {
    operations.push({ kind: 'added', right: right[rightIndex] });
    rightIndex += 1;
  }

  return operations;
}

function diffTokenOperations(left: string[], right: string[]): TokenOperation[] {
  const table = buildLcsTable(left, right);
  const operations: TokenOperation[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      operations.push({ kind: 'same', text: left[leftIndex] });
      leftIndex += 1;
      rightIndex += 1;
    } else if (table[leftIndex + 1][rightIndex] >= table[leftIndex][rightIndex + 1]) {
      operations.push({ kind: 'removed', text: left[leftIndex] });
      leftIndex += 1;
    } else {
      operations.push({ kind: 'added', text: right[rightIndex] });
      rightIndex += 1;
    }
  }

  while (leftIndex < left.length) {
    operations.push({ kind: 'removed', text: left[leftIndex] });
    leftIndex += 1;
  }
  while (rightIndex < right.length) {
    operations.push({ kind: 'added', text: right[rightIndex] });
    rightIndex += 1;
  }

  return operations;
}

function coalesceSegments(segments: DiffSegment[]): DiffSegment[] {
  return segments.reduce<DiffSegment[]>((result, segment) => {
    if (!segment.text) return result;
    const previous = result[result.length - 1];
    if (previous && previous.changed === segment.changed) {
      previous.text += segment.text;
    } else {
      result.push({ ...segment });
    }
    return result;
  }, []);
}

function sameSegments(text: string): DiffSegment[] {
  return text ? [{ text, changed: false }] : [];
}

function changedSegments(text: string): DiffSegment[] {
  return text ? [{ text, changed: true }] : [];
}

function replacementSegments(
  leftText: string,
  rightText: string,
): {
  left: DiffSegment[];
  right: DiffSegment[];
} {
  const operations = diffTokenOperations(tokenize(leftText), tokenize(rightText));
  const left: DiffSegment[] = [];
  const right: DiffSegment[] = [];

  for (const operation of operations) {
    if (operation.kind === 'same') {
      left.push({ text: operation.text, changed: false });
      right.push({ text: operation.text, changed: false });
    } else if (operation.kind === 'removed') {
      left.push({ text: operation.text, changed: true });
    } else {
      right.push({ text: operation.text, changed: true });
    }
  }

  return { left: coalesceSegments(left), right: coalesceSegments(right) };
}

function createLine(kind: DiffLineKind, line: IndexedLine, segments: DiffSegment[]): DiffLine {
  return {
    kind,
    text: line.text,
    lineNumber: line.lineNumber,
    segments,
  };
}

function appendChangeBlock(
  rows: AlignedDiffRow[],
  removed: IndexedLine[],
  added: IndexedLine[],
): void {
  const pairCount = Math.min(removed.length, added.length);
  for (let index = 0; index < pairCount; index += 1) {
    const replacement = replacementSegments(removed[index].text, added[index].text);
    rows.push({
      left: createLine('removed', removed[index], replacement.left),
      right: createLine('added', added[index], replacement.right),
    });
  }
  for (let index = pairCount; index < removed.length; index += 1) {
    rows.push({
      left: createLine('removed', removed[index], changedSegments(removed[index].text)),
      right: null,
    });
  }
  for (let index = pairCount; index < added.length; index += 1) {
    rows.push({
      left: null,
      right: createLine('added', added[index], changedSegments(added[index].text)),
    });
  }
}

export function diffLines(input: string, output: string): LineDiff {
  const left = splitLines(input).map((text, index) => ({ text, lineNumber: index + 1 }));
  const right = splitLines(output).map((text, index) => ({ text, lineNumber: index + 1 }));
  const operations = diffLineOperations(left, right);
  const rows: AlignedDiffRow[] = [];
  let removed: IndexedLine[] = [];
  let added: IndexedLine[] = [];

  const flushChanges = () => {
    if (removed.length || added.length) appendChangeBlock(rows, removed, added);
    removed = [];
    added = [];
  };

  for (const operation of operations) {
    if (operation.kind === 'same') {
      flushChanges();
      rows.push({
        left: createLine('same', operation.left, sameSegments(operation.left.text)),
        right: createLine('same', operation.right, sameSegments(operation.right.text)),
      });
    } else if (operation.kind === 'removed') {
      removed.push(operation.left);
    } else {
      added.push(operation.right);
    }
  }
  flushChanges();

  return {
    identical:
      left.length === right.length && left.every((line, index) => line.text === right[index].text),
    inputEmpty: input.length === 0,
    outputEmpty: output.length === 0,
    rows,
  };
}
