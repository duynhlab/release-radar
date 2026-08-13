import type { Tool, ToolReadme, ToolReadmeFile } from "./types.ts";

export const README_MAX_LENGTH = 30_000;

/**
 * GitHub's "preferred README" can be reStructuredText, AsciiDoc, etc. We only
 * have a markdown renderer, so anything else is treated as "no README" rather
 * than rendered as garbage. Plain text and extensionless files read fine as
 * markdown paragraphs.
 */
export function isRenderableReadme(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return true;
  const ext = name.slice(dot + 1).toLowerCase();
  return ["md", "markdown", "mdown", "txt"].includes(ext);
}

/**
 * Normalize an already-decoded README body. Decoding (base64 from the
 * contents API) happens in the sync script — this module stays free of
 * Node-only APIs like Buffer.
 */
export function normalizeReadme(
  name: string,
  markdown: string,
  path: string,
  htmlUrl: string | null,
): ToolReadme {
  if (!htmlUrl || !isRenderableReadme(name)) return null;
  const trimmed = markdown.trim();
  if (!trimmed) return null;
  return {
    markdown:
      trimmed.length > README_MAX_LENGTH
        ? trimmed.slice(0, README_MAX_LENGTH) + "\n\n…(truncated)"
        : trimmed,
    path,
    htmlUrl,
  };
}

export function buildReadmeFile(
  tool: Tool,
  readme: ToolReadme,
  generatedAt: string,
): ToolReadmeFile {
  return {
    schemaVersion: 1,
    generatedAt,
    tool: { id: tool.id, name: tool.name, repository: tool.repository },
    readme,
  };
}
