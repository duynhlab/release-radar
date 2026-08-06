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
    // No min-height: the card is as tall as its content. `min-h-52` used to
    // force 208px, and a 40px footer pushed the common case to ~249px.
    // `relative` anchors the stretched link below.
    <article className="relative flex flex-col gap-1.5 rounded-card border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {/* The whole card navigates, via a stretched link rather than
              role="button" on the article. This card contains a real <button>
              (favourite) and real links (footer); nesting those inside a
              clickable container is what breaks keyboard and screen-reader
              semantics. One real link stays correctly announced, and every
              other control sits above it on z-10. */}
          <h3 className="truncate text-card-title font-semibold text-fg">
            <Link
              to="/tools/$slug"
              params={{ slug: tool.id }}
              title={tool.name}
              className="after:absolute after:inset-0 after:content-[''] hover:text-accent"
            >
              {tool.name}
            </Link>
          </h3>
          <p className="mt-0.5 line-clamp-2 text-body text-fg-muted">
            {tool.description}
          </p>
        </div>
        <div className="relative z-10 -mr-1 -mt-1">
          <FavoriteToggle
            toolName={tool.name}
            isFavorite={isFavorite}
            onToggle={onToggleFavorite}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="relative z-10">
          <CategoryBadge category={tool.category} asLink />
        </span>
        {tool.group ? (
          <NeutralBadge title={`Part of the ${tool.group.name} family`}>
            {tool.group.name}
          </NeutralBadge>
        ) : null}
        {tool.latest ? <ChannelBadge channel={tool.latest.channel} /> : null}
      </div>

      {tool.latest ? (
        <div className="mt-auto pt-0.5">
          <div className="flex items-baseline justify-between gap-2">
            {/* Chart repos tag like `victoria-metrics-k8s-stack-0.89.0`, which
                wrapped to two lines and silently added ~21px to those cards —
                the single largest source of height variance. */}
            <a
              href={tool.latest.url}
              target="_blank"
              rel="noreferrer"
              title={tool.latest.version}
              className="relative z-10 min-w-0 truncate font-mono text-version font-medium text-fg hover:underline"
            >
              {tool.latest.version}
            </a>
            <TimeAgo
              iso={tool.latest.publishedAt}
              className="shrink-0 text-meta text-fg-subtle"
            />
          </div>
          {gap ? (
            <p className="mt-0.5 truncate text-meta text-fg-subtle">{gap}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-auto pt-0.5 text-meta text-fg-subtle">
          No releases tracked yet
        </p>
      )}

      <div className="relative z-10 -mx-1 -mb-1 flex items-center border-t border-border pt-0.5 text-fg-subtle">
        <Tooltip label="Release history">
          <Button size="icon" variant="ghost" asChild>
            <Link
              to="/tools/$slug"
              params={{ slug: tool.id }}
              aria-label={`Release history of ${tool.name}`}
            >
              <History className="size-3.5" aria-hidden="true" />
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
              <Github className="size-3.5" aria-hidden="true" />
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
                <Globe className="size-3.5" aria-hidden="true" />
              </a>
            </Button>
          </Tooltip>
        ) : null}
      </div>
    </article>
  );
}
