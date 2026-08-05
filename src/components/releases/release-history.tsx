import { useLocation } from "@tanstack/react-router";
import type { Release } from "@/domain/types";
import { ReleaseItem } from "./release-item";

export type ReleaseWithFragment = Release & { fragment: string };

export function ReleaseHistory({
  releases,
  repository,
}: {
  releases: readonly ReleaseWithFragment[];
  repository: string;
}) {
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
    <section aria-label="Release history" className="space-y-4">
      <h2 className="text-lg font-semibold text-fg">
        Release history
        <span className="ml-2 text-sm font-normal text-fg-muted">
          last {releases.length} releases
        </span>
      </h2>

      {releases.length === 0 ? (
        <p role="status" className="text-sm text-fg-muted">
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
