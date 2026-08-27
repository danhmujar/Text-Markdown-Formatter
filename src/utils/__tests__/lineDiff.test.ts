import { describe, expect, it } from 'vitest';
import { diffLines } from '../lineDiff';

describe('diffLines', () => {
  it('reports identical content', () => {
    expect(diffLines('one\ntwo', 'one\ntwo')).toMatchObject({
      identical: true,
      inputEmpty: false,
      outputEmpty: false,
    });
  });
  it('marks changed lines on each side', () => {
    expect(diffLines('one', 'two')).toMatchObject({
      identical: false,
      input: [{ kind: 'removed', text: 'one' }],
      output: [{ kind: 'added', text: 'two' }],
    });
  });
  it('reports empty sides explicitly', () => {
    expect(diffLines('', 'result')).toMatchObject({
      inputEmpty: true,
      outputEmpty: false,
      input: [],
      output: [{ kind: 'added', text: 'result' }],
    });
  });
});
