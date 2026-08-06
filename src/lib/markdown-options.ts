import type { ParseOptions, RenderOptions } from "@tanstack/markdown";

/**
 * Release notes are third-party, hostile input. This is the ONLY markdown
 * configuration in the app; there is no second path.
 *
 * - `allowHtml: false` is load-bearing. With `true`, the React renderer switches
 *   to dangerouslySetInnerHTML for html/inlineHtml nodes. With `false` the
 *   parser never produces those nodes at all, so raw HTML arrives as text and
 *   React escapes it. A `<details>` in a note therefore renders as the visible
 *   literal string — inert, if not pretty.
 * - `headingIds: false` is load-bearing too, and less obvious. The default is
 *   ON, and a tool page renders up to 20 note documents — two notes with a
 *   "## Installation" heading would emit the same DOM id, an axe duplicate-id
 *   violation the legacy app never had. The headings are downgraded to <p>
 *   anyway, so the ids have no purpose.
 * - No extensions: an extension with renderHtml returns unsanitized HTML.
 * - No highlighter: highlighters insert trusted markup via
 *   dangerouslySetInnerHTML.
 *
 * TanStack Markdown is explicitly "not a general HTML sanitizer". Dropping
 * rehype-sanitize is only valid because raw HTML is off, the React renderer
 * emits ordinary values, and executable URL schemes are stripped by core.
 *
 * Kept free of React imports so `node scripts/audit-markdown-corpus.ts` can use
 * the exact same options the app renders with.
 */
export const NOTES_MARKDOWN_OPTIONS: Readonly<ParseOptions & RenderOptions> =
  Object.freeze({
    allowHtml: false,
    frontmatter: false,
    headingIds: false,
    headingAnchors: false,
    highlighter: undefined,
    extensions: [],
  });
