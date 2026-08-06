import { describe, expect, it } from "vitest";
import { parseCatalog } from "../../src/server/catalog.ts";
import {
  buildIndex,
  buildToolFile,
  contentEquals,
  filterReleases,
  MAX_RELEASES_PER_TOOL,
  mergeReleases,
  normalizeRelease,
  releaseMatchesConfig,
  NOTES_MAX_LENGTH,
  stableStringify,
  type RawGitHubRelease,
} from "../../src/domain/releases.ts";
import type { Release } from "../../src/domain/types.ts";

function rawRelease(overrides: Partial<RawGitHubRelease> = {}): RawGitHubRelease {
  return {
    id: 1,
    tag_name: "v1.0.0",
    name: "v1.0.0",
    body: "notes",
    draft: false,
    prerelease: false,
    published_at: "2026-07-01T10:00:00Z",
    created_at: "2026-07-01T09:00:00Z",
    html_url: "https://github.com/acme/tool/releases/tag/v1.0.0",
    ...overrides,
  };
}

function release(overrides: Partial<Release> = {}): Release {
  return { ...normalizeRelease(rawRelease()), ...overrides };
}

const tool = parseCatalog(`
schemaVersion: 1
tools:
  - id: acme
    name: Acme
    category: kubernetes
    repository: acme/tool
    description: test tool
    release:
      includePrerelease: false
      tagPattern: "^v\\\\d+\\\\.\\\\d+\\\\.\\\\d+$"
      ignorePattern: "^v0\\\\."
`).tools[0];

describe("normalizeRelease", () => {
  it("maps GitHub fields to the release shape", () => {
    const r = normalizeRelease(rawRelease());
    expect(r).toMatchObject({
      id: 1,
      version: "v1.0.0",
      channel: "stable",
      publishedAt: "2026-07-01T10:00:00Z",
      notes: "notes",
    });
  });

  it("falls back to created_at when published_at is null", () => {
    const r = normalizeRelease(rawRelease({ published_at: null }));
    expect(r.publishedAt).toBe("2026-07-01T09:00:00Z");
  });

  it("marks prereleases and truncates long notes", () => {
    const r = normalizeRelease(
      rawRelease({ prerelease: true, body: "x".repeat(NOTES_MAX_LENGTH + 5) }),
    );
    expect(r.channel).toBe("prerelease");
    expect(r.notes).toContain("…(truncated)");
    expect(r.notes!.length).toBeLessThan(NOTES_MAX_LENGTH + 100);
  });

  it("normalizes empty notes to null", () => {
    expect(normalizeRelease(rawRelease({ body: "  " })).notes).toBeNull();
    expect(normalizeRelease(rawRelease({ body: null })).notes).toBeNull();
  });
});

describe("filterReleases", () => {
  it("drops drafts, prereleases, non-matching and ignored tags", () => {
    const raws = [
      rawRelease({ id: 1, tag_name: "v1.2.3" }),
      rawRelease({ id: 2, tag_name: "v1.2.4", draft: true }),
      rawRelease({ id: 3, tag_name: "v1.2.5-rc.1", prerelease: true }),
      rawRelease({ id: 4, tag_name: "v1.3.0-beta.1" }), // fails tagPattern
      rawRelease({ id: 5, tag_name: "v0.9.0" }), // matches ignorePattern
      rawRelease({ id: 6, tag_name: "v2.0.0" }),
    ];
    const result = filterReleases(raws, tool);
    expect(result.map((r) => r.id)).toEqual([1, 6]);
  });

  it("keeps prereleases when includePrerelease is true", () => {
    const permissive = {
      ...tool,
      release: { ...tool.release, includePrerelease: true, tagPattern: undefined },
    };
    const raws = [rawRelease({ id: 1, tag_name: "v1.0.0-rc.1", prerelease: true })];
    expect(filterReleases(raws, permissive)).toHaveLength(1);
  });
});

