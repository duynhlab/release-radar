import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { daysBetween, formatDate, releaseGapLabel } from "../../src/lib/dates.ts";

describe("formatDate", () => {
  it("formats in UTC", () => {
    expect(formatDate("2026-07-23T00:35:52Z")).toBe("Jul 23, 2026");
  });

  describe("under a non-UTC process timezone", () => {
    const original = process.env.TZ;
    beforeAll(() => {
      process.env.TZ = "Asia/Ho_Chi_Minh";
    });
    afterAll(() => {
      process.env.TZ = original;
    });

    it("still renders the UTC date, not the local one", () => {
      // 23:30Z is already the next day in UTC+7. Pinning timeZone: "UTC" is
      // what stops the server and the browser disagreeing across a hydration
      // boundary, so this is a hydration test wearing a date-format costume.
      expect(formatDate("2026-07-23T23:30:00Z")).toBe("Jul 23, 2026");
      expect(formatDate("2026-07-23T00:30:00Z")).toBe("Jul 23, 2026");
    });
  });
});

describe("daysBetween", () => {
  it("counts whole days forward", () => {
    expect(daysBetween("2026-01-01T00:00:00Z", "2026-01-04T00:00:00Z")).toBe(3);
  });
  it("returns zero for the same instant", () => {
    expect(daysBetween("2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z")).toBe(0);
  });
  it("goes negative when the range is reversed", () => {
    expect(daysBetween("2026-01-04T00:00:00Z", "2026-01-01T00:00:00Z")).toBe(-3);
  });
  it("rounds to the nearest day", () => {
    expect(daysBetween("2026-01-01T00:00:00Z", "2026-01-01T13:00:00Z")).toBe(1);
    expect(daysBetween("2026-01-01T00:00:00Z", "2026-01-01T11:00:00Z")).toBe(0);
  });
});

describe("releaseGapLabel", () => {
  it("returns null without a previous release", () => {
    expect(releaseGapLabel("2026-01-10T00:00:00Z", null)).toBeNull();
  });
  it("pluralises", () => {
    expect(
      releaseGapLabel("2026-01-10T00:00:00Z", {
        version: "v1.0.0",
        publishedAt: "2026-01-08T00:00:00Z",
      }),
    ).toBe("2 days after v1.0.0");
  });
  it("uses the singular at exactly one day", () => {
    expect(
      releaseGapLabel("2026-01-09T00:00:00Z", {
        version: "v1.0.0",
        publishedAt: "2026-01-08T00:00:00Z",
      }),
    ).toBe("1 day after v1.0.0");
  });
  it("collapses same-day and out-of-order gaps", () => {
    expect(
      releaseGapLabel("2026-01-08T06:00:00Z", {
        version: "v1.0.0",
        publishedAt: "2026-01-08T01:00:00Z",
      }),
    ).toBe("same day as v1.0.0");
    expect(
      releaseGapLabel("2026-01-01T00:00:00Z", {
        version: "v1.0.0",
        publishedAt: "2026-01-08T00:00:00Z",
      }),
    ).toBe("same day as v1.0.0");
  });
});
