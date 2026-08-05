import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { NotFound } from "@/components/layout/not-found";
import { RelatedTools } from "@/components/catalog/related-tools";
import { ToolSummary } from "@/components/catalog/tool-summary";
import { ReleaseHistory } from "@/components/releases/release-history";
import { getSiblings, getTool } from "@/data/catalog";
import { loadToolReleases } from "@/data/release-notes";
import { releaseGapLabel } from "@/lib/dates";
import { buildMeta, canonicalLink } from "@/lib/seo";
import { absoluteUrl, pageTitle } from "@/lib/site";
import { assignReleaseFragments } from "@/lib/urls";

export const Route = createFileRoute("/tools/$slug")({
  loader: async ({ params: { slug } }) => {
    const tool = getTool(slug);
    if (!tool) throw notFound();

    const releases = await loadToolReleases(slug);
    return {
      tool,
      siblings: getSiblings(tool),
      // gap and fragments are computed here, not in the components: both must
      // be identical on server and client, and the loader result is what gets
      // serialized into the payload.
      gap: tool.latest
        ? releaseGapLabel(tool.latest.publishedAt, tool.previous)
        : null,
      releases: assignReleaseFragments(releases),
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
  notFoundComponent: () => <NotFound kind="tool" />,
  component: ToolPage,
});

function ToolPage() {
  const { tool, siblings, gap, releases } = Route.useLoaderData();

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex items-center gap-2 text-fg-muted">
          <li>
            <Link to="/" className="hover:text-fg">
              All tools
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-fg">
            {tool.name}
          </li>
        </ol>
      </nav>

      <ToolSummary tool={tool} gap={gap} />

      {tool.group && siblings.length > 0 ? (
        <RelatedTools groupName={tool.group.name} siblings={siblings} />
      ) : null}

      <ReleaseHistory releases={releases} repository={tool.repository} />
    </div>
  );
}
