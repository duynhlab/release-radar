import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Octokit } from "octokit";
import { z } from "zod";
import { enabledTools, loadCatalog } from "../src/server/catalog.ts";
import { splitRepository } from "../src/domain/repository.ts";
import {
  buildIndex,
  buildToolFile,
  contentEquals,
  filterReleases,
  mergeReleases,
  releaseMatchesConfig,
  stableStringify,
  type RawGitHubRelease,
} from "../src/domain/releases.ts";
import { buildReadmeFile, normalizeReadme } from "../src/domain/readme.ts";
import {
  IndexSchema,
  ToolReadmeFileSchema,
  ToolReleasesFileSchema,
  type Tool,
  type ToolReadme,
  type ToolReleasesFile,
} from "../src/domain/types.ts";

const DATA_DIR = path.join(process.cwd(), "data");
const RELEASES_DIR = path.join(DATA_DIR, "releases");
const READMES_DIR = path.join(DATA_DIR, "readmes");
const INDEX_PATH = path.join(DATA_DIR, "index.json");
const FETCH_WINDOW = 10;

// A corrupt or schema-invalid data file must not crash the whole sync run:
// warn, treat as absent, and let the fetch rebuild it.
function readJsonIfExists<T>(filePath: string, parse: (raw: unknown) => T): T | null {
  if (!existsSync(filePath)) return null;
  try {
    return parse(JSON.parse(readFileSync(filePath, "utf8")));
  } catch (err) {
    // A ZodError's `message` is the raw issue array as JSON — dozens of lines
    // of noise for what is usually one repeated problem. Prettify it, as
    // validate-catalog does, so the recovery path stays readable.
    const reason =
      err instanceof z.ZodError
        ? z.prettifyError(err)
        : err instanceof Error
          ? err.message
          : String(err);
    console.warn(`warn      ${path.basename(filePath)} is invalid, rebuilding:`);
    console.warn(reason);
    return null;
  }
}

async function fetchRawReleases(
  octokit: Octokit,
  tool: Tool,
): Promise<RawGitHubRelease[]> {
  const { owner, repo } = splitRepository(tool.repository);
  if (tool.release.strategy === "github-releases") {
    const { data } = await octokit.rest.repos.listReleases({
      owner,
      repo,
      per_page: FETCH_WINDOW,
    });
    return data as RawGitHubRelease[];
  }
  // github-tags fallback: tags have no publish date or notes; use the tag
  // commit date so ordering stays meaningful.
  const { data: tags } = await octokit.rest.repos.listTags({
    owner,
    repo,
    per_page: FETCH_WINDOW,
  });
  const releases: RawGitHubRelease[] = [];
  for (const tag of tags) {
    const { data: commit } = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: tag.commit.sha,
    });
    const date =
      commit.commit.committer?.date ?? commit.commit.author?.date ?? null;
    if (!date) continue;
    releases.push({
      id: tag.name,
      tag_name: tag.name,
      name: tag.name,
      body: null,
      draft: false,
      prerelease: false,
      published_at: date,
      created_at: date,
      html_url: `https://github.com/${tool.repository}/releases/tag/${tag.name}`,
    });
  }
  return releases;
}

/** A missing README is a valid repo state, not a fetch failure. */
async function fetchReadme(octokit: Octokit, tool: Tool): Promise<ToolReadme> {
  const { owner, repo } = splitRepository(tool.repository);
  try {
    const { data } = await octokit.rest.repos.getReadme({ owner, repo });
    // Files over 1 MB come back with encoding "none" and empty content;
    // a README that size is not worth a second raw-media-type request.
    const markdown =
      data.encoding === "base64"
        ? Buffer.from(data.content, "base64").toString("utf8")
        : "";
    return normalizeReadme(data.name, markdown, data.path, data.html_url);
  } catch (err) {
    if ((err as { status?: unknown }).status === 404) return null;
    throw err;
  }
}

/**
 * README sync is independent of release strategy (manual tools have READMEs
 * too) and follows the same rules as releases: never touch the existing file
 * on fetch errors, only advance generatedAt when content changed.
 */
