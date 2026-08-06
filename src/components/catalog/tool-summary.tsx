import { Link } from "@tanstack/react-router";
import type { IndexTool } from "@/domain/types";
import { CategoryBadge, NeutralBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TimeAgo } from "@/components/ui/time-ago";
import { CopyVersionButton } from "@/components/releases/copy-version-button";
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
      className="inline-flex min-h-7 items-center text-control text-accent hover:underline"
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
    <header className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-detail-title font-semibold tracking-tight text-fg">
          {tool.name}
        </h1>
        <CategoryBadge category={tool.category} asLink />
        {/* No channel badge here: every release row below carries one, and the
            first of those IS tool.latest — so this was the same signal twice on
            one screen, which is exactly what the badge row is not for. */}
      </div>

      <p className="max-w-[80ch] text-body text-fg-muted">{tool.description}</p>

      {/* Links and topic tags share one metadata row rather than two stacked
          ones; that alone was ~60px of the old 302px header. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <ExternalLink href={repoUrl(tool.repository)}>
          {tool.repository}
        </ExternalLink>
        {tool.homepage ? (
          <ExternalLink href={tool.homepage}>Website</ExternalLink>
        ) : null}
        {tool.documentation ? (
          <ExternalLink href={tool.documentation}>Documentation</ExternalLink>
        ) : null}
        {tool.tags.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
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
      </div>

      {tool.latest ? (
        // A strip, not a card: one row of facts plus its actions. The old card
        // was 134px for six short values.
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-border bg-surface px-3 py-2">
          <span className="font-mono text-version font-semibold text-fg">
            {tool.latest.version}
          </span>
          {/* One rendering of the date. TimeAgo already carries the absolute
              form in its title, and renders it as its own text until hydration
              — so a sibling formatDate() span printed the identical string
              beside it in every prerendered page, which is what crawlers and
              no-JS visitors actually saw. */}
          <TimeAgo
            iso={tool.latest.publishedAt}
            className="text-meta text-fg-muted"
          />
          {gap ? <span className="text-meta text-fg-subtle">{gap}</span> : null}
          <div className="flex flex-wrap gap-1.5">
            <CopyVersionButton version={tool.latest.version} />
            <Button variant="outline" size="sm" asChild>
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
