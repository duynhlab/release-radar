import { describe, expect, it } from "vitest";
import {
  README_MAX_LENGTH,
  buildReadmeFile,
  isRenderableReadme,
  normalizeReadme,
} from "@/domain/readme";
import { ToolReadmeFileSchema, ToolSchema } from "@/domain/types";

const TOOL = ToolSchema.parse({
  id: "acme",
  name: "Acme",
  category: "kubernetes",
  repository: "acme/tool",
  description: "d",
});

const HTML_URL = "https://github.com/acme/tool/blob/main/README.md";

describe("isRenderableReadme", () => {
  it.each([
    ["README.md", true],
    ["readme.markdown", true],
    ["README.mdown", true],
    ["README.txt", true],
    ["README", true],
    ["README.rst", false],
    ["README.adoc", false],
    [".md", true], // dot at index 0 is a hidden file, not an extension
  ])("%s -> %s", (name, expected) => {
    expect(isRenderableReadme(name)).toBe(expected);
  });
});

describe("normalizeReadme", () => {
  it("keeps a markdown README and trims it", () => {
    const readme = normalizeReadme("README.md", "  # Hi  \n", "README.md", HTML_URL);
    expect(readme).toEqual({ markdown: "# Hi", path: "README.md", htmlUrl: HTML_URL });
  });

  it("returns null for non-markdown, empty content or missing html_url", () => {
    expect(normalizeReadme("README.rst", "x", "README.rst", HTML_URL)).toBeNull();
    expect(normalizeReadme("README.md", "   ", "README.md", HTML_URL)).toBeNull();
    expect(normalizeReadme("README.md", "x", "README.md", null)).toBeNull();
  });

  it("caps at README_MAX_LENGTH with the truncation marker", () => {
    const readme = normalizeReadme(
      "README.md",
      "y".repeat(README_MAX_LENGTH + 100),
      "README.md",
      HTML_URL,
    );
    expect(readme?.markdown.length).toBe(
      README_MAX_LENGTH + "\n\n…(truncated)".length,
    );
    expect(readme?.markdown.endsWith("…(truncated)")).toBe(true);
  });
});

describe("buildReadmeFile", () => {
  it("produces a schema-valid file, readme present or null", () => {
    const withReadme = buildReadmeFile(
      TOOL,
      { markdown: "# Hi", path: "README.md", htmlUrl: HTML_URL },
      "2026-08-13T00:00:00.000Z",
    );
    expect(ToolReadmeFileSchema.parse(withReadme)).toEqual(withReadme);

    const without = buildReadmeFile(TOOL, null, "2026-08-13T00:00:00.000Z");
    expect(ToolReadmeFileSchema.parse(without).readme).toBeNull();
  });
});

