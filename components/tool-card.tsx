"use client";

import Link from "next/link";
import { releaseGapLabel } from "@/lib/format";
import type { IndexTool } from "@/lib/types";
import { CategoryBadge, ChannelBadge } from "./category-badge";
import { FavoriteToggle } from "./favorite-toggle";
import { TimeAgo } from "./time-ago";

function HistoryIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6v4l2.5 2.5" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7" />
      <path d="M3 10h14M10 3c-1.8 1.9-2.7 4.3-2.7 7s.9 5.1 2.7 7c1.8-1.9 2.7-4.3 2.7-7S11.8 4.9 10 3z" />
    </svg>
  );
}

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
    <article className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
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
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
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

      <div className="flex items-center gap-1 border-t border-zinc-100 pt-2 text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
        <Link
          href={`/tools/${tool.id}`}
          aria-label={`Release history of ${tool.name}`}
          title="Release history"
          className="rounded-md p-1 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <HistoryIcon />
        </Link>
        <a
          href={`https://github.com/${tool.repository}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`GitHub repository of ${tool.name}`}
          title="GitHub repository"
          className="rounded-md p-1 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <GitHubIcon />
        </a>
        {tool.homepage && (
          <a
            href={tool.homepage}
            target="_blank"
            rel="noreferrer"
            aria-label={`Website of ${tool.name}`}
            title="Website"
            className="rounded-md p-1 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <GlobeIcon />
          </a>
        )}
      </div>
    </article>
  );
}
