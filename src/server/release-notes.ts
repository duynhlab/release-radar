import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  ToolReleasesFileSchema,
  type ToolReleasesFile,
} from "../domain/types.ts";

// fs readers over the generated data/ directory.
//
// SCRIPTS AND TESTS ONLY. Nothing under src/routes/**, src/components/** or
// src/data/** may import this module.
//
// The prerender pass runs in workerd, not Node — `node:fs` fails there with
// "[unenv] fs.readFileSync is not implemented yet!". So there is no render
// context, prerender included, in which this file works. Release notes reach
// the app as static assets instead; see src/data/release-notes.ts.

export const DATA_DIR = path.join(process.cwd(), "data");
export const RELEASES_DIR = path.join(DATA_DIR, "releases");
export const INDEX_PATH = path.join(DATA_DIR, "index.json");

const TOOL_ID = /^[a-z0-9][a-z0-9-]*$/;

export function getToolReleases(id: string): ToolReleasesFile | null {
  // Ids come from the validated catalog, but keep the path safe anyway.
  if (!TOOL_ID.test(id)) return null;
  const filePath = path.join(RELEASES_DIR, `${id}.json`);
  if (!existsSync(filePath)) return null;
  return ToolReleasesFileSchema.parse(
    JSON.parse(readFileSync(filePath, "utf8")),
  );
}

/** Every tool id that has a committed release file. */
export function listReleaseFileIds(): string[] {
  if (!existsSync(RELEASES_DIR)) return [];
  return readdirSync(RELEASES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -".json".length))
    .sort();
}
