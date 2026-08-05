import { describe, expect, it } from "vitest";
import {
  CatalogError,
  compileToolPatterns,
  enabledTools,
  loadCatalog,
  parseCatalog,
} from "../../src/server/catalog.ts";

const validYaml = `
schemaVersion: 1
tools:
  - id: flux
    name: Flux
    category: delivery
    repository: fluxcd/flux2
    description: GitOps toolkit for Kubernetes
    tags:
      - gitops
    release:
      strategy: github-releases
      includePrerelease: false
      tagPattern: "^v\\\\d+\\\\.\\\\d+\\\\.\\\\d+$"
`;

describe("parseCatalog", () => {
  it("parses a valid catalog and applies defaults", () => {
    const catalog = parseCatalog(validYaml);
    expect(catalog.tools).toHaveLength(1);
    const tool = catalog.tools[0];
    expect(tool.id).toBe("flux");
    expect(tool.enabled).toBe(true);
    expect(tool.release.strategy).toBe("github-releases");
    expect(tool.release.includePrerelease).toBe(false);
  });

  it("applies release defaults when release block is omitted", () => {
    const catalog = parseCatalog(`
schemaVersion: 1
tools:
  - id: helm
    name: Helm
    category: delivery
    repository: helm/helm
    description: Kubernetes package manager
`);
    expect(catalog.tools[0].release.strategy).toBe("github-releases");
    expect(catalog.tools[0].tags).toEqual([]);
  });

  it("rejects invalid YAML", () => {
    expect(() => parseCatalog("tools: [")).toThrow(CatalogError);
  });

  it("rejects duplicate tool ids", () => {
    const dup = `
schemaVersion: 1
tools:
  - id: flux
    name: Flux
    category: delivery
    repository: fluxcd/flux2
    description: a
  - id: flux
    name: Flux again
    category: delivery
    repository: fluxcd/flux2
    description: b
`;
    expect(() => parseCatalog(dup)).toThrow(/duplicate tool id/);
  });

  it("rejects a repository not in owner/repo form", () => {
    const bad = validYaml.replace("fluxcd/flux2", "not-a-repo");
    expect(() => parseCatalog(bad)).toThrow(CatalogError);
  });

  it("rejects an invalid tag pattern regex", () => {
    const bad = `
schemaVersion: 1
tools:
  - id: flux
    name: Flux
    category: delivery
    repository: fluxcd/flux2
    description: a
    release:
      tagPattern: "["
`;
    expect(() => parseCatalog(bad)).toThrow(/regular expression/);
  });

  it("rejects an unknown category", () => {
    const bad = validYaml.replace("category: delivery", "category: nonsense");
    expect(() => parseCatalog(bad)).toThrow(CatalogError);
  });
});

describe("groups", () => {
  it("accepts a tool referencing a declared group", () => {
    const catalog = parseCatalog(`
schemaVersion: 1
groups:
  acme:
    name: Acme Corp
    homepage: https://acme.dev
tools:
  - id: acme-server
    name: Acme Server
    category: platform
    repository: acme/server
    description: a
    group: acme
`);
    expect(catalog.tools[0].group).toBe("acme");
    expect(catalog.groups.acme.name).toBe("Acme Corp");
  });

  it("rejects a tool referencing an undeclared group", () => {
    const bad = `
schemaVersion: 1
tools:
  - id: acme-server
    name: Acme Server
    category: platform
    repository: acme/server
    description: a
    group: nonexistent
`;
    expect(() => parseCatalog(bad)).toThrow(/unknown group/);
  });

  it("defaults groups to an empty map", () => {
    const catalog = parseCatalog(validYaml);
    expect(catalog.groups).toEqual({});
  });
});

describe("enabledTools", () => {
  it("filters out disabled tools", () => {
    const catalog = parseCatalog(`
schemaVersion: 1
tools:
  - id: a
    name: A
    category: platform
    repository: a/a
    description: a
    enabled: false
  - id: b
    name: B
    category: platform
    repository: b/b
    description: b
`);
    expect(enabledTools(catalog).map((t) => t.id)).toEqual(["b"]);
  });
});

describe("compileToolPatterns", () => {
  it("compiles tag and ignore patterns", () => {
    const catalog = parseCatalog(validYaml);
    const { tagPattern, ignorePattern } = compileToolPatterns(catalog.tools[0]);
    expect(tagPattern?.test("v2.9.3")).toBe(true);
    expect(tagPattern?.test("v2.9.3-rc.1")).toBe(false);
    expect(ignorePattern).toBeUndefined();
  });
});

describe("real catalog file", () => {
  it("config/tools.yaml is valid", () => {
    const catalog = loadCatalog();
    expect(catalog.tools.length).toBeGreaterThanOrEqual(10);
    expect(enabledTools(catalog).length).toBeGreaterThanOrEqual(10);
  });
});
