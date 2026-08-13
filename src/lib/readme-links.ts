/**
 * Link policy for repository READMEs.
 *
 * Same rejections as the release-note policy in note-links.ts ("" means core
 * stripped the scheme; "//" is off-site), but the opposite treatment of
 * relative paths: a README's `docs/guide.md`, `./CONTRIBUTING.md` or
 * `/examples` is repo-relative — GitHub resolves it against the repo, and so
 * do we. On this site those paths would 404, so every README link resolves to
 * an absolute GitHub URL and is rendered as an external link.
 *
 * `#fragment` anchors get the same treatment: headingIds are off (see
 * markdown-options.ts), so there is no in-page target — GitHub's rendered
 * README on the repo page answers the same fragments.
 *
 * Pure and React-free, so the corpus audit script can apply the same policy.
 */

const NON_HTTP_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** `repository` is the catalog's Zod-validated `owner/repo`, never README text. */
export function resolveReadmeHref(
  href: string | undefined,
  repository: string,
): string | null {
  if (!href) return null; // "" means core rejected the scheme
  if (href.startsWith("//")) return null; // protocol-relative -> off-site
  if (href.startsWith("#")) return `https://github.com/${repository}${href}`;
  if (/^https?:\/\//i.test(href)) return href;
  if (NON_HTTP_SCHEME.test(href)) return null; // mailto:, tel:, anything else
  return resolveRepoPath(href, repository, "blob");
}

/**
 * Absolute URL for a README image — used as the blocked-image placeholder's
 * link target (v1 renders no remote images, see ALLOWED_NOTE_IMAGE_HOSTS).
 * Relative paths resolve through the repo's `raw` view so the link shows the
 * image itself rather than a file page.
 */
export function resolveReadmeImageSrc(
  src: string | undefined,
  repository: string,
): string | null {
  if (!src) return null;
  if (src.startsWith("//") || src.startsWith("#")) return null;
  if (/^https?:\/\//i.test(src)) return src;
  if (NON_HTTP_SCHEME.test(src)) return null;
  return resolveRepoPath(src, repository, "raw");
}

function resolveRepoPath(
  href: string,
  repository: string,
  view: "blob" | "raw",
): string | null {
  try {
    // A leading "/" is repo-root, not site-root — strip it so the URL join
    // stays inside <repo>/<view>/HEAD/ instead of resetting to the host root.
    const rel = href.startsWith("/") ? href.slice(1) : href;
    const url = new URL(rel, `https://github.com/${repository}/${view}/HEAD/`);
    // "../" runs can climb out of the repo path but never off the host; the
    // check is belt and braces against URL parsing surprises.
    return url.hostname === "github.com" ? url.href : null;
  } catch {
    return null;
  }
}
