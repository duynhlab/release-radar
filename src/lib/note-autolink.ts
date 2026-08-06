import type { InlineNode, MarkdownDocument } from "@tanstack/markdown";

/**
 * GitHub-style autolinking for release notes.
 *
 * TanStack Markdown has no autolink literals, and with `allowHtml: false` even
 * `<https://x>` angle autolinks are off — so a bare URL, `@user`, `#123` and a
 * commit SHA all arrive as plain text. GitHub renders every one of them as a
 * link, and 48% of the notes in this corpus contain at least one mention.
 *
 * This runs on the AST between parse and render, which is the only place it
 * can: `renderInlineReact` returns `node.value` directly for text nodes and
 * never consults the component map, so a `text` renderer override would be
 * silently ignored.
 *
 * Working on the AST rather than the source string is also what makes it safe.
 * Code spans and fenced blocks are distinct node types, so they are skipped
 * structurally instead of by trying to out-regex the parser.
 *
 * Everything emitted is a LinkNode, never an anchor, so every link still flows
 * through `NoteLink` and inherits `classifyNoteHref` plus
 * `rel="noopener noreferrer nofollow ugc"`.
 *
 * One subtlety worth knowing: a link with a blocked scheme does not survive as
 * `<a href="">` — the parser drops it and keeps only the label as a text node.
 * That label is then ordinary text and gets autolinked like any other. The
 * dangerous URL is already gone at that point, and the worst case (a label that
 * is itself a URL) ends up no different from writing that URL as prose, which
 * this transform links by design.
 *
 * Kept free of React imports so `scripts/audit-markdown-corpus.ts` can apply
 * the exact transform the app renders with.
 */

/**
 * One pass, one alternation, all simple bounded classes — no nested
 * quantifiers. The security suite throws `"x".repeat(200000)` at this under a
 * 2s budget and the corpus audit fails any note parsing in over 250ms, so a
 * backtracking pattern would surface as a timeout rather than a wrong link.
 *
 * The URL branch is first so a `#123` or SHA inside a URL is consumed as part
 * of the URL rather than matched on its own.
 *
 * The `(?<!["'=])` guard keeps it out of attribute values in raw HTML. With
 * `allowHtml: false` a note's `<img src="https://…">` arrives as escaped text,
 * and linkifying the middle of it both looks wrong and splits the text node so
 * that the corpus audit can no longer see the tag at all.
 */
const AUTOLINK =
  /(?<!["'=])(https?:\/\/[^\s<>()[\]"']+)|(^|[^\w@/])@([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38})(\[bot\])?|(^|[^\w&])#(\d{1,7})\b|\b([0-9a-f]{7,40})\b/g;

/** Never descend into these: an anchor in an anchor is invalid HTML and an axe
 *  `nested-interactive` violation, and code must stay literal — `#2086` in
 *  backticks is prose about a number, not a reference. */
const OPAQUE = new Set(["code", "inlineCode", "html", "htmlInline", "link", "image"]);

/** Trailing punctuation is nearly always the sentence's, not the URL's. */
function trimUrl(url: string): string {
  let end = url.length;
  while (end > 0 && ".,;:!?'\"".includes(url[end - 1]!)) end -= 1;
  return url.slice(0, end);
}

/**
 * A 7-39 char run is only a commit if it contains a letter. All-digit runs are
 * overwhelmingly something else: 394 of the 1123 candidates in this corpus were
 * chunks of `user-attachments` UUIDs or a Zoom meeting id. A full 40-char hash
 * is unambiguous and needs no such test.
 */
function isCommitSha(hex: string): boolean {
  return hex.length === 40 || /[a-f]/.test(hex);
}

function linkNode(href: string, text: string): InlineNode {
  return { type: "link", href, children: [{ type: "text", value: text }] };
}

/** Returns null when nothing matched, so unchanged nodes keep their identity. */
function splitText(value: string, repository: string): InlineNode[] | null {
  AUTOLINK.lastIndex = 0;
  const out: InlineNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = AUTOLINK.exec(value)) !== null) {
    const [whole, url, mentionLead, user, bot, refLead, issue, sha] = match;
    let start = match.index;
    let text: string;
    let href: string;

    if (url) {
      text = trimUrl(url);
      href = text;
    } else if (user) {
      // The lead character is matched only to prove `@` follows a boundary;
      // it belongs to the surrounding text, not to the link.
      start += (mentionLead ?? "").length;
      text = `@${user}${bot ?? ""}`;
      // A `name[bot]` account lives at /apps/name — /name is a different user
      // or a 404. 556 mentions in this corpus are bots.
      href = bot
        ? `https://github.com/apps/${user}`
        : `https://github.com/${user}`;
    } else if (issue) {
      start += (refLead ?? "").length;
      text = `#${issue}`;
      // GitHub redirects /issues/N to /pull/N, so there is nothing to guess.
      href = `https://github.com/${repository}/issues/${issue}`;
    } else if (sha && isCommitSha(sha)) {
      text = sha.length === 40 ? sha.slice(0, 7) : sha;
      href = `https://github.com/${repository}/commit/${sha}`;
    } else {
      continue; // an all-digit run, or a hex run that is not a commit
    }

    if (start > last) out.push({ type: "text", value: value.slice(last, start) });
    out.push(linkNode(href, text));
    last = match.index + whole.length;
  }

  if (out.length === 0) return null;
  if (last < value.length) out.push({ type: "text", value: value.slice(last) });
  return out;
}

function transformChildren(children: unknown[], repository: string): unknown[] {
  const out: unknown[] = [];
  for (const child of children) {
    const node = child as Record<string, unknown> | null;
    if (
      node &&
      typeof node === "object" &&
      node.type === "text" &&
      typeof node.value === "string"
    ) {
      const split = splitText(node.value, repository);
      if (split) {
        out.push(...split);
        continue;
      }
    }
    out.push(transform(child, repository));
  }
  return out;
}

function transform<T>(node: T, repository: string): T {
  if (Array.isArray(node)) {
    return node.map((child) => transform(child, repository)) as T;
  }
  if (!node || typeof node !== "object") return node;

  const record = node as Record<string, unknown>;
  if (typeof record.type === "string" && OPAQUE.has(record.type)) return node;

  const next: Record<string, unknown> = { ...record };
  for (const [key, value] of Object.entries(record)) {
    if (key === "children" && Array.isArray(value)) {
      next[key] = transformChildren(value, repository);
    } else if (value && typeof value === "object") {
      next[key] = transform(value, repository);
    }
  }
  return next as T;
}

/** `repository` is the catalog's Zod-validated `owner/repo`, never note text. */
export function autolinkNotes(
  document: MarkdownDocument,
  repository: string,
): MarkdownDocument {
  return transform(document, repository);
}
