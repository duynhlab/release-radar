import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { Category, IndexTool } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { CountPill } from "@/components/ui/count-pill";
import { SectionLabel } from "@/components/ui/section-label";
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
    <div className="space-y-5">
      <div className="space-y-2.5">
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
                  <CountPill tone="accent" className="ml-1">
                    {filterCount}
                  </CountPill>
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

        {/* role="status" on an always-present node so filter changes coalesce
            into one polite announcement rather than one per keystroke. The
            unfiltered total lives in the page metadata row, so repeating it
            here would be the same number twice on one screen. */}
        <div className="flex min-h-7 items-center gap-2">
          <p role="status" className="text-meta text-fg-muted">
            {filtered ? `${visible.length} of ${tools.length} tools` : ""}
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
          <p className="text-body font-medium text-fg">No tools match</p>
          <p className="mt-1 text-body text-fg-muted">
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
        <div className="space-y-7">
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
      <SectionLabel className="mb-2.5" count={tools.length}>
        {title}
      </SectionLabel>
      <ToolGrid tools={tools} />
    </section>
  );
}
