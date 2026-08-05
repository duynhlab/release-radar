import { CATEGORIES, type ReleaseIndex } from "../domain/types.ts";

export interface PrerenderPage {
  path: string;
  prerender: { enabled: true };
  sitemap: {
    priority: number;
    changefreq: "hourly" | "daily" | "weekly";
    lastmod: string;
  };
}

/**
 * The authoritative prerender list: 1 home + 8 categories + one page per tool.
 *
 * Derived from the same validated index that getTool() reads, so
 * "prerendered set == 404-free set" holds by construction. That is what
 * replaces Next's `dynamicParams = false`.
 */
export function buildPrerenderPages(index: ReleaseIndex): PrerenderPage[] {
  const lastmod = index.generatedAt;
  return [
    {
      path: "/",
      prerender: { enabled: true },
      sitemap: { priority: 1, changefreq: "hourly", lastmod },
    },
    ...CATEGORIES.map((slug) => ({
      path: `/categories/${slug}`,
      prerender: { enabled: true } as const,
      sitemap: { priority: 0.6, changefreq: "daily" as const, lastmod },
    })),
    ...index.tools.map((tool) => ({
      path: `/tools/${tool.id}`,
      prerender: { enabled: true } as const,
      sitemap: {
        priority: 0.8,
        changefreq: "weekly" as const,
        lastmod: tool.latest?.publishedAt ?? lastmod,
      },
    })),
  ];
}
