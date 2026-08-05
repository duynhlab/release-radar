import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

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
    <Button
      size="icon"
      variant="ghost"
      aria-pressed={isFavorite}
      aria-label={
        isFavorite
          ? `Remove ${toolName} from favorites`
          : `Add ${toolName} to favorites`
      }
      onClick={onToggle}
      className={cn(isFavorite ? "text-star" : "text-fg-subtle")}
    >
      {/* Fill plus aria-pressed, so the state is never signalled by colour alone. */}
      <Star className="size-5" fill={isFavorite ? "currentColor" : "none"} aria-hidden="true" />
    </Button>
  );
}
