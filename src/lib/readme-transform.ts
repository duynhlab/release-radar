import type { MarkdownDocument } from "@tanstack/markdown";

/**
 * Normalize README heading depths so the rendered document slots into the
 * page's outline without axe heading-order violations.
 *
 * READMEs use arbitrary levels — some start at "#", others at "###", many
 * skip levels. Unlike release notes (20 documents per page, headings demoted
 * to styled <p>), a README is one long document where a real outline earns
 * its keep. The distinct depths that actually occur are remapped, in order,
 * to h3, h4, h5, h6 — h1 is the tool name and h2 the section heading, so
 * content starts at 3, and skips are structurally impossible afterwards.
 *
 * Runs on the AST between parse and render, same seam as note-autolink.
 * Kept free of React imports so the corpus audit script can use it.
 */

const BASE_DEPTH = 3;

export function normalizeReadmeHeadings(
  document: MarkdownDocument,
): MarkdownDocument {
  const depths = new Set<number>();
  collectDepths(document, depths);
  if (depths.size === 0) return document;

  const remap = new Map(
    [...depths]
      .sort((a, b) => a - b)
      .map((depth, i) => [depth, Math.min(BASE_DEPTH + i, 6)]),
  );
  return transform(document, remap) as MarkdownDocument;
}

function collectDepths(node: unknown, depths: Set<number>): void {
  if (Array.isArray(node)) {
    for (const child of node) collectDepths(child, depths);
    return;
  }
  if (!node || typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  if (record.type === "heading" && typeof record.depth === "number") {
    depths.add(record.depth);
    return; // headings do not nest
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") collectDepths(value, depths);
  }
}

function transform(node: unknown, remap: Map<number, number>): unknown {
  if (Array.isArray(node)) {
    return node.map((child) => transform(child, remap));
  }
  if (!node || typeof node !== "object") return node;

  const record = node as Record<string, unknown>;
  if (record.type === "heading" && typeof record.depth === "number") {
    return { ...record, depth: remap.get(record.depth) ?? record.depth };
  }
  const next: Record<string, unknown> = { ...record };
  for (const [key, value] of Object.entries(record)) {
    if (value && typeof value === "object") next[key] = transform(value, remap);
  }
  return next;
}
