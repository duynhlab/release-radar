import { Link2 } from "lucide-react";
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
    <article
      id={fragment}
      className="rounded-card border border-border bg-surface p-5"
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="font-mono text-card-title font-semibold text-fg">
          <a
            href={release.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent"
          >
            {release.version}
          </a>
        </h3>
        <ChannelBadge channel={release.channel} />
        <time dateTime={release.publishedAt} className="text-body text-fg-muted">
          {formatDate(release.publishedAt)}
        </time>
        <Button size="icon" variant="ghost" asChild>
          <a href={`#${fragment}`} aria-label={`Link to release ${release.version}`}>
            <Link2 className="size-4" aria-hidden="true" />
          </a>
        </Button>
        {previous ? (
          <a
            href={compareUrl(repository, previous.version, release.version)}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-body text-accent hover:underline"
          >
            Compare {previous.version} → {release.version}
          </a>
        ) : null}
      </header>

      {release.notes ? (
        // Native <details>, controlled. Radix Collapsible would unmount the
        // closed content, stripping 19 of 20 notes from the SSR HTML and
        // breaking both the scripts-blocked audit and in-page Cmd+F. Two-way
        // sync keeps aria-expanded truthful while Enter/Space stay native.
        <details
          open={open}
          onToggle={(e) => setUserToggled(e.currentTarget.open)}
          className="mt-3"
        >
          <summary
            aria-expanded={open}
            className="cursor-pointer select-none text-body font-medium text-fg-muted hover:text-fg"
          >
            Release notes
          </summary>
          <div className="mt-3">
            <ReleaseNotes markdown={release.notes} />
          </div>
        </details>
      ) : null}
    </article>
  );
}
