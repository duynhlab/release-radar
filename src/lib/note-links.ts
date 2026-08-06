export type NoteHrefKind = "internal" | "external";

/**
 * Link policy for release notes — narrower than the library's on purpose.
 *
 * TanStack Markdown's core sanitizeUrl() allows `#`, `/`, `./`, `../`, http:,
 * https:, mailto: and tel:, and returns the EMPTY STRING for everything else
 * rather than dropping the attribute. Two consequences handled here:
 *
 *   1. `[x](javascript:alert(1))` becomes `<a href="">x</a>` — a dead link that
 *      still satisfies a naive `not.toContain("javascript:")` assertion. Treat
 *      "" as "not a link" so no anchor is emitted at all.
 *   2. A protocol-relative `//evil.example` matches core's leading-"/" test and
 *      survives sanitization, navigating off-site. Reject it explicitly.
 *
 * mailto: and tel: are dropped too, which core permits — a release note has no
 * business opening a mail client.
 *
 * Pure, so the corpus audit script can apply the same policy without React.
 */
export function classifyNoteHref(
  href: string | undefined,
): NoteHrefKind | null {
  if (!href) return null; // "" means core rejected the scheme
  if (href.startsWith("//")) return null; // protocol-relative -> off-site
  if (/^(#|\/|\.\/|\.\.\/)/.test(href)) return "internal";
  if (/^https?:\/\//i.test(href)) return "external";
  return null; // mailto:, tel:, bare "docs/x.md", anything else
}

/** v1 denies every remote image. Enabling one is an entry plus a test. */
export const ALLOWED_NOTE_IMAGE_HOSTS: readonly string[] = [];

export function isAllowedNoteImage(src: string): boolean {
  if (ALLOWED_NOTE_IMAGE_HOSTS.length === 0) return false;
  try {
    const url = new URL(src);
    return (
      url.protocol === "https:" &&
      ALLOWED_NOTE_IMAGE_HOSTS.includes(url.hostname)
    );
  } catch {
    return false;
  }
}
