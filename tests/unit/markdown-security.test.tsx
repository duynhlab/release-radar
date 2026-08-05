import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReleaseNotes } from "@/components/releases/release-notes";
import {
  classifyNoteHref,
  isAllowedNoteImage,
} from "@/components/releases/markdown-components";
import { NOTES_MARKDOWN_OPTIONS } from "@/lib/markdown";

const html = (markdown: string) =>
  renderToStaticMarkup(<ReleaseNotes markdown={markdown} />);

describe("markdown configuration", () => {
  it("is frozen with allowHtml and headingIds off", () => {
    expect(NOTES_MARKDOWN_OPTIONS.allowHtml).toBe(false);
    expect(NOTES_MARKDOWN_OPTIONS.headingIds).toBe(false);
    expect(Object.isFrozen(NOTES_MARKDOWN_OPTIONS)).toBe(true);
  });
});

describe("dangerous URLs", () => {
  const schemes = [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
  ];

  for (const scheme of schemes) {
    it(`emits no anchor at all for ${scheme.slice(0, 24)}`, () => {
      const out = html(`[click me](${scheme})`);
      expect(out).not.toContain("javascript:");
      expect(out).not.toContain("vbscript:");
      expect(out).not.toContain("file:");
      expect(out).not.toContain("data:text/html");
      // Core returns "" rather than dropping the attribute, which would leave a
      // dead <a href="">. Assert no anchor survives, not merely no scheme.
      expect(out).not.toContain("<a");
      expect(out).toContain("click me");
    });
  }

  it("rejects protocol-relative URLs that core lets through", () => {
    const out = html("[go](//evil.example/pwn)");
    expect(out).not.toContain("<a");
    expect(out).toContain("data-blocked-href");
  });

  it("rejects mailto: and tel:, which core allows", () => {
    expect(html("[mail](mailto:a@b.c)")).not.toContain("<a");
    expect(html("[call](tel:+123)")).not.toContain("<a");
  });

  it("keeps http, https, relative and fragment links", () => {
    const external = html("[pr](https://github.com/acme/tool/pull/1)");
    expect(external).toContain('href="https://github.com/acme/tool/pull/1"');
    expect(external).toContain('target="_blank"');
    expect(external).toContain("noopener");
    expect(external).toContain("noreferrer");
    expect(html("[rel](/docs/guide)")).toContain('href="/docs/guide"');
    expect(html("[frag](#install)")).toContain('href="#install"');
  });
});

describe("raw HTML", () => {
  // With allowHtml:false the parser never produces html nodes, so raw HTML
  // arrives as a text node and React escapes it. It therefore shows up as the
  // visible literal string — inert, but not invisible. Assert that it is
  // escaped rather than that the substring is absent: `onerror` legitimately
  // appears inside `&lt;img src=x onerror=&quot;...&quot;&gt;`.
  const noLiveElement = (out: string, tag: string) => {
    expect(out).not.toContain(`<${tag}`);
    expect(out).toContain(`&lt;${tag}`);
  };

  it("escapes a script tag and keeps the surrounding text", () => {
    const out = html("hello <script>alert(1)</script> world");
    noLiveElement(out, "script");
    expect(out).toContain("hello");
    expect(out).toContain("world");
  });

  it("escapes an iframe", () => {
    noLiveElement(html('<iframe src="x"></iframe>'), "iframe");
  });

  it("escapes an img with an event handler, so no attribute is ever live", () => {
    const out = html('<img src=x onerror="alert(1)">');
    noLiveElement(out, "img");
    // The handler survives only as escaped text, never as a real attribute.
    expect(out).toContain("onerror=&quot;");
    expect(out).not.toMatch(/<img[^>]*onerror/i);
  });

  it("escapes a details block, the most common raw HTML in the corpus", () => {
    noLiveElement(html("<details><summary>More</summary>body</details>"), "details");
  });
});

describe("images", () => {
  it("blocks remote images and preserves alt text", () => {
    const out = html("![build badge](https://img.shields.io/badge.svg)");
    expect(out).not.toContain("<img");
    expect(out).not.toContain('src=""');
    expect(out).toContain("build badge");
  });

  it("isAllowedNoteImage denies everything while the allowlist is empty", () => {
    expect(isAllowedNoteImage("https://img.shields.io/x.svg")).toBe(false);
    expect(isAllowedNoteImage("not a url")).toBe(false);
  });
});

describe("headings", () => {
  it("downgrades to paragraphs and emits no ids", () => {
    const out = html("# One\n\n## One\n\n### Two");
    expect(out).not.toContain("<h1");
    expect(out).not.toContain("<h2");
    expect(out).not.toContain("<h3");
    // headingIds defaults ON upstream; duplicate ids across 20 notes on one
    // tool page would be an axe violation the legacy app never had.
    expect(out).not.toContain("id=");
  });
});

describe("GFM support without remark-gfm", () => {
  it("renders tables inside a focusable scroll container", () => {
    const out = html("| a | b |\n| :-: | --: |\n| 1 | 2 |");
    expect(out).toContain("<table");
    expect(out).toContain('tabindex="0"');
  });

  it("renders fenced code in a focusable pre", () => {
    const out = html("```sh\nkubectl get pods\n```");
    expect(out).toContain("<pre");
    expect(out).toContain('tabindex="0"');
    expect(out).toContain("kubectl get pods");
  });

  it("renders task lists, strikethrough and nested lists", () => {
    expect(html("- [x] done\n- [ ] todo")).toContain("checkbox");
    expect(html("~~gone~~")).toContain("<del");
    expect(html("- a\n  - b")).toContain("<ul");
  });
});

describe("resilience", () => {
  it("is deterministic and terminates on pathological input", { timeout: 2000 }, () => {
    const inputs = [
      "[".repeat(5000),
      "*".repeat(20000),
      ">".repeat(1000) + " deep",
      "```\nunterminated fence",
      "x".repeat(200000),
    ];
    for (const input of inputs) {
      expect(html(input)).toBe(html(input));
    }
  });

  it("handles CRLF notes", () => {
    expect(html("line one\r\n\r\nline two")).toContain("line two");
  });
});

describe("classifyNoteHref", () => {
  it.each([
    ["", null],
    [undefined, null],
    ["//evil.example", null],
    ["mailto:a@b.c", null],
    ["tel:+1", null],
    ["docs/x.md", null],
    ["#frag", "internal"],
    ["/abs", "internal"],
    ["./rel", "internal"],
    ["../up", "internal"],
    ["https://x.example", "external"],
    ["HTTP://x.example", "external"],
  ])("classifies %s", (href, expected) => {
    expect(classifyNoteHref(href as string | undefined)).toBe(expected);
  });
});
