import type { IndexTool } from "@/domain/types";
import { TOOL_GRID_CLASS } from "./grid";
import { useFavorites } from "@/features/favorites/use-favorites";
import { ToolCard } from "./tool-card";

/**
 * 1 / 2 / 4 at the three audited viewports (390 / 768 / 1440). The `lg` step
 * only governs 1024-1279px, where four columns would give ~264px cards that
 * cannot hold a two-line name plus the version row.
 */
export function ToolGrid({ tools }: { tools: readonly IndexTool[] }) {
  const { favorites, toggleFavorite } = useFavorites();
  return (
    <div className={TOOL_GRID_CLASS}>
      {tools.map((tool) => (
        <ToolCard
          key={tool.id}
          tool={tool}
          isFavorite={favorites.has(tool.id)}
          onToggleFavorite={() => toggleFavorite(tool.id)}
        />
      ))}
    </div>
  );
}
