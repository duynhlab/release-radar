"use client";

import { formatDate } from "@/lib/format";
import { useHydrated } from "./use-hydrated";

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
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

/**
 * Renders the absolute date in the prerendered HTML (deterministic at build
 * time) and swaps to a relative label once hydrated.
 */
export function TimeAgo({ iso }: { iso: string }) {
  const hydrated = useHydrated();
  return (
    <time dateTime={iso} title={formatDate(iso)}>
      {hydrated ? relativeLabel(iso) : formatDate(iso)}
    </time>
  );
}
