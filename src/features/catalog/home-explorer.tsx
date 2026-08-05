import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { Category, IndexTool } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { ToolGrid } from "@/components/catalog/tool-grid";
import { useFavorites } from "@/features/favorites/use-favorites";
import { useNow } from "@/lib/use-now";
import { applyFilters, bucketByRecency, sortTools } from "./filters";
import { CategoryChips, FilterControls } from "./filter-controls";
import { SearchField } from "./search-field";
import {
  activeFilterCount,
  isFiltered,
  type HomeSearch,
} from "./search-params";
import { useSetHomeSearch } from "./use-home-search";

export function HomeExplorer({
  tools,
  generatedAt,
  categories,
  tags,
  search,
}: {
  tools: readonly IndexTool[];
  generatedAt: string;
  categories: readonly Category[];
  tags: readonly string[];
  search: HomeSearch;
}) {
  const { favorites } = useFavorites();
  const { update, clear } = useSetHomeSearch();
  const [sheetOpen, setSheetOpen] = useState(false);
  const now = useNow(generatedAt);

  const visible = useMemo(
    () => sortTools(applyFilters(tools, search, favorites), search.sort),
    [tools, search, favorites],
  );
  const buckets = useMemo(() => bucketByRecency(visible, now), [visible, now]);

  const filtered = isFiltered(search);
  const filterCount = activeFilterCount(search);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchField
            value={search.q}
            // Typing replaces so a long query does not bury the previous page
            // under one history entry per keystroke.
            onChange={(q) => update({ q }, { replace: true })}
          />
          <div className="hidden md:block">
            <FilterControls
              idPrefix="desktop"
              search={search}
              tags={tags}
              onChange={(patch) => update(patch)}
            />
          </div>
          <Sheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            title="Filters"
            trigger={
              <Button variant="outline" size="md" className="md:hidden">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                Filters
                {filterCount > 0 ? (
                  <span className="ml-1 rounded-pill bg-accent px-1.5 text-xs text-accent-fg">
                    {filterCount}
                  </span>
                ) : null}
              </Button>
            }
            footer={
              <Button
                variant="solid"
                size="md"
                className="w-full"
                onClick={() => setSheetOpen(false)}
              >
                Show {visible.length} results
              </Button>
            }
          >
            <FilterControls
              idPrefix="sheet"
              search={search}
              tags={tags}
              onChange={(patch) => update(patch)}
            />
          </Sheet>
        </div>

        <CategoryChips
          categories={categories}
          selected={search.category}
          onSelect={(category) => update({ category })}
        />

        <div className="flex items-center gap-3">
          {/* role="status" on an always-present node, so filter changes coalesce
              into one polite announcement instead of one per keystroke. */}
          <p role="status" className="text-sm text-fg-muted">
            {visible.length === tools.length
              ? `${tools.length} tools`
              : `${visible.length} of ${tools.length} tools`}
          </p>
          {filtered ? (
            <Button variant="ghost" size="sm" onClick={clear}>
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      {visible.length === 0 ? (
        <div role="status" className="py-16 text-center">
          <p className="text-base font-medium text-fg">No tools match</p>
          <p className="mt-1 text-sm text-fg-muted">
            {search.favorites
              ? "You have no favorites matching these filters. Star a tool to pin it here."
              : "Try a different search term or clear the filters."}
          </p>
          {filtered ? (
            <Button variant="solid" size="md" className="mt-6" onClick={clear}>
              Clear filters
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-8">
          <Section title="Released today" tools={buckets.today} />
          <Section title="Released this week" tools={buckets.week} />
          <Section
            title={
              buckets.today.length + buckets.week.length > 0
                ? "Earlier"
                : "All tools"
            }
            tools={buckets.earlier}
          />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  tools,
}: {
  title: string;
  tools: readonly IndexTool[];
}) {
  if (tools.length === 0) return null;
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted">
        {title}
        <span className="ml-2 rounded-pill bg-surface-hover px-2 py-0.5 text-xs font-medium normal-case text-fg-muted">
          {tools.length}
        </span>
      </h2>
      <ToolGrid tools={tools} />
    </section>
  );
}
