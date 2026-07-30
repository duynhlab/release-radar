import { readFileSync, writeFileSync } from "node:fs";
import { Octokit } from "octokit";
import {
  appendToolToCatalog,
  buildToolEntry,
  CatalogEditError,
  ensureGroup,
  normalizeRepository,
  type AddToolInputs,
} from "../lib/catalog-edit.ts";
import { CATALOG_PATH, loadCatalog } from "../lib/catalog.ts";
import { CATEGORIES, type Category } from "../lib/types.ts";

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
    group: process.env.INPUT_GROUP?.trim() || undefined,
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

  // Early warning if the tag pattern would filter out every recent release.
  const { data: releases } = await octokit.rest.repos.listReleases({
    owner,
    repo,
    per_page: 5,
  });
  if (releases.length === 0) {
    console.warn(`::warning::${repository} has no GitHub releases yet`);
  } else if (entry.release.tagPattern) {
    const pattern = new RegExp(entry.release.tagPattern);
    if (!releases.some((r) => pattern.test(r.tag_name))) {
      console.warn(
        `::warning::tagPattern ${entry.release.tagPattern} matches none of the 5 latest tags: ${releases.map((r) => r.tag_name).join(", ")}`,
      );
    }
  }

  let yamlText = readFileSync(CATALOG_PATH, "utf8");
  if (entry.group) {
    const ensured = ensureGroup(
      yamlText,
      entry.group,
      process.env.INPUT_GROUP_NAME || undefined,
    );
    yamlText = ensured.yaml;
    if (ensured.created) {
      console.log(`Created new group "${entry.group}"`);
    }
  }
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
