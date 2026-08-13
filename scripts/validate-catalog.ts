import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { CatalogError, enabledTools, loadCatalog } from "../src/server/catalog.ts";
import {
  CATEGORIES,
  CatalogSchema,
  IndexSchema,
  type Catalog,
} from "../src/domain/types.ts";

const SCHEMA_PATH = path.join(process.cwd(), "schemas", "tool.schema.json");
const RELEASES_DIR = path.join(process.cwd(), "data", "releases");
const READMES_DIR = path.join(process.cwd(), "data", "readmes");
const INDEX_PATH = path.join(process.cwd(), "data", "index.json");
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
 * Every data/releases/*.json and data/readmes/*.json must belong to a catalog
 * tool. An orphan means the catalog and generated data have diverged (e.g. a
 * tool entry was lost in a bad merge or revert) — the next sync would silently
 * drop the tool from the site, so fail loudly here instead.
 */
function checkOrphanData(catalog: Catalog): string[] {
  const ids = new Set(catalog.tools.map((t) => t.id));
  const orphansIn = (dir: string): string[] =>
    existsSync(dir)
      ? readdirSync(dir)
          .filter((f) => f.endsWith(".json"))
          .map((f) => f.replace(/\.json$/, ""))
          .filter((id) => !ids.has(id))
      : [];
  return [...new Set([...orphansIn(RELEASES_DIR), ...orphansIn(READMES_DIR)])];
}

/**
 * The Add tool workflow exposes groups and categories as static dropdowns.
 * Nothing else can catch them drifting: a stale option is valid YAML, so the
 * workflow runs and only fails inside `scripts/add-tool.ts` — an Actions
 * failure long after the change that caused it, with CI still green.
 */
function checkWorkflowDropdown(
  input: string,
  expectedValues: readonly string[],
): string | null {
  if (!existsSync(ADD_TOOL_WORKFLOW)) return null;
  const workflow = parse(readFileSync(ADD_TOOL_WORKFLOW, "utf8"));
  const options: string[] | undefined =
    workflow?.on?.workflow_dispatch?.inputs?.[input]?.options;
  if (!Array.isArray(options)) {
    return `add-tool.yaml: ${input} input has no options list`;
  }
  // Order-insensitive: the dropdown's order is a UI choice, not a contract.
  const expected = [...expectedValues].sort();
  const actual = [...options].sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    return `add-tool.yaml ${input} dropdown is out of sync with the catalog.\n  expected: ${expected.join(", ")}\n  actual:   ${actual.join(", ")}`;
  }
  return null;
}

/**
 * data/index.json is what the build turns into src/generated/catalog.ts, and
 * IndexSchema failing there aborts `vite build`. This script previously
 * validated only config/tools.yaml, so a sync that produced a malformed index
 * passed every check the sync workflow ran and then broke the Cloudflare build
 * — where nobody is watching at 09:17.
 */
function checkIndex(): string | null {
  if (!existsSync(INDEX_PATH)) return null; // not yet synced; build will fail loudly
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  } catch (err) {
    return `data/index.json is not valid JSON: ${err instanceof Error ? err.message : String(err)}`;
  }
  const result = IndexSchema.safeParse(raw);
  return result.success
    ? null
    : `data/index.json failed validation:\n${z.prettifyError(result.error)}`;
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
      `Orphan data (no catalog entry): ${orphans.join(", ")}\n` +
        "Either restore the tool in config/tools.yaml or delete the data file.",
    );
    process.exit(1);
  }

  const indexError = checkIndex();
  if (indexError) {
    console.error(indexError);
    process.exit(1);
  }

  const dropdownMismatches = [
    checkWorkflowDropdown("group", ["none", ...Object.keys(catalog.groups)]),
    checkWorkflowDropdown("category", CATEGORIES),
  ].filter((m) => m !== null);
  if (dropdownMismatches.length > 0) {
    console.error(dropdownMismatches.join("\n"));
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
