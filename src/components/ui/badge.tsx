import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CATEGORY_LABELS, type Category } from "@/domain/types";
import { cn } from "@/lib/cn";

// Static class strings per category so Tailwind's scanner sees them. A computed
// `bg-cat-${category}-bg` would be invisible to it and silently render unstyled.
const CATEGORY_STYLES: Record<Category, string> = {
  platform: "bg-cat-platform-bg text-cat-platform-fg",
  provisioning: "bg-cat-provisioning-bg text-cat-provisioning-fg",
  delivery: "bg-cat-delivery-bg text-cat-delivery-fg",
  observability: "bg-cat-observability-bg text-cat-observability-fg",
  networking: "bg-cat-networking-bg text-cat-networking-fg",
  security: "bg-cat-security-bg text-cat-security-fg",
  data: "bg-cat-data-bg text-cat-data-fg",
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

export function ChannelBadge({ channel }: { channel: "stable" | "prerelease" }) {
  return (
    <span
      className={cn(
        base,
        channel === "stable"
          ? "bg-stable-bg text-stable-fg"
          : "bg-pre-bg text-pre-fg",
      )}
    >
      {channel}
    </span>
  );
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
