import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { THEME_COLORS } from "@/features/theme/theme-script";

/**
 * WCAG contrast, computed from the oklch tokens in app.css.
 *
 * axe cannot resolve oklch() — it reports 1.00 for every pair — which is how
 * light fg-subtle once shipped at 4.29:1 on 12px metadata with a green audit.
 * The e2e doc measures by sampling rendered pixels; this test closes the gap
 * in CI by doing the colour math directly on the source tokens, so a palette
 * edit that breaks a floor fails the build rather than a manual audit.
 */

const css = readFileSync(
  path.join(process.cwd(), "src", "styles", "app.css"),
  "utf8",
);

/** Extract the `--rr-*: oklch(...)` tokens from one selector block. */
function parseTheme(selector: RegExp): Record<string, [number, number, number]> {
  const block = css.match(selector)?.[1];
  if (!block) throw new Error(`theme block not found: ${selector}`);
  const tokens: Record<string, [number, number, number]> = {};
  for (const m of block.matchAll(
    /--rr-([\w-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g,
  )) {
    tokens[m[1]!] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return tokens;
}

const DARK = parseTheme(/:root,\s*\.dark\s*\{([\s\S]*?)\n\}/);
const LIGHT = parseTheme(/\n\.light\s*\{([\s\S]*?)\n\}/);

function oklchToLinearSrgb([L, C, h]: [number, number, number]) {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb: [number, number, number] = [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return rgb.map((v) => Math.min(1, Math.max(0, v))) as [
    number,
    number,
    number,
  ];
}

/** WCAG relative luminance takes linear sRGB directly. */
function luminance(oklch: [number, number, number]): number {
  const [r, g, b] = oklchToLinearSrgb(oklch);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(
  theme: Record<string, [number, number, number]>,
  fg: string,
  bg: string,
): number {
  const f = theme[fg];
  const b = theme[bg];
  if (!f || !b) throw new Error(`missing token: ${!f ? fg : bg}`);
  const [hi, lo] = [luminance(f), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

function toHex(oklch: [number, number, number]): string {
  const gamma = (v: number) =>
    v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return (
    "#" +
    oklchToLinearSrgb(oklch)
      .map((v) =>
        Math.round(gamma(v) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

const CATEGORIES = [
  "kubernetes",
  "gitops",
  "iac",
  "observability",
  "database",
  "backup",
  "messaging",
  "networking",
  "security",
  "testing",
  "ai",
];

describe.each([
  ["dark", DARK],
  ["light", LIGHT],
] as const)("%s theme contrast", (_name, theme) => {
  it("keeps body foreground at AAA on both grounds", () => {
    expect(ratio(theme, "fg", "bg")).toBeGreaterThanOrEqual(7);
    expect(ratio(theme, "fg", "surface")).toBeGreaterThanOrEqual(7);
  });

  // 4.5:1 is the AA floor for normal-size text (WCAG 1.4.3), and every one of
  // these tiers appears at 14px or below. Checked on both bg and surface,
  // because cards put the same tokens on the lighter ground.
  it.each([
    ["fg-muted", "bg"],
    ["fg-muted", "surface"],
    ["fg-subtle", "bg"],
    ["fg-subtle", "surface"],
    ["accent", "bg"],
    ["accent", "surface"],
    ["accent", "accent-soft"],
    ["accent-fg", "accent"],
    ["pre-fg", "pre-bg"],
  ] as const)("%s on %s meets 4.5:1", (fg, bg) => {
    expect(ratio(theme, fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps every category badge pair above 4.5:1", () => {
    for (const cat of CATEGORIES) {
      expect
        .soft(ratio(theme, `cat-${cat}-fg`, `cat-${cat}-bg`))
        .toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("dark theme glare ceiling", () => {
  it("keeps fg below near-white halation territory", () => {
    // fg once sat at oklch 0.965 — 17.4:1, near-white on a dark ground. That
    // passes every WCAG floor and still reads badly: it haloes, and next to
    // 10:1 body text every paragraph looked gray-with-glaring-bold. The
    // ceiling pins the fix; if a redesign genuinely needs a brighter fg,
    // change this number in the same commit and say why.
    expect(ratio(DARK, "fg", "bg")).toBeLessThanOrEqual(15.5);
  });
});

describe("theme-color meta mapping", () => {
  it("matches the bg tokens it mirrors", () => {
    // THEME_COLORS ships to browser chrome via the boot script; it must track
    // the CSS source of truth.
    expect(toHex(DARK.bg!)).toBe(THEME_COLORS.dark);
    expect(toHex(LIGHT.bg!)).toBe(THEME_COLORS.light);
  });
});
