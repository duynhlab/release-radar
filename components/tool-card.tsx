"use client";

import Link from "next/link";
import { releaseGapLabel } from "@/lib/format";
import type { IndexTool } from "@/lib/types";
import { CategoryBadge, ChannelBadge } from "./category-badge";
import { FavoriteToggle } from "./favorite-toggle";
import { TimeAgo } from "./time-ago";

export function ToolCard({
  tool,
  isFavorite,
  onToggleFavorite,
}: {
  tool: IndexTool;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const gap = tool.latest
    ? releaseGapLabel(tool.latest.publishedAt, tool.previous)
    : null;

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">
            <Link
              href={`/tools/${tool.id}`}
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              {tool.name}
            </Link>
          </h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
            {tool.description}
          </p>
        </div>
        <FavoriteToggle
          toolName={tool.name}
          isFavorite={isFavorite}
          onToggle={() => onToggleFavorite(tool.id)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={tool.category} asLink />
        {tool.group && (
          <span
            title={`Part of the ${tool.group.name} family`}
            className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            ⌂ {tool.group.name}
          </span>
        )}
        {tool.latest && <ChannelBadge channel={tool.latest.channel} />}
      </div>

      {tool.latest ? (
        <div className="mt-auto space-y-1 text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <a
              href={tool.latest.url}
              target="_blank"
              rel="noreferrer"
              className="font-mono font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              {tool.latest.version}
            </a>
            <span className="text-zinc-500 dark:text-zinc-400">
              <TimeAgo iso={tool.latest.publishedAt} />
            </span>
          </div>
          {gap && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{gap}</p>
          )}
        </div>
      ) : (
        <p className="mt-auto text-sm text-zinc-500 dark:text-zinc-400">
          No releases tracked yet
        </p>
      )}

      <div className="flex gap-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <Link
          href={`/tools/${tool.id}`}
          className="hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          History
        </Link>
        <a
          href={`https://github.com/${tool.repository}`}
          target="_blank"
          rel="noreferrer"
          className="hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Repository
        </a>
        {tool.homepage && (
          <a
            href={tool.homepage}
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Website
          </a>
        )}
      </div>
    </article>
  );
}
