# CLAUDE.md

Agent-facing notes for this repo. `README.md` is the human-facing doc and goes
deeper on most topics — this file covers the conventions and constraints that
are easy to violate, and points at README rather than repeating it.

## Git Commit Convention

Semantic format for **both commit messages and PR titles**. Keep the wording
simple.

```
type(scope): subject
```

- **Types**: `feat` `fix` `chore` `ci` `docs`
- **Scopes**: `catalog` `data` `sync` `ui` `ci` `deps` `readme`
- Subject in lowercase, imperative, no trailing period.
- Branches follow the same vocabulary: `feat/…` `fix/…` `chore/…` `docs/…`.

Every commit carries this trailer:

```
Co-Authored-By: duynebot <bot@duynh.me>
```

**Never add Claude attribution** — no `Co-Authored-By: Claude …` trailer, no
"Generated with Claude Code" line in PR bodies. This is the one place the
default agent behavior goes against what this repo wants.

Good:

```
feat(catalog): add pgBackRest
chore(data): sync releases 2026-08-05
fix(sync): handle repos with no releases
feat(ui): add group dropdown to explorer
chore(deps): bump the npm-minor-patch group
ci(deps): bump actions/checkout to v8
docs(readme): document tag-pattern tips
```

Avoid — these are real subjects from this repo's history, from before the
convention:

```
Add pgBackRest to catalog        → feat(catalog): add pgBackRest
Remove header tagline            → feat(ui): remove header tagline
Use mermaid diagram in README    → docs(readme): use mermaid diagram
Fix pgaudit tag pattern          → fix(catalog): correct pgaudit tag pattern
```

## Project Overview

Personal DevOps/SRE release tracker: a Git-backed catalog that follows new
releases of infrastructure tools on GitHub. Currently **68 tools** across 8
groups and 8 categories.

No database, no runtime API calls, no client-side tokens. The site is a pure
function of the committed JSON — **if the site shows wrong data, look at
`data/`, not the frontend.**

## Setup

```bash
pnpm install
```

- Node >= 26. It runs the `.ts` scripts natively — no tsx/ts-node.
- pnpm 11.18.0, pinned via `packageManager`.
- Syncing locally needs a token: `GITHUB_TOKEN=$(gh auth token) pnpm sync`.
- `pnpm-workspace.yaml` holds `allowBuilds` (a **map**, not a list — a YAML
  sequence there is silently ignored) and `overrides` (pnpm 11 reads them there,
  not from `package.json`).

## Development

```bash
pnpm dev          # vite dev
```

Adding a tool is the 90% task:

1. Edit `config/tools.yaml` (the JSON schema in `schemas/` gives autocomplete).
2. `pnpm validate:catalog`
3. `GITHUB_TOKEN=$(gh auth token) pnpm sync`
4. Commit **both** the YAML and the generated `data/` files.

See README §"Adding a tool" for tag-pattern tips. Note that `pnpm sync`
refreshes every tool, so unrelated `data/` files often ride along in the diff;
say so in the PR body.

Dependency trap: `pnpm install` does **not** move a version forward inside a
range that's already satisfied. Use `pnpm update <pkg>` to walk the range
forward.

This environment enforces a pnpm `minimumReleaseAge` policy — packages published
in the last 24h are rejected, and the failure names the lockfile rather than the
policy. When it fires, pin the previous release rather than bypassing it.

## Testing

```bash
pnpm test         # vitest: unit + dom + worker projects, 189 tests
```

Three projects in `vitest.config.ts`:

- **unit** (node) — domain, catalog relations against real data, search params,
  filters, markdown security.
- **dom** (jsdom) — theme boot script, favorites store, hotkey hook, SSR
  determinism. `tests/dom/setup.ts` installs a Storage polyfill: **Node 26
  defines its own disabled `localStorage` global that shadows jsdom's**, so bare
  `localStorage` is undefined without it.
- **worker** (workerd, via `@cloudflare/vitest-pool-workers`) — proves the
  catalog loads with no `node:fs`. Uses its own minimal
  `tests/worker/wrangler.test.jsonc`, because pointing the pool at the real
  config makes it try to resolve `main` as a file path.

`tests/` has its own `tsconfig.json` relaxing `noUncheckedIndexedAccess`;
indexing a fixture you just built is safe by construction. It stays **on** for
`src/` and `scripts/`, where it caught a `repository.split("/")[1]` that reached
Octokit as `owner: undefined`.

