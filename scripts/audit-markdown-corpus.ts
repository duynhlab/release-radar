import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseMarkdown } from "@tanstack/markdown/parser";
import { NOTES_MARKDOWN_OPTIONS } from "../src/lib/markdown-options.ts";
import { classifyNoteHref } from "../src/lib/note-links.ts";
import { ToolReleasesFileSchema } from "../src/domain/types.ts";

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

function walk(node: unknown, visit: (n: Node) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (!node || typeof node !== "object") return;
  const n = node as Node;
  visit(n);
  for (const value of Object.values(n)) {
    if (value && typeof value === "object") walk(value, visit);
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

    const started = performance.now();
    const doc = parseMarkdown(markdown, NOTES_MARKDOWN_OPTIONS);
    const elapsed = performance.now() - started;
    if (elapsed > PARSE_BUDGET_MS) {
      counts.slowParse.push({ ...where, sample: `${Math.round(elapsed)}ms` });
    }

    const again = parseMarkdown(markdown, NOTES_MARKDOWN_OPTIONS);
    if (JSON.stringify(doc) !== JSON.stringify(again)) {
      counts.nonDeterministic.push(where);
    }

    let sawBareUrl = false;
    let sawRawHtml: string | null = null;

    walk(doc, (node) => {
      const type = node.type;
      if (type === "text" && typeof node.value === "string") {
        if (BARE_URL.test(node.value)) sawBareUrl = true;
        const tag = HTML_TAG.exec(node.value);
        if (tag) sawRawHtml ??= tag[0];
        if (DANGEROUS_HTML.test(node.value)) {
          counts.dangerousHtml.push({ ...where, sample: node.value.slice(0, 80) });
        }
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
};

mkdirSync(OUT_DIR, { recursive: true });

const pct = (n: number) => ((100 * n) / counts.notes).toFixed(1);
const report = `# Release-note corpus report

Generated by \`pnpm audit:markdown\` from the committed \`data/releases/\`.
Classification walks the \`@tanstack/markdown\` AST — never regexes over source,
which cannot distinguish a \`<name>\` placeholder inside a fenced block from real
inline HTML.

**${counts.notes} notes with content across ${counts.tools} tools.**

## Accepted regression — bare URLs

TanStack Markdown has no autolink literals, so a bare URL in prose renders as
plain text. This was accepted knowingly when the renderer was chosen.

| | |
|---|---|
| Notes containing a bare prose URL | **${counts.bareUrl.length} (${pct(counts.bareUrl.length)}%)** |
| Tools affected | **${toolsWith(counts.bareUrl).length} / ${counts.tools}** |
| …of which mention a Full Changelog line | ${counts.fullChangelog} |

Affected tools: ${toolsWith(counts.bareUrl).join(", ") || "none"}

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
`;

writeFileSync(REPORT_PATH, report);
writeFileSync(BASELINE_PATH, `${JSON.stringify(summary, null, 2)}\n`);

// --- gate ---------------------------------------------------------------

const check = process.argv.includes("--check");
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

if (check) {
  let baseline: typeof summary | null = null;
  try {
    baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as typeof summary;
  } catch {
    baseline = null;
  }
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
console.log(`report:         ${path.relative(process.cwd(), REPORT_PATH)}`);

if (failures.length > 0) {
  console.error("\nMarkdown corpus gate failed:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nMarkdown corpus gate OK");
