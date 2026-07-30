"use client";

import type { IndexTool } from "@/lib/types";
import { ToolCard } from "./tool-card";
import { useFavorites } from "./use-favorites";

export function ToolGrid({ tools }: { tools: IndexTool[] }) {
  const { favorites, toggleFavorite } = useFavorites();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tools.map((tool) => (
        <ToolCard
          key={tool.id}
          tool={tool}
          isFavorite={favorites.has(tool.id)}
          onToggleFavorite={toggleFavorite}
        />
      ))}
    </div>
  );
}
