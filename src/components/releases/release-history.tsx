import { useLocation, useRouter } from "@tanstack/react-router";
import type { Release } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { CountPill } from "@/components/ui/count-pill";
import { ReleaseItem } from "./release-item";

type ReleaseWithFragment = Release & { fragment: string };

export function ReleaseHistory({
  releases,
  repository,
  unavailable = false,
  hideHeading = false,
}: {
  releases: readonly ReleaseWithFragment[];
  repository: string;
  /** The notes asset could not be fetched — distinct from having none. */
  unavailable?: boolean;
  /**
   * When a tab strip already carries the visible label and count, the heading
   * goes sr-only — the outline keeps its h2, the screen shows one signal.
   */
  hideHeading?: boolean;
}) {
  const router = useRouter();
  const hash = useLocation({
    select: (l) => {
      try {
        return decodeURIComponent(l.hash ?? "");
      } catch {
        return l.hash ?? "";
      }
    },
  });

  return (
    <section aria-label="Release history" className="space-y-2">
      {hideHeading ? (
        <h2 className="sr-only">Release history</h2>
      ) : (
        <h2 className="flex items-center gap-2 text-card-title font-semibold text-fg">
          Release history
          {/* No "0" pill beside a message that already says there is nothing. */}
          {releases.length > 0 ? <CountPill>{releases.length}</CountPill> : null}
        </h2>
      )}

      {unavailable ? (
        // A transport failure, not an empty history — promising that a sync
        // will fix it would be wrong, and retrying actually can.
        <div role="alert" className="space-y-3">
          <p className="text-body text-fg-muted">
            Release notes could not be loaded. The tool itself is still tracked.
          </p>
          <Button variant="outline" size="sm" onClick={() => void router.invalidate()}>
            Try again
          </Button>
        </div>
      ) : releases.length === 0 ? (
        <p role="status" className="text-body text-fg-muted">
          No releases tracked yet. The next scheduled sync will populate this
          page.
        </p>
      ) : (
        releases.map((release, i) => (
          <ReleaseItem
            key={release.fragment}
            release={release}
            previous={releases[i + 1] ?? null}
            repository={repository}
            fragment={release.fragment}
            defaultOpen={hash ? hash === release.fragment : i === 0}
          />
        ))
      )}
    </section>
  );
}
