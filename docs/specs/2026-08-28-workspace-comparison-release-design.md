# Workspace, Comparison, and Release Information Design Specification

## Scope

Add three independent enhancements to Text & Markdown Formatter:

1. Local workspace persistence.
2. Side-by-side input/output comparison.
3. Version display and a separate in-app changelog dialog.

These enhancements must preserve existing editor, preview, copy, theme, grid, and About behavior. No backend, account, cloud synchronization, PWA manifest, or install behavior is included.

## Local workspace persistence

Persist the current workspace locally as a versioned record:

```ts
{
  grid: string[][],
  outputOverrides: Record<string, string>
}
```

Use a versioned localStorage key such as `formatter-workspace-v1`. Debounce writes so normal typing does not write on every keystroke. Restore the workspace on startup. Malformed, incompatible, or unavailable storage must be ignored safely without preventing the app from loading.

Persist grid content and output overrides only. Undo/redo history remains session-local. Starting a new workspace or clearing all content must remove the saved workspace as well as clear the current grid and output overrides.

## Side-by-side comparison

Add a Compare action to every output container. Activating it opens a responsive comparison dialog with the current input Markdown on the left and the effective output on the right.

The effective output is the manually edited output override when one exists; otherwise it is the normal output derived from input. Preserve raw Markdown on the input side and show formatted output on the output side. Differences are distinguished at line level. Identical content must show an explicit no-differences state. Empty input or output must render a clear empty state rather than failing.

The comparison dialog follows the About dialog interaction contract: accessible dialog semantics, Escape close, backdrop close, close control, focus trap, focus restoration, background inert isolation, responsive sizing, and internal mobile scrolling. Comparison must not mutate either input or output state.

## Version and changelog

Extend the existing About dialog with the current app version and a View changelog action. The action opens a separate accessible in-app changelog dialog.

Version information is local and aligned with the package version. Changelog entries are local static data; no runtime network request or PWA/version-fetch behavior is added. The initial changelog records the product changes already implemented:

- Copy workflow and Catalyst labels.
- Markdown paste classification.
- Bold-spacing warning correction.
- Cross-application copy spacing.
- About FAB and workspace improvements.

## Component and data structure

```text
App
├── Header
├── Editor
├── Preview
│   └── OutputCell
├── AboutDialog
├── ChangelogDialog
└── ComparisonDialog
```

Add a focused `useWorkspacePersistence` hook for local storage. Add a focused diff utility or `DiffView` component for line-level comparison. Add local app metadata and changelog constants. Reuse the existing React, TypeScript, Tailwind, theme-variable, and accessible-dialog patterns.

## Accessibility and responsive behavior

- Persisted data must not affect keyboard behavior or focus order.
- Compare controls require accessible labels and must be reachable in every output container.
- Comparison and changelog dialogs use `role="dialog"`, `aria-modal="true"`, and accessible headings.
- Escape, close-button, and backdrop interactions close both dialogs.
- Focus returns to the initiating control after either dialog closes.
- Background app content is inert while either dialog is open.
- Dialog bodies scroll internally on mobile-width screens.
- Light and dark themes remain legible.

## Acceptance criteria

1. Workspace grid content survives a browser reload through local storage.
2. Output overrides survive a browser reload through local storage.
3. Invalid or incompatible saved workspace data is ignored safely.
4. Clearing or starting a new workspace removes persisted workspace content.
5. A Compare action is available for each output container.
6. Compare presents input Markdown and effective output side by side.
7. Changed lines are visibly distinguished, and identical content shows a no-differences state.
8. Comparison handles manually edited output overrides correctly.
9. The About dialog displays the current app version.
10. The About dialog provides a View changelog action.
11. Changelog opens in a separate accessible in-app dialog.
12. Existing About, editor, preview, copy, theme, and grid behavior remains unchanged.
13. No backend, cloud synchronization, PWA manifest, or install behavior is added.
