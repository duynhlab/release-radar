import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(
  path.join(process.cwd(), "src", "styles", "app.css"),
  "utf8",
);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = path.join(dir, entry);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(p) ? [p] : [];
  });
}

const SOURCES = sourceFiles(path.join(process.cwd(), "src")).filter(
  (p) => !p.includes("generated") && !p.endsWith("routeTree.gen.ts"),
);

/** Strip comments so a rule named in prose is not mistaken for a declaration. */
function withoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

describe("font declarations", () => {
  it("never names a literal font stack outside @theme", () => {
    // The legacy app shipped `body { font-family: Arial }` in globals.css,
    // which silently defeated the Geist it was loading. The invariant is about
    // LITERAL stacks: `font-family: var(--font-mono)` is the tokens working as
    // intended, and .rr-notes code legitimately does that.
    const body = withoutComments(CSS);
    const afterTheme = body.slice(
      body.indexOf("}", body.indexOf("@theme inline")),
    );
    const declarations = [...afterTheme.matchAll(/font-family\s*:\s*([^;]+);/g)]
      .map((m) => m[1]!.trim())
      .filter((value) => !value.startsWith("var(--font-"));
    expect(declarations).toEqual([]);
  });

  it("points --font-sans and --font-mono at the self-hosted Geist faces", () => {
    expect(CSS).toMatch(/--font-sans:\s*"Geist Variable"/);
    expect(CSS).toMatch(/--font-mono:\s*"Geist Mono Variable"/);
  });
});

describe("type scale", () => {
  const TIERS = [
    "micro",
    "meta",
    "control",
    "body",
    "card-title",
    "version",
    "page-title",
    "detail-title",
  ];

  it("defines every semantic tier", () => {
    for (const tier of TIERS) {
      expect(CSS, tier).toMatch(new RegExp(`--text-${tier}:`));
    }
  });

  it("has no raw Tailwind size classes left in src/", () => {
    // The whole point of the named scale is that a size is chosen by role. A
    // stray text-sm re-opens the seven-step ad-hoc scale this replaced.
    const offenders: string[] = [];
    for (const file of SOURCES) {
      const hits = readFileSync(file, "utf8").match(
        /\btext-(xs|sm|base|lg|xl|2xl|3xl)\b/g,
      );
      if (hits) offenders.push(`${path.relative(process.cwd(), file)}: ${hits.join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });

  it("has no arbitrary font sizes in src/", () => {
    const offenders: string[] = [];
    for (const file of SOURCES) {
      const hits = readFileSync(file, "utf8").match(/text-\[[0-9.]+(px|rem)\]/g);
      if (hits) offenders.push(`${path.relative(process.cwd(), file)}: ${hits.join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });

  it("uses no font-weight above 600", () => {
    // 700 was reserved for a metric that actually matters; nothing qualifies.
    const offenders: string[] = [];
    for (const file of SOURCES) {
      const hits = readFileSync(file, "utf8").match(/\bfont-(bold|extrabold|black)\b/g);
      if (hits) offenders.push(`${path.relative(process.cwd(), file)}: ${hits.join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });
});

describe("radius scale", () => {
  it("defines exactly the four radius steps", () => {
    for (const step of ["badge", "control", "card", "pill"]) {
      expect(CSS, step).toMatch(new RegExp(`--radius-${step}:`));
    }
  });

  it("never falls back to Tailwind's default `rounded`", () => {
    // A bare `rounded` is 4px and escapes the scale, which is how the app ended
    // up rendering five radii while claiming three.
    const offenders: string[] = [];
    for (const file of SOURCES) {
      const hits = readFileSync(file, "utf8").match(/\brounded(?![-\w[])/g);
      if (hits) offenders.push(path.relative(process.cwd(), file));
    }
    expect(offenders).toEqual([]);
  });
});

describe("theme tokens", () => {
  const varsIn = (selector: string) => {
    const body = withoutComments(CSS);
    const start = body.indexOf(selector);
    const block = body.slice(start, body.indexOf("}", start));
    return new Set([...block.matchAll(/(--rr-[\w-]+):/g)].map((m) => m[1]!));
  };

  it("defines every dark token in light too", () => {
    // A half-authored light theme is the classic failure of a dark-first build:
    // it inherits whatever the dark block set and looks subtly broken.
    const dark = varsIn(":root,");
    const light = varsIn(".light {");
    expect([...dark].filter((v) => !light.has(v))).toEqual([]);
    expect([...light].filter((v) => !dark.has(v))).toEqual([]);
  });

  it("pairs every category background with a foreground", () => {
    const bgs = [...CSS.matchAll(/--rr-cat-([\w-]+)-bg:/g)].map((m) => m[1]);
    for (const hue of bgs) {
      expect(CSS, hue).toMatch(new RegExp(`--rr-cat-${hue}-fg:`));
    }
    expect(bgs.length).toBeGreaterThan(0);
  });
});
