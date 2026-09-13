# Comparison Mode Audit

## Scope

Audit and remediation of Comparison mode state isolation, focus transitions, diff limits, line-ending identity, and difference presentation.

## Findings

1. Formatter-specific New, Undo, and Redo controls remained available while Comparison was active.
2. Switching between editing and results removed the focused action without assigning focus to the next active surface.
3. Quadratic line and token LCS tables could block the UI on oversized pastes.
4. CRLF and LF content produced equal rendered rows but a contradictory non-identical result.
5. The original red/green rows, `+`/`−` markers, and line numbers made the comparison busier than necessary.

## Implemented changes

- Hide Formatter New, Undo, and Redo controls in Comparison mode on desktop and mobile.
- Focus the result region after Compare and the Left editor after Edit comparison.
- Reject comparisons over 1,000 lines, 10,000 tokens per side, or 1,000 tokens in a replacement line before running LCS.
- Normalize CRLF and LF for identity checks.
- Render neutral aligned rows with yellow word-level highlights; remove row colors, markers, and visible line numbers.

## Verification

- Vitest covers normalized line-ending identity and oversized comparison rejection.
- Playwright covers control isolation, focus transitions, input limits, and simplified highlight rendering.
