export function HelpGuide({ shortcuts = false }: { shortcuts?: boolean }) {
  if (shortcuts)
    return (
      <div className="space-y-4 text-sm leading-6">
        <p>Use Ctrl on Windows or ⌘ on Mac for the browser shortcuts below.</p>
        <dl className="space-y-3">
          <div>
            <dt className="font-semibold">Ctrl / ⌘ + C, X, V, A</dt>
            <dd>
              Copy, cut, paste, or select all in the focused editor. You can also use its
              right-click menu.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Ctrl / ⌘ + Z · Ctrl + Y or Ctrl / ⌘ + Shift + Z</dt>
            <dd>
              Undo / redo Formatter workspace changes when focus is outside an editor. Inside an
              editor, the browser handles these keys; use the Undo and Redo buttons for reliable
              workspace history.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Alt + N</dt>
            <dd>
              Start a new Formatter workspace. This clears its saved content; browser or
              operating-system shortcuts may take priority.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Enter in a list</dt>
            <dd>
              Continue the next number or letter. The End setting adds a semicolon, colon, or
              nothing. Enter on an empty lettered item returns to the next parent number when one
              exists; otherwise it exits the list.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Tab / Shift + Tab in a list</dt>
            <dd>
              Tab changes a Roman or numeric item to a flush-left a. item. Further Tab leaves that
              lettered item unchanged. Shift + Tab returns it to the next parent number. Existing
              indented lists and selected lines retain their indentation controls.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Shift + Enter</dt>
            <dd>Insert a line break without smart list continuation.</dd>
          </div>
          <div>
            <dt className="font-semibold">Escape</dt>
            <dd>
              Close Help, About, the changelog, or an open menu. Tab and Shift + Tab move between
              controls; Tab inside a recognized list edits the list.
            </dd>
          </div>
        </dl>
        <p>
          Use the Bold and Italic toolbar buttons for formatting; Ctrl+B and Ctrl+I are not app
          shortcuts.
        </p>
      </div>
    );
  return (
    <div className="space-y-5 text-sm leading-6">
      <section>
        <h3 className="font-semibold">Format text for Catalyst</h3>
        <ol className="mt-2 list-decimal space-y-2 pl-5">
          <li>
            Copy text from your source, then click <strong>Paste</strong> in the destination cell.
            You can also right-click in the editor and choose Paste.
          </li>
          <li>
            Choose <strong>Edit</strong> to change the text. Paste inserts at your last cursor
            position or replaces the selected text. Without a saved position, it appends.
          </li>
          <li>
            Use <strong>Clean</strong> to remove accidental line wraps and repair Markdown.
            Recognized word-by-word tabs are repaired automatically on paste. Use the toolbar for
            lists, bold, and italic.
          </li>
          <li>
            Choose <strong>Preview</strong> to review formatting, then{' '}
            <strong>Copy to Catalyst</strong> for one cell or <strong>Copy all to Catalyst</strong>{' '}
            for the workspace.
          </li>
          <li>
            To copy part of a cell, select text in <strong>Edit</strong> or <strong>Preview</strong>{' '}
            and press Ctrl+C or right-click and choose Copy. Only the selection is prepared for
            Catalyst. Preview copies visible text with its formatting. In Edit, include Markdown
            markers in the selection to copy their formatting.
          </li>
        </ol>
      </section>
      <section>
        <h3 className="font-semibold">Paste behavior and layouts</h3>
        <p className="mt-2">
          In Edit, choose Keep in one cell or Split into cells. Splitting a table replaces the
          workspace grid. Paste from Preview uses automatic cleanup and table splitting. Use Layout
          for side-by-side or multi-cell work.
        </p>
        <p className="mt-2">
          When automatic cleanup changes a paste, Undo restores its original text; another Undo
          returns to the previous workspace. New clears the locally saved Formatter content.
          Comparison drafts are separate and temporary.
        </p>
      </section>
      <section>
        <h3 className="font-semibold">Compare two versions</h3>
        <p className="mt-2">
          Open Comparison, then Paste into Left and Right. Click Compare to see differences. Edit
          comparison returns to the drafts; Clear removes both drafts after confirmation. Comparison
          paste preserves plain text without Formatter cleanup.
        </p>
      </section>
      <section>
        <h3 className="font-semibold">If Paste is blocked</h3>
        <p className="mt-2">
          Your browser may ask for clipboard permission. If the button cannot read the clipboard,
          right-click inside the editor and choose Paste, use Ctrl+V on Windows or ⌘V on Mac, or
          touch and hold the editor on mobile and choose Paste.
        </p>
      </section>
    </div>
  );
}
