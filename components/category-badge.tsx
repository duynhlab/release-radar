import Link from "next/link";
import { CATEGORY_LABELS, type Category } from "@/lib/types";

const CATEGORY_STYLES: Record<Category, string> = {
  platform:
    "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  provisioning:
    "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  delivery:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  observability:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  networking:
    "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  security:
    "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  data:
    "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  ai:
    "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
};

export function CategoryBadge({
  category,
  asLink = false,
}: {
  category: Category;
  asLink?: boolean;
}) {
  const className = `inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[category]}`;
  const label = CATEGORY_LABELS[category];
  if (asLink) {
    return (
      <Link href={`/categories/${category}`} className={`${className} hover:opacity-80`}>
        {label}
      </Link>
    );
  }
  return <span className={className}>{label}</span>;
}

export function ChannelBadge({ channel }: { channel: "stable" | "prerelease" }) {
  return channel === "stable" ? (
    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
      stable
    </span>
  ) : (
    <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
      prerelease
    </span>
  );
}
