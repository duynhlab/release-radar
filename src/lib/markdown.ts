import { parseMarkdown } from "@tanstack/markdown/parser";
import { renderMarkdownReact } from "@tanstack/markdown/react";
import type { MarkdownDocument, ParseOptions, RenderOptions } from "@tanstack/markdown";
import type { ReactNode } from "react";
import { NOTE_COMPONENTS } from "@/components/releases/markdown-components";

/**
 * Release notes are third-party, hostile input. This is the ONLY markdown
 * configuration in the app; there is no second path.
 *
 * - `allowHtml: false` is load-bearing. With `true`, the React renderer switches
 *   to dangerouslySetInnerHTML for html/inlineHtml nodes. With `false` the
 *   parser never produces those nodes at all, so raw HTML arrives as text and
 *   React escapes it. A `<details>` in a note therefore renders as the visible
 *   literal string, which is ugly but inert.
 * - `headingIds: false` is load-bearing too, and less obvious. The default is
 *   ON, and a tool page renders up to 20 note documents — two notes with a
 *   "## Installation" heading would emit the same DOM id, an axe duplicate-id
 *   violation that does not exist today. The headings are downgraded to <p>
 *   anyway, so the ids have no purpose.
 * - No extensions: an extension with renderHtml returns unsanitized HTML.
 * - No highlighter: highlighters insert trusted markup via
 *   dangerouslySetInnerHTML.
 *
 * TanStack Markdown is explicitly "not a general HTML sanitizer". Dropping
 * rehype-sanitize is only valid because raw HTML is off, the React renderer
 * emits ordinary values, and executable URL schemes are stripped by core.
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

/**
 * Pure AST seam. Identity in v1.
 *
 * This is where a `linkifyBareUrls` transform would go if the accepted
 * bare-URL regression (214 notes, 36 tools) ever becomes worth fixing — it
 * would be a custom parser over hostile input, so it needs its own fuzz
 * fixtures and must route through classifyNoteHref like every other link.
 */
export function transformNotes(document: MarkdownDocument): MarkdownDocument {
  return document;
}

export function parseReleaseNotes(markdown: string): MarkdownDocument {
  return transformNotes(parseMarkdown(markdown, NOTES_MARKDOWN_OPTIONS));
}

export function renderReleaseNotes(markdown: string): ReactNode {
  return renderMarkdownReact(parseReleaseNotes(markdown), {
    ...NOTES_MARKDOWN_OPTIONS,
    components: NOTE_COMPONENTS,
  });
}
