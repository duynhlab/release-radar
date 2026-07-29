"use client";

export function FavoriteToggle({
  toolName,
  isFavorite,
  onToggle,
}: {
  toolName: string;
  isFavorite: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isFavorite}
      aria-label={
        isFavorite
          ? `Remove ${toolName} from favorites`
          : `Add ${toolName} to favorites`
      }
      className={`rounded-md p-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
        isFavorite ? "text-amber-500" : "text-zinc-400 dark:text-zinc-600"
      }`}
    >
      <svg
        viewBox="0 0 20 20"
        fill={isFavorite ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 2.5l2.3 4.7 5.2.75-3.75 3.66.88 5.16L10 14.34l-4.63 2.43.88-5.16L2.5 7.95l5.2-.75L10 2.5z"
        />
      </svg>
    </button>
  );
}
