import { parseMarkdown } from "@tanstack/markdown/parser";
import { renderMarkdownReact } from "@tanstack/markdown/react";
import type { MarkdownDocument } from "@tanstack/markdown";
import type { ReactNode } from "react";
import { readmeComponents } from "@/components/readme/readme-components";
import { NOTE_COMPONENTS } from "@/components/releases/markdown-components";
import {
  NOTES_MARKDOWN_OPTIONS,
  README_MARKDOWN_OPTIONS,
} from "./markdown-options";
import { autolinkNotes } from "./note-autolink";
import { normalizeReadmeHeadings } from "./readme-transform";

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

/**
 * README pipeline: same parser posture as notes (allowHtml stays false — see
 * README_MARKDOWN_OPTIONS), no autolinking ("#1 in benchmarks" is prose, not
 * an issue reference), heading depths normalized to the page outline.
 */
export function parseReadme(markdown: string): MarkdownDocument {
  return normalizeReadmeHeadings(
    parseMarkdown(markdown, README_MARKDOWN_OPTIONS),
  );
}

export function renderReadme(markdown: string, repository: string): ReactNode {
  return renderMarkdownReact(parseReadme(markdown), {
    ...README_MARKDOWN_OPTIONS,
    components: readmeComponents(repository),
  });
}
