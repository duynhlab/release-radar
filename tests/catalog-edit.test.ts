import { describe, expect, it } from "vitest";
import {
  appendToolToCatalog,
  buildToolEntry,
  CatalogEditError,
  deriveGroupName,
  deriveToolId,
  deriveToolName,
  ensureGroup,
  normalizeRepository,
} from "../lib/catalog-edit.ts";
import { parseCatalog } from "../lib/catalog.ts";

const baseYaml = `# yaml-language-server: $schema=../schemas/tool.schema.json
schemaVersion: 1

groups:
  acme:
    name: Acme Corp

tools:
  - id: flux
    name: Flux
    category: delivery
    repository: fluxcd/flux2
    description: GitOps toolkit
    release:
      strategy: github-releases
      includePrerelease: false
      tagPattern: "^v\\\\d+\\\\.\\\\d+\\\\.\\\\d+$"
`;

const entry = buildToolEntry(
  { repository: "acme/tool", category: "platform", tags: ["kubernetes"] },
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
      { repository: "acme/tool", category: "platform" },
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

describe("ensureGroup", () => {
  it("adds a new group to an existing groups map", () => {
    const { yaml, created } = ensureGroup(baseYaml, "pgbouncer", "PgBouncer");
    expect(created).toBe(true);
    const catalog = parseCatalog(yaml);
    expect(catalog.groups.pgbouncer).toEqual({ name: "PgBouncer" });
    expect(catalog.groups.acme.name).toBe("Acme Corp"); // untouched
    expect(yaml.startsWith("# yaml-language-server:")).toBe(true);
  });

  it("derives the display name from the slug when omitted", () => {
    const { yaml } = ensureGroup(baseYaml, "my-db-family");
    expect(parseCatalog(yaml).groups["my-db-family"].name).toBe("My Db Family");
    expect(deriveGroupName("victoria-metrics")).toBe("Victoria Metrics");
  });

  it("creates the groups map when the catalog has none", () => {
    const noGroups = baseYaml.replace(/groups:\n(  acme:\n    name: Acme Corp\n)\n/, "");
    expect(parseCatalog(noGroups).groups).toEqual({});
    const { yaml, created } = ensureGroup(noGroups, "acme", "Acme", "https://acme.dev");
    expect(created).toBe(true);
    expect(parseCatalog(yaml).groups.acme).toEqual({
      name: "Acme",
      homepage: "https://acme.dev",
    });
  });

  it("is a no-op when the group already exists", () => {
    const { yaml, created } = ensureGroup(baseYaml, "acme", "Different Name");
    expect(created).toBe(false);
    expect(yaml).toBe(baseYaml);
  });

  it("rejects invalid slugs", () => {
    expect(() => ensureGroup(baseYaml, "Not A Slug")).toThrow(CatalogEditError);
  });

  it("supports the full new-group + tool flow", () => {
    const { yaml } = ensureGroup(baseYaml, "acme-family");
    const catalog = parseCatalog(
      appendToolToCatalog(yaml, { ...entry, group: "acme-family" }),
    );
    expect(catalog.tools[1].group).toBe("acme-family");
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
        category: "delivery",
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
        category: "delivery",
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
