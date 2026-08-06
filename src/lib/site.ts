export const SITE_NAME = "Release Radar";

export const SITE_DESCRIPTION =
  "Daily tracker for new releases of DevOps and SRE tools on GitHub";

/**
 * Public origin, used for canonical URLs, Open Graph and the sitemap.
 * Not recorded anywhere else in the repo (wrangler.jsonc has no routes block),
 * so it lives here as the single place to change it.
 */
export const SITE_URL = (
  import.meta.env?.VITE_SITE_URL ?? "https://radar.duynh.me"
).replace(/\/$/, "");

/** Next's `metadata.template: "%s · Release Radar"` has no TanStack equivalent. */
export function pageTitle(segment?: string): string {
  return segment ? `${segment} · ${SITE_NAME}` : SITE_NAME;
}

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, `${SITE_URL}/`).href;
}
