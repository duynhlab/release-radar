import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseMarkdown } from "@tanstack/markdown/parser";
import {
  NOTES_MARKDOWN_OPTIONS,
  README_MARKDOWN_OPTIONS,
} from "../src/lib/markdown-options.ts";
import { autolinkNotes } from "../src/lib/note-autolink.ts";
import { classifyNoteHref } from "../src/lib/note-links.ts";
import { resolveReadmeHref } from "../src/lib/readme-links.ts";
import { normalizeReadmeHeadings } from "../src/lib/readme-transform.ts";
import {
  ToolReadmeFileSchema,
  ToolReleasesFileSchema,
} from "../src/domain/types.ts";

/**
 * Inventory every release note through the real parser and fail on the things
 * that would be regressions, while merely reporting the ones we accepted.
 *
 * Classification walks the AST rather than running regexes over the source.
 * Two independent regex passes over this corpus disagreed badly — 26 vs 43
 * raw-HTML notes, 4 vs 27 indented-code — because a regex cannot tell a
 * <name> placeholder inside a fenced block from real inline HTML. With
 * allowHtml:false a text node containing https?:// IS a bare URL by
 * construction, because links are link nodes and fences are code nodes.
 */

const RELEASES_DIR = path.join(process.cwd(), "data", "releases");
const READMES_DIR = path.join(process.cwd(), "data", "readmes");
const OUT_DIR = path.join(process.cwd(), "artifacts", "markdown");
const REPORT_PATH = path.join(OUT_DIR, "corpus-report.md");
const BASELINE_PATH = path.join(OUT_DIR, "corpus-baseline.json");

const PARSE_BUDGET_MS = 250;
const DANGEROUS_HTML = /<\s*\/?\s*(script|iframe|object|embed|form|svg)\b|\son\w+\s*=/i;
const HTML_TAG = /<\/?[A-Za-z][\w:-]*(\s[^<>]*)?>/;
const BARE_URL = /https?:\/\//;

interface Finding {
  tool: string;
  version: string;
  sample?: string;
}

interface Counts {
  tools: number;
  notes: number;
  bareUrl: Finding[];
  fullChangelog: number;
  rawHtml: Finding[];
  dangerousHtml: Finding[];
  indentedCode: Finding[];
  setextHeading: Finding[];
  badUrl: Finding[];
  slowParse: Finding[];
  nonDeterministic: Finding[];
  tables: number;
  taskLists: number;
  footnotes: number;
  strikethrough: number;
  codeFences: number;
  images: number;
  links: number;
}

type Node = Record<string, unknown>;

/**
 * `inLink` matters because autolinking makes a linked URL's own label a text
 * node containing "https://". The old rule — "a text node containing https?://
 * IS a bare URL, because links are link nodes" — held only while nothing
 * synthesised links from text. Bare-URL counting must now ignore link labels;
 * the raw-HTML checks still apply everywhere, since a tag in a link label is
 * just as much escaped text as one in a paragraph.
 */
function walk(
  node: unknown,
  visit: (n: Node, inLink: boolean) => void,
  inLink = false,
): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit, inLink);
    return;
  }
  if (!node || typeof node !== "object") return;
  const n = node as Node;
  visit(n, inLink);
  const nested = inLink || n.type === "link";
  for (const value of Object.values(n)) {
    if (value && typeof value === "object") walk(value, visit, nested);
  }
}

/** Setext headings and indented code blocks need the source, not just the AST. */
function scanSource(markdown: string): {
  setext: boolean;
  indentedCode: boolean;
} {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let inFence = false;
  let inList = false;
  let setext = false;
  let indentedCode = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    if (/^\s*([-*+]|\d+[.)])\s/.test(line)) inList = true;
    else if (line.trim() === "") inList = inList && true;
    else if (!/^\s{2,}/.test(line)) inList = false;

    const prev = lines[i - 1] ?? "";
    if (
      /^(=|-){2,}\s*$/.test(line) &&
      prev.trim() !== "" &&
      !/^\s*[-*+>#|]/.test(prev) &&
      !prev.includes("|")
    ) {
      setext = true;
    }

    // A 4-space indent only means a code block outside a list and after a blank
    // line; inside a list it is just continuation.
    if (/^ {4,}\S/.test(line) && prev.trim() === "" && !inList) {
      indentedCode = true;
    }
  }
  return { setext, indentedCode };
}

