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
Co-Authored-By: duynebot <duynebot@users.noreply.github.com>
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
releases of infrastructure tools on GitHub. Currently 64 tools across 8 groups.

No database, no runtime API calls, no client-side tokens. The site is a pure
function of the committed JSON — **if the site shows wrong data, look at
`data/`, not the frontend.**

## Setup

```bash
pnpm install
```

- Node ≥ 26. It runs the `.ts` scripts natively — no tsx/ts-node.
- pnpm 11.18.0, pinned via `packageManager`.
- Syncing locally needs a token: `GITHUB_TOKEN=$(gh auth token) pnpm sync`.
- `.dev.vars` is gitignored and only holds `NEXTJS_ENV`.

## Development

```bash
pnpm dev          # Next.js dev server
```

Adding a tool is the 90% task:

1. Edit `config/tools.yaml` (the JSON schema in `schemas/` gives autocomplete).
2. `pnpm validate:catalog`
3. `GITHUB_TOKEN=$(gh auth token) pnpm sync`
4. Commit **both** the YAML and the generated `data/` files.

See README §"Adding a tool" for tag-pattern tips — that's where the per-repo
quirks are recorded. Note that `pnpm sync` refreshes every tool, so unrelated
`data/` files often ride along in the diff; say so in the PR body.

Dependency trap: `pnpm install` does **not** move a version forward inside a
range that's already satisfied. `"@types/react": "^19"` resolved at 19.2.17
stays at 19.2.17. Use `pnpm update <pkg>` to walk the range forward.

## Testing

```bash
pnpm test         # vitest, 47 tests across 4 files
```

`tests/` holds `sync.test.ts`, `catalog.test.ts`, `catalog-edit.test.ts`, and
`sanitize.test.tsx`. `vitest.config.ts` picks up `tests/**/*.test.{ts,tsx}`
only.

`lib/releases.ts` is the correctness core and is pure by design — new release
logic goes there, with tests, rather than into a script or a component.

## Code Quality

The merge gate, same as CI runs it:

```bash
pnpm validate:catalog && pnpm test && pnpm lint && pnpm typecheck && pnpm build
```

For UI changes, or dependency bumps that touch the runtime (`react-dom`,
`wrangler`), also run `pnpm preview` — `next dev` behavior is not proof, the
SSG/worker path is what ships. Baseline to hold: zero console errors, zero
axe-core violations.

## Cloudflare Workers

Deployed via OpenNext to Workers, connected through **Workers Builds (Git
integration)** — not GitHub Actions.

- **Do not add a deploy step to any workflow.** You'd get double deploys.
- `pnpm preview` builds and serves on workerd. Verify with curl against the
  real routes, and query the local observability API for span outcomes and log
  levels:
  ```bash
  curl -X POST http://localhost:8787/cdn-cgi/local/explorer/api/local/observability/query \
    -H 'Content-Type: application/json' \
    -d '{"sql":"SELECT name, outcome FROM spans WHERE parent_id IS NULL"}'
  ```
- `incrementalCache: staticAssetsIncrementalCache` in `open-next.config.ts` is
  load-bearing — `defineCloudflareConfig()` alone makes SSG pages return
  500/404 on workerd. Don't remove it.
- Never `export const runtime = "edge"` — the adapter doesn't support it.
- The Cloudflare build environment's Node version lives in the Cloudflare
  dashboard, **not** in this repo. Changing `node-version` in the workflows
  does not move it; it's the one Node version here that isn't version
  controlled.

## Architecture

```
config/tools.yaml → Actions sync (2×/day, 09:17 + 21:17 ICT) → data/*.json
                  → Next.js SSG → Cloudflare Workers
```

- Full SSG. Every route sets `dynamic = "error"` so the build fails loudly if
  one accidentally becomes dynamic; the dynamic routes also set
  `dynamicParams = false`.
- JSON is read with `fs` at build time (`lib/data.ts`), never `import`ed —
  importing would bundle every release note into the worker and blow the 3 MiB
  gzip limit.
- 3 routes (`app/page.tsx`, `app/categories/[slug]`, `app/tools/[slug]`) →
  76 static pages.
- `data/` is **generated**. Never edit it by hand; the sync overwrites it.
- Scheduled runs are best-effort: observed 1.5–3.5h late in this repo, so
  09:17 means "sometime after 09:17".

## Core Technologies

| | |
|---|---|
| Node / pnpm | 26 / 11.18.0 |
| Next.js | 16.2.12 — App Router, Turbopack |
| React | 19.2.8 |
| TypeScript | 6.0.3 |
| Tailwind | 4.3.3, via `@tailwindcss/postcss` |
| OpenNext | `@opennextjs/cloudflare` 1.20.2 |
| wrangler | 4.118.0 — workerd `compatibility_date: 2026-07-01`, `nodejs_compat` |
| Zod | 4.4.3 |
| Octokit | 5.0.5 |
| vitest | 4.1.10 |
| Markdown | react-markdown 10.1.0 + remark-gfm + rehype-sanitize |

`next` and `eslint-config-next` are pinned exact (no caret) on purpose — they
move only through a reviewed Dependabot PR.

## Key Patterns

- **`lib/types.ts` is the single source of truth for shape.** Zod schema
  first, types via `z.infer`. Don't hand-write an interface that duplicates a
  schema.
- **`lib/releases.ts` is pure**: normalize → filter (`releaseMatchesConfig`) →
  merge/dedupe by GitHub release id → cap at `MAX_RELEASES_PER_TOOL` (20) →
  `stableStringify`. Release notes are truncated at `NOTES_MAX_LENGTH`.
- **`generatedAt` only advances when content changes** (`contentEquals`).
  Idempotency is tested and load-bearing — otherwise every scheduled run
  produces a noise commit.
- **Release notes are hostile input.** Render them only through
  `components/release-notes.tsx` (rehype-sanitize). There is no second path.
- **No `Date.now()` in render paths** — it breaks hydration. `TimeAgo` renders
  the absolute date until hydrated; the home page uses `generatedAt` as the
  server clock via `useSyncExternalStore`.
- **`scripts/sync-releases.ts` try/catches per tool.** One flaky repo must
  never block the rest or wipe existing data.
- **Sync commits don't trigger CI** (GITHUB_TOKEN loop prevention) but do
  trigger Cloudflare rebuilds. Intentional.
