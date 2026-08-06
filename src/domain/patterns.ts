import type { Tool } from "./types.ts";

// Extracted from server/catalog.ts so domain/releases.ts stays genuinely pure.
// catalog.ts imports node:fs and yaml, so importing it from releases.ts made the
// "pure" correctness core un-importable outside Node — including in the worker
// and in the browser bundle.

export interface ToolPatterns {
  tagPattern?: RegExp;
  ignorePattern?: RegExp;
}

export function compileToolPatterns(tool: Tool): ToolPatterns {
  return {
    tagPattern: tool.release.tagPattern
      ? new RegExp(tool.release.tagPattern)
      : undefined,
    ignorePattern: tool.release.ignorePattern
      ? new RegExp(tool.release.ignorePattern)
      : undefined,
  };
}
