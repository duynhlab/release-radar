import { describe, expect, it } from "vitest";
import {
  HOME_SEARCH_DEFAULTS,
  activeFilterCount,
  canonicalHomePath,
  isFiltered,
  parseHomeSearch,
} from "../../src/features/catalog/search-params.ts";

describe("parseHomeSearch", () => {
  it("returns the defaults for an empty URL", () => {
    expect(parseHomeSearch({})).toEqual(HOME_SEARCH_DEFAULTS);
  });

  it("accepts every valid field", () => {
    expect(
      parseHomeSearch({
        q: "grafana",
        category: "observability",
        tag: "metrics",
        sort: "name",
        favorites: true,
      }),
    ).toEqual({
      q: "grafana",
      category: "observability",
      tag: "metrics",
      sort: "name",
      favorites: true,
    });
  });

  it("normalises one bad param without discarding its siblings", () => {
    // The whole point of the total function: a Zod schema handed straight to
    // validateSearch would throw here and drop the visitor into an error
    // boundary instead of just resetting the bad field.
    expect(parseHomeSearch({ category: "nope", sort: "name" })).toMatchObject({
      category: "all",
      sort: "name",
    });
  });

  it("never throws on hostile input", () => {
    const hostile: Array<Record<string, unknown>> = [
      { q: { nested: true } },
      { category: 42 },
      { sort: null },
      { favorites: "maybe" },
      { tag: "<script>alert(1)</script>" },
      { tag: "../../etc/passwd" },
    ];
    for (const input of hostile) {
      expect(() => parseHomeSearch(input)).not.toThrow();
    }
  });

  it("accepts boolean-ish favorites in string form", () => {
    expect(parseHomeSearch({ favorites: "true" }).favorites).toBe(true);
    expect(parseHomeSearch({ favorites: "1" }).favorites).toBe(true);
    expect(parseHomeSearch({ favorites: "false" }).favorites).toBe(false);
    expect(parseHomeSearch({ favorites: "0" }).favorites).toBe(false);
    expect(parseHomeSearch({ favorites: "yes" }).favorites).toBe(false);
  });

  it("trims and caps q", () => {
    expect(parseHomeSearch({ q: "  grafana  " }).q).toBe("grafana");
    // Over the cap the field is rejected and falls back, rather than silently
    // truncating to something the user did not type.
    expect(parseHomeSearch({ q: "x".repeat(300) }).q).toBe("");
  });

  it("lowercases tags and rejects unsafe ones", () => {
    expect(parseHomeSearch({ tag: "Kubernetes" }).tag).toBe("kubernetes");
    expect(parseHomeSearch({ tag: "<script>" }).tag).toBe("all");
    expect(parseHomeSearch({ tag: "a b" }).tag).toBe("all");
  });

  it("accepts an unknown but well-formed tag", () => {
    // Deliberate: the tag vocabulary lives in data/index.json, and coupling the
    // URL schema to it would make the schema impure and break as data changes.
    // An unknown tag simply matches nothing.
    expect(parseHomeSearch({ tag: "not-a-real-tag" }).tag).toBe("not-a-real-tag");
  });
});

describe("isFiltered / activeFilterCount", () => {
  it("is false for defaults", () => {
    expect(isFiltered(HOME_SEARCH_DEFAULTS)).toBe(false);
    expect(activeFilterCount(HOME_SEARCH_DEFAULTS)).toBe(0);
  });

  it("counts only the non-search facets", () => {
    const search = parseHomeSearch({ q: "x", category: "database", favorites: true });
    expect(isFiltered(search)).toBe(true);
    // q is visible in its own field, so it does not add to the Filters badge.
    expect(activeFilterCount(search)).toBe(2);
  });
});

describe("canonicalHomePath", () => {
  it("is bare for the default view", () => {
    expect(canonicalHomePath(HOME_SEARCH_DEFAULTS)).toBe("/");
  });

  it("includes non-default facets", () => {
    expect(
      canonicalHomePath(parseHomeSearch({ q: "grafana", category: "observability" })),
    ).toBe("/?q=grafana&category=observability");
  });

  it("never emits favorites, which is per-device state", () => {
    expect(canonicalHomePath(parseHomeSearch({ favorites: true }))).toBe("/");
  });
});
