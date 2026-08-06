import { describe, expect, it } from "vitest";
import {
  getAllTags,
  getIndex,
  getTool,
  getToolsByCategory,
  isCategory,
} from "../../src/data/catalog.ts";

/**
 * Runs inside workerd, not Node.
 *
 * This is the test that actually proves the central constraint: if the catalog
 * path ever reached for node:fs, this module would fail to instantiate here
 * rather than 500 in production with a green build. The prerender pass runs in
 * workerd too, so "works in Node" was never sufficient evidence.
 */
describe("catalog inside the worker runtime", () => {
  it("is genuinely running on workerd, not Node", () => {
    expect(navigator.userAgent).toBe("Cloudflare-Workers");
  });

  it("loads the catalog with no filesystem access", () => {
    const index = getIndex();
    expect(index.tools.length).toBeGreaterThan(0);
    expect(index.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("resolves a tool by id", () => {
    const first = getIndex().tools[0]!;
    expect(getTool(first.id)?.name).toBe(first.name);
    expect(getTool("not-a-real-tool")).toBeUndefined();
  });

  it("serves category lookups", () => {
    expect(isCategory("observability")).toBe(true);
    expect(getToolsByCategory("observability").length).toBeGreaterThan(0);
  });

  it("exposes the tag vocabulary", () => {
    expect(getAllTags().length).toBeGreaterThan(0);
  });

  it("carries no release-note bodies", () => {
    // The index is the small half of the split; notes are static assets. If a
    // refactor started bundling them, the worker would balloon past its budget.
    for (const tool of getIndex().tools) {
      if (tool.latest) expect(tool.latest).not.toHaveProperty("notes");
    }
  });
});
