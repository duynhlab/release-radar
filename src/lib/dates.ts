/**
 * Absolute date, always in UTC.
 *
 * The fixed timeZone is why server and client agree — without it the same
 * instant renders differently either side of a hydration boundary. Same reason
 * TimeAgo pins the "en" locale rather than reading the navigator.
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function daysBetween(fromIso: string, toIso: string): number {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return Math.round(ms / 86_400_000);
}

/** "42 days after v2.9.2" — the gap since the previous release. */
export function releaseGapLabel(
  latestPublishedAt: string,
  previous: { version: string; publishedAt: string } | null,
): string | null {
  if (!previous) return null;
  const days = daysBetween(previous.publishedAt, latestPublishedAt);
  if (days <= 0) return `same day as ${previous.version}`;
  return `${days} day${days === 1 ? "" : "s"} after ${previous.version}`;
}
