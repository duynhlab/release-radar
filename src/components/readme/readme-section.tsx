import { useRouter } from "@tanstack/react-router";
import type { ToolReadme } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Readme } from "./readme";

/**
 * The README tab panel. Mirrors ReleaseHistory's three states: transport
 * failure (retryable alert), genuinely absent (quiet status), content.
 * The visible label lives in the tab strip; the h2 keeps the outline intact.
 */
export function ReadmeSection({
  readme,
  repository,
  unavailable = false,
}: {
  readme: ToolReadme;
  repository: string;
  /** The README asset could not be fetched — distinct from having none. */
  unavailable?: boolean;
}) {
  const router = useRouter();

  return (
    <section aria-label="README" className="space-y-2">
      <h2 className="sr-only">README</h2>

      {unavailable ? (
        <div role="alert" className="space-y-3">
          <p className="text-body text-fg-muted">
            The README could not be loaded. The tool itself is still tracked.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void router.invalidate()}
          >
            Try again
          </Button>
        </div>
      ) : !readme ? (
        <p role="status" className="text-body text-fg-muted">
          This repository has no README.
        </p>
      ) : (
        <>
          <Readme markdown={readme.markdown} repository={repository} />
          {/* Images are blocked and long READMEs truncated — the canonical
              rendering is one click away. */}
          <p className="pt-2 text-meta text-fg-subtle">
            <a
              href={readme.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              View the full README on GitHub
            </a>
          </p>
        </>
      )}
    </section>
  );
}
