import { formatDate } from "@/lib/dates";
import { useHydrated } from "@/lib/use-hydrated";

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["week", 604_800_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

function relativeLabel(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  // Locale pinned to "en" for the same reason formatDate pins UTC: the server
  // has no navigator, so reading it would desync the two renders.
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

/**
 * Absolute date in the prerendered HTML (deterministic at build time), relative
 * label once hydrated. The <time dateTime> is always the raw ISO and the title
 * is always the absolute date, so the tooltip complements whichever is showing.
 */
export function TimeAgo({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const hydrated = useHydrated();
  return (
    <time dateTime={iso} title={formatDate(iso)} className={className}>
      {hydrated ? relativeLabel(iso) : formatDate(iso)}
    </time>
  );
}
