export class RepositoryError extends Error {}

export interface RepositoryParts {
  owner: string;
  repo: string;
}

/**
 * Split "owner/repo" into its parts, refusing anything malformed.
 *
 * Callers used to do `repository.split("/")[1]`, which yields `undefined` on a
 * malformed value and then flows onward — into Octokit as `owner: undefined`,
 * or into a slug derivation that throws a confusing error much later. The
 * catalog schema already enforces this shape, so a failure here means the
 * caller was handed something that never came from the catalog.
 */
export function splitRepository(repository: string): RepositoryParts {
  const match = repository.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (!match?.[1] || !match[2]) {
    throw new RepositoryError(
      `expected "owner/repo", got "${repository}"`,
    );
  }
  return { owner: match[1], repo: match[2] };
}

/** Just the repo name — the part used to derive ids and display names. */
export function repositoryName(repository: string): string {
  return splitRepository(repository).repo;
}
