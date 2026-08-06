/**
 * One source of truth for the catalog grid. This ladder was byte-identical in
 * tool-grid.tsx and skeleton.tsx, so the skeleton could silently stop matching
 * the real grid.
 *
 * 1 / 2 / 3 columns at <640 / 640-899 / >=900.
 *
 * No fourth column: inside the 1152px grid container three columns put cards
 * at ~360px, which is where a two-line description stops fighting the version
 * row. A fourth would take them back to ~319px.
 *
 * The 900px step uses the named `cards` breakpoint declared in app.css, not an
 * arbitrary `min-[900px]:` variant — Tailwind emits arbitrary breakpoints
 * before named ones, so `sm:grid-cols-2` sorted later and won at 1024px.
 */
export const TOOL_GRID_CLASS =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 cards:grid-cols-3";
