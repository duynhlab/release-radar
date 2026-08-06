import { describe, expect, it } from "vitest";
import type { IndexTool } from "../../src/domain/types.ts";
import {
  DAY_MS,
  applyFilters,
  bucketByRecency,
  sortTools,
} from "../../src/features/catalog/filters.ts";
import {
  HOME_SEARCH_DEFAULTS,
  parseHomeSearch,
} from "../../src/features/catalog/search-params.ts";

function tool(over: Partial<IndexTool> & { id: string }): IndexTool {
  return {
    name: over.id,
    category: "platform",
    repository: `acme/${over.id}`,
    description: "",
    tags: [],
    latest: null,
    previous: null,
    releaseCount: 0,
    ...over,
  } as IndexTool;
}

function published(iso: string) {
  return {
    id: 1,
    version: "v1",
    name: null,
    channel: "stable" as const,
    publishedAt: iso,
    url: "https://github.com/acme/x/releases/tag/v1",
    draft: false,
    prerelease: false,
  };
}

const NO_FAVES = new Set<string>();

describe("applyFilters", () => {
  const tools = [
    tool({ id: "grafana", name: "Grafana", tags: ["dashboards"] }),
    tool({
      id: "loki",
      name: "Loki",
      group: { id: "grafana", name: "Grafana" },
      tags: ["logs"],
      category: "observability",
    }),
    tool({ id: "vault", name: "Vault", category: "security", tags: ["secrets"] }),
  ];

  it("matches on name, id, group name and tags", () => {
    const by = (q: string) =>
      applyFilters(tools, parseHomeSearch({ q }), NO_FAVES).map((t) => t.id);
    expect(by("graf")).toEqual(["grafana", "loki"]); // name + group name
    expect(by("vault")).toEqual(["vault"]);
    expect(by("logs")).toEqual(["loki"]); // tag, which the legacy app missed
    expect(by("GRAFANA")).toEqual(["grafana", "loki"]); // case-insensitive
  });

  it("intersects category and tag", () => {
    expect(
      applyFilters(
        tools,
        parseHomeSearch({ category: "observability", tag: "logs" }),
        NO_FAVES,
      ).map((t) => t.id),
    ).toEqual(["loki"]);
    expect(
      applyFilters(
        tools,
        parseHomeSearch({ category: "security", tag: "logs" }),
        NO_FAVES,
      ),
    ).toEqual([]);
  });

  it("filters to favorites only when asked", () => {
    const faves = new Set(["vault"]);
    expect(
      applyFilters(tools, parseHomeSearch({ favorites: true }), faves).map(
        (t) => t.id,
      ),
    ).toEqual(["vault"]);
  });
});

describe("sortTools", () => {
  it("sorts by name", () => {
    const out = sortTools(
      [tool({ id: "b", name: "Beta" }), tool({ id: "a", name: "Alpha" })],
      "name",
    );
    expect(out.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("sorts by latest release, newest first", () => {
    const out = sortTools(
      [
        tool({ id: "old", latest: published("2026-01-01T00:00:00Z") }),
        tool({ id: "new", latest: published("2026-06-01T00:00:00Z") }),
      ],
      "latest",
    );
    expect(out.map((t) => t.id)).toEqual(["new", "old"]);
  });

  it("breaks ties on name, so home and category agree", () => {
    // The legacy home page had no tiebreaker while the category page did, which
    // made identical timestamps order by whatever the engine happened to do.
    const same = "2026-06-01T00:00:00Z";
    const out = sortTools(
      [
        tool({ id: "z", name: "Zeta", latest: published(same) }),
        tool({ id: "a", name: "Alpha", latest: published(same) }),
      ],
      "latest",
    );
    expect(out.map((t) => t.id)).toEqual(["a", "z"]);
  });

  it("puts tools with no release last", () => {
    const out = sortTools(
      [tool({ id: "none" }), tool({ id: "some", latest: published("2026-01-01T00:00:00Z") })],
      "latest",
    );
    expect(out.map((t) => t.id)).toEqual(["some", "none"]);
  });

  it("is stable across repeated calls on a shuffled input", () => {
    const input = [
      tool({ id: "c", name: "C", latest: published("2026-01-01T00:00:00Z") }),
      tool({ id: "a", name: "A", latest: published("2026-01-01T00:00:00Z") }),
      tool({ id: "b", name: "B", latest: published("2026-01-01T00:00:00Z") }),
    ];
    const first = sortTools(input, "latest").map((t) => t.id);
    const second = sortTools([...input].reverse(), "latest").map((t) => t.id);
    expect(first).toEqual(second);
  });

  it("does not mutate its input", () => {
    const input = [tool({ id: "b", name: "B" }), tool({ id: "a", name: "A" })];
    sortTools(input, "name");
    expect(input.map((t) => t.id)).toEqual(["b", "a"]);
  });
});

describe("bucketByRecency", () => {
  const now = Date.parse("2026-06-10T12:00:00Z");
  const at = (offsetMs: number) =>
    published(new Date(now - offsetMs).toISOString());

  it("splits at exactly one day and one week", () => {
    const buckets = bucketByRecency(
      [
        tool({ id: "just-now", latest: at(0) }),
        tool({ id: "edge-today", latest: at(DAY_MS - 1) }),
        tool({ id: "edge-week-start", latest: at(DAY_MS) }),
        tool({ id: "edge-week-end", latest: at(7 * DAY_MS - 1) }),
        tool({ id: "older", latest: at(7 * DAY_MS) }),
      ],
      now,
    );
    expect(buckets.today.map((t) => t.id)).toEqual(["just-now", "edge-today"]);
    expect(buckets.week.map((t) => t.id)).toEqual([
      "edge-week-start",
      "edge-week-end",
    ]);
    expect(buckets.earlier.map((t) => t.id)).toEqual(["older"]);
  });

  it("always puts releaseless tools in earlier", () => {
    const buckets = bucketByRecency([tool({ id: "none" })], now);
    expect(buckets.earlier.map((t) => t.id)).toEqual(["none"]);
  });

  it("keeps every tool exactly once", () => {
    const tools = [
      tool({ id: "a", latest: at(0) }),
      tool({ id: "b", latest: at(2 * DAY_MS) }),
      tool({ id: "c", latest: at(30 * DAY_MS) }),
      tool({ id: "d" }),
    ];
    const b = bucketByRecency(tools, now);
    expect([...b.today, ...b.week, ...b.earlier]).toHaveLength(tools.length);
  });
});

describe("defaults", () => {
  it("returns everything unfiltered", () => {
    const tools = [tool({ id: "a" }), tool({ id: "b" })];
    expect(applyFilters(tools, HOME_SEARCH_DEFAULTS, NO_FAVES)).toHaveLength(2);
  });
});
