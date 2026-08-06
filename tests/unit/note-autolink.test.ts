import { describe, expect, it } from "vitest";
import { parseMarkdown } from "@tanstack/markdown/parser";
import { NOTES_MARKDOWN_OPTIONS } from "../../src/lib/markdown-options.ts";
import { autolinkNotes } from "../../src/lib/note-autolink.ts";

const REPO = "argoproj/argo-cd";

interface Node {
  type?: string;
  value?: string;
  href?: string;
  [key: string]: unknown;
}

function walk(node: unknown, visit: (n: Node) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (!node || typeof node !== "object") return;
  visit(node as Node);
  for (const value of Object.values(node as Node)) {
    if (value && typeof value === "object") walk(value, visit);
  }
}

/** Every link the transform produced, as [label, href]. */
function links(markdown: string, repository = REPO): Array<[string, string]> {
  const doc = autolinkNotes(
    parseMarkdown(markdown, NOTES_MARKDOWN_OPTIONS),
    repository,
  );
  const found: Array<[string, string]> = [];
  walk(doc, (node) => {
    if (node.type !== "link" || typeof node.href !== "string") return;
    let label = "";
    walk(node.children, (child) => {
      if (child.type === "text" && typeof child.value === "string") {
        label += child.value;
      }
    });
    found.push([label, node.href]);
  });
  return found;
}

/** All plain text, so we can assert something stayed unlinked. */
function text(markdown: string): string {
  const doc = autolinkNotes(parseMarkdown(markdown, NOTES_MARKDOWN_OPTIONS), REPO);
  let out = "";
  walk(doc, (node) => {
    if (
      (node.type === "text" || node.type === "inlineCode") &&
      typeof node.value === "string"
    ) {
      out += node.value;
    }
  });
  return out;
}

describe("mentions", () => {
  it("links a plain @username", () => {
    expect(links("thanks @crenshaw-dev for the fix")).toEqual([
      ["@crenshaw-dev", "https://github.com/crenshaw-dev"],
    ]);
  });

  it("sends a [bot] account to /apps, not to a same-named user", () => {
    // github.com/dependabot is a different account; the app lives at /apps.
    expect(links("bumped by @dependabot[bot] overnight")).toEqual([
      ["@dependabot[bot]", "https://github.com/apps/dependabot"],
    ]);
  });

  it("leaves an email address alone", () => {
    expect(links("reported by antonio@zoftko.com")).toEqual([]);
    expect(text("reported by antonio@zoftko.com")).toContain("antonio@zoftko.com");
  });

  it("links a mention in parentheses, the common changelog shape", () => {
    expect(links("* Fix the thing (@rumstead)")).toEqual([
      ["@rumstead", "https://github.com/rumstead"],
    ]);
  });
});

describe("issue references", () => {
  it("resolves #123 against the tool's own repository", () => {
    expect(links("closes #2086")).toEqual([
      ["#2086", "https://github.com/argoproj/argo-cd/issues/2086"],
    ]);
  });

  it("uses the repository it is given, not a hardcoded one", () => {
    expect(links("see #7", "grafana/loki")).toEqual([
      ["#7", "https://github.com/grafana/loki/issues/7"],
    ]);
  });

  it("ignores a numeric HTML entity", () => {
    expect(links("a &#8212; dash")).toEqual([]);
  });
});

describe("commit SHAs", () => {
  const full = "c7c0ab53b84c26b54a9fea0b48a9e436ecbd5192";

  it("links a 40-char sha and shows the first 7", () => {
    expect(links(`landed in ${full}`)).toEqual([
      ["c7c0ab5", `https://github.com/argoproj/argo-cd/commit/${full}`],
    ]);
  });

  it("links a short hash as written", () => {
    expect(links("see 2347a9a")).toEqual([
      ["2347a9a", "https://github.com/argoproj/argo-cd/commit/2347a9a"],
    ]);
  });

  it("does not link an all-digit run", () => {
    // 394 of 1123 short-hex candidates in the real corpus were things like a
    // Zoom meeting id or a chunk of a user-attachments UUID.
    expect(links("meeting id 696660622")).toEqual([]);
    expect(links("build 1234567 failed")).toEqual([]);
  });

  it("still requires 7 characters", () => {
    expect(links("commit abc123 is short")).toEqual([]);
  });
});

describe("bare URLs", () => {
  it("links a bare prose URL", () => {
    expect(links("**Full Changelog**: https://github.com/a/b/compare/v1...v2")).toEqual([
      [
        "https://github.com/a/b/compare/v1...v2",
        "https://github.com/a/b/compare/v1...v2",
      ],
    ]);
  });

  it("leaves trailing sentence punctuation out of the href", () => {
    expect(links("see https://example.com/docs.")).toEqual([
      ["https://example.com/docs", "https://example.com/docs"],
    ]);
  });

  it("does not touch a URL inside an escaped HTML attribute", () => {
    // allowHtml:false means this arrives as visible escaped text. Linkifying
    // the middle of it looks wrong and hides the tag from the corpus audit.
    expect(links('<img src="https://example.com/a.png" />')).toEqual([]);
  });

  it("does not double-link a real markdown link", () => {
    expect(links("[the docs](https://example.com)")).toEqual([
      ["the docs", "https://example.com"],
    ]);
  });
});

describe("what it must never touch", () => {
  it("leaves a code span literal", () => {
    expect(links("use `#2086` as the id")).toEqual([]);
    expect(text("use `#2086` as the id")).toContain("#2086");
  });

  it("leaves a fenced block literal", () => {
    const md = "```\n@user #123 c7c0ab53b84c26b54a9fea0b48a9e436ecbd5192\n```";
    expect(links(md)).toEqual([]);
  });

  it("never nests a link inside a link", () => {
    // A nested anchor is invalid HTML and an axe nested-interactive violation.
    const found = links("[see #2086 from @user](https://example.com)");
    expect(found).toEqual([["see #2086 from @user", "https://example.com"]]);
  });

  it("still autolinks inside emphasis and list items", () => {
    expect(links("- **thanks @user**")).toEqual([
      ["@user", "https://github.com/user"],
    ]);
  });
});

describe("resilience", () => {
  it("is deterministic", () => {
    const md = "@user fixed #12 in c7c0ab53b84c26b54a9fea0b48a9e436ecbd5192";
    expect(JSON.stringify(links(md))).toBe(JSON.stringify(links(md)));
  });

  it("does not backtrack catastrophically", () => {
    // The security suite budgets 2s for inputs like these; the corpus audit
    // fails any single note that parses in over 250ms.
    const inputs = [
      "x".repeat(200_000),
      "@".repeat(20_000),
      "#".repeat(20_000),
      `${"a".repeat(39)} `.repeat(2_000),
      "https://".repeat(5_000),
    ];
    const started = performance.now();
    for (const input of inputs) links(input);
    expect(performance.now() - started).toBeLessThan(2_000);
  });
});
