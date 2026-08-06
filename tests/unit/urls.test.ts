import { describe, expect, it } from "vitest";
import {
  assignReleaseFragments,
  compareUrl,
  releaseFragmentId,
} from "../../src/lib/urls.ts";

describe("compareUrl", () => {
  it("builds a GitHub compare link", () => {
    expect(compareUrl("acme/tool", "v1.0.0", "v1.1.0")).toBe(
      "https://github.com/acme/tool/compare/v1.0.0...v1.1.0",
    );
  });

  it("encodes tags containing slashes and plus signs", () => {
    // Helm-chart repos really do tag like "chart/1.2.3", and Grafana ships
    // "v11.0.0+security-01".
    expect(compareUrl("acme/tool", "chart/1.0.0", "chart/1.1.0")).toContain(
      "chart%2F1.0.0...chart%2F1.1.0",
    );
    expect(compareUrl("acme/tool", "v1+security-01", "v2")).toContain(
      "v1%2Bsecurity-01",
    );
  });
});

describe("releaseFragmentId", () => {
  it.each([
    ["v1.36.3", "release-v1.36.3"],
    ["victoria-metrics-k8s-stack-0.89.0", "release-victoria-metrics-k8s-stack-0.89.0"],
    ["2024.1+build", "release-2024.1-build"],
    ["chart/1.2.3", "release-chart-1.2.3"],
    ["", "release-unknown"],
    ["!!!", "release-unknown"],
  ])("%s -> %s", (version, expected) => {
    expect(releaseFragmentId(version)).toBe(expected);
  });

  it("keeps dots, which read better than hyphens in a version", () => {
    expect(releaseFragmentId("v1.36.3")).not.toContain("v1-36-3");
  });
});

describe("assignReleaseFragments", () => {
  it("is stable and unique across a page of releases", () => {
    const releases = [
      { version: "v2.0.0" },
      { version: "v1.9.0" },
      { version: "v1.8.0" },
    ];
    const out = assignReleaseFragments(releases);
    expect(out.map((r) => r.fragment)).toEqual([
      "release-v2.0.0",
      "release-v1.9.0",
      "release-v1.8.0",
    ]);
  });

  it("disambiguates collisions deterministically", () => {
    // Different tags can slug to the same fragment; duplicate DOM ids would be
    // an axe violation, so the suffix is assigned in the loader where server
    // and client agree.
    const out = assignReleaseFragments([
      { version: "v1.0.0" },
      { version: "v1/0/0" },
      { version: "v1+0+0" },
    ]);
    const fragments = out.map((r) => r.fragment);
    expect(new Set(fragments).size).toBe(3);
    expect(fragments[1]).toBe("release-v1-0-0");
    expect(fragments[2]).toBe("release-v1-0-0-2");
  });

  it("preserves the original fields", () => {
    const out = assignReleaseFragments([{ version: "v1", extra: 42 }]);
    expect(out[0].extra).toBe(42);
  });
});
