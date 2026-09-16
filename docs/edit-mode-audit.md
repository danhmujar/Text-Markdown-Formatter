# Comprehensive Audit of Edit-Mode Logic

This audit traces and examines the entire edit-mode lifecycle across [FormatterCell.tsx](file:///c:/AI/Project/Text-Markdown-Formatter/src/components/FormatterCell.tsx), [EditToolbar.tsx](file:///c:/AI/Project/Text-Markdown-Formatter/src/components/EditToolbar.tsx), [FormatterWorkspace.tsx](file:///c:/AI/Project/Text-Markdown-Formatter/src/components/FormatterWorkspace.tsx), [useFormatterActions.ts](file:///c:/AI/Project/Text-Markdown-Formatter/src/hooks/useFormatterActions.ts), [useGridActions.ts](file:///c:/AI/Project/Text-Markdown-Formatter/src/hooks/useGridActions.ts), [useGridHistory.ts](file:///c:/AI/Project/Text-Markdown-Formatter/src/hooks/useGridHistory.ts), [listNumbering.ts](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/listNumbering.ts), [cleanup.ts](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/cleanup.ts), [syntaxValidator.ts](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/syntaxValidator.ts), and existing test suites.

Findings are categorized and ordered by **Severity: High (Critical / Data Corruption / Broken User Flow)**, **Medium (Inconsistencies & Edge Case Glitches)**, and **Low (A11y, Architectural Complexity & Test Gaps)**.

---

## 1. High Severity Findings

### 1.1 Enter Key on List Lines with Active Selection Duplicates/Displaces Selected Text
* **Files & Lines:** [src/hooks/useFormatterActions.ts:137–172](file:///c:/AI/Project/Text-Markdown-Formatter/src/hooks/useFormatterActions.ts#L137-L172), [src/utils/listNumbering.ts:206–236](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/listNumbering.ts#L206-L236)
* **Problem:**
  In a standard textarea, pressing <kbd>Enter</kbd> when text is selected deletes the selected text range `[selectionStart, selectionEnd)` and inserts the newline. In `useFormatterActions.ts`:
  ```typescript
  const cursor = textarea.selectionStart;
  const smartResult = applySmartListEnter(value, cursor, listTerminator);
  // ...
  const nextValue = value.substring(0, cursor) + insertion + value.substring(cursor);
  ```
  Both `applySmartListEnter` and the fallback `getNextListPrefix` branch slice `value.substring(cursor)`. Because `textarea.selectionEnd` is never referenced, whatever text the user highlighted is **not deleted**; instead, it gets retained and pushed onto the newly created list line, duplicating or corrupting text.
* **Impact:** High. Accidental text duplication/corruption whenever a user selects text and presses Enter.
* **Recommended Fix:** Check `const hasSelection = textarea.selectionStart !== textarea.selectionEnd`. If a selection exists, replace the entire selection span `[selectionStart, selectionEnd)` with a newline (or delete the selection before calculating the new list prefix).

---

### 1.2 Alphabetical Lists in Parentheses Jump from `(c)` to `(ci)` Due to Roman Numeral Collision
* **Files & Lines:** [src/utils/listNumbering.ts:327–343](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/listNumbering.ts#L327-L343), [src/utils/listNumbering.ts:417–435](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/listNumbering.ts#L417-L435)
* **Problem:**
  In `getNextListPrefix`:
  1. Priority 1 is Roman numeral in parentheses: `/^(\s*)\(([ivxlcdm]+)\)(\s*)(.*)$/i`
  2. Priority 5 is Alphabetical in parentheses: `/^(\s*)\(([a-zA-Z])\)(\s*)(.*)$/`
  Because `c`, `d`, `i`, `v`, `x`, `l`, `m` are characters in `[ivxlcdm]`, an alphabetical list will proceed as:
  - `(a) Item` &rarr; Enter &rarr; `(b) Item`
  - `(b) Item` &rarr; Enter &rarr; `(c) Item`
  - `(c) Item` &rarr; Enter &rarr; matches `romanMatch` as Roman numeral 100 (`c`)! It calculates `intToRoman(100 + 1) = "ci"`, yielding **`(ci) ` instead of `(d) `**!
  - Similarly, if someone types `(d) Item`, hitting Enter yields `(di) ` (501) instead of `(e) `!
* **Impact:** High. Breaks standard alphabetical subsection lists `(a), (b), (c), (d)` in legal and technical drafts.
* **Recommended Fix:** Disambiguate single-character paren markers: if the character is `c`, `d`, `l`, `m`, check the preceding lines to see whether the list sequence is alphabetical (`(a)`, `(b)`) or Roman (`(i)`, `(ii)`), or require multi-character Roman syntax / lower priority for ambiguous single letters unless Roman sequence is established.

---

### 1.3 Prefix Stripping Regex Matches ANY Alphanumeric Word in Parentheses and Deletes It
* **Files & Lines:** [src/utils/listNumbering.ts:509–512](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/listNumbering.ts#L509-L512)
* **Problem:**
  When applying or toggling numbering via `applyNumberingToText`, existing list markers are stripped using:
  ```typescript
  const strippedContent = trimmedContent.replace(
    /^(?:[-*+•◦▪]\s+|\d+[\.\)]\s+|\(\d+\)\s+|\([a-zA-Z0-9ivxlcdmIVXLCDM]+\)\s+|[a-zA-Z][\.\)]\s+)/,
    '',
  );
  ```
  The group `\([a-zA-Z0-9ivxlcdmIVXLCDM]+\)\s+` reduces to `\([a-zA-Z0-9]+\)\s+`. This matches **any word enclosed in parentheses followed by whitespace**!
  If a line begins with `(Note) Please read`, `(Optional) Field`, `(Overall Cap) k€ 3,100`, or `(USD) 50,000`, applying numbering or converting lines **permanently deletes** the parenthesized word!
* **Impact:** High. Silent data loss of parenthesized words and labels.
* **Recommended Fix:** Narrow the parenthesized marker regex strictly to single alphabetic letters (`\([a-zA-Z]\)\s+`), digits (`\(\d+\)\s+`), or valid roman numerals (`\((?:[ivxclcdm]+|[IVXLCDM]+)\)\s+`), rather than any arbitrary alphanumeric string `[a-zA-Z0-9]+`.

---

### 1.4 Global Ctrl+Z/Ctrl+Y Intercepts `<textarea>`, Wiping Native Keystroke Undo and Resetting Caret
* **Files & Lines:** [src/App.tsx:98–107](file:///c:/AI/Project/Text-Markdown-Formatter/src/App.tsx#L98-L107)
* **Problem:**
  `App.tsx` attaches a window `keydown` listener that unconditionally captures `Ctrl+Z`, `Ctrl+Shift+Z`, and `Ctrl+Y`:
  ```typescript
  if (!event.ctrlKey && !event.metaKey) return;
  const key = event.key.toLowerCase();
  if (key === 'z') {
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
  }
  ```
  In browsers, `<textarea>` has a fine-grained, native per-character undo buffer. By calling `event.preventDefault()` globally:
  1. The browser's native undo is disabled while typing inside the textarea.
  2. The custom `undo()` pops whole 500ms debounce grid snapshots.
  3. When React applies the reverted `grid` state, the textarea re-renders and resets the user's cursor to the end of the text (or start), losing typing position.
* **Impact:** High. Destroys native text editing UX and causes unexpected multi-word cursor jumping.
* **Recommended Fix:** Allow native textarea undo when the active element is a textarea (`if ((event.target as HTMLElement).tagName === 'TEXTAREA') return;`), or restrict application-level grid undo to when the textarea is not actively focused/typing.

---

### 1.5 `smartCleanupMarkdown` Corrupts Valid Multi-Line Bold & Strikethrough Syntax
* **Files & Lines:** [src/utils/cleanup.ts:486–502](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/cleanup.ts#L486-L502), [src/utils/cleanup.ts:556–563](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/cleanup.ts#L556-L563)
* **Problem:**
  In `smartCleanupMarkdown` when `!isTyping`:
  ```typescript
  const lineStars = line.match(/\*\*/g) || [];
  if (lineStars.length % 2 !== 0 && !line.endsWith('\\')) {
    line = `${line}**`;
    markdownFixed = true;
    fixesCount++;
  }
  ```
  If a user has valid markdown text spanning multiple lines:
  ```markdown
  **This is an important heading
  that spans over two lines.**
  ```
  `smartCleanupMarkdown` treats line 1 as having an unclosed `**` and appends `**`. Then line 2 has an odd `**` at its end and gets another `**` appended, resulting in:
  ```markdown
  **This is an important heading**
  that spans over two lines.****
  ```
  It corrupts the markdown into 4 asterisks (`****`) and prematurely terminates the bold formatting.
* **Impact:** High. Syntax corruption on pasted or cleaned multi-line markdown.
* **Recommended Fix:** Do not auto-close `**` or `~~` on a line-by-line basis if the entire document has an even number of delimiters. Only auto-close at the end of the line if the line is an isolated list item or bullet item with non-continuation following text.

---

### 1.6 Numbering with No Selection Prepend-Numbers Every Line in the Cell (Including Tables and Fences)
* **Files & Lines:** [src/utils/listNumbering.ts:478–524](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/listNumbering.ts#L478-L524)
* **Problem:**
  In `applyNumberingToText`:
  ```typescript
  const targetStart = hasSelection ? lineStart : 0;
  const targetEnd = hasSelection ? lineEnd : fullText.length;
  ```
  If a user has no active selection (caret is simply resting on one line) and clicks `1. 2.` or `(i) (ii)` in `EditToolbar`:
  - `hasSelection` is `false`.
  - It numbers **every single non-blank line in the entire cell** from index 0 to `fullText.length`.
  - It blindly numbers markdown headings (`# Title` &rarr; `1. # Title`), table rows (`| A | B |` &rarr; `2. | A | B |`), and code fences (` ``` ` &rarr; `3. ``` `).
  - Furthermore, lines 527–528 set `newSelectionStart = 0` and `newSelectionEnd = fullText.length`, selecting the entire cell text.
* **Impact:** High. Unexpected destruction of markdown document structure if a user clicks a numbering button without realizing it applies cell-wide.
* **Recommended Fix:** If `!hasSelection`, either:
  1. Apply numbering only to the current line (or the contiguous list block surrounding the caret).
  2. Skip markdown headings (`^#{1,6}\s`), table rows (`^\|`), horizontal rules (`^---`), and code blocks (`^```).

---

## 2. Medium Severity Findings

### 2.1 Mid-Line Enter Appends Semicolon/Colon into the Middle of the Sentence
* **Files & Lines:** [src/utils/listNumbering.ts:206–236](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/listNumbering.ts#L206-L236)
* **Problem:**
  `applySmartListEnter` checks `fullLine`, but inserts `${terminator}\n${indent}...` directly at `cursor`. If a user presses <kbd>Enter</kbd> to break a line mid-sentence:
  `"(i) The quick| brown fox"` &rarr; `"(i) The quick;\n(ii)  brown fox"`.
  The terminator `;` is inserted in the middle of a sentence, and the remainder of the sentence becomes item `(ii)`.
* **Impact:** Medium. Annoying corruption when splitting list items.
* **Recommended Fix:** Only append `terminator` if `cursor` is at the end of the line (or after trimming trailing whitespace: `cursor >= lineEnd - trailingSpace`). If Enter is pressed mid-line, split the line without inserting the list terminator.

---

### 2.2 Duplicate Terminator Punctuation (`;;` or `.;`) on Enter
* **Files & Lines:** [src/utils/listNumbering.ts:206–236](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/listNumbering.ts#L206-L236), [src/utils/__tests__/markdownFormatter.test.ts:153–156](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/__tests__/markdownFormatter.test.ts#L153-L156)
* **Problem:**
  If the user has already typed a semicolon `;`, colon `:`, or period `.` at the end of a list item and presses <kbd>Enter</kbd>, `applySmartListEnter` unconditionally prepends `${terminator}`:
  `"(ii) Done.;\n(iii) "` or `"(i) First item;;\n(ii) "`.
  In fact, `markdownFormatter.test.ts` line 153 explicitly asserts this bug as a test case:
  `it('always appends even when punctuation already ends the line')`!
* **Impact:** Medium. Generates invalid syntax like `;;` or `.;` that requires manual cleanup.
* **Recommended Fix:** Check whether the text immediately preceding `cursor` already ends with `terminator` or matching punctuation (`[;:.]`). If it does, do not insert a duplicate terminator character.

---

### 2.3 Inserting a List Item via Enter Does Not Renumber Subsequent Items
* **Files & Lines:** [src/hooks/useFormatterActions.ts:137–172](file:///c:/AI/Project/Text-Markdown-Formatter/src/hooks/useFormatterActions.ts#L137-L172)
* **Problem:**
  If a user has:
  ```
  1. First item
  2. Second item
  3. Third item
  ```
  Placing the cursor at the end of `1. First item` and pressing <kbd>Enter</kbd> inserts `2. `, resulting in:
  ```
  1. First item
  2. 
  2. Second item
  3. Third item
  ```
  Subsequent items are not renumbered.
* **Impact:** Medium. Requires the user to manually retype numbers or select all lines and reapply numbering via the toolbar.
* **Recommended Fix:** When continuing numbered (`\d+\.`) or Roman lists in the middle of an existing list block, renumber subsequent sibling items up to the first non-list line.

---

### 2.4 Empty List Line Exit Behavior Mismatch Across Formats
* **Files & Lines:** [src/hooks/useFormatterActions.ts:159–165](file:///c:/AI/Project/Text-Markdown-Formatter/src/hooks/useFormatterActions.ts#L159-L165), [src/utils/listNumbering.ts:227](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/listNumbering.ts#L227)
* **Problem:**
  When pressing Enter on an empty list marker:
  - For `   a. `, `applySmartListEnter` returns `applyListDedent(value, cursor)`, converting it to `(ii)`.
  - For `1. ` or `(i) `, `applySmartListEnter` returns `null`, falling through to `getNextListPrefix` (lines 160–165), which removes the prefix via `value.substring(0, lineStart) + value.substring(lineEnd)`.
  - If `1. ` is at the end of the text, removing `fullLine` leaves a trailing newline `\n`. If it is in the middle, it collapses the line, leaving `\n\n`.
* **Impact:** Medium. Inconsistent UX depending on which list format is being typed.
* **Recommended Fix:** Unify the empty-line Enter behavior: pressing Enter on an indented sub-item dedents it one level; pressing Enter on a top-level empty list item clears the marker cleanly without leaving orphan whitespace or trailing newlines.

---

### 2.5 Tab and Shift+Tab Collapse Multi-Line Selection and Indent Only Line 1
* **Files & Lines:** [src/hooks/useFormatterActions.ts:114–125](file:///c:/AI/Project/Text-Markdown-Formatter/src/hooks/useFormatterActions.ts#L114-L125), [src/utils/listNumbering.ts:267–317](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/listNumbering.ts#L267-L317)
* **Problem:**
  When multiple lines are selected and <kbd>Tab</kbd> or <kbd>Shift+Tab</kbd> is pressed, `cursor = textarea.selectionStart`. `applyListIndent` / `applyListDedent` only operates on `splitLineAt(value, cursor)` (the first line), and then resets `setSelectionRange(newCursor, newCursor)`.
  The rest of the selected lines remain unindented, and the user's multi-line selection is lost.
* **Impact:** Medium. Standard code and text editor behavior indents all selected lines and preserves the selection.
* **Recommended Fix:** If `selectionStart !== selectionEnd`, iterate over all lines spanning `[selectionStart, selectionEnd]`, apply indent/dedent to each line, and adjust the selection range to encompass all modified lines.

---

### 2.6 Tab Only Supports Roman and Numeric-Dot; Fails and Exits Focus for Bullets, Alpha, and Paren Numbers
* **Files & Lines:** [src/utils/listNumbering.ts:270–291](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/listNumbering.ts#L270-L291), [src/hooks/useFormatterActions.ts:120–122](file:///c:/AI/Project/Text-Markdown-Formatter/src/hooks/useFormatterActions.ts#L120-L122)
* **Problem:**
  `applyListIndent` only checks `romanMatch`, `numericMatch`, and `subMatch` (`^\s+[a-zA-Z]\.`).
  If a user has:
  - Bullet lists: `* Item` or `- Item`
  - Unindented alpha lists: `a. Item`
  - Parenthesized number lists: `1) Item` or `(1) Item`
  - Parenthesized alpha lists: `(a) Item`
  `applyListIndent` returns `null`. `handleTextareaKeyDown` does not call `event.preventDefault()`, and the browser moves keyboard focus out of the textarea to the next interactive DOM element!
* **Impact:** Medium. Severe jarring loss of keyboard focus when attempting to indent common list types.
* **Recommended Fix:** Support indentation across all list marker formats (e.g. prefixing spaces or shifting to sub-bullets/sub-letters), or at minimum insert standard spaces/tab and call `event.preventDefault()`.

---

### 2.7 Tab Transforms Numbered Items (`1.`) into Lettered Sub-Items (`   a.`)
* **Files & Lines:** [src/utils/listNumbering.ts:275](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/listNumbering.ts#L275)
* **Problem:**
  Pressing <kbd>Tab</kbd> on a numeric item `1. Item` runs:
  `const newLine = `   a.${spacing}${rest}`;`
  It forces `1.` to become `   a.`. While legal outlines sometimes use `1.` &rarr; `   a.`, in standard markdown and general note-taking, users expect indented numeric lists (or 2/4 spaces indentation), not forced letter conversion. If the user had `2. Item`, Tab turns it into `   a. Item` as well.
* **Impact:** Medium. Unexpected change of numbering style.
* **Recommended Fix:** Allow indented numeric lists or make style conversion configurable.

---

### 2.8 Cursor Calculation in `applyListIndent` Places Caret Inside Leading Indent
* **Files & Lines:** [src/utils/listNumbering.ts:278](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/listNumbering.ts#L278)
* **Problem:**
  In `applyListIndent`:
  `newCursor: cursor + (newLine.length - fullLine.length)`
  If the cursor is at column 0 (before the marker):
  `fullLine = "(i) Test"` (len 8), `newLine = "   a. Test"` (len 10).
  `newCursor = 0 + 2 = 2`. The caret lands at index 2 (`"  | a. Test"`), between the leading space indentation, instead of remaining at the line start or moving after the marker.
* **Impact:** Medium. Bad caret placement.
* **Recommended Fix:** Calculate `newCursor` relative to the marker position (e.g. preserve distance from text start or place immediately after the new prefix).

---

### 2.9 `syntaxValidator.ts` Flags Valid Markdown Constructs and Self-Generated 3-Space Indentation
* **Files & Lines:** [src/utils/syntaxValidator.ts:180–197](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/syntaxValidator.ts#L180-L197), [src/utils/syntaxValidator.ts:264–274](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/syntaxValidator.ts#L264-L274), [src/utils/syntaxValidator.ts:300–301](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/syntaxValidator.ts#L300-L301)
* **Problem:**
  1. **Self-flagging 3-space indentation:** `listNumbering.ts` generates 3 spaces for sub-items (`   a. `). `syntaxValidator.ts` line 264 checks: `if (indent > 0 && indent % 2 !== 0 && indent !== 4) warnings.push(...)`. The app's own validator flags its own auto-continuation output as an "Irregular List Indentation" warning!
  2. **False glued bold warning on punctuation:** `[^\s*]\*\*[a-zA-Z0-9...]` flags valid quoted/parenthesized bold like `"**bold**"` or `(**bold**)`.
  3. **Table column count on escaped pipes:** `trimmed.slice(1, -1).split('|')` does not ignore escaped `\|`, causing false "Table Column Count Mismatch" warnings.
* **Impact:** Medium. False positive warnings distract and confuse users.
* **Recommended Fix:** Permit 3-space indents when accompanied by legal/alphabetical list markers, ignore enclosing punctuation `[("'(\[]` before `**`, and split table rows using a regex that respects `\|`.

---

### 2.10 `convertNewlinesToBr` Replaces All Newlines with `<br>`, Destroying Markdown on Copy
* **Files & Lines:** [src/utils/cleanup.ts:148–155](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/cleanup.ts#L148-L155), [src/utils/cleanup.ts:163–172](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/cleanup.ts#L163-L172)
* **Problem:**
  If the original pasted text contained a `<br>` tag and was not a markdown table, `inputHadBr` becomes `true`. Whenever the user copies the cell, `prepareCopiedText` runs:
  `return convertNewlinesToBr(outputText);`
  `convertNewlinesToBr` does: `return normalized.replace(/\n/g, '<br>')`.
  This replaces **every newline in the entire document** with `<br>`, including between paragraphs, list items (`- Item 1<br>- Item 2`), code fences, and headings (`# Title<br>Body`).
* **Impact:** Medium. When pasted elsewhere, list formatting and heading hierarchy are completely ruined.
* **Recommended Fix:** Only convert `<br>` where intentional inline soft breaks exist, or avoid global newline-to-`<br>` replacement inside markdown blocks.

---

## 3. Low Severity, Accessibility & Architecture Findings

### 3.1 `EditToolbar` Uses `role="toolbar"` Without APG Roving `tabIndex`
* **Files & Lines:** [src/components/EditToolbar.tsx:33–41](file:///c:/AI/Project/Text-Markdown-Formatter/src/components/EditToolbar.tsx#L33-L41)
* **Problem:**
  `EditToolbar` declares `role="toolbar"`, but every single child button and select element has `tabIndex={0}`. Per W3C ARIA APG for toolbars, a toolbar must manage focus with arrow keys (<kbd>&larr;</kbd>/<kbd>&rarr;</kbd>) and have only one tab stop (`tabIndex={0}` for active, `tabIndex={-1}` for others).
  Currently, a keyboard user must press <kbd>Tab</kbd> 9 times per cell to get from the cell header to the textarea. In a 2x2 grid, that is up to 36 redundant tab stops.
* **Impact:** Low–Medium A11y friction.
* **Recommended Fix:** Implement roving `tabIndex` on `EditToolbar` or change the container role from `role="toolbar"` to a presentation grouping if roving focus is not implemented.

---

### 3.2 Dual / Redundant List Continuation Architecture in `useFormatterActions.ts`
* **Files & Lines:** [src/hooks/useFormatterActions.ts:139–172](file:///c:/AI/Project/Text-Markdown-Formatter/src/hooks/useFormatterActions.ts#L139-L172)
* **Problem:**
  `useFormatterActions.ts` contains two separate list continuation implementations:
  1. `applySmartListEnter` (lines 139–148)
  2. Fallback inline block using `getNextListPrefix` (lines 150–172)
  This causes divergence: roman numerals and `1.` get `listTerminator`, while `(a)` and bullets do not; `   a.` dedents on empty line, while `1.` deletes the line.
* **Impact:** Low (Code smell / maintenance complexity).
* **Recommended Fix:** Consolidate list continuation into a single unified helper in `listNumbering.ts` that handles terminator logic, continuation, dedenting, and empty line exit consistently across all marker styles.

---

### 3.3 Memory Leak / Stale References in `textareaRefs.current`
* **Files & Lines:** [src/hooks/useFormatterActions.ts:25](file:///c:/AI/Project/Text-Markdown-Formatter/src/hooks/useFormatterActions.ts#L25), [src/components/FormatterWorkspace.tsx:104–108](file:///c:/AI/Project/Text-Markdown-Formatter/src/components/FormatterWorkspace.tsx#L104-L108)
* **Problem:**
  When switching from a 2x2 layout to 1x1, cells `0-1`, `1-0`, and `1-1` are unmounted. `registerTextarea` sets the value to `null`, but the keys remain in the ref object indefinitely, and any callback referencing those keys accesses stale entries.
* **Impact:** Low.
* **Recommended Fix:** Clean up deleted cell keys when grid dimensions shrink.

---

### 3.4 Cross-Tab Terminator Synchronization Missing
* **Files & Lines:** [src/utils/listNumbering.ts:149–161](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/listNumbering.ts#L149-L161)
* **Problem:**
  `setListTerminator` writes to `localStorage` and dispatches a local window event `formatter:list-terminator`. However, `subscribeListTerminator` does not listen to the browser's `window.addEventListener('storage', ...)`. If a user has two tabs open and changes the terminator in tab A, tab B does not update until refreshed.
* **Impact:** Low.
* **Recommended Fix:** Add a `storage` event listener inside `subscribeListTerminator`.

---

### 3.5 Inline Formatting Toggle Requires Exact Wrapper Selection
* **Files & Lines:** [src/utils/listNumbering.ts:550–562](file:///c:/AI/Project/Text-Markdown-Formatter/src/utils/listNumbering.ts#L550-L562)
* **Problem:**
  In `applyInlineFormatToText`, unwrapping only triggers if `selected.startsWith(wrapper) && selected.endsWith(wrapper)`. If a user double-clicks the word `bold` in `**bold**`, the browser selects only `bold`. Clicking the Bold button wraps it again into `****bold****`.
* **Impact:** Low. Minor editing annoyance.
* **Recommended Fix:** Inspect the text immediately before and after the selection (`before.endsWith(wrapper) && after.startsWith(wrapper)`); if present, unwrap by stripping the outer delimiters.

---

### 3.6 Missing Focus Restoration on Warnings Dialog Dismissal
* **Files & Lines:** [src/components/FormatterCell.tsx:106–113](file:///c:/AI/Project/Text-Markdown-Formatter/src/components/FormatterCell.tsx#L106-L113)
* **Problem:**
  When syntax warnings are opened and the user presses <kbd>Escape</kbd>, `setShowWarnings(false)` is called, but focus is not returned to the warning toggle button (`aria-expanded`).
* **Impact:** Low A11y issue.
* **Recommended Fix:** Store the trigger button ref and call `.focus()` when dismissing via Escape.

---

## 4. Test Coverage Gaps

An audit of `src/**/__tests__/` reveals notable gaps around edit-mode logic:

| Feature Area | Current Test Coverage | Identified Missing Tests |
| :--- | :--- | :--- |
| **`FormatterCell.tsx`** | 1 test ([FormatterCell.test.tsx:43](file:///c:/AI/Project/Text-Markdown-Formatter/src/components/__tests__/FormatterCell.test.tsx#L43), tests only that preview builds HTML) | No tests for edit mode switching, textarea keyboard event forwarding, clear button, or warning panel toggling. |
| **`useFormatterActions.ts`** | **0 tests** (No test file exists for this hook) | No tests for `handleTextareaKeyDown` (<kbd>Enter</kbd>, <kbd>Tab</kbd>, <kbd>Shift+Tab</kbd>), toolbar actions, feedback messages, or terminator subscriptions. |
| **Enter with Selection** | **0 tests** | No tests verify that pressing Enter with highlighted text deletes the selection. |
| **Alphabetical List Parentheses** | 1 basic test (`a.` &rarr; `b.`) | No test verifying that `(c)` &rarr; `(d)` (does not jump to `(ci)`). |
| **Prefix Stripping** | 1 test | No tests checking that parenthesized text like `(Note) ` or `(USD) ` is preserved when formatting. |
| **Tab Indentation** | 5 tests in `markdownFormatter.test.ts` | No tests for multi-line Tab/Shift+Tab, bullet lists on Tab, or cursor positioning after Tab. |
| **Multi-line Bold Cleanup** | **0 tests** | No test verifying that `**Line 1\nLine 2**` is not mangled into `****`. |

---

## Summary of Priority Actions

1. **Fix Enter replacement:** In `useFormatterActions.ts`, pass `selectionStart` and `selectionEnd` to replace any selected text range before inserting new list markers.
2. **Fix `(c)` &rarr; `(ci)` bug:** In `listNumbering.ts`, resolve the alphabetical vs. Roman numeral parentheses collision in `getNextListPrefix`.
3. **Guard prefix stripping:** In `applyNumberingToText`, constrain the regex to legitimate list markers instead of arbitrary `\([a-zA-Z0-9]+\)\s+`.
4. **Scope global undo:** In `App.tsx`, bypass `Ctrl+Z` interception when a `<textarea>` is actively focused so native undo and cursor position are preserved.
5. **Protect multi-line markdown in cleanup:** In `cleanup.ts`, avoid appending `**` on lines when the document-level count is already balanced.
6. **Limit no-selection numbering:** In `listNumbering.ts`, operate on the active line or list block rather than rewriting the entire cell content.
7. **Add unit test suite for `useFormatterActions`:** Provide comprehensive tests covering <kbd>Enter</kbd>, <kbd>Tab</kbd>, <kbd>Shift+Tab</kbd>, and selection edge cases.

---

## 5. Remediation Verification & Discrepancy Fixes

Following the implementation pass, an independent audit of the changes identified six discrepancies and regressions, which were systematically resolved:

1. **Bullet Semicolon Regression Fixed:** Bullet lists (`*`, `-`, `+`) were receiving automated semicolon terminators (`* item;\n* `). Resolved in `listNumbering.ts` so `parsed.kind === 'bullet'` explicitly omits terminators while preserving clean list continuation.
2. **Roman List `(v)` &rarr; `(w)` Break Fixed:** A character class `[a-hj-uwyzcdlmvx]` caused `(v)` to be treated as alphabetical `v` (continuing to `w`). Replaced with a context-aware parser `isPrecedingRoman` that checks preceding lines in the list block; Roman lists continue seamlessly through `(iv)` &rarr; `(v)` &rarr; `(vi)`, while alphabetical lists continue `(b)` &rarr; `(c)` &rarr; `(d)` and `(h)` &rarr; `(i)` &rarr; `(j)`.
3. **Parenthesized Number `(1)` Support Restored:** Restored full pattern recognition for `(1)`, `(2)` in `parseListLine` so enclosed numbers continue accurately on Enter.
4. **Fallback Enter Selection Deletion Fixed:** `useFormatterActions.ts` fallback branch now respects `textarea.selectionEnd` when replacing text on Enter.
5. **Markdown Structural Line Protection in Numbering:** `applyNumberingToText` now preserves Markdown headings (`#`), table rows (`|`), code fences (` ``` `), and blockquotes (`>`) intact rather than prefixing them with list numbers.
6. **Glued Colon Bold Warning Restored:** Restored detection of `**Title**:Text` in `syntaxValidator.ts` without triggering false positive warnings on punctuation-adjacent bold such as `"**bold**"`, `(**bold**)`, or `**Title**: Text`.

