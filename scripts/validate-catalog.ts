import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CatalogError, enabledTools, loadCatalog } from "../lib/catalog.ts";
import { CatalogSchema } from "../lib/types.ts";

const SCHEMA_PATH = path.join(process.cwd(), "schemas", "tool.schema.json");

function regenerateJsonSchema(): void {
  const jsonSchema = z.toJSONSchema(CatalogSchema, {
    target: "draft-7",
    io: "input",
  });
  mkdirSync(path.dirname(SCHEMA_PATH), { recursive: true });
  writeFileSync(SCHEMA_PATH, JSON.stringify(jsonSchema, null, 2) + "\n");
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
