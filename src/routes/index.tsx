import {
  createFileRoute,
  stripSearchParams,
  type SearchSchemaInput,
} from "@tanstack/react-router";
import { getAllTags, getIndex, getUsedCategories } from "@/data/catalog";
import { HomeExplorer } from "@/features/catalog/home-explorer";
import {
  HOME_SEARCH_DEFAULTS,
  canonicalHomePath,
  isFiltered,
  parseHomeSearch,
  type HomeSearch,
  type HomeSearchInput,
} from "@/features/catalog/search-params";
import { PageContainer } from "@/components/layout/page-container";
import { PageTitle } from "@/components/ui/page-title";
import { CatalogSkeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/dates";
import { bucketByRecency } from "@/features/catalog/filters";
import { buildMeta, canonicalLink } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/site";

export const Route = createFileRoute("/")({
  // SearchSchemaInput marks "input type differs from output type", which keeps
  // <Link search={{ category: "security" }}> typed while the parsed value is
  // always fully populated.
  validateSearch: (input: HomeSearchInput & SearchSchemaInput): HomeSearch =>
    parseHomeSearch(input as Record<string, unknown>),
  search: { middlewares: [stripSearchParams(HOME_SEARCH_DEFAULTS)] },
  loader: () => {
    const index = getIndex();
    return {
      tools: index.tools,
      generatedAt: index.generatedAt,
      categories: getUsedCategories(),
      tags: getAllTags(),
    };
  },
  head: ({ match }) => {
    const search = match.search;
    return {
      meta: buildMeta({
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
        canonical: absoluteUrl(canonicalHomePath(search)),
        // Filtered permutations must not be indexed as duplicates.
        noindex: isFiltered(search),
      }),
      links: [canonicalLink(absoluteUrl(canonicalHomePath(search)))],
    };
  },
  pendingComponent: () => <CatalogSkeleton />,
  component: HomePage,
});

function HomePage() {
  const { tools, generatedAt, categories, tags } = Route.useLoaderData();
  const search = Route.useSearch();

  return (
    <PageContainer className="space-y-6">
      <PageTitle
        title="Know what’s new"
        meta={`Track releases across your infrastructure stack · updated ${formatDate(generatedAt)}`}
      />
      <section aria-label="Overview" className="grid grid-cols-3 overflow-hidden rounded-card border border-border bg-surface sm:grid-cols-4">
        <div className="col-span-3 border-b border-border p-4 sm:col-span-1 sm:border-b-0 sm:border-r">
          <h2 className="text-body font-semibold">Overview</h2>
          <p className="mt-1 text-meta text-fg-muted">A snapshot of your tracked ecosystem.</p>
        </div>
        {[
          ["Tools tracked", tools.length],
          ["Categories", categories.length],
          ["Updated in 7 days", bucketByRecency(tools, Date.parse(generatedAt)).today.length + bucketByRecency(tools, Date.parse(generatedAt)).week.length],
        ].map(([label, count]) => (
          <div key={label} className="border-r border-border p-4 last:border-r-0">
            <p className="text-meta text-fg-muted">{label}</p>
            <p className="mt-1 text-page-title font-semibold tabular-nums">{count}</p>
          </div>
        ))}
      </section>
      <HomeExplorer
        tools={tools}
        generatedAt={generatedAt}
        categories={categories}
        tags={tags}
        search={search}
      />
    </PageContainer>
  );
}
