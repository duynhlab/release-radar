import { parseMarkdown } from "@tanstack/markdown/parser";
import { renderMarkdownReact } from "@tanstack/markdown/react";
import type { MarkdownDocument } from "@tanstack/markdown";
import type { ReactNode } from "react";
import { NOTE_COMPONENTS } from "@/components/releases/markdown-components";
import { NOTES_MARKDOWN_OPTIONS } from "./markdown-options";
import { autolinkNotes } from "./note-autolink";

/**
 * The AST seam between parse and render. `repository` is the tool's catalog
 * entry, needed because `#123` and a bare SHA are repo-relative — GitHub reads
 * them against the repo the note belongs to, and so do we.
 */
export function transformNotes(
  document: MarkdownDocument,
  repository: string,
): MarkdownDocument {
  return autolinkNotes(document, repository);
}

export function parseReleaseNotes(
  markdown: string,
  repository: string,
): MarkdownDocument {
  return transformNotes(
    parseMarkdown(markdown, NOTES_MARKDOWN_OPTIONS),
    repository,
  );
}

export function renderReleaseNotes(
  markdown: string,
  repository: string,
): ReactNode {
  return renderMarkdownReact(parseReleaseNotes(markdown, repository), {
    ...NOTES_MARKDOWN_OPTIONS,
    components: NOTE_COMPONENTS,
  });
}
