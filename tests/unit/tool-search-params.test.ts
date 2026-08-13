import { describe, expect, it } from "vitest";
import { parseToolSearch } from "@/features/tool/search-params";

describe("parseToolSearch", () => {
  it("defaults to the releases tab", () => {
    expect(parseToolSearch({})).toEqual({ tab: "releases" });
  });

  it("accepts the readme tab", () => {
    expect(parseToolSearch({ tab: "readme" })).toEqual({ tab: "readme" });
  });

  it("never throws — junk falls back to the default", () => {
    expect(parseToolSearch({ tab: "nope" })).toEqual({ tab: "releases" });
    expect(parseToolSearch({ tab: 42 })).toEqual({ tab: "releases" });
    expect(parseToolSearch({ tab: ["readme"] })).toEqual({ tab: "releases" });
  });
});
