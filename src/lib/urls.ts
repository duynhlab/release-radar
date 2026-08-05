export function toolPath(id: string): string {
  return `/tools/${id}`;
}

export function categoryPath(slug: string): string {
  return `/categories/${slug}`;
}

export function repoUrl(repository: string): string {
  return `https://github.com/${repository}`;
}

export function compareUrl(
  repository: string,
  fromVersion: string,
  toVersion: string,
): string {
  return `https://github.com/${repository}/compare/${encodeURIComponent(fromVersion)}...${encodeURIComponent(toVersion)}`;
}

/**
 * Stable in-page anchor for one release, e.g. `release-v1.36.3`.
 *
 * Derived from the immutable tag, so a shared link keeps working across syncs.
 * Dots survive because they are valid in a fragment and `v1.36.3` reads far
 * better than `v1-36-3`.
 */
export function releaseFragmentId(version: string): string {
  const slug = version
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `release-${slug || "unknown"}`;
}

/**
 * Assign unique fragments across one page's releases.
 *
 * Called once in the loader so server and client agree; collisions get a
 * deterministic numeric suffix rather than duplicate DOM ids.
 */
export function assignReleaseFragments<T extends { version: string }>(
  releases: readonly T[],
): Array<T & { fragment: string }> {
  const seen = new Map<string, number>();
  return releases.map((release) => {
    const base = releaseFragmentId(release.version);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return { ...release, fragment: count === 0 ? base : `${base}-${count + 1}` };
  });
}
