import { renderReleaseNotes } from "@/lib/markdown";

/**
 * The single rendering path for release notes. Third-party input — never render
 * note markdown any other way.
 *
 * `repository` resolves the repo-relative references GitHub autolinks: `#123`
 * and a bare commit SHA mean nothing without knowing which repo wrote them.
 */
export function ReleaseNotes({
  markdown,
  repository,
}: {
  markdown: string;
  repository: string;
}) {
  return (
    <div className="rr-notes">{renderReleaseNotes(markdown, repository)}</div>
  );
}
