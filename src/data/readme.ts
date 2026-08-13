import { createIsomorphicFn } from "@tanstack/react-start";
import { ToolReadmeFileSchema, type ToolReadme } from "../domain/types.ts";

// READMEs are served as STATIC ASSETS and must never enter the worker bundle
// — same architecture as release notes (see src/data/release-notes.ts for the
// full rationale: no fs in any render context, one HTTP mechanism everywhere).

const README_BASE = "/readme-content";

const TOOL_ID = /^[a-z0-9][a-z0-9-]*$/;

/**
 * A synced tool always has a file; `readme: null` inside it means the repo has
 * no renderable README. A missing or unparseable asset is a transport failure
 * — the two must not collapse, or the empty state lies about a broken CDN.
 */
export type ReadmeResult =
  | { status: "ok"; readme: ToolReadme }
  | { status: "unavailable" };

const UNAVAILABLE: ReadmeResult = { status: "unavailable" };

/** Exported so the parse contract can be tested directly. */
export async function parseReadmeResponse(res: Response): Promise<ReadmeResult> {
  if (!res.ok) return UNAVAILABLE;
  return {
    status: "ok",
    readme: ToolReadmeFileSchema.parse(await res.json()).readme,
  };
}

const fetchReadme = createIsomorphicFn()
  .server(async (id: string): Promise<ReadmeResult> => {
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const origin = new URL(getRequest().url).origin;
      return await parseReadmeResponse(
        await fetch(`${origin}${README_BASE}/${id}.json`),
      );
    } catch {
      return UNAVAILABLE;
    }
  })
  .client(async (id: string): Promise<ReadmeResult> => {
    try {
      return await parseReadmeResponse(await fetch(`${README_BASE}/${id}.json`));
    } catch {
      return UNAVAILABLE;
    }
  });

export async function loadToolReadme(id: string): Promise<ReadmeResult> {
  if (!TOOL_ID.test(id)) return UNAVAILABLE;
  return fetchReadme(id);
}
