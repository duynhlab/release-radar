import type { IndexTool } from "@/domain/types";
import type { HomeSearch } from "./search-params";

export const DAY_MS = 86_400_000;

export function applyFilters(
  tools: readonly IndexTool[],
  search: HomeSearch,
  favorites: ReadonlySet<string>,
): IndexTool[] {
  const q = search.q.trim().toLowerCase();
  return tools.filter((tool) => {
    if (q) {
      // Tags are searched too (new). Description stays out: "kubernetes" would
      // otherwise match half the catalog.
      const haystack =
        tool.name.toLowerCase() +
        " " +
        tool.id +
        " " +
        (tool.group?.name.toLowerCase() ?? "") +
        " " +
        tool.tags.join(" ");
      if (!haystack.includes(q)) return false;
    }
    if (search.category !== "all" && tool.category !== search.category) {
      return false;
    }
    if (search.tag !== "all" && !tool.tags.includes(search.tag)) return false;
    if (search.favorites && !favorites.has(tool.id)) return false;
    return true;
  });
}

/**
 * Sort, deterministically.
 *
 * `latest` gains the name tiebreaker the category page already had. Without it,
 * tools sharing a publishedAt ordered by whatever the engine's sort happened to
 * do, and home disagreed with category for the same data.
 */
export function sortTools(
  tools: readonly IndexTool[],
  sort: HomeSearch["sort"],
): IndexTool[] {
  return [...tools].sort((a, b) =>
    sort === "name"
      ? a.name.localeCompare(b.name)
      : (b.latest?.publishedAt ?? "").localeCompare(
          a.latest?.publishedAt ?? "",
        ) || a.name.localeCompare(b.name),
  );
}

export interface RecencyBuckets {
  today: IndexTool[];
  week: IndexTool[];
  earlier: IndexTool[];
}

/** Single pass; the legacy version was O(n²) via Array.includes on identity. */
export function bucketByRecency(
  tools: readonly IndexTool[],
  nowMs: number,
): RecencyBuckets {
  const buckets: RecencyBuckets = { today: [], week: [], earlier: [] };
  for (const tool of tools) {
    const published = tool.latest?.publishedAt;
    if (!published) {
      buckets.earlier.push(tool);
      continue;
    }
    const age = nowMs - new Date(published).getTime();
    if (age < DAY_MS) buckets.today.push(tool);
    else if (age < 7 * DAY_MS) buckets.week.push(tool);
    else buckets.earlier.push(tool);
  }
  return buckets;
}
