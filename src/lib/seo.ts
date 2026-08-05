import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "./site.ts";

export interface MetaInput {
  title: string;
  description?: string;
  canonical: string;
  noindex?: boolean;
}

type MetaTag = Record<string, string>;

/**
 * Per-route meta. The legacy app emitted only title + description — canonical,
 * Open Graph and robots are all additions, so there is no prior shape to match.
 */
export function buildMeta(input: MetaInput): MetaTag[] {
  const description = input.description ?? SITE_DESCRIPTION;
  const tags: MetaTag[] = [
    { title: input.title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: input.title },
    { property: "og:description", content: description },
    { property: "og:url", content: input.canonical },
    { property: "og:image", content: absoluteUrl("/og.png") },
    { name: "twitter:card", content: "summary_large_image" },
  ];
  if (input.noindex) {
    tags.push({ name: "robots", content: "noindex" });
  }
  return tags;
}

export function canonicalLink(href: string) {
  return { rel: "canonical", href };
}