async function syncReadme(
  octokit: Octokit,
  tool: Tool,
): Promise<"updated" | "unchanged" | "failed"> {
  const filePath = path.join(READMES_DIR, `${tool.id}.json`);
  const existing = readJsonIfExists(filePath, (raw) =>
    ToolReadmeFileSchema.parse(raw),
  );
  try {
    const readme = await fetchReadme(octokit, tool);
    const next = buildReadmeFile(tool, readme, existing?.generatedAt ?? "");
    if (existing && contentEquals(next, existing)) return "unchanged";
    next.generatedAt = new Date().toISOString();
    writeFileSync(filePath, stableStringify(next));
    console.log(`updated   ${tool.id} readme (${readme ? readme.path : "none"})`);
    return "updated";
  } catch (err) {
    console.error(
      `error     ${tool.id} readme: ${err instanceof Error ? err.message : String(err)}`,
    );
    return "failed";
  }
}

async function main(): Promise<void> {
  const catalog = loadCatalog();
  const tools = enabledTools(catalog);
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  mkdirSync(RELEASES_DIR, { recursive: true });
  mkdirSync(READMES_DIR, { recursive: true });

  const filesById = new Map<string, ToolReleasesFile | null>();
  let failures = 0;
  let updates = 0;
  let readmeUpdates = 0;
  let readmeFailures = 0;

  for (const tool of tools) {
    const readmeResult = await syncReadme(octokit, tool);
    if (readmeResult === "updated") readmeUpdates++;
    if (readmeResult === "failed") readmeFailures++;

    const filePath = path.join(RELEASES_DIR, `${tool.id}.json`);
    const existing = readJsonIfExists(filePath, (raw) =>
      ToolReleasesFileSchema.parse(raw),
    );

    if (tool.release.strategy === "manual") {
      filesById.set(tool.id, existing);
      console.log(`skip      ${tool.id} (manual strategy)`);
      continue;
    }

    try {
      const raws = await fetchRawReleases(octokit, tool);
      const incoming = filterReleases(raws, tool);
      // Re-filter stored history too, so catalog config changes (tightened
      // tagPattern, disabled prereleases) apply retroactively.
      const keptExisting = (existing?.releases ?? []).filter((r) =>
        releaseMatchesConfig(r, tool),
      );
      const merged = mergeReleases(keptExisting, incoming);
      const next = buildToolFile(tool, merged, existing?.generatedAt ?? "");

      if (existing && contentEquals(next, existing)) {
        filesById.set(tool.id, existing);
        console.log(`unchanged ${tool.id} (${merged.length} releases)`);
      } else {
        next.generatedAt = new Date().toISOString();
        writeFileSync(filePath, stableStringify(next));
        filesById.set(tool.id, next);
        updates++;
        console.log(
          `updated   ${tool.id} (${merged.length} releases, latest ${merged[0]?.version ?? "none"})`,
        );
      }
    } catch (err) {
      // Never touch the existing file on fetch errors — a flaky repo must
      // not wipe history or block the other tools.
      failures++;
      filesById.set(tool.id, existing);
      console.error(
        `error     ${tool.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const existingIndex = readJsonIfExists(INDEX_PATH, (raw) =>
    IndexSchema.parse(raw),
  );
  const nextIndex = buildIndex(
    catalog,
    filesById,
    existingIndex?.generatedAt ?? "",
  );
  if (existingIndex && contentEquals(nextIndex, existingIndex)) {
    console.log("unchanged index.json");
  } else {
    nextIndex.generatedAt = new Date().toISOString();
    writeFileSync(INDEX_PATH, stableStringify(nextIndex));
    console.log("updated   index.json");
  }

  console.log(
    `Done: ${tools.length} tools, ${updates} updated, ${failures} failed; readmes: ${readmeUpdates} updated, ${readmeFailures} failed`,
  );
  if (failures > 0 && failures === tools.length) {
    console.error("All tools failed to sync");
    process.exit(1);
  }
}

await main();
