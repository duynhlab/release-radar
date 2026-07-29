import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolGrid } from "@/components/tool-grid";
import { getIndex } from "@/lib/data";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/types";

export const dynamic = "error";
export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const label = CATEGORY_LABELS[slug as Category];
  return { title: label ?? "Category" };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!CATEGORIES.includes(slug as Category)) notFound();
  const category = slug as Category;

  const tools = getIndex()
    .tools.filter((tool) => tool.category === category)
    .sort(
      (a, b) =>
        (b.latest?.publishedAt ?? "").localeCompare(
          a.latest?.publishedAt ?? "",
        ) || a.name.localeCompare(b.name),
    );

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link
          href="/"
          className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← All tools
        </Link>
      </nav>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {CATEGORY_LABELS[category]}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {tools.length} tool{tools.length === 1 ? "" : "s"} tracked in this
          category
        </p>
      </div>
      {tools.length === 0 ? (
        <p role="status" className="py-8 text-sm text-zinc-500 dark:text-zinc-400">
          No tools in this category yet. Add one to{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
            config/tools.yaml
          </code>
          .
        </p>
      ) : (
        <section aria-label="Tools">
          <h2 className="sr-only">Tools</h2>
          <ToolGrid tools={tools} />
        </section>
      )}
    </div>
  );
}
