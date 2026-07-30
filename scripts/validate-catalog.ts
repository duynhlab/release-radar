import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { CatalogError, enabledTools, loadCatalog } from "../lib/catalog.ts";
import { CatalogSchema, type Catalog } from "../lib/types.ts";

const SCHEMA_PATH = path.join(process.cwd(), "schemas", "tool.schema.json");
const RELEASES_DIR = path.join(process.cwd(), "data", "releases");
const ADD_TOOL_WORKFLOW = path.join(
  process.cwd(),
  ".github",
  "workflows",
  "add-tool.yaml",
);

function regenerateJsonSchema(): void {
  const jsonSchema = z.toJSONSchema(CatalogSchema, {
    target: "draft-7",
    io: "input",
  });
  mkdirSync(path.dirname(SCHEMA_PATH), { recursive: true });
  writeFileSync(SCHEMA_PATH, JSON.stringify(jsonSchema, null, 2) + "\n");
}

/**
 * Every data/releases/*.json must belong to a catalog tool. An orphan means
 * the catalog and generated data have diverged (e.g. a tool entry was lost
 * in a bad merge or revert) — the next sync would silently drop the tool
 * from the site, so fail loudly here instead.
 */
function checkOrphanData(catalog: Catalog): string[] {
  if (!existsSync(RELEASES_DIR)) return [];
  const ids = new Set(catalog.tools.map((t) => t.id));
  return readdirSync(RELEASES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((id) => !ids.has(id));
}

/**
 * The Add tool workflow exposes groups as a static dropdown — keep it in
 * sync with the catalog's groups map.
 */
function checkWorkflowGroupOptions(catalog: Catalog): string | null {
  if (!existsSync(ADD_TOOL_WORKFLOW)) return null;
  const workflow = parse(readFileSync(ADD_TOOL_WORKFLOW, "utf8"));
  const options: string[] | undefined =
    workflow?.on?.workflow_dispatch?.inputs?.group?.options;
  if (!Array.isArray(options)) {
    return "add-tool.yaml: group input has no options list";
  }
  const expected = ["none", ...Object.keys(catalog.groups)].sort();
  const actual = [...options].sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    return `add-tool.yaml group dropdown is out of sync with catalog groups.\n  expected: ${expected.join(", ")}\n  actual:   ${actual.join(", ")}`;
  }
  return null;
}

function main(): void {
  let catalog;
  try {
    catalog = loadCatalog();
  } catch (err) {
    console.error(err instanceof CatalogError ? err.message : err);
    process.exit(1);
  }

  regenerateJsonSchema();

  const orphans = checkOrphanData(catalog);
  if (orphans.length > 0) {
    console.error(
      `Orphan release data (no catalog entry): ${orphans.join(", ")}\n` +
        "Either restore the tool in config/tools.yaml or delete the data file.",
    );
    process.exit(1);
  }

  const groupMismatch = checkWorkflowGroupOptions(catalog);
  if (groupMismatch) {
    console.error(groupMismatch);
    process.exit(1);
  }

  const enabled = enabledTools(catalog);
  console.log(
    `Catalog OK: ${catalog.tools.length} tools (${enabled.length} enabled)`,
  );
  for (const tool of catalog.tools) {
    const status = tool.enabled ? "" : " (disabled)";
    console.log(`  - ${tool.id} [${tool.category}] ${tool.repository}${status}`);
  }
}

main();
