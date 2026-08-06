import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { CATEGORY_LABELS } from "@/domain/types";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { NotFound } from "@/components/layout/not-found";
import { ToolGrid } from "@/components/catalog/tool-grid";
import { PageContainer } from "@/components/layout/page-container";
import { PageTitle } from "@/components/ui/page-title";
import { CatalogSkeleton } from "@/components/ui/skeleton";
import { getToolsByCategory, isCategory } from "@/data/catalog";
import { buildMeta, canonicalLink } from "@/lib/seo";
import { absoluteUrl, pageTitle } from "@/lib/site";

export const Route = createFileRoute("/categories/$slug")({
  loader: ({ params: { slug } }) => {
    // throw notFound() alone yields a real HTTP 404 and renders
    // notFoundComponent into the SSR HTML. No setResponseStatus needed.
    if (!isCategory(slug)) throw notFound();
    return { category: slug, tools: getToolsByCategory(slug) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: pageTitle("Category") }] };
    const { category, tools } = loaderData;
    const label = CATEGORY_LABELS[category];
    const canonical = absoluteUrl(`/categories/${category}`);
    return {
      meta: buildMeta({
        title: pageTitle(label),
        description: `${tools.length} ${label} tools tracked on Release Radar, sorted by latest release.`,
        canonical,
      }),
      links: [canonicalLink(canonical)],
    };
  },
  pendingComponent: () => <CatalogSkeleton cards={4} />,
  notFoundComponent: () => <NotFound kind="category" />,
  component: CategoryPage,
});

function CategoryPage() {
  const { category, tools } = Route.useLoaderData();
  const label = CATEGORY_LABELS[category];

  return (
    <PageContainer className="space-y-6">
      <Breadcrumb current={label} />

      <PageTitle
        title={label}
        meta={`${tools.length} tool${tools.length === 1 ? "" : "s"} tracked in this category`}
      />

      {tools.length === 0 ? (
        <p role="status" className="py-8 text-body text-fg-muted">
          No tools tracked in this category yet.{" "}
          <Link to="/" className="text-accent hover:underline">
            Browse all tools
          </Link>
          .
        </p>
      ) : (
        <section aria-label="Tools">
          <h2 className="sr-only">Tools</h2>
          <ToolGrid tools={tools} />
        </section>
      )}
    </PageContainer>
  );
}
