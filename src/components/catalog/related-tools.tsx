import { Link } from "@tanstack/react-router";
import { SectionLabel } from "@/components/ui/section-label";
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
      <SectionLabel>Part of {groupName}</SectionLabel>
      <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {siblings.map((sibling) => (
          <li key={sibling.id} className="flex items-baseline gap-2 text-body">
            <Link
              to="/tools/$slug"
              params={{ slug: sibling.id }}
              className="text-accent hover:underline"
            >
              {sibling.name}
            </Link>
            {sibling.latest ? (
              <span className="font-mono text-meta text-fg-subtle">
                {sibling.latest.version}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
