import type { ReactNode } from "react";

/**
 * Title plus its metadata row. Repeated in four places before this, with the
 * gap already drifting between mt-1 and mt-2.
 *
 * The metadata sits 4px under the title so the two read as one block rather
 * than two stacked ones.
 */
export function PageTitle({
  title,
  meta,
}: {
  title: string;
  meta?: ReactNode;
}) {
  return (
    <div>
      <h1 className="text-page-title font-semibold tracking-tight text-fg">
        {title}
      </h1>
      {meta ? <p className="mt-1 text-meta text-fg-muted">{meta}</p> : null}
    </div>
  );
}
