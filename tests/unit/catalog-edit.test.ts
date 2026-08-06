import { describe, expect, it } from "vitest";
import {
  appendToolToCatalog,
  buildToolEntry,
  CatalogEditError,
  countPatternMatches,
  deriveToolId,
  deriveToolName,
  normalizeRepository,
} from "../../src/server/catalog-edit.ts";
import { parseCatalog } from "../../src/server/catalog.ts";

const baseYaml = `# yaml-language-server: $schema=../schemas/tool.schema.json
schemaVersion: 1

groups:
  acme:
    name: Acme Corp

tools:
  - id: flux
    name: Flux
    category: gitops
    repository: fluxcd/flux2
    description: GitOps toolkit
    release:
      strategy: github-releases
      includePrerelease: false
      tagPattern: "^v\\\\d+\\\\.\\\\d+\\\\.\\\\d+$"
`;

const entry = buildToolEntry(
  { repository: "acme/tool", category: "kubernetes", tags: ["kubernetes"] },
  { description: "A tool", homepage: "https://acme.dev" },
);

describe("normalizeRepository", () => {
  it("accepts owner/repo and URL forms", () => {
    expect(normalizeRepository("acme/tool")).toBe("acme/tool");
    expect(normalizeRepository("https://github.com/acme/tool")).toBe("acme/tool");
    expect(normalizeRepository("https://github.com/acme/tool/releases")).toBe("acme/tool");
    expect(normalizeRepository("github.com/acme/tool.git")).toBe("acme/tool");
  });

  it("rejects unparseable input", () => {
    expect(() => normalizeRepository("not a repo")).toThrow(CatalogEditError);
    expect(() => normalizeRepository("https://gitlab.com/a/b")).toThrow(CatalogEditError);
  });
});

describe("deriveToolId / deriveToolName", () => {
  it("derives slugs and display names", () => {
    expect(deriveToolId("VictoriaMetrics/VictoriaMetrics")).toBe("victoriametrics");
    expect(deriveToolId("grafana/helm-charts")).toBe("helm-charts");
    expect(deriveToolName("kubernetes-sigs/external-dns")).toBe("External Dns");
  });
});

describe("buildToolEntry", () => {
  it("fills description and homepage from repo metadata", () => {
    expect(entry.description).toBe("A tool");
    expect(entry.homepage).toBe("https://acme.dev");
    expect(entry.id).toBe("tool");
    expect(entry.release.strategy).toBe("github-releases");
  });

  it("drops non-URL homepage and falls back on empty description", () => {
    const e = buildToolEntry(
      { repository: "acme/tool", category: "kubernetes" },
      { description: "  ", homepage: "not-a-url" },
    );
    expect(e.homepage).toBeUndefined();
    expect(e.description).toBe("Releases of acme/tool");
  });

  it("honors explicit id/name/tagPattern", () => {
    const e = buildToolEntry(
      {
        repository: "acme/tool",
        category: "ai",
        id: "my-id",
        name: "My Tool",
        tagPattern: "^release-",
      },
      { description: null, homepage: null },
    );
    expect(e.id).toBe("my-id");
    expect(e.name).toBe("My Tool");
    expect(e.release.tagPattern).toBe("^release-");
  });
});

describe("countPatternMatches", () => {
  const pgauditTags = ["19beta2", "18.0", "17.1", "17.1rc1", "16.1"];

  it("counts tags accepted by the pattern", () => {
    expect(countPatternMatches(pgauditTags, "^v\\d+\\.\\d+\\.\\d+$")).toBe(0);
    expect(countPatternMatches(pgauditTags, "^\\d+\\.\\d+(\\.\\d+)?$")).toBe(3);
    expect(countPatternMatches(["v1.0.0", "nightly"], "^v\\d+\\.\\d+\\.\\d+$")).toBe(1);
  });

  it("treats no pattern as match-all and handles empty input", () => {
    expect(countPatternMatches(pgauditTags)).toBe(5);
    expect(countPatternMatches([], "^v")).toBe(0);
  });
});

describe("appendToolToCatalog", () => {
  it("preserves the existing document and appends a valid entry", () => {
    const result = appendToolToCatalog(baseYaml, entry);
    expect(result.startsWith("# yaml-language-server:")).toBe(true);
    expect(result).toContain("id: flux");
    const catalog = parseCatalog(result);
    expect(catalog.tools.map((t) => t.id)).toEqual(["flux", "tool"]);
    expect(catalog.tools[1].tags).toEqual(["kubernetes"]);
  });

  it("round-trips through the strict schema", () => {
    const result = appendToolToCatalog(baseYaml, {
      ...entry,
      release: { ...entry.release, tagPattern: "^v\\d+\\.\\d+\\.\\d+$" },
    });
    const catalog = parseCatalog(result);
    expect(catalog.tools[1].release.tagPattern).toBe("^v\\d+\\.\\d+\\.\\d+$");
  });

  it("rejects duplicate ids", () => {
    const dup = { ...entry, id: "flux" };
    expect(() => appendToolToCatalog(baseYaml, dup)).toThrow(/already exists/);
  });

  it("rejects the same repository with the same release config", () => {
    const dup = buildToolEntry(
      {
        repository: "fluxcd/flux2",
        category: "gitops",
        id: "flux-again",
        tagPattern: "^v\\d+\\.\\d+\\.\\d+$",
      },
      { description: "x", homepage: null },
    );
    expect(() => appendToolToCatalog(baseYaml, dup)).toThrow(/already tracked/);
  });

  it("allows the same repository with a different tag pattern", () => {
    const other = buildToolEntry(
      {
        repository: "fluxcd/flux2",
        category: "gitops",
        id: "flux-charts",
        tagPattern: "^chart-",
      },
      { description: "x", homepage: null },
    );
    const result = appendToolToCatalog(baseYaml, other);
    expect(parseCatalog(result).tools).toHaveLength(2);
  });

  it("rejects an undeclared group", () => {
    const bad = { ...entry, group: "nope" };
    expect(() => appendToolToCatalog(baseYaml, bad)).toThrow(/unknown group/);
  });

  it("accepts a declared group", () => {
    const good = { ...entry, group: "acme" };
    const catalog = parseCatalog(appendToolToCatalog(baseYaml, good));
    expect(catalog.tools[1].group).toBe("acme");
  });
});
