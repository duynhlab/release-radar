import { readFileSync, writeFileSync } from "node:fs";
import { Octokit } from "octokit";
import {
  appendToolToCatalog,
  buildToolEntry,
  CatalogEditError,
  countPatternMatches,
  normalizeRepository,
  type AddToolInputs,
} from "../src/server/catalog-edit.ts";
import { CATALOG_PATH, loadCatalog } from "../src/server/catalog.ts";
import { CATEGORIES, type Category } from "../src/domain/types.ts";

function readInputs(): AddToolInputs {
  const repository = process.env.INPUT_REPOSITORY?.trim();
  const category = process.env.INPUT_CATEGORY?.trim() as Category | undefined;
  if (!repository) throw new CatalogEditError("INPUT_REPOSITORY is required");
  if (!category || !CATEGORIES.includes(category)) {
    throw new CatalogEditError(
      `INPUT_CATEGORY must be one of: ${CATEGORIES.join(", ")}`,
    );
  }
  const tags = process.env.INPUT_TAGS?.split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return {
    repository,
    category,
    id: process.env.INPUT_ID || undefined,
    name: process.env.INPUT_NAME || undefined,
    group:
      process.env.INPUT_GROUP?.trim() === "none"
        ? undefined
        : process.env.INPUT_GROUP?.trim() || undefined,
    tags,
    tagPattern: process.env.INPUT_TAG_PATTERN || undefined,
    includePrerelease: process.env.INPUT_INCLUDE_PRERELEASE === "true",
  };
}

async function main(): Promise<void> {
  const inputs = readInputs();
  const repository = normalizeRepository(inputs.repository);
  const [owner, repo] = repository.split("/");
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const { data: repoMeta } = await octokit.rest.repos.get({ owner, repo });
  const entry = buildToolEntry(inputs, {
    description: repoMeta.description,
    homepage: repoMeta.homepage,
  });

  // A tool that would sync zero releases must not reach the catalog —
  // fail fast so the pattern gets fixed in the workflow form, not found
  // empty on the site later.
  const { data: releases } = await octokit.rest.repos.listReleases({
    owner,
    repo,
    per_page: 5,
  });
  if (releases.length === 0) {
    throw new CatalogEditError(
      `${repository} has no GitHub releases — nothing to track. ` +
        "If the repo only pushes git tags, add it manually in config/tools.yaml with strategy github-tags.",
    );
  }
  const tagNames = releases.map((r) => r.tag_name);
  if (countPatternMatches(tagNames, entry.release.tagPattern) === 0) {
    const hint = tagNames.every((t) => !t.startsWith("v"))
      ? ' Hint: these tags have no "v" prefix — try a pattern without "^v".'
      : "";
    throw new CatalogEditError(
      `tagPattern ${entry.release.tagPattern} matches none of the latest tags: ${tagNames.join(", ")}.${hint}`,
    );
  }

  const yamlText = readFileSync(CATALOG_PATH, "utf8");
  writeFileSync(CATALOG_PATH, appendToolToCatalog(yamlText, entry));
  loadCatalog();

  console.log(`Added tool "${entry.id}" (${repository})`);
  console.log(JSON.stringify(entry, null, 2));
}

main().catch((err) => {
  console.error(
    `::error::${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
});
