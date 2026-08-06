import { Link } from "@tanstack/react-router";
import type { IndexTool } from "@/domain/types";
import { CategoryBadge, ChannelBadge, NeutralBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TimeAgo } from "@/components/ui/time-ago";
import { CopyVersionButton } from "@/components/releases/copy-version-button";
import { formatDate } from "@/lib/dates";
import { repoUrl } from "@/lib/urls";

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-10 items-center text-body text-accent hover:underline"
    >
      {children}
    </a>
  );
}

export function ToolSummary({
  tool,
  gap,
}: {
  tool: IndexTool;
  gap: string | null;
}) {
  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-detail-title font-semibold tracking-tight text-fg">
          {tool.name}
        </h1>
        <CategoryBadge category={tool.category} asLink />
        {tool.latest ? <ChannelBadge channel={tool.latest.channel} /> : null}
      </div>

      <p className="max-w-2xl text-fg-muted">{tool.description}</p>

      <div className="flex flex-wrap gap-4">
        <ExternalLink href={repoUrl(tool.repository)}>
          {tool.repository}
        </ExternalLink>
        {tool.homepage ? (
          <ExternalLink href={tool.homepage}>Website</ExternalLink>
        ) : null}
        {tool.documentation ? (
          <ExternalLink href={tool.documentation}>Documentation</ExternalLink>
        ) : null}
      </div>

      {tool.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {tool.tags.map((tag) => (
            <li key={tag}>
              {/* Tags link back to a filtered home view — possible only now
                  that filter state lives in the URL. */}
              <Link to="/" search={{ tag }}>
                <NeutralBadge className="hover:bg-border">{tag}</NeutralBadge>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {tool.latest ? (
        <div className="rounded-card border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-mono text-version font-semibold text-fg">
              {tool.latest.version}
            </span>
            <ChannelBadge channel={tool.latest.channel} />
            <span className="text-body text-fg-muted">
              {formatDate(tool.latest.publishedAt)}
            </span>
            <TimeAgo
              iso={tool.latest.publishedAt}
              className="text-body text-fg-subtle"
            />
          </div>
          {gap ? <p className="mt-1 text-meta text-fg-subtle">{gap}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyVersionButton version={tool.latest.version} />
            <Button variant="outline" size="md" asChild>
              <a href={tool.latest.url} target="_blank" rel="noopener noreferrer">
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
