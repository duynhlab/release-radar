import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReleaseNotes } from "../components/release-notes";

describe("ReleaseNotes sanitization", () => {
  it("strips script tags from hostile markdown", () => {
    const html = renderToStaticMarkup(
      <ReleaseNotes markdown={'hello <script>alert("xss")</script> world'} />,
    );
    expect(html).not.toContain("<script");
    expect(html).toContain("hello");
  });

  it("strips javascript: links", () => {
    const html = renderToStaticMarkup(
      <ReleaseNotes markdown="[click](javascript:alert(1))" />,
    );
    expect(html).not.toContain("javascript:");
  });

  it("strips inline event handlers", () => {
    const html = renderToStaticMarkup(
      <ReleaseNotes markdown={'<img src="x" onerror="alert(1)">'} />,
    );
    expect(html).not.toContain("onerror");
  });

  it("keeps safe markdown: links, code, GFM tables", () => {
    const html = renderToStaticMarkup(
      <ReleaseNotes
        markdown={
          "## Changes\n\n- fix [#1](https://github.com/acme/tool/pull/1)\n\n`code`\n\n| a | b |\n|---|---|\n| 1 | 2 |"
        }
      />,
    );
    expect(html).toContain("<a");
    expect(html).toContain('href="https://github.com/acme/tool/pull/1"');
    expect(html).toContain("<code");
    expect(html).toContain("<table");
  });
});
