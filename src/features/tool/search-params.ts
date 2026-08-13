import { z } from "zod";

export const TOOL_TABS = ["releases", "readme"] as const;
export type ToolTab = (typeof TOOL_TABS)[number];

export interface ToolSearch {
  tab: ToolTab;
}

/** What a caller may write. Every key optional — defaults are stripped. */
export type ToolSearchInput = Partial<ToolSearch>;

export const TOOL_SEARCH_DEFAULTS: ToolSearch = { tab: "releases" };

const TAB_FIELD = z.enum(TOOL_TABS);

/**
 * Total function: never throws — `?tab=nope` falls back to the default tab
 * instead of dropping the visitor into an error boundary. Same contract as
 * parseHomeSearch.
 */
export function parseToolSearch(raw: Record<string, unknown>): ToolSearch {
  const result = TAB_FIELD.safeParse(raw.tab);
  return { tab: result.success ? result.data : TOOL_SEARCH_DEFAULTS.tab };
}
