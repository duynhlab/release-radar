import { ChevronRight, Link2 } from "lucide-react";
import { useState } from "react";
import type { Release } from "@/domain/types";
import { ChannelBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { compareUrl } from "@/lib/urls";
import { ReleaseNotes } from "./release-notes";

export function ReleaseItem({
  release,
  previous,
  repository,
  fragment,
  defaultOpen,
}: {
  release: Release;
  previous: Release | null;
  repository: string;
  fragment: string;
  defaultOpen: boolean;
}) {
  // Derived, not synced. A deep link arrives only after hydration (fragments
  // are never sent to the server), so `defaultOpen` changes on the client once
  // the hash is known. Tracking only the user's own toggle and falling back to
  // defaultOpen lets that happen without an effect writing state — which would
  // cascade a second render on every release.
  const [userToggled, setUserToggled] = useState<boolean | null>(null);
  const open = userToggled ?? defaultOpen;

  return (
    // p-3, down from the codebase's only p-5. `group` drives the anchor
    // affordance, which stays hidden until hover or keyboard focus.
    <article
      id={fragment}
      className="rounded-card border border-border bg-surface"
    >
      {/* Native <details>, controlled. Radix Collapsible would unmount the
          closed content, stripping 19 of 20 notes from the SSR HTML and
          breaking both the scripts-blocked audit and in-page Cmd+F. Two-way
          sync keeps aria-expanded truthful while Enter/Space stay native.

          The <summary> IS the row: version, channel, date, compare and the
          expand affordance all sit on one line. A separate "Release notes"
          line below cost ~18px per row across 20 rows. */}
      <details
        open={open}
        onToggle={(e) => setUserToggled(e.currentTarget.open)}
        className="group"
      >
        <summary
          aria-expanded={open}
          className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 p-3 [&::-webkit-details-marker]:hidden"
        >
          <ChevronRight
            className="size-3.5 shrink-0 text-fg-subtle transition-transform group-open:rotate-90"
            aria-hidden="true"
          />
          <h3 className="font-mono text-version font-semibold text-fg">
            {release.version}
          </h3>
          <ChannelBadge channel={release.channel} />
          <time
            dateTime={release.publishedAt}
            className="text-meta text-fg-muted"
          >
            {formatDate(release.publishedAt)}
          </time>

          {/* These live inside the summary so they share its row, so each has
              to stop the click from also toggling the disclosure. Compare sits
              beside the release it compares rather than being pushed by ml-auto
              to the far edge of a 1360px container; the label is short and the
              full "vA vs vB" is its accessible name. */}
          {previous ? (
            <a
              href={compareUrl(repository, previous.version, release.version)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Compare ${previous.version} with ${release.version}`}
              className="text-meta text-accent hover:underline"
            >
              Compare
            </a>
          ) : null}

          <span className="ml-auto flex items-center gap-1">
            <a
              href={release.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={`${release.version} on GitHub`}
              className="text-meta text-accent hover:underline"
            >
              GitHub
            </a>
            <Button
              size="icon"
              variant="ghost"
              asChild
              className="size-6 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
            >
              <a
                href={`#${fragment}`}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Link to release ${release.version}`}
              >
                <Link2 className="size-3.5" aria-hidden="true" />
              </a>
            </Button>
          </span>
        </summary>

        {release.notes ? (
          <div className="px-3 pb-3">
            <ReleaseNotes markdown={release.notes} />
          </div>
        ) : (
          <p className="px-3 pb-3 text-meta text-fg-subtle">
            No release notes published.
          </p>
        )}
      </details>
    </article>
  );
}
