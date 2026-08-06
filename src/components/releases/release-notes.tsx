import { renderReleaseNotes } from "@/lib/markdown";

/**
 * The single rendering path for release notes. Third-party input — never render
 * note markdown any other way.
 */
export function ReleaseNotes({ markdown }: { markdown: string }) {
  return <div className="rr-notes">{renderReleaseNotes(markdown)}</div>;
}
