import { parseDocument, YAMLSeq } from "yaml";
import { CatalogSchema, type Category, type Tool } from "./types.ts";

export class CatalogEditError extends Error {}

/** Accepts "owner/repo" or any github.com URL form (incl. /releases). */
export function normalizeRepository(input: string): string {
  const trimmed = input.trim().replace(/\.git$/, "");
  const urlMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)/,
  );
  if (urlMatch) return `${urlMatch[1]}/${urlMatch[2]}`;
  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed)) return trimmed;
  throw new CatalogEditError(
    `cannot parse repository from "${input}" — expected owner/repo or a github.com URL`,
  );
}

/** Repo name → valid catalog id slug. */
export function deriveToolId(repository: string): string {
  const repoName = repository.split("/")[1];
  const slug = repoName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new CatalogEditError(`cannot derive a valid id from "${repoName}"`);
  }
  return slug;
}

/** Repo name → human-ish display name ("external-dns" → "External Dns"). */
export function deriveToolName(repository: string): string {
  return repository
    .split("/")[1]
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** How many of the given tag names a release tagPattern accepts. */
export function countPatternMatches(
  tagNames: string[],
  pattern?: string,
): number {
  if (!pattern) return tagNames.length;
  const re = new RegExp(pattern);
  return tagNames.filter((t) => re.test(t)).length;
}

export interface AddToolInputs {
  repository: string;
  category: Category;
  id?: string;
  name?: string;
  group?: string;
  tags?: string[];
  tagPattern?: string;
  includePrerelease?: boolean;
}

export interface RepoMetadata {
  description: string | null;
  homepage: string | null;
}

function isHttpUrl(value: string): boolean {
  try {
    return new URL(value).protocol.startsWith("http");
  } catch {
    return false;
  }
}

export function buildToolEntry(
  inputs: AddToolInputs,
  meta: RepoMetadata,
): Tool {
  const repository = normalizeRepository(inputs.repository);
  const homepage = meta.homepage?.trim();
  return {
    id: inputs.id?.trim() || deriveToolId(repository),
    name: inputs.name?.trim() || deriveToolName(repository),
    category: inputs.category,
    repository,
    description: meta.description?.trim() || `Releases of ${repository}`,
    ...(homepage && isHttpUrl(homepage) ? { homepage } : {}),
    tags: inputs.tags ?? [],
    ...(inputs.group ? { group: inputs.group } : {}),
    enabled: true,
    release: {
      strategy: "github-releases",
      includePrerelease: inputs.includePrerelease ?? false,
      ...(inputs.tagPattern ? { tagPattern: inputs.tagPattern } : {}),
    },
  };
}

/**
 * Appends a tool entry to the catalog YAML, preserving existing comments and
 * formatting (yaml Document API). Throws on duplicate id or repository.
 */
export function appendToolToCatalog(yamlText: string, entry: Tool): string {
  const doc = parseDocument(yamlText);
  const existing = CatalogSchema.parse(doc.toJS());

  for (const tool of existing.tools) {
    if (tool.id === entry.id) {
      throw new CatalogEditError(`tool id "${entry.id}" already exists`);
    }
    if (
      tool.repository.toLowerCase() === entry.repository.toLowerCase() &&
      JSON.stringify(tool.release) === JSON.stringify(entry.release)
    ) {
      throw new CatalogEditError(
        `repository "${entry.repository}" is already tracked as "${tool.id}" with the same release config`,
      );
    }
  }
  if (entry.group && !(entry.group in existing.groups)) {
    throw new CatalogEditError(
      `unknown group "${entry.group}" — declare it under "groups:" first (existing: ${Object.keys(existing.groups).join(", ") || "none"})`,
    );
  }

  // Strip fields that are defaults so the YAML stays as lean as hand-written
  // entries. Key order matches the existing entries.
  const yamlEntry: Record<string, unknown> = {
    id: entry.id,
    name: entry.name,
    category: entry.category,
    repository: entry.repository,
    description: entry.description,
    ...(entry.homepage ? { homepage: entry.homepage } : {}),
    ...(entry.documentation ? { documentation: entry.documentation } : {}),
    ...(entry.tags.length > 0 ? { tags: entry.tags } : {}),
    ...(entry.group ? { group: entry.group } : {}),
    release: {
      strategy: entry.release.strategy,
      includePrerelease: entry.release.includePrerelease,
      ...(entry.release.tagPattern
        ? { tagPattern: entry.release.tagPattern }
        : {}),
    },
  };

  const tools = doc.get("tools");
  if (!(tools instanceof YAMLSeq)) {
    throw new CatalogEditError('catalog has no "tools" sequence');
  }
  const node = doc.createNode(yamlEntry);
  node.spaceBefore = true;
  tools.add(node);

  const result = doc.toString({ lineWidth: 0 });
  // Re-validate the final document end to end.
  CatalogSchema.parse(parseDocument(result).toJS());
  return result;
}
