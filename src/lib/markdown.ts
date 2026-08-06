import { parseMarkdown } from "@tanstack/markdown/parser";
import { renderMarkdownReact } from "@tanstack/markdown/react";
import type { MarkdownDocument } from "@tanstack/markdown";
import type { ReactNode } from "react";
import { NOTE_COMPONENTS } from "@/components/releases/markdown-components";
import { NOTES_MARKDOWN_OPTIONS } from "./markdown-options";

export { NOTES_MARKDOWN_OPTIONS } from "./markdown-options";

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
