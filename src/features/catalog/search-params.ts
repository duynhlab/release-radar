import { z } from "zod";
import { CATEGORIES, type Category } from "@/domain/types";

export const SORT_KEYS = ["latest", "name"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface HomeSearch {
  q: string;
  category: Category | "all";
  tag: string;
  sort: SortKey;
  favorites: boolean;
}

/** What a caller may write. Every key optional — defaults are stripped. */
export type HomeSearchInput = Partial<HomeSearch>;

export const HOME_SEARCH_DEFAULTS: HomeSearch = {
  q: "",
  category: "all",
  tag: "all",
  sort: "latest",
  favorites: false,
};

/** Tags are catalog-authored slugs. Tight charset, but data-agnostic. */
const TAG_PATTERN = /^[a-z0-9][a-z0-9+#._-]{0,31}$/;

const booleanish = z.union([
  z.boolean(),
  z.literal("true").transform(() => true),
  z.literal("1").transform(() => true),
  z.literal("false").transform(() => false),
  z.literal("0").transform(() => false),
]);

const FIELDS = {
  q: z.string().trim().max(64),
  category: z.enum(["all", ...CATEGORIES]),
  // Unknown tags are accepted rather than rejected: the tag vocabulary comes
  // from data/index.json, and coupling this schema to it would make the schema
  // impure and break whenever the catalog changes. An unrecognised tag simply
  // matches zero tools, and Clear filters is always available.
  tag: z.union([
    z.literal("all"),
    z.string().trim().toLowerCase().regex(TAG_PATTERN),
  ]),
  sort: z.enum(SORT_KEYS),
  favorites: booleanish,
} satisfies { [K in keyof HomeSearch]: z.ZodType<HomeSearch[K]> };

/**
 * Total function: never throws, never rejects a whole URL over one bad param.
 *
 * A Zod schema handed straight to validateSearch throws on bad input and drops
 * the visitor into an error boundary — the opposite of "normalize safely". So
 * each field is validated independently and falls back to its default:
 * `?category=nope&sort=name` keeps sort=name and resets only the category.
 */
export function parseHomeSearch(raw: Record<string, unknown>): HomeSearch {
  const out: HomeSearch = { ...HOME_SEARCH_DEFAULTS };
  for (const key of Object.keys(FIELDS) as Array<keyof HomeSearch>) {
    const value = raw[key];
    if (value === undefined) continue;
    const result = FIELDS[key].safeParse(value);
    if (result.success) Object.assign(out, { [key]: result.data });
  }
  return out;
}

export function isFiltered(search: HomeSearch): boolean {
  return (Object.keys(HOME_SEARCH_DEFAULTS) as Array<keyof HomeSearch>).some(
    (key) => search[key] !== HOME_SEARCH_DEFAULTS[key],
  );
}

/** Badge count on the mobile Filters trigger. `q` is visible already. */
export function activeFilterCount(search: HomeSearch): number {
  return (["category", "tag", "sort", "favorites"] as const).filter(
    (key) => search[key] !== HOME_SEARCH_DEFAULTS[key],
  ).length;
}

/**
 * Canonical URL for a home view.
 *
 * Computed from normalized search rather than the raw URL, because
 * stripSearchParams removes defaults on navigation but does not rewrite a
 * hand-typed `/?category=all`. `favorites` is per-device state and never
 * canonical.
 */
export function canonicalHomePath(search: HomeSearch): string {
  const params = new URLSearchParams();
  for (const key of ["q", "category", "tag", "sort"] as const) {
    if (search[key] !== HOME_SEARCH_DEFAULTS[key]) {
      params.set(key, String(search[key]));
    }
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}
