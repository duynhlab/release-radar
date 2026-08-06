import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CountPill } from "./count-pill";

/**
 * The uppercase eyebrow above a group of content ("RELEASED TODAY", "PART OF
 * GRAFANA"). Previously copy-pasted as a class string in two places that had
 * already drifted apart by a margin utility.
 */
export function SectionLabel({
  children,
  count,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode;
  count?: number;
  className?: string;
  as?: "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "flex items-center gap-2 text-micro font-semibold uppercase tracking-[0.06em] text-fg-muted",
        className,
      )}
    >
      {children}
      {count !== undefined ? <CountPill>{count}</CountPill> : null}
    </Tag>
  );
}