`src/domain/releases.ts` is the correctness core and is pure by design.

## Code Quality

The merge gate, same as CI:

```bash
pnpm validate:catalog && pnpm lint && pnpm typecheck && pnpm test \
  && pnpm audit:markdown --check && pnpm build && pnpm check:bundle
```

`pnpm check:bundle` is the only check that proves release notes stay out of the
worker on a real build. `pnpm audit:markdown --check` also runs in the **sync**
workflow, because release notes are the one input that changes with no human in
the loop.

For UI changes also run `pnpm preview` and audit with `agent-browser`.
Baseline to hold: zero console errors, zero axe violations, LCP <= 2.5s,
CLS <= 0.1. See `artifacts/e2e/README.md`.

**agent-browser gotchas**: the viewport does not survive a navigation, and can
silently no-op after `set device`/`set media`. Use one session per viewport and
assert `innerWidth` before trusting any capture — a wrong viewport still
produces a plausible screenshot.

## Cloudflare Workers

Deployed via **Workers Builds (Git integration)**, not GitHub Actions.

- **Do not add a deploy step to any workflow.** You'd get double deploys.
- Build command `pnpm build`; deploy `pnpm exec wrangler deploy`;
  non-production branch deploy `pnpm exec wrangler versions upload`. These live
  in the Cloudflare dashboard, **not** in this repo — same as the Node version.
- The `pnpm exec` prefix on the deploy commands is load-bearing: wrangler is a
  devDependency, and the deploy step runs in a bare `/bin/sh` without
  `node_modules/.bin` on PATH.
- Set `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` in Workers Builds; prerender runs at
  build time and needs the env.
- `pnpm preview` builds and serves on workerd. `next dev` behaviour was never
  proof and neither is `vite dev`.

## Architecture

```
config/tools.yaml → Actions sync (2x/day, 09:17 + 21:17 ICT) → data/*.json
                  → TanStack Start prerender → Cloudflare Workers
```

- **77 prerendered pages**: 1 home + 8 categories + 68 tools.
- `data/` is **generated**. Never edit by hand.
- Scheduled runs are best-effort: observed 1.5–3.5h late.

### The load-bearing bits

**Prerender runs in workerd, not Node.** `node:fs` fails there with
`[unenv] fs.readFileSync is not implemented yet!`. So there is no render context
in which filesystem access works. This drives everything below.

- **The catalog index is code-generated** into `src/generated/catalog.ts`
  (gitignored) by `scripts/lib/gen-catalog.ts`. ~8.5 KB gzipped, so it ships to
  both worker and client, and 404s need no network hop. Zod validates at
  generation time and `tsc` structurally checks the emitted literal, so bad data
  fails `pnpm typecheck` rather than production.
- **Release notes are static assets.** `data/releases/*.json` is copied to
  `public/release-notes/` and fetched over HTTP by the `/tools/$slug` loader.
  1.9 MB must never enter the worker bundle. `src/server/release-notes.ts` still
  reads them with `fs` — **scripts and tests only**, never from `src/routes/**`.
- **`prerender.autoSubfolderIndex: false` is mandatory.** The default `true`
  emits `foo/index.html` and makes Workers Assets serve `/foo` as a 307 to
  `/foo/`, putting a redirect on 76 of 77 URLs.
- **`prerender.autoStaticPathsDiscovery: false`** or the explicit `pages` list
  stops being authoritative.
- **`throw notFound()` alone gives a real 404** and server-renders the
  notFoundComponent. No `setResponseStatus` needed. Never set
  `assets.not_found_handling: "single-page-application"` — it returns 200.
- **Start's import-protection fails the build** if route code imports
  `@tanstack/react-start/server`, even behind `await import()` in an SSR branch.
  Use `createServerOnlyFn` / `createIsomorphicFn().server()`.

### Import rule

Anything reachable from `node scripts/*.ts` — `src/domain/**`, `src/server/**`,
`scripts/**` — must use **relative specifiers with explicit `.ts` extensions**
and never the `@/` alias. Node's native type stripping does no extension
resolution. Route and component code uses `@/…`.

## Core Technologies

