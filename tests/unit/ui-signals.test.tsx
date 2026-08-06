import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChannelBadge } from "@/components/ui/badge";
import { TimeAgo } from "@/components/ui/time-ago";

const SUMMARY = path.join(
  process.cwd(),
  "src",
  "components",
  "catalog",
  "tool-summary.tsx",
);

describe("ChannelBadge is an exception signal, not a label", () => {
  it("renders nothing for stable", () => {
    // Every tool sets includePrerelease:false, so all 690 stored releases are
    // stable. A badge that cannot say anything else is not a signal — it was
    // rendering ~768 times across the site.
    expect(renderToStaticMarkup(<ChannelBadge channel="stable" />)).toBe("");
  });

  it("renders a chip for a prerelease", () => {
    const out = renderToStaticMarkup(<ChannelBadge channel="prerelease" />);
    expect(out).toContain("prerelease");
    expect(out).toContain("bg-pre-bg");
  });
});

describe("the date is rendered once", () => {
  it("TimeAgo already carries the absolute date before hydration", () => {
    // This is why a sibling formatDate() span was redundant: in a prerendered
    // page — the state every crawler and no-JS visitor sees — TimeAgo's own
    // text IS the absolute date, so the two rendered identical strings side by
    // side. The relative label only appears after hydration.
    const out = renderToStaticMarkup(<TimeAgo iso="2026-08-04T10:00:00Z" />);
    expect(out).toContain("Aug 4, 2026");
    expect(out).toContain('title="Aug 4, 2026"');
  });

  it("tool-summary does not import formatDate", () => {
    // A source check, in the idiom of styles.test.ts. ToolSummary renders
    // inside a router context, so asserting on its markup would mean standing
    // up the whole route tree; importing formatDate is the specific thing that
    // produced the duplicate, and it has no other use in that file.
    // Matched on the import rather than the bare name so prose about the bug
    // does not trip it.
    expect(readFileSync(SUMMARY, "utf8")).not.toMatch(
      /^import .*\bformatDate\b/m,
    );
  });

  it("tool-summary imports no channel badge", () => {
    // The first release row below it is tool.latest, and already badges it.
    expect(readFileSync(SUMMARY, "utf8")).not.toMatch(
      /^import .*\bChannelBadge\b/m,
    );
  });
});
