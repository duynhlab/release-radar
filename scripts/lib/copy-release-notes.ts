import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

interface CopyResult {
  written: number;
  removed: number;
  total: number;
}

/**
 * Publish a data/ directory of per-tool JSON as static assets under public/.
 *
 * These must never enter the worker bundle, and `node:fs` does not exist in
 * any render context (prerender runs in workerd), so route loaders fetch them
 * over HTTP from the asset CDN instead.
 *
 * Write-if-different keeps the Vite dev watcher from looping; stale files are
 * deleted so a removed tool's data does not linger in a deploy.
 */
function copyJsonAssets(srcDir: string, outDir: string): CopyResult {
  mkdirSync(outDir, { recursive: true });

  const sources = existsSync(srcDir)
    ? readdirSync(srcDir).filter((f) => f.endsWith(".json"))
    : [];
  const wanted = new Set(sources);

  let written = 0;
  for (const file of sources) {
    const next = readFileSync(path.join(srcDir, file), "utf8");
    const target = path.join(outDir, file);
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
  for (const file of readdirSync(outDir)) {
    if (file.endsWith(".json") && !wanted.has(file)) {
      rmSync(path.join(outDir, file));
      removed += 1;
    }
  }

  return { written, removed, total: sources.length };
}

/** data/releases/*.json → public/release-notes/ (~1.9 MB across 78 files). */
export async function copyReleaseNotes(): Promise<CopyResult> {
  return copyJsonAssets(
    path.join(process.cwd(), "data", "releases"),
    path.join(process.cwd(), "public", "release-notes"),
  );
}

/** data/readmes/*.json → public/readme-content/. */
export async function copyReadmes(): Promise<CopyResult> {
  return copyJsonAssets(
    path.join(process.cwd(), "data", "readmes"),
    path.join(process.cwd(), "public", "readme-content"),
  );
}
