import { releaseIndex } from "../generated/catalog.ts";
import {
  CATEGORIES,
  type Category,
  type IndexTool,
  type ReleaseIndex,
} from "../domain/types.ts";

// Isomorphic catalog access. No I/O, no Zod at runtime — the generated module
// was already validated with IndexSchema at generation time.
//
// ~8.5 KB gzipped, present in both the worker and the client bundle. The
// duplication is deliberate: home, category and detail between them consume
// nearly every field, so there is no useful projection, and shipping it buys
// zero-network client navigation across all 77 pages plus 404 decisions
// without a round trip.

const byId = new Map<string, IndexTool>(
  releaseIndex.tools.map((tool) => [tool.id, tool]),
);

/** Newest release first, then name — the one ordering used everywhere. */
function byLatestThenName(a: IndexTool, b: IndexTool): number {
  return (
    (b.latest?.publishedAt ?? "").localeCompare(a.latest?.publishedAt ?? "") ||
    a.name.localeCompare(b.name)
  );
}

const byCategory = new Map<Category, IndexTool[]>(
  CATEGORIES.map((category) => [
    category,
    releaseIndex.tools
      .filter((tool) => tool.category === category)
      .sort(byLatestThenName),
  ]),
);

export function getIndex(): ReleaseIndex {
  return releaseIndex;
}

export function getTool(id: string): IndexTool | undefined {
  return byId.get(id);
}

export function getToolsByCategory(category: Category): IndexTool[] {
  return byCategory.get(category) ?? [];
}

/** Tools sharing this tool's group, excluding itself. Sorted by name. */
export function getSiblings(tool: IndexTool): IndexTool[] {
  const groupId = tool.group?.id;
  if (!groupId) return [];
  return releaseIndex.tools
    .filter((t) => t.group?.id === groupId && t.id !== tool.id)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function isCategory(slug: string): slug is Category {
  return (CATEGORIES as readonly string[]).includes(slug);
}

/** Every distinct tag across the catalog, sorted. */
export function getAllTags(): string[] {
  return [...new Set(releaseIndex.tools.flatMap((t) => t.tags))].sort();
}

/** Categories that actually have tools, in CATEGORIES declaration order. */
export function getUsedCategories(): Category[] {
  const used = new Set(releaseIndex.tools.map((t) => t.category));
  return CATEGORIES.filter((c) => used.has(c));
}
