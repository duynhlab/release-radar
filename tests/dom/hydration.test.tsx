import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Readme } from "../../src/components/readme/readme.tsx";
import { ReleaseNotes } from "../../src/components/releases/release-notes.tsx";
import { TimeAgo } from "../../src/components/ui/time-ago.tsx";
import { formatDate } from "../../src/lib/dates.ts";

describe("hydration determinism", () => {
  it("renders TimeAgo identically twice, as the absolute date", () => {
    const iso = "2026-07-23T00:35:52Z";
    const a = renderToString(<TimeAgo iso={iso} />);
    const b = renderToString(<TimeAgo iso={iso} />);
    expect(a).toBe(b);
    // Server output must not depend on the clock, so it is the absolute date;
    // the relative label only appears after useHydrated flips.
    expect(a).toContain(formatDate(iso));
    expect(a.toLowerCase()).toContain(`datetime="${iso.toLowerCase()}"`);
  });

  it("is unaffected by the process timezone", () => {
    const iso = "2026-07-23T23:30:00Z";
    const original = process.env.TZ;
    process.env.TZ = "Asia/Ho_Chi_Minh";
    const local = renderToString(<TimeAgo iso={iso} />);
    process.env.TZ = "UTC";
    const utc = renderToString(<TimeAgo iso={iso} />);
    process.env.TZ = original;
    expect(local).toBe(utc);
  });

  it("renders release notes deterministically", () => {
    const markdown =
      "## Changes\n\n- fixed [#1](https://github.com/a/b/pull/1)\n\n```sh\nkubectl get pods\n```";
    expect(renderToString(<ReleaseNotes markdown={markdown} repository="a/b" />)).toBe(
      renderToString(<ReleaseNotes markdown={markdown} repository="a/b" />),
    );
  });

  it("renders a README deterministically", () => {
    const markdown =
      "# Tool\n\nSee [docs](docs/guide.md) and ![badge](https://img.shields.io/x.svg)\n\n### Usage";
    expect(renderToString(<Readme markdown={markdown} repository="a/b" />)).toBe(
      renderToString(<Readme markdown={markdown} repository="a/b" />),
    );
  });

  it("does not warn during render", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    renderToString(<TimeAgo iso="2026-07-23T00:35:52Z" />);
    renderToString(<ReleaseNotes markdown="hello **world**" repository="a/b" />);
    renderToString(<Readme markdown="# hi\n\n[x](./y.md)" repository="a/b" />);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
