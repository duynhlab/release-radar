import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryBadge, ChannelBadge } from "@/components/category-badge";
import { ReleaseCard } from "@/components/release-card";
import { getIndex, getIndexTool, getToolReleases } from "@/lib/data";
import { formatDate, releaseGapLabel } from "@/lib/format";

export const dynamic = "error";
export const dynamicParams = false;

export function generateStaticParams() {
  return getIndex().tools.map((tool) => ({ slug: tool.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getIndexTool(slug);
  return {
    title: tool?.name ?? "Tool",
    description: tool?.description,
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getIndexTool(slug);
  const file = getToolReleases(slug);
  if (!tool) notFound();

  const releases = file?.releases ?? [];
  const gap = tool.latest
    ? releaseGapLabel(tool.latest.publishedAt, tool.previous)
    : null;
  const siblings = tool.group
    ? getIndex().tools.filter(
        (t) => t.group?.id === tool.group?.id && t.id !== tool.id,
      )
    : [];

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link
          href="/"
          className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← All tools
        </Link>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{tool.name}</h1>
          <CategoryBadge category={tool.category} asLink />
          {tool.latest && <ChannelBadge channel={tool.latest.channel} />}
        </div>
        <p className="max-w-2xl text-zinc-600 dark:text-zinc-300">
          {tool.description}
        </p>
        {tool.latest && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Latest{" "}
            <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
              {tool.latest.version}
            </span>{" "}
            on {formatDate(tool.latest.publishedAt)}
            {gap ? ` · ${gap}` : ""}
          </p>
        )}
        <div className="flex flex-wrap gap-4 text-sm">
          <a
            href={`https://github.com/${tool.repository}`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            {tool.repository}
          </a>
          {tool.homepage && (
            <a
              href={tool.homepage}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Website
            </a>
          )}
          {tool.documentation && (
            <a
              href={tool.documentation}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Documentation
            </a>
          )}
        </div>
        {tool.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tool.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {tool.group && siblings.length > 0 && (
        <section
          aria-label={`Part of ${tool.group.name}`}
          className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Part of {tool.group.name}
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {siblings.map((sibling) => (
              <li key={sibling.id}>
                <Link
                  href={`/tools/${sibling.id}`}
                  className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  {sibling.name}
                </Link>
                {sibling.latest && (
                  <span className="ml-1.5 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {sibling.latest.version}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Release history" className="space-y-4">
        <h2 className="text-lg font-semibold">
          Release history
          <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
            last {releases.length} releases
          </span>
        </h2>
        {releases.length === 0 ? (
          <p role="status" className="py-8 text-sm text-zinc-500 dark:text-zinc-400">
            No releases tracked yet. The next daily sync will populate this
            page.
          </p>
        ) : (
          <div className="space-y-4">
            {releases.map((release, i) => (
              <ReleaseCard
                key={String(release.id)}
                release={release}
                previous={releases[i + 1] ?? null}
                repository={tool.repository}
                defaultOpen={i === 0}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
