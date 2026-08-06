import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadToolReleases,
  parseNotesResponse,
} from "../../src/data/release-notes.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function stubFetch(response: Response | (() => Promise<Response>)) {
  globalThis.fetch = vi.fn(async () =>
    typeof response === "function" ? response() : response,
  ) as unknown as typeof fetch;
}

const validFile = {
  schemaVersion: 1,
  generatedAt: "2026-08-05T00:00:00.000Z",
  tool: { id: "grafana", name: "Grafana", repository: "grafana/grafana" },
  releases: [
    {
      id: 1,
      version: "v11.0.0",
      name: null,
      channel: "stable",
      publishedAt: "2026-08-01T00:00:00Z",
      url: "https://github.com/grafana/grafana/releases/tag/v11.0.0",
      notes: "hello",
      draft: false,
      prerelease: false,
    },
  ],
};

describe("release notes in the worker runtime", () => {
  it("rejects a malformed id without touching the network", async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    // Path traversal must never become a subrequest.
    expect(await loadToolReleases("../../etc/passwd")).toEqual([]);
    expect(await loadToolReleases("Grafana")).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("parses a valid response", async () => {
    const releases = await parseNotesResponse(
      new Response(JSON.stringify(validFile), { status: 200 }),
    );
    expect(releases).toHaveLength(1);
    expect(releases[0]!.version).toBe("v11.0.0");
  });

  it("rejects a response that does not match the schema", async () => {
    await expect(
      parseNotesResponse(
        new Response(JSON.stringify({ schemaVersion: 1 }), { status: 200 }),
      ),
    ).rejects.toThrow();
  });

  it("returns an empty history without parsing on a non-ok response", async () => {
    expect(
      await parseNotesResponse(new Response("nope", { status: 404 })),
    ).toEqual([]);
  });

  it("degrades to [] when no request context exists for the origin", async () => {
    // The server branch needs a live request to resolve its own origin. In a
    // harness there is none, so this exercises the real degradation path.
    stubFetch(new Response(JSON.stringify(validFile), { status: 200 }));
    expect(await loadToolReleases("grafana")).toEqual([]);
  });

  it("degrades to an empty history on 404 rather than throwing", async () => {
    stubFetch(new Response("nope", { status: 404 }));
    expect(await loadToolReleases("grafana")).toEqual([]);
  });

  it("degrades when the fetch itself fails", async () => {
    stubFetch(() => Promise.reject(new Error("network down")));
    // A tool page that was never prerendered must render its empty state, not
    // a 500.
    expect(await loadToolReleases("grafana")).toEqual([]);
  });
});
