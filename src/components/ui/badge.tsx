import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CATEGORY_LABELS, type Category } from "@/domain/types";
import { cn } from "@/lib/cn";

// Static class strings per category so Tailwind's scanner sees them. A computed
// `bg-cat-${category}-bg` would be invisible to it and silently render unstyled.
const CATEGORY_STYLES: Record<Category, string> = {
  kubernetes: "bg-cat-kubernetes-bg text-cat-kubernetes-fg",
  gitops: "bg-cat-gitops-bg text-cat-gitops-fg",
  iac: "bg-cat-iac-bg text-cat-iac-fg",
  observability: "bg-cat-observability-bg text-cat-observability-fg",
  database: "bg-cat-database-bg text-cat-database-fg",
  backup: "bg-cat-backup-bg text-cat-backup-fg",
  messaging: "bg-cat-messaging-bg text-cat-messaging-fg",
  networking: "bg-cat-networking-bg text-cat-networking-fg",
  security: "bg-cat-security-bg text-cat-security-fg",
  testing: "bg-cat-testing-bg text-cat-testing-fg",
  ai: "bg-cat-ai-bg text-cat-ai-fg",
};

const base =
  "inline-flex h-5 items-center gap-1 rounded-badge px-1.5 text-micro font-medium";

export function CategoryBadge({
  category,
  asLink = false,
}: {
  category: Category;
  asLink?: boolean;
}) {
  const className = cn(base, CATEGORY_STYLES[category]);
  const label = CATEGORY_LABELS[category];
  if (!asLink) return <span className={className}>{label}</span>;
  return (
    <Link
      to="/categories/$slug"
      params={{ slug: category }}
      className={cn(className, "hover:brightness-110")}
    >
      {label}
    </Link>
  );
}

/**
 * Renders only for a prerelease — an exception signal, not a label.
 *
 * Every tool sets `includePrerelease: false`, so the sync filters prereleases
 * out and all 690 stored releases are stable. A badge that reads "stable" on
 * every card and every history row (~768 renders) states something that cannot
 * be false, while the case worth noticing was signalled at the same size and
 * weight, differing only in hue.
 *
 * The guard lives here rather than at the call sites so it cannot come back the
 * next time a badge row is edited.
 */
export function ChannelBadge({ channel }: { channel: "stable" | "prerelease" }) {
  if (channel === "stable") return null;
  return <span className={cn(base, "bg-pre-bg text-pre-fg")}>{channel}</span>;
}

export function NeutralBadge({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(base, "bg-surface-hover text-fg-muted", className)}
    >
      {children}
    </span>
  );
}