| | |
|---|---|
| Node / pnpm | 26 / 11.18.0 |
| TanStack Start | 1.168.36 (Release Candidate) |
| TanStack Router | 1.170.19 |
| React | 19.2.8 |
| TypeScript | 6.0.3 |
| Vite | 8.2.0 (native `resolve.tsconfigPaths`) |
| Tailwind | 4.3.3 via `@tailwindcss/vite` |
| Cloudflare | `@cloudflare/vite-plugin` 1.50.0, wrangler 4.118.0 |
| Zod | 4.4.3 |
| Markdown | `@tanstack/markdown` 0.0.13 (**alpha**) |
| vitest | 4.1.10 + `@cloudflare/vitest-pool-workers` 0.20.1 |

Framework and build-chain deps are pinned **exact**; they move only through a
reviewed dependency PR.

## Compact Technical UI conventions

Type sizes are eight **named tiers**, chosen by role, declared in
`src/styles/app.css`: `micro` 11 · `meta` 12 · `control` 13 · `body` 14 ·
`card-title` 15 · `version` 16 · `page-title` 22 · `detail-title` 24.
`tests/unit/styles.test.ts` fails the build on a raw `text-sm`, an arbitrary
`text-[13px]`, a weight above 600, or a bare `rounded`.

- **Density comes from controls and spacing, not from small body text.** Body
  and descriptions stay at 14px; controls are 13px, metadata 12px.
- **Control heights are 28 / 32 / 36.** Icon buttons are 32px visually and carry
  `hit-40`, a pseudo-element that widens the pointer target to 40px without
  affecting layout.
- **Three radii**: `badge` 5px, `control` 8px, `card` 10px. No bare `rounded`.
- **Borders carry elevation.** The single `shadow-overlay` is for overlays only —
  never on a page card.
- **One signal per piece of state.** Don't render the same channel badge or the
  same date twice on one screen; both happened before this pass.
- **A new custom utility must be declared to `cn()`** if it shares a Tailwind
  prefix. tailwind-merge reads `text-<x>` as a colour, so the semantic sizes were
  silently dropped wherever they met a `text-fg-*` class until `src/lib/cn.ts`
  declared the font-size group.
- **Two container widths, chosen by page type.** `PageContainer` gives grid
  pages `max-w-6xl` (1152px, cards land at ~376px) and the tool page
  `max-w-4xl` (896px). One shared width made a release row 72% empty.
- **Don't push a row's actions to both edges.** Splitting left/right in a wide
  container leaves a hole in the middle; cluster them and let the trailing space
  be margin.
- **Named breakpoints, not arbitrary ones, for layout steps.** Tailwind emits
  `min-[900px]:` variants *before* the named ones, so `sm:` sorted later and won.
  `--breakpoint-cards` exists for the grid's 900px step.
- **Whole-card navigation is a stretched link** (`after:absolute after:inset-0`),
  not `role="button"` — the card contains a real button and real links. Inner
  controls sit on `relative z-10`; controls inside a `<summary>` need
  `stopPropagation` so they don't toggle the disclosure.

## Key Patterns

- **`src/domain/types.ts` is the single source of truth for shape.** Zod first,
  types via `z.infer`.
- **`src/domain/releases.ts` is pure**: normalize → filter → merge/dedupe by id
  → cap at 20 → `stableStringify`.
- **`generatedAt` only advances when content changes** (`contentEquals`).
- **Release notes are hostile input.** Render only through
  `components/releases/release-notes.tsx`. `allowHtml: false` **and**
  `headingIds: false` are both load-bearing — the latter because a tool page
  renders up to 20 note documents and duplicate heading ids would be an axe
  violation. There is no second path.
- **Link policy is stricter than the library's.** `@tanstack/markdown` returns
  an *empty string* for a blocked scheme rather than dropping the attribute, and
  admits protocol-relative `//host`. `src/lib/note-links.ts` treats `""` as "not
  a link" and rejects `//`.
- **Native `<details>`, not Radix Collapsible.** Radix unmounts closed content,
  which would strip 19 of 20 notes from the SSR HTML.
- **No `Date.now()` in render paths.** `TimeAgo` renders the absolute date until
  hydrated; recency buckets use `generatedAt` as the server clock via
  `useSyncExternalStore`. `formatDate` pins UTC and `TimeAgo` pins the `en`
  locale for the same reason.
- **`scripts/sync-releases.ts` try/catches per tool.** One flaky repo must never
  block the rest.
- **Sync commits don't trigger CI** but do trigger Cloudflare rebuilds.
