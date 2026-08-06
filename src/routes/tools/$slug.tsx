import { createFileRoute, notFound } from "@tanstack/react-router";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { NotFound } from "@/components/layout/not-found";
import { PageContainer } from "@/components/layout/page-container";
import { RelatedTools } from "@/components/catalog/related-tools";
import { ToolSummary } from "@/components/catalog/tool-summary";
import { ReleaseHistory } from "@/components/releases/release-history";
import { getSiblings, getTool } from "@/data/catalog";
import { loadToolReleases } from "@/data/release-notes";
import { Skeleton } from "@/components/ui/skeleton";
import { releaseGapLabel } from "@/lib/dates";
import { buildMeta, canonicalLink } from "@/lib/seo";
import { absoluteUrl, pageTitle } from "@/lib/site";
import { assignReleaseFragments } from "@/lib/urls";

export const Route = createFileRoute("/tools/$slug")({
  loader: async ({ params: { slug } }) => {
    const tool = getTool(slug);
    if (!tool) throw notFound();

    const notes = await loadToolReleases(slug);
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

function ToolPage() {
  const { tool, siblings, gap, releases, notesUnavailable } =
    Route.useLoaderData();

  return (
    <PageContainer width="reading" className="space-y-5">
      <Breadcrumb current={tool.name} />

      <ToolSummary tool={tool} gap={gap} />

      {tool.group && siblings.length > 0 ? (
        <RelatedTools groupName={tool.group.name} siblings={siblings} />
      ) : null}

      <ReleaseHistory
        releases={releases}
        repository={tool.repository}
        unavailable={notesUnavailable}
      />
    </PageContainer>
  );
}
