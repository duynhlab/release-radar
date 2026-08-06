import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A neutral count beside a label. There were three recipes for this — two
 * different pill class strings and one place that used plain muted text.
 */
export function CountPill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent";
  className?: string;
}) {
  return (
    <span
      data-numeric=""
      className={cn(
        "inline-flex h-4 items-center rounded-pill px-1.5 text-micro font-medium normal-case",
        tone === "accent"
          ? "bg-accent text-accent-fg"
          : "bg-surface-hover text-fg-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
