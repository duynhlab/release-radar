/**
 * One source of truth for the catalog grid. This ladder was byte-identical in
 * tool-grid.tsx and skeleton.tsx, so the skeleton could silently stop matching
 * the real grid.
 *
 * 1 / 2 / 3 / 4 columns at <640 / 640-899 / 900-1279 / >=1280.
 *
 * The 900px step uses the named `cards` breakpoint declared in app.css, not an
 * arbitrary `min-[900px]:` variant — Tailwind emits arbitrary breakpoints
 * before named ones, so `sm:grid-cols-2` sorted later and won at 1024px.
 */
export const TOOL_GRID_CLASS =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 cards:grid-cols-3 xl:grid-cols-4";
