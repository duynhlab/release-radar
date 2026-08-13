import { describe, expect, it } from "vitest";
import {
  resolveReadmeHref,
  resolveReadmeImageSrc,
} from "@/lib/readme-links";

const REPO = "acme/tool";

describe("resolveReadmeHref", () => {
  it.each([
    ["", null],
    [undefined, null],
    ["//evil.example/x", null],
    ["mailto:a@b.c", null],
    ["tel:+1", null],
    ["vbscript:x", null],
    ["https://example.com/a?b=c#d", "https://example.com/a?b=c#d"],
    ["HTTP://example.com", "HTTP://example.com"],
    ["#install", "https://github.com/acme/tool#install"],
    ["docs/guide.md", "https://github.com/acme/tool/blob/HEAD/docs/guide.md"],
    ["./CONTRIBUTING.md", "https://github.com/acme/tool/blob/HEAD/CONTRIBUTING.md"],
    ["../sibling.md", "https://github.com/acme/tool/blob/sibling.md"],
    ["/examples", "https://github.com/acme/tool/blob/HEAD/examples"],
    ["docs/a b.md", "https://github.com/acme/tool/blob/HEAD/docs/a%20b.md"],
  ])("resolves %s", (href, expected) => {
    expect(resolveReadmeHref(href as string | undefined, REPO)).toBe(expected);
  });

  it("keeps a query and fragment on a relative path", () => {
    expect(resolveReadmeHref("docs/x.md#anchor", REPO)).toBe(
      "https://github.com/acme/tool/blob/HEAD/docs/x.md#anchor",
    );
  });

  it("never resolves off github.com, no matter how many ..s", () => {
    const resolved = resolveReadmeHref("../".repeat(10) + "x", REPO);
    expect(resolved).toMatch(/^https:\/\/github\.com\//);
  });
});

describe("resolveReadmeImageSrc", () => {
  it.each([
    ["", null],
    [undefined, null],
    ["//evil.example/x.png", null],
    ["#frag", null],
    ["data:image/png;base64,x", null],
    ["https://img.shields.io/badge.svg", "https://img.shields.io/badge.svg"],
    ["docs/shot.png", "https://github.com/acme/tool/raw/HEAD/docs/shot.png"],
    ["./logo.svg", "https://github.com/acme/tool/raw/HEAD/logo.svg"],
    ["/assets/x.png", "https://github.com/acme/tool/raw/HEAD/assets/x.png"],
  ])("resolves %s", (src, expected) => {
    expect(resolveReadmeImageSrc(src as string | undefined, REPO)).toBe(expected);
  });
});
