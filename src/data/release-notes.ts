import { createIsomorphicFn } from "@tanstack/react-start";
import { ToolReleasesFileSchema, type Release } from "../domain/types.ts";

// Release notes are ~1.9 MB across 68 files. They are served as STATIC ASSETS
// and must never enter the worker bundle.
//
// There is no fs path here on purpose: the prerender pass runs in workerd, not
// Node, where `node:fs` throws "[unenv] fs.readFileSync is not implemented
// yet!". So one HTTP mechanism covers every context —
//   prerender  -> fetch from the prerender server's own origin
//   client nav -> relative fetch, straight to the asset CDN, worker uninvolved
//   worker SSR -> resolves against Workers Assets
//
// Any @tanstack/react-start/server import must stay behind createIsomorphicFn's
// server branch, or Start's import-protection plugin fails the build.

export const NOTES_BASE = "/release-notes";

const TOOL_ID = /^[a-z0-9][a-z0-9-]*$/;

async function parseResponse(res: Response): Promise<Release[]> {
  if (!res.ok) return [];
  return ToolReleasesFileSchema.parse(await res.json()).releases;
}

const fetchNotes = createIsomorphicFn()
  .server(async (id: string): Promise<Release[]> => {
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const origin = new URL(getRequest().url).origin;
      return await parseResponse(await fetch(`${origin}${NOTES_BASE}/${id}.json`));
    } catch {
      // Only reachable if a valid tool page was never prerendered. Degrade to
      // an empty history rather than a 500 — the page renders its empty state.
      return [];
    }
  })
  .client(async (id: string): Promise<Release[]> => {
    try {
      return await parseResponse(await fetch(`${NOTES_BASE}/${id}.json`));
    } catch {
      return [];
    }
  });

export async function loadToolReleases(id: string): Promise<Release[]> {
  if (!TOOL_ID.test(id)) return [];
  return fetchNotes(id);
}
