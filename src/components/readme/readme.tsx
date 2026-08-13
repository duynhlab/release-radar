import { useMemo } from "react";
import { renderReadme } from "@/lib/markdown";

/**
 * The single rendering path for repository READMEs. Third-party input — never
 * render README markdown any other way.
 *
 * `rr-notes` carries the shared markdown typography; `rr-readme` layers the
 * real-heading styles on top. Memoized because the tab switch re-renders the
 * page while the README itself never changes within a loader result.
 */
export function Readme({
  markdown,
  repository,
}: {
  markdown: string;
  repository: string;
}) {
  const content = useMemo(
    () => renderReadme(markdown, repository),
    [markdown, repository],
  );
  return <div className="rr-notes rr-readme">{content}</div>;
}
