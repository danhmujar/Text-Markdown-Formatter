import { describe, expect, it } from 'vitest';
import { diffLines, isDiffSupported } from '../lineDiff';

describe('diffLines', () => {
  it('reports identical content with aligned, numbered lines', () => {
    expect(diffLines('one\ntwo', 'one\ntwo')).toEqual({
      identical: true,
      inputEmpty: false,
      outputEmpty: false,
      rows: [
        {
          left: {
            kind: 'same',
            text: 'one',
            lineNumber: 1,
            segments: [{ text: 'one', changed: false }],
          },
          right: {
            kind: 'same',
            text: 'one',
            lineNumber: 1,
            segments: [{ text: 'one', changed: false }],
          },
        },
        {
          left: {
            kind: 'same',
            text: 'two',
            lineNumber: 2,
            segments: [{ text: 'two', changed: false }],
          },
          right: {
            kind: 'same',
            text: 'two',
            lineNumber: 2,
            segments: [{ text: 'two', changed: false }],
          },
        },
      ],
    });
  });

  it('highlights replaced words while preserving unchanged context', () => {
    const result = diffLines('Keep old value.', 'Keep new value.');
    expect(result.rows).toEqual([
      {
        left: {
          kind: 'removed',
          text: 'Keep old value.',
          lineNumber: 1,
          segments: [
            { text: 'Keep ', changed: false },
            { text: 'old', changed: true },
            { text: ' value.', changed: false },
          ],
        },
        right: {
          kind: 'added',
          text: 'Keep new value.',
          lineNumber: 1,
          segments: [
            { text: 'Keep ', changed: false },
            { text: 'new', changed: true },
            { text: ' value.', changed: false },
          ],
        },
      },
    ]);
  });

  it('preserves punctuation and repeated whitespace in replacement segments', () => {
    const input = 'alpha   old, value!';
    const output = 'alpha   new, value?';
    const result = diffLines(input, output);
    const row = result.rows[0];
    expect(row.left?.segments.map((segment) => segment.text).join('')).toBe(input);
    expect(row.right?.segments.map((segment) => segment.text).join('')).toBe(output);
    expect(row.left?.segments).toEqual([
      { text: 'alpha   ', changed: false },
      { text: 'old', changed: true },
      { text: ', value', changed: false },
      { text: '!', changed: true },
    ]);
    expect(row.right?.segments).toEqual([
      { text: 'alpha   ', changed: false },
      { text: 'new', changed: true },
      { text: ', value', changed: false },
      { text: '?', changed: true },
    ]);
  });

  it('keeps lines aligned around a middle insertion', () => {
    const result = diffLines('before\nafter', 'before\ninserted\nafter');
    expect(result.rows.map(({ left, right }) => [left?.text ?? null, right?.text ?? null])).toEqual(
      [
        ['before', 'before'],
        [null, 'inserted'],
        ['after', 'after'],
      ],
    );
    expect(result.rows[1].right).toMatchObject({ kind: 'added', lineNumber: 2 });
  });

  it('keeps lines aligned around a middle deletion', () => {
    const result = diffLines('before\nremoved\nafter', 'before\nafter');
    expect(result.rows.map(({ left, right }) => [left?.text ?? null, right?.text ?? null])).toEqual(
      [
        ['before', 'before'],
        ['removed', null],
        ['after', 'after'],
      ],
    );
    expect(result.rows[1].left).toMatchObject({ kind: 'removed', lineNumber: 2 });
  });

  it('pairs replacement lines in order and spacers the unequal remainder', () => {
    const result = diffLines('anchor\nold one\nold two\nend', 'anchor\nnew one\nend');
    expect(result.rows.map(({ left, right }) => [left?.text ?? null, right?.text ?? null])).toEqual(
      [
        ['anchor', 'anchor'],
        ['old one', 'new one'],
        ['old two', null],
        ['end', 'end'],
      ],
    );
  });

  it('uses a deterministic removal-first tie break for ambiguous alignment', () => {
    const result = diffLines('A\nB', 'B\nC');
    expect(result.rows.map(({ left, right }) => [left?.text ?? null, right?.text ?? null])).toEqual(
      [
        ['A', null],
        ['B', 'B'],
        [null, 'C'],
      ],
    );
  });

  it('represents empty sides with spacer rows', () => {
    expect(diffLines('', 'first\nsecond')).toMatchObject({
      identical: false,
      inputEmpty: true,
      outputEmpty: false,
      rows: [
        { left: null, right: { kind: 'added', text: 'first', lineNumber: 1 } },
        { left: null, right: { kind: 'added', text: 'second', lineNumber: 2 } },
      ],
    });
    expect(diffLines('only', '')).toMatchObject({
      inputEmpty: false,
      outputEmpty: true,
      rows: [{ left: { kind: 'removed', text: 'only', lineNumber: 1 }, right: null }],
    });
  });

  it('reports both empty strings as identical with no logical rows', () => {
    expect(diffLines('', '')).toEqual({
      identical: true,
      inputEmpty: true,
      outputEmpty: true,
      rows: [],
    });
  });

  it('treats LF and CRLF separators as identical content', () => {
    const result = diffLines('first\r\nsecond', 'first\nsecond');
    expect(result.identical).toBe(true);
    expect(result.rows.map(({ left, right }) => [left?.text ?? null, right?.text ?? null])).toEqual(
      [
        ['first', 'first'],
        ['second', 'second'],
      ],
    );
  });

  it('preserves an explicit trailing newline as a terminal blank line', () => {
    const result = diffLines('line\n', 'line\n');
    expect(result.rows).toHaveLength(2);
    expect(result.rows[1]).toMatchObject({
      left: { kind: 'same', text: '', lineNumber: 2, segments: [] },
      right: { kind: 'same', text: '', lineNumber: 2, segments: [] },
    });
  });

  it('keeps whitespace-only content non-empty and deterministic', () => {
    const first = diffLines('   ', '  changed');
    const second = diffLines('   ', '  changed');
    expect(first).toEqual(second);
    expect(first.inputEmpty).toBe(false);
    expect(first.outputEmpty).toBe(false);
    expect(first.rows[0].left?.segments.map((segment) => segment.text).join('')).toBe('   ');
    expect(first.rows[0].right?.segments.map((segment) => segment.text).join('')).toBe('  changed');
  });

  it('rejects inputs that would require oversized LCS tables', () => {
    expect(isDiffSupported(Array(1_001).fill('line').join('\n'), 'line')).toBe(false);
    expect(isDiffSupported('word '.repeat(1_001), 'changed')).toBe(false);
  });
});
