import { Link } from "@tanstack/react-router";
import type { IndexTool } from "@/domain/types";

export function RelatedTools({
  groupName,
  siblings,
}: {
  groupName: string;
  siblings: readonly IndexTool[];
}) {
  return (
    <section
      aria-label={`Part of ${groupName}`}
      className="rounded-card border border-border bg-surface p-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
        Part of {groupName}
      </h2>
      <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {siblings.map((sibling) => (
          <li key={sibling.id} className="flex items-baseline gap-2 text-sm">
            <Link
              to="/tools/$slug"
              params={{ slug: sibling.id }}
              className="text-accent hover:underline"
            >
              {sibling.name}
            </Link>
            {sibling.latest ? (
              <span className="font-mono text-xs text-fg-subtle">
                {sibling.latest.version}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
