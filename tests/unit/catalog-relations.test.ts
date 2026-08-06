import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_RELEASES_PER_TOOL } from "../../src/domain/releases.ts";
import { splitRepository } from "../../src/domain/repository.ts";
import { CATEGORIES, IndexSchema, ToolReleasesFileSchema } from "../../src/domain/types.ts";
import { enabledTools, loadCatalog } from "../../src/server/catalog.ts";
import { listReleaseFileIds, getToolReleases } from "../../src/server/release-notes.ts";

// Integrity checks against the REAL committed catalog and data, not fixtures.
// These are what stop a bad sync or a hand-edit reaching production.

const catalog = loadCatalog();
const index = IndexSchema.parse(
  JSON.parse(
    readFileSync(path.join(process.cwd(), "data", "index.json"), "utf8"),
  ),
);

describe("catalog integrity", () => {
  it("has unique, well-formed tool ids", () => {
    const ids = catalog.tools.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9][a-z0-9-]*$/);
  });

  it("declares every group it references", () => {
    for (const tool of catalog.tools) {
      if (tool.group) expect(catalog.groups).toHaveProperty(tool.group);
    }
  });

  it("has parseable owner/repo for every tool", () => {
    for (const tool of catalog.tools) {
      expect(() => splitRepository(tool.repository)).not.toThrow();
    }
  });

  it("uses only declared categories", () => {
    for (const tool of catalog.tools) {
      expect(CATEGORIES).toContain(tool.category);
    }
  });
});

describe("index matches the catalog", () => {
  it("covers exactly the enabled tools, both directions", () => {
    const expected = new Set(enabledTools(catalog).map((t) => t.id));
    const actual = new Set(index.tools.map((t) => t.id));
    expect([...actual].filter((id) => !expected.has(id))).toEqual([]);
    expect([...expected].filter((id) => !actual.has(id))).toEqual([]);
  });

  it("never carries notes on the latest release", () => {
    // IndexToolSchema omits notes; if that ever regressed, index.json would
    // balloon and get bundled into the worker.
    for (const tool of index.tools) {
      if (tool.latest) expect(tool.latest).not.toHaveProperty("notes");
    }
  });

  it("keeps previous no newer than latest", () => {
    for (const tool of index.tools) {
      if (tool.latest && tool.previous) {
        expect(
          tool.previous.publishedAt.localeCompare(tool.latest.publishedAt),
        ).toBeLessThanOrEqual(0);
      }
    }
  });
});

describe("release files", () => {
  const ids = listReleaseFileIds();

  it("has no orphans", () => {
    const known = new Set(catalog.tools.map((t) => t.id));
    expect(ids.filter((id) => !known.has(id))).toEqual([]);
  });

  it("is internally consistent for every tool", () => {
    for (const id of ids) {
      const file = getToolReleases(id);
      expect(file, id).not.toBeNull();
      const parsed = ToolReleasesFileSchema.parse(file);

      expect(parsed.releases.length).toBeLessThanOrEqual(MAX_RELEASES_PER_TOOL);

      const releaseIds = parsed.releases.map((r) => String(r.id));
      expect(new Set(releaseIds).size, `${id} has duplicate release ids`).toBe(
        releaseIds.length,
      );

      // Newest first, with the id tie-break mergeReleases applies.
      const sorted = [...parsed.releases].sort(
        (a, b) =>
          b.publishedAt.localeCompare(a.publishedAt) ||
          String(b.id).localeCompare(String(a.id)),
      );
      expect(parsed.releases.map((r) => String(r.id)), `${id} is out of order`).toEqual(
        sorted.map((r) => String(r.id)),
      );

      const prefix = `https://github.com/${parsed.tool.repository}/`;
      for (const release of parsed.releases) {
        expect(release.url.startsWith(prefix), `${id} ${release.version}`).toBe(
          true,
        );
      }
    }
  });
});
