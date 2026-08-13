import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Readme } from "@/components/readme/readme";
import {
  NOTES_MARKDOWN_OPTIONS,
  README_MARKDOWN_OPTIONS,
} from "@/lib/markdown-options";

const html = (markdown: string) =>
  renderToStaticMarkup(
    <Readme markdown={markdown} repository="argoproj/argo-cd" />,
  );

describe("README markdown configuration", () => {
  it("is frozen with allowHtml and headingIds off", () => {
    expect(README_MARKDOWN_OPTIONS.allowHtml).toBe(false);
    expect(README_MARKDOWN_OPTIONS.headingIds).toBe(false);
    expect(Object.isFrozen(README_MARKDOWN_OPTIONS)).toBe(true);
  });

  it("diverges from the notes config ONLY on frontmatter", () => {
    // The sanctioned exception to "no second path" is exactly one flag wide.
    // Any security-relevant flag drifting between the two configs fails here.
    const { frontmatter: notesFm, ...notesRest } = NOTES_MARKDOWN_OPTIONS;
    const { frontmatter: readmeFm, ...readmeRest } = README_MARKDOWN_OPTIONS;
    expect(readmeRest).toEqual(notesRest);
    expect(notesFm).toBe(false);
    expect(readmeFm).toBe(true);
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
      expect(out).not.toContain("<a");
      expect(out).toContain("click me");
    });
  }

  it("rejects protocol-relative URLs", () => {
    const out = html("[go](//evil.example/pwn)");
    expect(out).not.toContain("<a");
    expect(out).toContain("data-blocked-href");
  });

  it("rejects mailto: and tel:", () => {
    expect(html("[mail](mailto:a@b.c)")).not.toContain("<a");
    expect(html("[call](tel:+123)")).not.toContain("<a");
  });
});

describe("repo-relative link resolution", () => {
  it("resolves a bare relative path to the repo's blob view", () => {
    const out = html("[guide](docs/guide.md)");
    expect(out).toContain(
      'href="https://github.com/argoproj/argo-cd/blob/HEAD/docs/guide.md"',
    );
    expect(out).toContain('target="_blank"');
    expect(out).toMatch(/rel="noopener noreferrer nofollow ugc"/);
  });

  it("resolves ./, ../ and leading-/ paths inside the repo", () => {
    expect(html("[c](./CONTRIBUTING.md)")).toContain(
      'href="https://github.com/argoproj/argo-cd/blob/HEAD/CONTRIBUTING.md"',
    );
    expect(html("[e](/examples)")).toContain(
      'href="https://github.com/argoproj/argo-cd/blob/HEAD/examples"',
    );
    // ".." can climb the path but never leaves github.com.
    expect(html("[up](../../../../x)")).toContain('href="https://github.com/');
  });

  it("sends fragment links to GitHub's rendered README", () => {
    // headingIds are off, so there is no in-page target for a README TOC.
    expect(html("[install](#install)")).toContain(
      'href="https://github.com/argoproj/argo-cd#install"',
    );
  });

  it("passes absolute http(s) links through untouched", () => {
    expect(html("[x](https://example.com/a)")).toContain(
      'href="https://example.com/a"',
    );
  });

  it("does not autolink mentions or issue refs", () => {
    // "#1 in benchmarks" and "@latest" are prose in a README, not references.
    const out = html("thanks @user for #12");
    expect(out).not.toContain("<a");
    expect(out).toContain("@user");
    expect(out).toContain("#12");
  });
});

describe("raw HTML", () => {
  const noLiveElement = (out: string, tag: string) => {
    expect(out).not.toContain(`<${tag}`);
    expect(out).toContain(`&lt;${tag}`);
  };

  it("escapes a script tag", () => {
    noLiveElement(html("hello <script>alert(1)</script>"), "script");
  });

  it("escapes README layout HTML (p align, img, details)", () => {
    noLiveElement(html('<p align="center"><img src="logo.png"></p>'), "p align");
    noLiveElement(html("<details><summary>More</summary>x</details>"), "details");
  });

  it("never lets an event handler become a live attribute", () => {
    const out = html('<img src=x onerror="alert(1)">');
    expect(out).not.toMatch(/<img[^>]*onerror/i);
    expect(out).toContain("onerror=&quot;");
  });
});

describe("images", () => {
  it("blocks remote images but links the placeholder to the source", () => {
    const out = html("![build badge](https://img.shields.io/badge.svg)");
    expect(out).not.toContain("<img");
    expect(out).not.toContain('src=""');
    expect(out).toContain("build badge");
    expect(out).toContain('href="https://img.shields.io/badge.svg"');
    expect(out).toContain("data-blocked-image");
  });

  it("links a relative image's placeholder to the repo's raw view", () => {
    const out = html("![screenshot](docs/img/shot.png)");
    expect(out).not.toContain("<img");
    expect(out).toContain(
      'href="https://github.com/argoproj/argo-cd/raw/HEAD/docs/img/shot.png"',
    );
  });
});

describe("headings", () => {
  it("emits real headings normalized to start at h3", () => {
    const out = html("# Title\n\ntext\n\n### Section");
    // Distinct depths {1, 3} remap in order to {3, 4} — no skips, no h1/h2
    // competing with the page's own outline.
    expect(out).toContain("<h3");
    expect(out).toContain("<h4");
    expect(out).not.toContain("<h1");
    expect(out).not.toContain("<h2");
  });

  it("maps a README that starts deep back to h3", () => {
    const out = html("#### Only level used");
    expect(out).toContain("<h3");
    expect(out).not.toContain("<h4");
  });

  it("emits no heading ids", () => {
    expect(html("# One\n\n## Two\n\n## Two")).not.toContain("id=");
  });
});

describe("frontmatter", () => {
  it("does not render a leading frontmatter block as content", () => {
    const out = html("---\ntitle: secret-frontmatter\n---\n\nBody text");
    expect(out).not.toContain("secret-frontmatter");
    expect(out).toContain("Body text");
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
      "#".repeat(6) + " h\n".repeat(500),
    ];
    for (const input of inputs) {
      expect(html(input)).toBe(html(input));
    }
  });
});
