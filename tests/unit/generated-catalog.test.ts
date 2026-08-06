import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateCatalogModule } from "../../scripts/lib/gen-catalog.ts";
import { buildPrerenderPages } from "../../src/lib/prerender-pages.ts";
import { CATEGORIES, IndexSchema } from "../../src/domain/types.ts";
import {
  getAllTags,
  getIndex,
  getSiblings,
  getTool,
  getToolsByCategory,
  getUsedCategories,
  isCategory,
} from "../../src/data/catalog.ts";

describe("generated catalog module", () => {
  it("is byte-identical on regeneration", async () => {
    // Determinism is what keeps the generated file out of every sync diff and
    // makes the dev watcher stable.
    const before = readFileSync(
      path.join(process.cwd(), "src", "generated", "catalog.ts"),
      "utf8",
    );
    const { changed } = await generateCatalogModule();
    const after = readFileSync(
      path.join(process.cwd(), "src", "generated", "catalog.ts"),
      "utf8",
    );
    expect(changed).toBe(false);
    expect(after).toBe(before);
  });

  it("still satisfies IndexSchema at runtime", () => {
    expect(() => IndexSchema.parse(getIndex())).not.toThrow();
  });
});

describe("catalog accessors", () => {
  const index = getIndex();

  it("looks a tool up by id", () => {
    const first = index.tools[0]!;
    expect(getTool(first.id)?.id).toBe(first.id);
    expect(getTool("definitely-not-a-tool")).toBeUndefined();
  });

  it("partitions tools across categories without loss", () => {
    const total = CATEGORIES.reduce(
      (sum, c) => sum + getToolsByCategory(c).length,
      0,
    );
    expect(total).toBe(index.tools.length);
  });

  it("sorts each category newest-first then by name", () => {
    for (const category of getUsedCategories()) {
      const tools = getToolsByCategory(category);
      const sorted = [...tools].sort(
        (a, b) =>
          (b.latest?.publishedAt ?? "").localeCompare(
            a.latest?.publishedAt ?? "",
          ) || a.name.localeCompare(b.name),
      );
      expect(tools.map((t) => t.id)).toEqual(sorted.map((t) => t.id));
    }
  });

  it("returns group siblings without the tool itself", () => {
    const grouped = index.tools.find((t) => t.group);
    expect(grouped, "expected at least one grouped tool").toBeDefined();
    const siblings = getSiblings(grouped!);
    expect(siblings.every((s) => s.id !== grouped!.id)).toBe(true);
    expect(siblings.every((s) => s.group?.id === grouped!.group?.id)).toBe(true);
  });

  it("returns no siblings for an ungrouped tool", () => {
    const solo = index.tools.find((t) => !t.group);
    expect(getSiblings(solo!)).toEqual([]);
  });

  it("validates category slugs", () => {
    expect(isCategory("observability")).toBe(true);
    expect(isCategory("nope")).toBe(false);
  });

  it("returns sorted, de-duplicated tags", () => {
    const tags = getAllTags();
    expect(tags).toEqual([...new Set(tags)].sort());
  });
});

describe("prerender page list", () => {
  it("covers home, every category and every tool exactly once", () => {
    const pages = buildPrerenderPages(getIndex());
    const paths = pages.map((p) => p.path);

    expect(paths).toHaveLength(1 + CATEGORIES.length + getIndex().tools.length);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain("/");
    for (const category of CATEGORIES) {
      expect(paths).toContain(`/categories/${category}`);
    }
    for (const tool of getIndex().tools) {
      expect(paths).toContain(`/tools/${tool.id}`);
    }
  });

  it("marks every page for prerender", () => {
    for (const page of buildPrerenderPages(getIndex())) {
      expect(page.prerender.enabled).toBe(true);
    }
  });
});
