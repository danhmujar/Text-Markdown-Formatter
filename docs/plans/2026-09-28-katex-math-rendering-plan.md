# General KaTeX Math Rendering

## Summary

Replace the three-expression allowlist with locally bundled KaTeX support. Render common LaTeX math in preview and rich clipboard HTML while preserving the original LaTeX in plain text. “General LaTeX” means the [KaTeX-supported math subset](https://katex.org/docs/supported), not full LaTeX documents, packages, TikZ, or document commands.

## Implementation Changes

- Add local `katex@^0.18.9`, update `package-lock.json`, import its bundled CSS/fonts, and create a separate Vite `math` chunk. Do not use a CDN or modify the stale, noncanonical `bun.lock`.
- Replace the current exact-match tokenizer with shared math parsing for:
  - Inline: `$…$` and `\(…\)`
  - Display: `$$…$$` and `\[…\]`
  - Fractions, roots, scripts, symbols, matrices, and environments supported inside those delimiters
- Apply Markdown-style dollar boundaries: ignore escaped dollars, reject whitespace immediately inside inline dollar delimiters, and avoid treating currency such as `$5 and $10` as math.
- Keep code spans and fenced code literal. Require environments to be inside recognized delimiters rather than detecting bare `\begin{…}` blocks.
- Render with `trust: false`, bounded expansion/size, isolated macros, and accessible HTML+MathML. Invalid or unsupported expressions remain visible as their original source and produce a syntax warning rather than breaking the cell. KaTeX documents these security and failure controls in its [rendering options](https://katex.org/docs/options) and [error guidance](https://katex.org/docs/error).
- Protect complete math expressions from Smart Clean so whitespace, backslashes, underscores, ampersands, line breaks, and Markdown-like characters inside LaTeX remain byte-for-byte unchanged.
- Extend sanitization to allow safe KaTeX MathML and preserve only generated KaTeX classes/attributes. Keep URL-capable commands, injected styles, scripts, and unsafe protocols blocked.
- Import KaTeX styling locally for preview. Display equations inherit theme text color, remain centered, and scroll horizontally inside narrow cells without expanding the page.
- Include trusted KaTeX styling and HTML+MathML fallback in rich clipboard content. Keep the existing plain-text path unchanged so it retains the original delimiters and LaTeX.
- Update README capability documentation; retain historical changelog entries unchanged.

## Interfaces

- Keep `buildInlineStyledHtml`, `buildGridHtml`, clipboard APIs, workspace persistence, and `StyleOptions` signatures unchanged.
- Add internal math token/rendering utilities shared by the Markdown renderer, cleanup protection, and syntax validation.
- Extend `analyzeSyntaxWarnings` with unmatched-delimiter and KaTeX parse warnings.

## Test Plan

- Unit-test every delimiter, inline/display layout, fractions, roots, Greek symbols, scripts, matrices, multiline expressions, and the three previously supported expressions.
- Verify escaped delimiters, currency, inline/fenced code, malformed delimiters, unsupported commands, and invalid expressions remain readable.
- Verify Smart Clean preserves valid LaTeX exactly while continuing to clean surrounding prose.
- Verify preview HTML contains accessible KaTeX/MathML, rich clipboard HTML retains sanitized rendered math, and plain clipboard text retains source LaTeX.
- Add security cases for `\href`, `\includegraphics`, HTML commands, unsafe protocols, oversized dimensions, and excessive macro expansion.
- Add narrow-viewport and accessibility coverage for display-math overflow and readable MathML.
- Run `lint` → `typecheck` → `test` → `build` → `a11y:check`, using narrowly scoped per-command sandbox approval if Windows blocks child-process creation.

## Assumptions

- KaTeX is approved as a local runtime dependency; it includes its own TypeScript declarations.
- Rendering remains offline/PWA-compatible and makes no runtime network requests.
- Rich-copy fidelity is best-effort across Word, Outlook, Google Docs, and spreadsheets; the original LaTeX in `text/plain` remains the lossless fallback.
