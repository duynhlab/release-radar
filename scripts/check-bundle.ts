import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { CATEGORIES, IndexSchema } from "../src/domain/types.ts";

/**
 * The only check that proves the central constraint on a real build:
 * the catalog index reaches the worker, and release notes never do.
 *
 * Notes are ~2.5 MB raw. If a refactor ever turns the asset fetch back into a
 * static import, everything still builds and the pages still render — the only
 * symptom is a fat worker. This makes it a hard failure instead.
 */

const SERVER_DIR = path.join(process.cwd(), "dist", "server");
const CLIENT_DIR = path.join(process.cwd(), "dist", "client");
const DATA_DIR = path.join(process.cwd(), "data");

// Workers' limit is 3 MiB gzipped. Budget well under it so growth is noticed.
const WORKER_GZIP_BUDGET = 1_000_000;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(path.join(dir, entry.name))
      : [path.join(dir, entry.name)],
  );
}

const failures: string[] = [];

const serverFiles = walk(SERVER_DIR).filter((f) => f.endsWith(".js"));
const serverSources = serverFiles.map((f) => ({
  file: path.relative(process.cwd(), f),
  text: readFileSync(f, "utf8"),
}));

// 1. The index must be present, or routes would be doing runtime I/O instead.
const index = IndexSchema.parse(
  JSON.parse(readFileSync(path.join(DATA_DIR, "index.json"), "utf8")),
);
const indexPresent = serverSources.some((s) =>
  s.text.includes(index.generatedAt),
);
if (!indexPresent) {
  failures.push(
    `catalog index not found in any server chunk (looked for generatedAt ${index.generatedAt})`,
  );
}

// 2. No release-note body may appear in any server chunk. Sample several tools
//    so this cannot pass by picking a lucky one.
const noteFiles = readdirSync(path.join(DATA_DIR, "releases")).filter((f) =>
  f.endsWith(".json"),
);
let sampled = 0;
for (const file of noteFiles.slice(0, 12)) {
  const parsed: unknown = JSON.parse(
    readFileSync(path.join(DATA_DIR, "releases", file), "utf8"),
  );
  const releases = (parsed as { releases?: Array<{ notes?: string | null }> })
    .releases;
  const notes = releases?.find((r) => (r.notes?.length ?? 0) > 80)?.notes;
  if (!notes) continue;
  sampled += 1;
  const probe = notes.slice(0, 80);
  const hit = serverSources.find((s) => s.text.includes(probe));
  if (hit) {
    failures.push(`release notes from ${file} leaked into ${hit.file}`);
  }
}
if (sampled === 0) {
  failures.push("no release notes were long enough to sample — check is vacuous");
}

// 2b. Same probe for READMEs — they ship as /readme-content assets and are the
//     other multi-megabyte corpus that must stay out of the worker. Not gated
//     on `sampled === 0` like notes: the READMEs directory may legitimately be
//     empty until the first post-feature sync runs.
const readmesDir = path.join(DATA_DIR, "readmes");
const readmeFiles = (() => {
  try {
    return readdirSync(readmesDir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
})();
let readmesSampled = 0;
for (const file of readmeFiles.slice(0, 12)) {
  const parsed: unknown = JSON.parse(
    readFileSync(path.join(readmesDir, file), "utf8"),
  );
  const markdown = (parsed as { readme?: { markdown?: string } | null }).readme
    ?.markdown;
  if (!markdown || markdown.length <= 80) continue;
  readmesSampled += 1;
  const probe = markdown.slice(0, 80);
  const hit = serverSources.find((s) => s.text.includes(probe));
  if (hit) {
    failures.push(`README from ${file} leaked into ${hit.file}`);
  }
}

// 3. Worker gzip budget.
const totalGzip = serverSources.reduce(
  (sum, s) => sum + gzipSync(Buffer.from(s.text)).length,
  0,
);
if (totalGzip > WORKER_GZIP_BUDGET) {
  failures.push(
    `worker bundle ${totalGzip} bytes gzipped exceeds budget ${WORKER_GZIP_BUDGET}`,
  );
}

// 4. Every expected page prerendered as a flat file (autoSubfolderIndex:false),
//    so the legacy "200, no redirect" URL contract holds.
const htmlCount = walk(CLIENT_DIR).filter((f) => f.endsWith(".html")).length;
// Derived, not literal: a hardcoded count silently goes stale the next time the
// taxonomy changes, and this check is the only thing guarding the page contract.
const expected = 1 + CATEGORIES.length + index.tools.length;
if (htmlCount !== expected) {
  failures.push(`prerendered ${htmlCount} pages, expected ${expected}`);
}

// 5. No GitHub credential may appear in anything shipped.
const secretPattern = /gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,}/;
for (const dir of [SERVER_DIR, CLIENT_DIR]) {
  for (const file of walk(dir)) {
    if (statSync(file).size > 8_000_000) continue;
    const text = readFileSync(file, "latin1");
    if (secretPattern.test(text)) {
      failures.push(`possible GitHub credential in ${path.relative(process.cwd(), file)}`);
    }
  }
}

console.log(`server chunks:      ${serverFiles.length}`);
console.log(`worker gzip:        ${totalGzip} bytes (budget ${WORKER_GZIP_BUDGET})`);
console.log(`catalog in worker:  ${indexPresent ? "yes" : "NO"}`);
console.log(`note bodies sampled:${sampled}, leaked: 0`);
console.log(`readmes sampled:    ${readmesSampled}`);
console.log(`prerendered pages:  ${htmlCount} (expected ${expected})`);

if (failures.length > 0) {
  console.error("\nBundle check failed:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nBundle check OK");
