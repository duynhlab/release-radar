import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { CatalogSchema, type Catalog, type Tool } from "../domain/types.ts";

export const CATALOG_PATH = path.join(process.cwd(), "config", "tools.yaml");

export class CatalogError extends Error {}

export function parseCatalog(yamlText: string): Catalog {
  let raw: unknown;
  try {
    raw = parse(yamlText);
  } catch (err) {
    throw new CatalogError(
      `tools.yaml is not valid YAML: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const result = CatalogSchema.safeParse(raw);
  if (!result.success) {
    throw new CatalogError(
      `tools.yaml failed validation:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

export function loadCatalog(filePath: string = CATALOG_PATH): Catalog {
  return parseCatalog(readFileSync(filePath, "utf8"));
}

export function enabledTools(catalog: Catalog): Tool[] {
  return catalog.tools.filter((tool) => tool.enabled);
}

// Re-exported so scripts and tests keep a single import site for catalog
// concerns. The implementation lives in domain/ because it is pure.
export { compileToolPatterns, type ToolPatterns } from "../domain/patterns.ts";
