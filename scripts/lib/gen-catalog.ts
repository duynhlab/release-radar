import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { stableStringify } from "../../src/domain/releases.ts";
import { IndexSchema, type ReleaseIndex } from "../../src/domain/types.ts";

const INDEX_PATH = path.join(process.cwd(), "data", "index.json");
const OUT_PATH = path.join(process.cwd(), "src", "generated", "catalog.ts");

/**
 * Emit data/index.json as a typed TS module the worker and the client can both
 * import. ~8.5 KB gzipped, so shipping it beats an RPC per navigation and lets
 * 404s be decided without a network hop.
 *
 * Two gates fall out for free:
 *   1. IndexSchema.parse here, so a malformed index fails the build.
 *   2. tsc structurally checking the emitted literal against ReleaseIndex, so a
 *      schema change the committed data violates fails `pnpm typecheck` rather
 *      than production.
 *
 * Gitignored: data/index.json is bot-rewritten twice a day and a committed
 * derivative would double every sync diff.
 */
export async function generateCatalogModule(): Promise<{
  releaseIndex: ReleaseIndex;
  changed: boolean;
}> {
  const result = IndexSchema.safeParse(
    JSON.parse(readFileSync(INDEX_PATH, "utf8")),
  );
  if (!result.success) {
    throw new Error(
      `data/index.json failed validation:\n${z.prettifyError(result.error)}`,
    );
  }
  const releaseIndex = result.data;

  // stableStringify sorts keys recursively, so regeneration is byte
  // deterministic and the file only churns when the data actually changes.
  const source = [
    "// GENERATED FILE — do not edit.",
    "// Source: data/index.json, validated with IndexSchema at generation time.",
    "// Regenerate: pnpm gen",
    'import type { ReleaseIndex } from "../domain/types.ts";',
    "",
    `export const releaseIndex: ReleaseIndex = ${stableStringify(releaseIndex).trimEnd()};`,
    "",
  ].join("\n");

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  let previous: string | null = null;
  try {
    previous = readFileSync(OUT_PATH, "utf8");
  } catch {
    previous = null;
  }
  const changed = previous !== source;
  if (changed) writeFileSync(OUT_PATH, source);

  return { releaseIndex, changed };
}
