import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A grid page and a reading page want different widths, and they used to share
 * one at 1360px. That left a release row spreading a version, a badge, a date
 * and two links across 1312px — 944px of it empty, 72% of the row.
 *
 * `grid` (1152px) puts cards at ~360px with the 3-column ladder.
 * `reading` (896px) is for the single column of prose and rows on a tool page.
 *
 * Both are stock Tailwind steps, so no arbitrary width enters the scale. The
 * header keeps the grid width, so a reading page's left edge sits inboard of
 * the header's — intentional, and what keeps long-form content readable.
 */
export function PageContainer({
  width = "grid",
  children,
  className,
}: {
  width?: "grid" | "reading";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        width === "grid" ? "max-w-6xl" : "max-w-4xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** The header spans the grid width on every route, so it never shifts. */
export const HEADER_CONTAINER = "mx-auto w-full max-w-6xl";
