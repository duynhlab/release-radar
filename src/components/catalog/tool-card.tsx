import { Link } from "@tanstack/react-router";
import type { IndexTool } from "@/domain/types";
import { CategoryBadge, ChannelBadge } from "@/components/ui/badge";
import { TimeAgo } from "@/components/ui/time-ago";
import { FavoriteToggle } from "./favorite-toggle";

export function ToolCard({
  tool,
  isFavorite,
  onToggleFavorite,
}: {
  tool: IndexTool;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <article className="relative flex flex-col gap-3 rounded-card border border-border bg-surface p-4 transition-colors hover:border-border-strong">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-card-title font-semibold text-accent">
          {tool.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-card-title font-semibold text-fg">
            <Link to="/tools/$slug" params={{ slug: tool.id }} className="after:absolute after:inset-0 after:content-[''] hover:text-accent">
              {tool.name}
            </Link>
          </h3>
          <p className="truncate text-meta text-fg-muted">{tool.repository}</p>
        </div>
        <div className="relative z-10 -mr-1 -mt-1">
          <FavoriteToggle toolName={tool.name} isFavorite={isFavorite} onToggle={onToggleFavorite} />
        </div>
      </div>
      <p className="line-clamp-2 text-body text-fg-muted">{tool.description}</p>
      <div className="relative z-10 flex flex-wrap items-center gap-1.5">
        <CategoryBadge category={tool.category} asLink />
        {tool.latest ? <ChannelBadge channel={tool.latest.channel} /> : null}
      </div>
      <div className="mt-auto flex items-baseline justify-between gap-2 border-t border-border pt-3">
        {tool.latest ? <>
          <a href={tool.latest.url} target="_blank" rel="noreferrer" title={tool.latest.version} className="relative z-10 min-w-0 truncate font-mono text-control font-medium text-fg hover:underline">{tool.latest.version}</a>
          <TimeAgo iso={tool.latest.publishedAt} className="shrink-0 text-meta text-fg-subtle" />
        </> : <p className="text-meta text-fg-subtle">No releases tracked yet</p>}
      </div>
    </article>
  );
}
