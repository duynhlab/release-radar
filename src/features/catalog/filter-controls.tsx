import { CATEGORY_LABELS, type Category } from "@/domain/types";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { SORT_KEYS, type HomeSearch, type SortKey } from "./search-params";

export function CategoryChips({
  categories,
  selected,
  onSelect,
}: {
  categories: readonly Category[];
  selected: Category | "all";
  onSelect: (next: Category | "all") => void;
}) {
  const options: Array<Category | "all"> = ["all", ...categories];
  return (
    // Horizontal scroller on narrow screens. No tabIndex on the scroller: the
    // buttons inside are already focusable, which satisfies
    // scrollable-region-focusable, and a tab stop here would be dead weight.
    // The -mx-4 px-4 bleed keeps a clipped chip from creating horizontal page
    // overflow at 390px; the mask fades the cut edge instead of slicing a chip
    // in half, so it reads as "more to the right" rather than as a bug.
    //
    // It wraps at `cards` (900px), not `sm`. With 11 categories the labels are
    // long enough that 640–899px wrapped to three rows — 96px of chips above
    // the results. Scrolling one 28px row until there is room for two is the
    // better trade, and it reuses the breakpoint the grid already switches on.
    <div
      role="group"
      aria-label="Filter by category"
      className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)] [scrollbar-width:none] cards:mx-0 cards:flex-wrap cards:px-0 cards:[mask-image:none]"
      style={{ scrollSnapType: "x proximity" }}
    >
      {options.map((option) => {
        const active = selected === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            aria-pressed={active}
            className={cn(
              "inline-flex h-7 shrink-0 items-center rounded-control px-2.5 text-control font-medium transition-colors",
              active
                ? "bg-accent text-accent-fg"
                : "bg-surface text-fg-muted hover:bg-surface-hover hover:text-fg",
            )}
          >
            {option === "all" ? "All" : CATEGORY_LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}

/**
 * `idPrefix` keeps the desktop instance and the Sheet instance from emitting
 * duplicate element ids — both are in the DOM at once during the Sheet's exit
 * animation, which would break label association and trip axe.
 */
export function FilterControls({
  idPrefix,
  search,
  tags,
  onChange,
}: {
  idPrefix: string;
  search: HomeSearch;
  tags: readonly string[];
  onChange: (patch: Partial<HomeSearch>) => void;
}) {
  const tagKnown = search.tag === "all" || tags.includes(search.tag);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        id={`${idPrefix}-tag`}
        label="Filter by tag"
        value={search.tag}
        onChange={(e) => onChange({ tag: e.target.value })}
      >
        <option value="all">All tags</option>
        {/* An unrecognised tag from the URL still shows, so the control
            reflects the URL instead of silently lying about it. */}
        {!tagKnown ? (
          <option value={search.tag} disabled>
            {search.tag} (no matches)
          </option>
        ) : null}
        {tags.map((tag) => (
          <option key={tag} value={tag}>
            {tag}
          </option>
        ))}
      </NativeSelect>

      <NativeSelect
        id={`${idPrefix}-sort`}
        label="Sort order"
        value={search.sort}
        onChange={(e) => onChange({ sort: e.target.value as SortKey })}
      >
        {SORT_KEYS.map((key) => (
          <option key={key} value={key}>
            {key === "latest" ? "Latest release" : "Name"}
          </option>
        ))}
      </NativeSelect>

      <Button
        variant={search.favorites ? "soft" : "outline"}
        size="md"
        aria-pressed={search.favorites}
        onClick={() => onChange({ favorites: !search.favorites })}
        className={cn(search.favorites && "text-star")}
      >
        ★ Favorites
      </Button>
    </div>
  );
}
