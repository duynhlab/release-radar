import { compileToolPatterns } from "./patterns.ts";
import type {
  Catalog,
  IndexTool,
  Release,
  ReleaseIndex,
  Tool,
  ToolReleasesFile,
} from "./types.ts";

export const MAX_RELEASES_PER_TOOL = 20;
export const NOTES_MAX_LENGTH = 10_000;

/**
 * Shape of a release as returned by the GitHub REST API (subset we use).
 * The github-tags strategy synthesizes these with the tag name as id.
 */
export interface RawGitHubRelease {
  id: number | string;
  tag_name: string;
  name: string | null;
  body?: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  created_at: string;
  html_url: string;
}

export function normalizeRelease(raw: RawGitHubRelease): Release {
  const notes = raw.body?.trim() || null;
  return {
    id: raw.id,
    version: raw.tag_name,
    name: raw.name,
    channel: raw.prerelease ? "prerelease" : "stable",
    publishedAt: raw.published_at ?? raw.created_at,
    url: raw.html_url,
    notes: notes && notes.length > NOTES_MAX_LENGTH
      ? notes.slice(0, NOTES_MAX_LENGTH) + "\n\n…(truncated)"
      : notes,
    draft: raw.draft,
    prerelease: raw.prerelease,
  };
}

/**
 * Whether a stored release still satisfies the tool's current config.
 * Also applied to existing history during merge, so tightening tagPattern
 * or turning off includePrerelease cleans up already-synced releases.
 */
export function releaseMatchesConfig(release: Release, tool: Tool): boolean {
  const { tagPattern, ignorePattern } = compileToolPatterns(tool);
  if (!tool.release.includePrerelease && release.prerelease) return false;
  if (tagPattern && !tagPattern.test(release.version)) return false;
  if (ignorePattern && ignorePattern.test(release.version)) return false;
  return true;
}

/** Apply the tool's release config filters and normalize what survives. */
export function filterReleases(
  raws: RawGitHubRelease[],
  tool: Tool,
): Release[] {
  return raws
    .filter((r) => !r.draft)
    .map(normalizeRelease)
    .filter((r) => releaseMatchesConfig(r, tool));
}

/**
 * Merge incoming releases into the existing history. Dedupe by release id
 * (incoming wins, so note edits propagate), sort newest first with a
 * deterministic tie-break, cap the history length.
 */
export function mergeReleases(
  existing: Release[],
  incoming: Release[],
): Release[] {
  const byId = new Map<string, Release>();
  for (const release of existing) byId.set(String(release.id), release);
  for (const release of incoming) byId.set(String(release.id), release);
  return [...byId.values()]
    .sort(
      (a, b) =>
        b.publishedAt.localeCompare(a.publishedAt) ||
        String(b.id).localeCompare(String(a.id)),
    )
    .slice(0, MAX_RELEASES_PER_TOOL);
}

export function buildToolFile(
  tool: Tool,
  releases: Release[],
  generatedAt: string,
): ToolReleasesFile {
  return {
    schemaVersion: 1,
    generatedAt,
    tool: { id: tool.id, name: tool.name, repository: tool.repository },
    releases,
  };
}

export function buildIndex(
  catalog: Catalog,
  filesById: ReadonlyMap<string, ToolReleasesFile | null>,
  generatedAt: string,
): ReleaseIndex {
  const tools: IndexTool[] = catalog.tools
    .filter((tool) => tool.enabled)
    .map((tool) => {
      const releases = filesById.get(tool.id)?.releases ?? [];
      const latest = releases[0] ?? null;
      const previous = releases[1] ?? null;
      return {
        id: tool.id,
        name: tool.name,
        category: tool.category,
        repository: tool.repository,
        description: tool.description,
        ...(tool.homepage ? { homepage: tool.homepage } : {}),
        ...(tool.documentation ? { documentation: tool.documentation } : {}),
        tags: tool.tags,
        ...(tool.group && catalog.groups[tool.group]
          ? { group: { id: tool.group, name: catalog.groups[tool.group].name } }
          : {}),
        latest: latest ? omitNotes(latest) : null,
        previous: previous
          ? { version: previous.version, publishedAt: previous.publishedAt }
          : null,
        releaseCount: releases.length,
      };
    });
  return { schemaVersion: 1, generatedAt, tools };
}

function omitNotes(release: Release): Omit<Release, "notes"> {
  const { notes, ...rest } = release;
  void notes;
  return rest;
}

/** Deterministic serialization: recursively sorted keys, 2-space indent, trailing newline. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value), null, 2) + "\n";
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeysDeep(v)]),
    );
  }
  return value;
}

/** Deep equality that ignores the volatile `generatedAt` field. */
export function contentEquals(
  a: { generatedAt: string },
  b: { generatedAt: string },
): boolean {
  return (
    stableStringify({ ...a, generatedAt: "" }) ===
    stableStringify({ ...b, generatedAt: "" })
  );
}
