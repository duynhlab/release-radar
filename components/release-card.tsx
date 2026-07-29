import { compareUrl, formatDate } from "@/lib/format";
import type { Release } from "@/lib/types";
import { ChannelBadge } from "./category-badge";
import { ReleaseNotes } from "./release-notes";

export function ReleaseCard({
  release,
  previous,
  repository,
  defaultOpen = false,
}: {
  release: Release;
  previous: Release | null;
  repository: string;
  defaultOpen?: boolean;
}) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="font-mono text-lg font-semibold">
          <a
            href={release.url}
            target="_blank"
            rel="noreferrer"
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            {release.version}
          </a>
        </h3>
        <ChannelBadge channel={release.channel} />
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {formatDate(release.publishedAt)}
        </span>
        {previous && (
          <a
            href={compareUrl(repository, previous.version, release.version)}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Compare {previous.version} → {release.version}
          </a>
        )}
      </header>
      {release.notes && (
        <details className="group mt-3" open={defaultOpen}>
          <summary className="cursor-pointer select-none text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            Release notes
          </summary>
          <div className="mt-3">
            <ReleaseNotes markdown={release.notes} />
          </div>
        </details>
      )}
    </article>
  );
}
