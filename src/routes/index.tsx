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
import { CatalogSkeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/dates";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">
          DevOps release tracker
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          {tools.length} tools tracked · data updated {formatDate(generatedAt)}
        </p>
      </div>
      <HomeExplorer
        tools={tools}
        generatedAt={generatedAt}
        categories={categories}
        tags={tags}
        search={search}
      />
    </div>
  );
}
