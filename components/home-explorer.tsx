"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { Category, IndexTool } from "@/lib/types";
import { CategoryFilter } from "./category-filter";
import { SearchBox } from "./search-box";
import { ToolCard } from "./tool-card";
import { useFavorites } from "./use-favorites";

type SortKey = "latest" | "name";

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

// Clock store for the today/this-week buckets: minute granularity keeps the
// snapshot stable between renders, and the subscription re-buckets live.
function subscribeMinute(callback: () => void) {
  const id = setInterval(callback, 30_000);
  return () => clearInterval(id);
}
function getMinuteSnapshot(): number {
  return Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS;
}

function Section({
  title,
  tools,
  favorites,
  onToggleFavorite,
}: {
  title: string;
  tools: IndexTool[];
  favorites: ReadonlySet<string>;
  onToggleFavorite: (id: string) => void;
}) {
  if (tools.length === 0) return null;
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
        <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium normal-case text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {tools.length}
        </span>
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            isFavorite={favorites.has(tool.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </section>
  );
}

export function HomeExplorer({
  tools,
  generatedAt,
}: {
  tools: IndexTool[];
  generatedAt: string;
}) {
  // First render (build-time prerender AND hydration) must be deterministic,
  // so the server snapshot is the data timestamp; after hydration the
  // visitor's clock takes over.
  const now = useSyncExternalStore(subscribeMinute, getMinuteSnapshot, () =>
    new Date(generatedAt).getTime(),
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [tag, setTag] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("latest");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const { favorites, toggleFavorite } = useFavorites();

  const availableCategories = useMemo(
    () => new Set(tools.map((t) => t.category)),
    [tools],
  );
  const availableTags = useMemo(
    () => [...new Set(tools.flatMap((t) => t.tags))].sort(),
    [tools],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = tools.filter(
      (tool) =>
        (!q || tool.name.toLowerCase().includes(q) || tool.id.includes(q)) &&
        (category === "all" || tool.category === category) &&
        (tag === "all" || tool.tags.includes(tag)) &&
        (!onlyFavorites || favorites.has(tool.id)),
    );
    return result.sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : (b.latest?.publishedAt ?? "").localeCompare(a.latest?.publishedAt ?? ""),
    );
  }, [tools, query, category, tag, sort, onlyFavorites, favorites]);

  const releasedToday = filtered.filter(
    (t) => t.latest && now - new Date(t.latest.publishedAt).getTime() < DAY_MS,
  );
  const releasedThisWeek = filtered.filter(
    (t) =>
      t.latest &&
      !releasedToday.includes(t) &&
      now - new Date(t.latest.publishedAt).getTime() < 7 * DAY_MS,
  );
  const rest = filtered.filter(
    (t) => !releasedToday.includes(t) && !releasedThisWeek.includes(t),
  );

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <SearchBox value={query} onChange={setQuery} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="tag-filter" className="sr-only">
              Filter by tag
            </label>
            <select
              id="tag-filter"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <option value="all">All tags</option>
              {availableTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label htmlFor="sort-order" className="sr-only">
              Sort order
            </label>
            <select
              id="sort-order"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <option value="latest">Latest release</option>
              <option value="name">Name</option>
            </select>
            <button
              type="button"
              onClick={() => setOnlyFavorites((v) => !v)}
              aria-pressed={onlyFavorites}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                onlyFavorites
                  ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              ★ Favorites
            </button>
          </div>
        </div>
        <CategoryFilter
          selected={category}
          onChange={setCategory}
          availableCategories={availableCategories}
        />
      </div>

      {filtered.length === 0 ? (
        <div role="status" className="py-16 text-center">
          <p className="text-base font-medium">No tools match</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {onlyFavorites
              ? "You have no favorites matching these filters. Star a tool to pin it here."
              : "Try a different search term or clear the filters."}
          </p>
        </div>
      ) : (
        <>
          <Section
            title="Released today"
            tools={releasedToday}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
          <Section
            title="Released this week"
            tools={releasedThisWeek}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
          <Section
            title={
              releasedToday.length + releasedThisWeek.length > 0
                ? "Earlier"
                : "All tools"
            }
            tools={rest}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        </>
      )}
    </div>
  );
}
