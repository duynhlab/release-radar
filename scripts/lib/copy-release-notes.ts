import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const SRC_DIR = path.join(process.cwd(), "data", "releases");
const OUT_DIR = path.join(process.cwd(), "public", "release-notes");

/**
 * Publish data/releases/*.json as static assets.
 *
 * ~1.9 MB raw across 68 files. These must never enter the worker bundle, and
 * `node:fs` does not exist in any render context (prerender runs in workerd),
 * so route loaders fetch them over HTTP from the asset CDN instead.
 *
 * Write-if-different keeps the Vite dev watcher from looping; stale files are
 * deleted so a removed tool's notes do not linger in a deploy.
 */
export async function copyReleaseNotes(): Promise<{
  written: number;
  removed: number;
  total: number;
}> {
  mkdirSync(OUT_DIR, { recursive: true });

  const sources = existsSync(SRC_DIR)
    ? readdirSync(SRC_DIR).filter((f) => f.endsWith(".json"))
    : [];
  const wanted = new Set(sources);

  let written = 0;
  for (const file of sources) {
    const next = readFileSync(path.join(SRC_DIR, file), "utf8");
    const target = path.join(OUT_DIR, file);
    let current: string | null = null;
    try {
      current = readFileSync(target, "utf8");
    } catch {
      current = null;
    }
    if (current !== next) {
      writeFileSync(target, next);
      written += 1;
    }
  }

  let removed = 0;
  for (const file of readdirSync(OUT_DIR)) {
    if (file.endsWith(".json") && !wanted.has(file)) {
      rmSync(path.join(OUT_DIR, file));
      removed += 1;
    }
  }

  return { written, removed, total: sources.length };
}