const counts: Counts = {
  tools: 0,
  notes: 0,
  bareUrl: [],
  fullChangelog: 0,
  rawHtml: [],
  dangerousHtml: [],
  indentedCode: [],
  setextHeading: [],
  badUrl: [],
  slowParse: [],
  nonDeterministic: [],
  tables: 0,
  taskLists: 0,
  footnotes: 0,
  strikethrough: 0,
  codeFences: 0,
  images: 0,
  links: 0,
};

const files = readdirSync(RELEASES_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort();

for (const file of files) {
  const parsed = ToolReleasesFileSchema.parse(
    JSON.parse(readFileSync(path.join(RELEASES_DIR, file), "utf8")),
  );
  counts.tools += 1;

  for (const release of parsed.releases) {
    const markdown = release.notes;
    if (!markdown) continue;
    counts.notes += 1;
    const where: Finding = { tool: parsed.tool.id, version: release.version };

    // Autolinking runs on the AST between parse and render, so the audit has
    // to apply it too — otherwise it keeps reporting bare URLs that the app
    // now renders as links. Timing and determinism cover the transform as a
    // result, which is where a backtracking pattern would show up.
    const parse = () =>
      autolinkNotes(
        parseMarkdown(markdown, NOTES_MARKDOWN_OPTIONS),
        parsed.tool.repository,
      );

    // Raw-HTML findings describe what upstream sent, so they are measured on
    // the untransformed AST. Measuring them after autolinking made the metric
    // depend on our own rewriting: extracting a URL out of an escaped
    // `<img src="…">` split the text node so no single node held a complete
    // tag, and three notes silently stopped being counted.
    const rawDoc = parseMarkdown(markdown, NOTES_MARKDOWN_OPTIONS);

    const started = performance.now();
    const doc = parse();
    const elapsed = performance.now() - started;
    if (elapsed > PARSE_BUDGET_MS) {
      counts.slowParse.push({ ...where, sample: `${Math.round(elapsed)}ms` });
    }

    if (JSON.stringify(doc) !== JSON.stringify(parse())) {
      counts.nonDeterministic.push(where);
    }

    let sawBareUrl = false;
    let sawRawHtml: string | null = null;

    walk(rawDoc, (node) => {
      if (node.type !== "text" || typeof node.value !== "string") return;
      const tag = HTML_TAG.exec(node.value);
      if (tag) sawRawHtml ??= tag[0];
      if (DANGEROUS_HTML.test(node.value)) {
        counts.dangerousHtml.push({ ...where, sample: node.value.slice(0, 80) });
      }
    });

    walk(doc, (node, inLink) => {
      const type = node.type;
      if (type === "text" && typeof node.value === "string") {
        if (!inLink && BARE_URL.test(node.value)) sawBareUrl = true;
      }
      if (type === "link") {
        counts.links += 1;
        // LinkNode's property is `href`. This read `node.url` — always
        // undefined, so the `href &&` guard below never fired and the only
        // corpus-wide check on our link policy silently passed on everything.
        const href = typeof node.href === "string" ? node.href : "";
        if (href && classifyNoteHref(href) === null) {
          counts.badUrl.push({ ...where, sample: href.slice(0, 80) });
        }
      }
      if (type === "image") counts.images += 1;
      if (type === "table") counts.tables += 1;
      if (type === "code") counts.codeFences += 1;
      if (type === "footnoteDefinition" || type === "footnoteReference") {
        counts.footnotes += 1;
      }
      // The node type is `strike`; "delete"/"strikethrough" are remark's names,
      // so this counted zero regardless of the corpus.
      if (type === "strike") counts.strikethrough += 1;
      if (node.checked === true || node.checked === false) counts.taskLists += 1;
    });

    if (sawBareUrl) {
      counts.bareUrl.push(where);
      if (/\*\*Full Changelog\*\*|Full Changelog/i.test(markdown)) {
        counts.fullChangelog += 1;
      }
    }
    if (sawRawHtml) counts.rawHtml.push({ ...where, sample: sawRawHtml });

    const source = scanSource(markdown);
    if (source.setext) counts.setextHeading.push(where);
    if (source.indentedCode) counts.indentedCode.push(where);
  }
}

// --- READMEs --------------------------------------------------------------
//
// The other markdown corpus that changes with no human in the loop. Analyzed
// through the real README pipeline (README_MARKDOWN_OPTIONS + heading
// normalization, no autolinking) and the README link policy. Raw HTML is
// reported but not baseline-gated: badge/layout HTML is pervasive and volatile
// in READMEs, and it renders as escaped text regardless — the hard gates
// (dangerous HTML, determinism, parse budget) are what must hold. Setext
// headings are likewise report-only here: a README using one loses hierarchy
// cosmetically, which is not worth breaking the unattended sync over.

interface ReadmeCounts {
  readmes: number;
  rawHtml: Finding[];
  dangerousHtml: Finding[];
  setextHeading: Finding[];
  badUrl: Finding[];
  slowParse: Finding[];
  nonDeterministic: Finding[];
  links: number;
  images: number;
}

const readmeCounts: ReadmeCounts = {
  readmes: 0,
  rawHtml: [],
  dangerousHtml: [],
  setextHeading: [],
  badUrl: [],
  slowParse: [],
  nonDeterministic: [],
  links: 0,
  images: 0,
};

const readmeFiles = existsSync(READMES_DIR)
  ? readdirSync(READMES_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
  : [];

for (const file of readmeFiles) {
  const parsed = ToolReadmeFileSchema.parse(
    JSON.parse(readFileSync(path.join(READMES_DIR, file), "utf8")),
  );
  if (!parsed.readme) continue;
  readmeCounts.readmes += 1;
  const markdown = parsed.readme.markdown;
  const where: Finding = { tool: parsed.tool.id, version: parsed.readme.path };

  const parse = () =>
    normalizeReadmeHeadings(parseMarkdown(markdown, README_MARKDOWN_OPTIONS));

  const started = performance.now();
  const doc = parse();
  const elapsed = performance.now() - started;
  if (elapsed > PARSE_BUDGET_MS) {
    readmeCounts.slowParse.push({ ...where, sample: `${Math.round(elapsed)}ms` });
  }
  if (JSON.stringify(doc) !== JSON.stringify(parse())) {
    readmeCounts.nonDeterministic.push(where);
  }

  let sawRawHtml: string | null = null;
  walk(doc, (node) => {
    if (node.type === "text" && typeof node.value === "string") {
      const tag = HTML_TAG.exec(node.value);
      if (tag) sawRawHtml ??= tag[0];
      if (DANGEROUS_HTML.test(node.value)) {
        readmeCounts.dangerousHtml.push({
          ...where,
          sample: node.value.slice(0, 80),
        });
      }
    }
    if (node.type === "link") {
      readmeCounts.links += 1;
      const href = typeof node.href === "string" ? node.href : "";
      if (href && resolveReadmeHref(href, parsed.tool.repository) === null) {
        readmeCounts.badUrl.push({ ...where, sample: href.slice(0, 80) });
      }
    }
    if (node.type === "image") readmeCounts.images += 1;
  });
  if (sawRawHtml) readmeCounts.rawHtml.push({ ...where, sample: sawRawHtml });
  if (scanSource(markdown).setext) readmeCounts.setextHeading.push(where);
}

const toolsWith = (findings: Finding[]) =>
  [...new Set(findings.map((f) => f.tool))].sort();

const summary = {
  tools: counts.tools,
  notes: counts.notes,
  bareUrl: { notes: counts.bareUrl.length, tools: toolsWith(counts.bareUrl) },
  fullChangelog: counts.fullChangelog,
  rawHtml: { notes: counts.rawHtml.length, tools: toolsWith(counts.rawHtml) },
  indentedCode: {
    notes: counts.indentedCode.length,
    tools: toolsWith(counts.indentedCode),
  },
  setextHeading: counts.setextHeading.length,
  structures: {
    links: counts.links,
    images: counts.images,
    codeFences: counts.codeFences,
    tables: counts.tables,
    taskLists: counts.taskLists,
    footnotes: counts.footnotes,
    strikethrough: counts.strikethrough,
  },
  readmes: {
    readmes: readmeCounts.readmes,
    rawHtml: readmeCounts.rawHtml.length,
    setextHeading: readmeCounts.setextHeading.length,
    badUrl: readmeCounts.badUrl.length,
    links: readmeCounts.links,
    images: readmeCounts.images,
  },
};

mkdirSync(OUT_DIR, { recursive: true });

const pct = (n: number) => ((100 * n) / counts.notes).toFixed(1);
const report = `# Release-note corpus report

Generated by \`pnpm audit:markdown\` from the committed \`data/releases/\`.
Classification walks the \`@tanstack/markdown\` AST — never regexes over source,
which cannot distinguish a \`<name>\` placeholder inside a fenced block from real
inline HTML.

**${counts.notes} notes with content across ${counts.tools} tools.**

## Bare URLs — regression closed

TanStack Markdown has no autolink literals, so a bare URL in prose used to
render as plain text. That was accepted knowingly when the renderer was chosen,
and affected 286 notes (41.4%) across 48 tools. \`src/lib/note-autolink.ts\`
now rewrites them into link nodes on the AST between parse and render, along
with \`@user\`, \`#123\` and commit SHAs.

| | |
|---|---|
| Notes containing a bare prose URL | **${counts.bareUrl.length} (${pct(counts.bareUrl.length)}%)** |
| Tools affected | **${toolsWith(counts.bareUrl).length} / ${counts.tools}** |
| …of which mention a Full Changelog line | ${counts.fullChangelog} |

Affected tools: ${toolsWith(counts.bareUrl).join(", ") || "none"}

What remains is **not prose**: every one is a URL inside an attribute of raw
HTML that \`allowHtml: false\` turned into escaped text — \`<a href="…">\`,
\`<img src="…">\`. Autolinking skips those deliberately: linkifying the middle
of a visibly-broken tag helps nobody, and it used to split the text node so
that the raw-HTML count below could no longer see the tag at all.

## Raw HTML

With \`allowHtml: false\` the parser emits no html nodes at all, so raw HTML
arrives as text and React escapes it. It is inert, but visible as a literal tag.

| | |
|---|---|
| Notes containing a raw HTML tag | ${counts.rawHtml.length} (${pct(counts.rawHtml.length)}%) |
| Tools affected | ${toolsWith(counts.rawHtml).length} |
| Dangerous HTML (script/iframe/on\\*=) | **${counts.dangerousHtml.length}** |

## Syntax the renderer does not support

| | |
|---|---|
| Indented code blocks | ${counts.indentedCode.length} |
| Setext headings | ${counts.setextHeading.length} |

## Structures present

| Construct | Count |
|---|---|
| Links | ${counts.links} |
| Images | ${counts.images} |
| Code fences | ${counts.codeFences} |
| Tables | ${counts.tables} |
| Task-list items | ${counts.taskLists} |
| Footnotes | ${counts.footnotes} |
| Strikethrough | ${counts.strikethrough} |

## Safety

| | |
|---|---|
| Links rejected by our stricter policy | ${counts.badUrl.length} |
| Notes exceeding ${PARSE_BUDGET_MS}ms to parse | ${counts.slowParse.length} |
| Non-deterministic parses | ${counts.nonDeterministic.length} |

## READMEs

**${readmeCounts.readmes} READMEs** from \`data/readmes/\`, analyzed through the
README pipeline (heading normalization, repo-relative link resolution, no
autolinking). Raw HTML and Setext headings are report-only here — pervasive and
cosmetic respectively — while dangerous HTML, determinism and the parse budget
gate the same as notes.

| | |
|---|---|
| Containing raw HTML | ${readmeCounts.rawHtml.length} (of ${readmeCounts.readmes}) |
| Dangerous HTML (script/iframe/on\\*=) | **${readmeCounts.dangerousHtml.length}** |
| Setext headings | ${readmeCounts.setextHeading.length} |
| Links | ${readmeCounts.links} |
| …rejected by the README link policy | ${readmeCounts.badUrl.length} |
| Images (all render as blocked placeholders) | ${readmeCounts.images} |
| Exceeding ${PARSE_BUDGET_MS}ms to parse | ${readmeCounts.slowParse.length} |
| Non-deterministic parses | ${readmeCounts.nonDeterministic.length} |
`;

// The previous baseline must be read BEFORE the new one is written: writing
// first made every --check comparison self-referential, so the "rose from N"
// gates could never fire.
const check = process.argv.includes("--check");
let baseline: typeof summary | null = null;
if (check) {
  try {
    baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as typeof summary;
  } catch {
    baseline = null;
  }
}

writeFileSync(REPORT_PATH, report);
writeFileSync(BASELINE_PATH, `${JSON.stringify(summary, null, 2)}\n`);

// --- gate ---------------------------------------------------------------

const failures: string[] = [];

if (counts.dangerousHtml.length > 0) {
  failures.push(
    `${counts.dangerousHtml.length} notes contain script/iframe/event-handler HTML`,
  );
}
if (counts.nonDeterministic.length > 0) {
  failures.push(`${counts.nonDeterministic.length} notes parse non-deterministically`);
}
if (counts.slowParse.length > 0) {
  failures.push(`${counts.slowParse.length} notes exceed the ${PARSE_BUDGET_MS}ms parse budget`);
}
if (counts.setextHeading.length > 0) {
  // Baseline is zero and a setext heading silently loses its hierarchy,
  // becoming a paragraph plus a rule.
  failures.push(`${counts.setextHeading.length} notes use Setext headings`);
}
if (readmeCounts.dangerousHtml.length > 0) {
  failures.push(
    `${readmeCounts.dangerousHtml.length} READMEs contain script/iframe/event-handler HTML`,
  );
}
if (readmeCounts.nonDeterministic.length > 0) {
  failures.push(
    `${readmeCounts.nonDeterministic.length} READMEs parse non-deterministically`,
  );
}
if (readmeCounts.slowParse.length > 0) {
  failures.push(
    `${readmeCounts.slowParse.length} READMEs exceed the ${PARSE_BUDGET_MS}ms parse budget`,
  );
}

if (check) {
  if (baseline) {
    if (counts.rawHtml.length > baseline.rawHtml.notes) {
      failures.push(
        `raw-HTML notes rose from ${baseline.rawHtml.notes} to ${counts.rawHtml.length}`,
      );
    }
    const newRawTools = toolsWith(counts.rawHtml).filter(
      (t) => !baseline.rawHtml.tools.includes(t),
    );
    if (newRawTools.length > 0) {
      failures.push(`new tools emitting raw HTML: ${newRawTools.join(", ")}`);
    }
    if (counts.indentedCode.length > baseline.indentedCode.notes) {
      failures.push(
        `indented code blocks rose from ${baseline.indentedCode.notes} to ${counts.indentedCode.length}`,
      );
    }
  }
}

console.log(`notes:          ${counts.notes} across ${counts.tools} tools`);
console.log(`bare URLs:      ${counts.bareUrl.length} notes / ${toolsWith(counts.bareUrl).length} tools (accepted)`);
console.log(`raw HTML:       ${counts.rawHtml.length} notes / ${toolsWith(counts.rawHtml).length} tools`);
console.log(`indented code:  ${counts.indentedCode.length} notes`);
console.log(`setext:         ${counts.setextHeading.length}`);
console.log(`dangerous HTML: ${counts.dangerousHtml.length}`);
console.log(`rejected links: ${counts.badUrl.length}`);
console.log(
  `readmes:        ${readmeCounts.readmes} (${readmeCounts.rawHtml.length} raw HTML, ${readmeCounts.dangerousHtml.length} dangerous, ${readmeCounts.badUrl.length} rejected links)`,
);
console.log(`report:         ${path.relative(process.cwd(), REPORT_PATH)}`);

if (failures.length > 0) {
  console.error("\nMarkdown corpus gate failed:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nMarkdown corpus gate OK");
