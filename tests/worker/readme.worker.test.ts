import { afterEach, describe, expect, it, vi } from "vitest";
import { loadToolReadme, parseReadmeResponse } from "../../src/data/readme.ts";

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
  generatedAt: "2026-08-13T00:00:00.000Z",
  tool: { id: "grafana", name: "Grafana", repository: "grafana/grafana" },
  readme: {
    markdown: "# Grafana",
    path: "README.md",
    htmlUrl: "https://github.com/grafana/grafana/blob/main/README.md",
  },
};

describe("readme assets in the worker runtime", () => {
  it("rejects a malformed id without touching the network", async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    // Path traversal must never become a subrequest.
    expect(await loadToolReadme("../../etc/passwd")).toEqual({
      status: "unavailable",
    });
    expect(await loadToolReadme("Grafana")).toEqual({ status: "unavailable" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("parses a valid response", async () => {
    const result = await parseReadmeResponse(
      new Response(JSON.stringify(validFile), { status: 200 }),
    );
    expect(result).toEqual({ status: "ok", readme: validFile.readme });
  });

  it("keeps 'no README' distinct from 'unavailable'", async () => {
    // A synced tool without a README ships readme: null; a 404 is a transport
    // failure. Collapsing them would promise the wrong remedy on the page.
    const noReadme = { ...validFile, readme: null };
    expect(
      await parseReadmeResponse(
        new Response(JSON.stringify(noReadme), { status: 200 }),
      ),
    ).toEqual({ status: "ok", readme: null });
    expect(
      await parseReadmeResponse(new Response("nope", { status: 404 })),
    ).toEqual({ status: "unavailable" });
  });

  it("rejects a response that does not match the schema", async () => {
    await expect(
      parseReadmeResponse(
        new Response(JSON.stringify({ schemaVersion: 1 }), { status: 200 }),
      ),
    ).rejects.toThrow();
  });

  it("reports unavailable when the fetch itself fails", async () => {
    stubFetch(() => Promise.reject(new Error("network down")));
    expect(await loadToolReadme("grafana")).toEqual({ status: "unavailable" });
  });
});
