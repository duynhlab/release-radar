import { Link } from "@tanstack/react-router";
import { Github, Globe, History } from "lucide-react";
import type { IndexTool } from "@/domain/types";
import { CategoryBadge, ChannelBadge, NeutralBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TimeAgo } from "@/components/ui/time-ago";
import { Tooltip } from "@/components/ui/tooltip";
import { FavoriteToggle } from "./favorite-toggle";
import { releaseGapLabel } from "@/lib/dates";
import { repoUrl } from "@/lib/urls";

export function ToolCard({
  tool,
  isFavorite,
  onToggleFavorite,
}: {
  tool: IndexTool;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const gap = tool.latest
    ? releaseGapLabel(tool.latest.publishedAt, tool.previous)
    : null;

  return (
    <article className="flex min-h-52 flex-col gap-2 rounded-card border border-border bg-surface p-3 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {/* Two lines, not truncate: a one-line clamp cut the distinguishing
              part of names like "VictoriaMetrics Helm Charts". */}
          <h3 className="line-clamp-2 text-card-title font-semibold text-fg">
            <Link
              to="/tools/$slug"
              params={{ slug: tool.id }}
              className="hover:text-accent"
            >
              {tool.name}
            </Link>
          </h3>
          <p className="mt-0.5 line-clamp-2 text-body text-fg-muted">
            {tool.description}
          </p>
        </div>
        <FavoriteToggle
          toolName={tool.name}
          isFavorite={isFavorite}
          onToggle={onToggleFavorite}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={tool.category} asLink />
        {tool.group ? (
          <NeutralBadge title={`Part of the ${tool.group.name} family`}>
            ⌂ {tool.group.name}
          </NeutralBadge>
        ) : null}
        {tool.latest ? <ChannelBadge channel={tool.latest.channel} /> : null}
      </div>

      {tool.latest ? (
        <div className="mt-auto space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            {/* The version carries the weight; the accent colour stays reserved
                for interactive things. */}
            <a
              href={tool.latest.url}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-body font-medium text-fg hover:underline"
            >
              {tool.latest.version}
            </a>
            <TimeAgo iso={tool.latest.publishedAt} className="text-meta text-fg-subtle" />
          </div>
          {gap ? <p className="text-meta text-fg-subtle">{gap}</p> : null}
        </div>
      ) : (
        <p className="mt-auto text-body text-fg-subtle">No releases tracked yet</p>
      )}

      <div className="flex items-center gap-0 border-t border-border pt-1 text-fg-subtle">
        <Tooltip label="Release history">
          <Button size="icon" variant="ghost" asChild>
            <Link
              to="/tools/$slug"
              params={{ slug: tool.id }}
              aria-label={`Release history of ${tool.name}`}
            >
              <History className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </Tooltip>
        <Tooltip label="GitHub repository">
          <Button size="icon" variant="ghost" asChild>
            <a
              href={repoUrl(tool.repository)}
              target="_blank"
              rel="noreferrer"
              aria-label={`GitHub repository of ${tool.name}`}
            >
              <Github className="size-4" aria-hidden="true" />
            </a>
          </Button>
        </Tooltip>
        {tool.homepage ? (
          <Tooltip label="Website">
            <Button size="icon" variant="ghost" asChild>
              <a
                href={tool.homepage}
                target="_blank"
                rel="noreferrer"
                aria-label={`Website of ${tool.name}`}
              >
                <Globe className="size-4" aria-hidden="true" />
              </a>
            </Button>
          </Tooltip>
        ) : null}
      </div>
    </article>
  );
}
