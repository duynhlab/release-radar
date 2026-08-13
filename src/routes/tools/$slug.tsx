import {
  Link,
  createFileRoute,
  notFound,
  stripSearchParams,
  type SearchSchemaInput,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CountPill } from "@/components/ui/count-pill";
import { NotFound } from "@/components/layout/not-found";
import { PageContainer } from "@/components/layout/page-container";
import { RelatedTools } from "@/components/catalog/related-tools";
import { ToolSummary } from "@/components/catalog/tool-summary";
import { ReadmeSection } from "@/components/readme/readme-section";
import { ReleaseHistory } from "@/components/releases/release-history";
import { getSiblings, getTool } from "@/data/catalog";
import { loadToolReadme } from "@/data/readme";
import { loadToolReleases } from "@/data/release-notes";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TOOL_SEARCH_DEFAULTS,
  parseToolSearch,
  type ToolSearch,
  type ToolSearchInput,
  type ToolTab,
} from "@/features/tool/search-params";
import { cn } from "@/lib/cn";
import { releaseGapLabel } from "@/lib/dates";
import { buildMeta, canonicalLink } from "@/lib/seo";
import { absoluteUrl, pageTitle } from "@/lib/site";
import { assignReleaseFragments } from "@/lib/urls";

export const Route = createFileRoute("/tools/$slug")({
  validateSearch: (input: ToolSearchInput & SearchSchemaInput): ToolSearch =>
    parseToolSearch(input as Record<string, unknown>),
  search: { middlewares: [stripSearchParams(TOOL_SEARCH_DEFAULTS)] },
  loader: async ({ params: { slug } }) => {
    const tool = getTool(slug);
    if (!tool) throw notFound();

    const [notes, readme] = await Promise.all([
      loadToolReleases(slug),
      loadToolReadme(slug),
    ]);
    return {
      tool,
      siblings: getSiblings(tool),
      // gap and fragments are computed here, not in the components: both must
      // be identical on server and client, and the loader result is what gets
      // serialized into the payload.
      gap: tool.latest
        ? releaseGapLabel(tool.latest.publishedAt, tool.previous)
        : null,
      notesUnavailable: notes.status === "unavailable",
      releases:
        notes.status === "ok" ? assignReleaseFragments(notes.releases) : [],
      readmeUnavailable: readme.status === "unavailable",
      readme: readme.status === "ok" ? readme.readme : null,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: pageTitle("Tool not found") }] };
    const { tool } = loaderData;
    const canonical = absoluteUrl(`/tools/${tool.id}`);
    const description = tool.latest
      ? `${tool.description}. Latest release ${tool.latest.version} on ${new Date(tool.latest.publishedAt).toISOString().slice(0, 10)}.`
      : tool.description;
    return {
      meta: buildMeta({
        title: pageTitle(tool.name),
        description,
        canonical,
      }),
      links: [canonicalLink(canonical)],
    };
  },
  pendingComponent: () => (
    <div role="status" aria-label="Loading tool" className="space-y-8">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  ),
  notFoundComponent: () => <NotFound kind="tool" />,
  component: ToolPage,
});

function TabLink({
  value,
  tab,
  children,
}: {
  value: ToolTab;
  tab: ToolTab;
  children: ReactNode;
}) {
  const active = tab === value;
  return (
    <Link
      from={Route.fullPath}
      search={{ tab: value }}
      resetScroll={false}
      // Router's default active matching treats the releases link (defaults
      // stripped, so search={}) as a subset of ANY search and injects
      // aria-current="page" on it even on ?tab=readme. Exact matching keeps
      // the router's judgment aligned with the explicit prop below.
      activeOptions={{ exact: true, includeSearch: true }}
      aria-current={active ? "page" : undefined}
      className={cn(
        "-mb-px inline-flex h-9 items-center gap-2 border-b-2 px-1 text-control font-medium transition-colors",
        active
          ? "border-accent text-fg"
          : "border-transparent text-fg-muted hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}

function ToolPage() {
  const {
    tool,
    siblings,
    gap,
    releases,
    notesUnavailable,
    readme,
    readmeUnavailable,
  } = Route.useLoaderData();
  const { tab } = Route.useSearch();

  return (
    <PageContainer width="reading" className="space-y-5">
      <Breadcrumb current={tool.name} />

      <ToolSummary tool={tool} gap={gap} />

      {tool.group && siblings.length > 0 ? (
        <RelatedTools groupName={tool.group.name} siblings={siblings} />
      ) : null}

      {/* The tab strip carries the visible section labels; each panel keeps an
          sr-only h2 for the outline. Both panels stay in the DOM (hidden, not
          unmounted) so the prerendered HTML and in-page Cmd+F keep every note
          and the README — same reasoning as native <details> in ReleaseItem. */}
      <div className="space-y-4">
        <nav
          aria-label="Tool sections"
          className="flex items-center gap-4 border-b border-border"
        >
          <TabLink value="releases" tab={tab}>
            Release history
            {releases.length > 0 ? (
              <CountPill>{releases.length}</CountPill>
            ) : null}
          </TabLink>
          <TabLink value="readme" tab={tab}>
            README
          </TabLink>
        </nav>

        <div hidden={tab !== "releases"}>
          <ReleaseHistory
            releases={releases}
            repository={tool.repository}
            unavailable={notesUnavailable}
            hideHeading
          />
        </div>
        <div hidden={tab !== "readme"}>
          <ReadmeSection
            readme={readme}
            repository={tool.repository}
            unavailable={readmeUnavailable}
          />
        </div>
      </div>
    </PageContainer>
  );
}
