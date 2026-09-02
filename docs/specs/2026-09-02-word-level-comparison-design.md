# Word-level side-by-side comparison design

## Summary

Upgrade the existing read-only comparison dialog from positional, whole-line highlighting to
an aligned, two-stage diff. The dialog will align corresponding input and output lines, preserve
that alignment with spacer rows for insertions and deletions, and emphasize the changed words
within paired replacement lines.

The existing Compare action, input/output selection, dialog lifecycle, responsive behavior, and
accessibility contract remain in place. The feature will not add editing controls or mutate the
workspace.

## Goals

- Make discrepancies between raw input Markdown and effective output easy to scan.
- Keep corresponding content aligned when lines are inserted or deleted.
- Show precise word-level changes without losing the surrounding line context.
- Preserve the current dialog's responsive and accessible interaction behavior.
- Keep the implementation dependency-free and independently testable.

## Non-goals

- Character-level highlighting inside changed words.
- Editing, accepting, rejecting, or merging changes from the comparison dialog.
- Comparing arbitrary cells or historical workspace versions.
- Adding change navigation, filters, or export controls.
- Rendering the right side as formatted HTML; both sides remain text representations.

## Approach

Use a two-stage diff implemented in the existing comparison utility:

1. Align input and output lines using a longest-common-subsequence line comparison.
2. Pair adjacent removed and added lines as replacements where possible.
3. Within each paired replacement, run a token-level longest-common-subsequence comparison.
4. Render unmatched line operations with a spacer row on the opposite side.

This approach is preferred over adding a diff dependency because the required behavior is
focused, the bundle remains unchanged, and the diff model can be tailored to the existing UI.
A global word-only diff was rejected because line insertions would make side-by-side alignment
harder to understand.

## Diff model

The utility will return aligned rows rather than two independent arrays. Each row represents one
visual position and contains an optional left line and optional right line.

Each populated line has a line-level kind:

- `same`: identical content exists on both sides.
- `removed`: content exists only on the input side or forms the left half of a replacement.
- `added`: content exists only on the output side or forms the right half of a replacement.

Paired replacement lines also contain ordered text segments. Each segment is either unchanged or
changed. Tokens preserve words, punctuation, and whitespace so concatenating the rendered
segments reproduces the original line exactly. Word-level emphasis applies only to changed
segments; the line-level background still communicates that the row changed.

For a pure insertion, the aligned row has no left line. For a pure deletion, it has no right line.
The renderer displays that missing side as an inert spacer row with no fabricated text or line
number. Consecutive removed and added lines are paired in order within the same change block;
unpaired remainder lines use spacer rows.

Repeated lines are resolved deterministically by the line alignment algorithm. The implementation
does not promise semantic matching beyond textual order.

## Components and data flow

`App` continues to select the raw grid input and effective output for the chosen cell. It passes
both strings into `ComparisonDialog` without modifying either value.

`ComparisonDialog` calls the focused diff utility and renders its aligned rows in a two-column
grid. Each visual row contains the input and output cells together, which guarantees horizontal
alignment. On narrow viewports, the column headings remain clear and the comparison region can
scroll horizontally when necessary rather than separating corresponding rows into unrelated
blocks.

Both columns show line numbers for real lines. Spacer rows have an accessible description when
needed but remain visually unobtrusive. Added content uses theme-compatible emerald styling;
removed content uses theme-compatible rose styling. Changed word segments use a stronger shade
of the same color and must not rely on color alone: line prefixes or accessible labels continue to
identify additions and removals.

The existing dialog behavior remains unchanged:

- `role="dialog"` and `aria-modal="true"` semantics.
- Close control receives initial focus.
- Tab focus is trapped inside the dialog.
- Escape, close control, and backdrop close the dialog.
- Focus returns to the initiating Compare control.
- The application background is inert while the dialog is open.

## Empty and identical states

When the strings are exactly identical, the dialog displays `No differences found.` and renders
the shared content without change highlighting.

When either side is empty, its column displays aligned spacer rows opposite all real lines on the
other side. If both sides are empty, each column displays `No content` and the identical-state
message remains accurate.

Line splitting accepts both LF and CRLF input. A trailing newline is treated consistently so the
diff does not invent a visible content line unless the existing text representation requires it.

## Performance and failure behavior

The comparison is computed only while the dialog is rendered. The initial implementation uses
dynamic-programming longest-common-subsequence comparisons, which are appropriate for the
cell-sized text the application currently handles. The utility remains pure and has no side
effects.

If later profiling shows unusually large cells causing a noticeable delay, a bounded fallback may
be designed separately. This feature will not silently truncate or misrepresent comparison data.
Rendering treats all input as text through React nodes, so Markdown and HTML-like content are not
executed.

## Testing

Unit tests for the diff utility will cover:

- Identical content.
- One-word replacement within a line.
- Multiple word replacements with preserved punctuation and whitespace.
- Inserted and deleted lines with spacer rows.
- Replacement blocks with unequal numbers of removed and added lines.
- Repeated lines with deterministic alignment.
- Empty left, empty right, and both empty.
- LF and CRLF input.

Component or Playwright coverage will verify:

- Raw input and effective output appear in the correct columns.
- Changed words and added/removed lines expose distinct visual states.
- Spacer rows preserve aligned visual rows.
- The identical message appears only when appropriate.
- Existing focus, Escape, backdrop, inert-background, responsive, and accessible-label behavior
  remains intact.

## Acceptance Criteria

1. Every output cell retains an accessible Compare action.
2. Compare displays the raw input on the left and effective output on the right.
3. Corresponding unchanged and changed lines remain horizontally aligned.
4. Added and deleted lines use visually distinct, theme-compatible highlighting.
5. Replacement lines highlight the changed words rather than only the whole line.
6. Inserted or deleted lines produce a blank spacer row on the opposite side.
7. Identical content displays “No differences found.”
8. Empty input or output is represented clearly without breaking alignment.
9. Comparison never changes input or output state.
10. The dialog retains its existing keyboard, focus, responsive, and accessibility behavior.
11. Automated tests cover line alignment and word-level discrepancy highlighting.
