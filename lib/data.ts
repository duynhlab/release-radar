import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  IndexSchema,
  ToolReleasesFileSchema,
  type IndexTool,
  type ReleaseIndex,
  type ToolReleasesFile,
} from "./types.ts";

// Build-time readers over the generated data/ directory. These run only
// during `next build` (all routes are fully static) — never on the worker.
// Do NOT import the JSON directly: that would bundle every release note
// into the worker script and blow the size budget.

const DATA_DIR = path.join(process.cwd(), "data");

let indexCache: ReleaseIndex | null = null;

export function getIndex(): ReleaseIndex {
  if (!indexCache) {
    const raw = readFileSync(path.join(DATA_DIR, "index.json"), "utf8");
    indexCache = IndexSchema.parse(JSON.parse(raw));
  }
  return indexCache;
}

export function getIndexTool(id: string): IndexTool | undefined {
  return getIndex().tools.find((tool) => tool.id === id);
}

export function getToolReleases(id: string): ToolReleasesFile | null {
  // Ids come from the validated index (generateStaticParams), but keep the
  // path safe against separators anyway.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) return null;
  const filePath = path.join(DATA_DIR, "releases", `${id}.json`);
  if (!existsSync(filePath)) return null;
  return ToolReleasesFileSchema.parse(JSON.parse(readFileSync(filePath, "utf8")));
}