describe("mergeReleases", () => {
  it("dedupes by id with incoming winning", () => {
    const existing = [release({ id: 1, notes: "old" })];
    const incoming = [release({ id: 1, notes: "edited" })];
    const merged = mergeReleases(existing, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].notes).toBe("edited");
  });

  it("sorts newest first with deterministic tie-break on id", () => {
    const a = release({ id: 1, publishedAt: "2026-07-01T10:00:00Z" });
    const b = release({ id: 2, publishedAt: "2026-07-02T10:00:00Z" });
    const c = release({ id: 3, publishedAt: "2026-07-02T10:00:00Z" });
    const merged = mergeReleases([a], [b, c]);
    expect(merged.map((r) => r.id)).toEqual([3, 2, 1]);
  });

  it("caps history at the maximum", () => {
    const existing = Array.from({ length: 15 }, (_, i) =>
      release({ id: i, publishedAt: `2026-06-${String(i + 1).padStart(2, "0")}T00:00:00Z` }),
    );
    const incoming = Array.from({ length: 10 }, (_, i) =>
      release({ id: 100 + i, publishedAt: `2026-07-${String(i + 1).padStart(2, "0")}T00:00:00Z` }),
    );
    const merged = mergeReleases(existing, incoming);
    expect(merged).toHaveLength(MAX_RELEASES_PER_TOOL);
    expect(merged[0].id).toBe(109); // newest kept
    expect(merged.at(-1)!.id).toBe(5); // oldest overflow dropped
  });

  it("is idempotent: re-merging the same input changes nothing", () => {
    const incoming = [release({ id: 1 }), release({ id: 2, publishedAt: "2026-07-05T00:00:00Z" })];
    const once = mergeReleases([], incoming);
    const twice = mergeReleases(once, incoming);
    expect(stableStringify(twice)).toBe(stableStringify(once));
  });
});

describe("releaseMatchesConfig", () => {
  it("applies config changes retroactively to stored releases", () => {
    const stored = release({ id: 1, version: "v1.2.3-rc.1", prerelease: true });
    expect(releaseMatchesConfig(stored, tool)).toBe(false); // prerelease + pattern
    expect(releaseMatchesConfig(release({ id: 2, version: "v1.2.3" }), tool)).toBe(true);
    expect(releaseMatchesConfig(release({ id: 3, version: "v0.1.0" }), tool)).toBe(false); // ignorePattern
  });
});

describe("contentEquals", () => {
  it("ignores generatedAt but catches release changes", () => {
    const releases = [release({ id: 1 })];
    const a = buildToolFile(tool, releases, "2026-07-01T00:00:00Z");
    const b = buildToolFile(tool, releases, "2026-07-29T00:00:00Z");
    expect(contentEquals(a, b)).toBe(true);

    const c = buildToolFile(tool, [release({ id: 2 })], a.generatedAt);
    expect(contentEquals(a, c)).toBe(false);
  });
});

describe("buildIndex", () => {
  const catalog = parseCatalog(`
schemaVersion: 1
groups:
  acme-family:
    name: Acme Family
tools:
  - id: acme
    name: Acme
    category: kubernetes
    repository: acme/tool
    description: test tool
    homepage: https://acme.dev
    group: acme-family
  - id: idle
    name: Idle
    category: security
    repository: idle/idle
    description: never synced
  - id: off
    name: Off
    category: security
    repository: off/off
    description: disabled
    enabled: false
`);

  it("computes latest, previous and releaseCount per enabled tool", () => {
    const latest = release({ id: 2, version: "v2.0.0", publishedAt: "2026-07-10T00:00:00Z" });
    const prev = release({ id: 1, version: "v1.0.0" });
    const files = new Map([
      ["acme", buildToolFile(catalog.tools[0], [latest, prev], "2026-07-10T00:00:00Z")],
      ["idle", null],
    ]);
    const index = buildIndex(catalog, files, "2026-07-10T00:00:00Z");

    expect(index.tools.map((t) => t.id)).toEqual(["acme", "idle"]); // disabled excluded
    const acme = index.tools[0];
    expect(acme.latest?.version).toBe("v2.0.0");
    expect(acme.latest).not.toHaveProperty("notes");
    expect(acme.previous).toEqual({ version: "v1.0.0", publishedAt: prev.publishedAt });
    expect(acme.releaseCount).toBe(2);
    expect(index.tools[1].latest).toBeNull();
    expect(index.tools[1].releaseCount).toBe(0);
  });

  it("attaches group info and omits it for ungrouped tools", () => {
    const index = buildIndex(catalog, new Map(), "2026-07-10T00:00:00Z");
    expect(index.tools[0].group).toEqual({
      id: "acme-family",
      name: "Acme Family",
    });
    expect(index.tools[1]).not.toHaveProperty("group");
  });
});

describe("stableStringify", () => {
  it("is key-order independent and ends with a newline", () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(
      stableStringify({ a: { c: 3, d: 2 }, b: 1 }),
    );
    expect(stableStringify({ a: 1 }).endsWith("\n")).toBe(true);
  });
});
