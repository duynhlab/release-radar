/**
 * One source of truth for the catalog grid. This ladder was byte-identical in
 * tool-grid.tsx and skeleton.tsx, so the skeleton could silently stop matching
 * the real grid.
 *
 * 1 / 2 / 3 / 4 columns. The md step exists so the 900-1023px band gets three
 * columns instead of being stuck at two.
 */
export const TOOL_GRID_CLASS =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4";
