import { cn } from "@/lib/cn";

/**
 * Hand-written rather than taken from shadcn, whose version is a bare
 * `animate-pulse` with no reduced-motion handling — and respecting
 * prefers-reduced-motion is a stated acceptance criterion.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-control bg-surface-hover motion-reduce:animate-none",
        className,
      )}
    />
  );
}

/** Matches the tool card's shape so the grid does not jump when data lands. */
export function ToolCardSkeleton() {
  return (
    <div className="flex min-h-52 flex-col gap-2 rounded-card border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="w-full space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="size-10 shrink-0 rounded-control" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="mt-auto space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export function CatalogSkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <div role="status" aria-label="Loading tools" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: cards }, (_, i) => (
          <ToolCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
