# Release Radar — Onboarding

Personal DevOps/SRE release tracker. A Git-backed catalog: YAML config in,
GitHub Actions syncs releases daily, JSON committed back to the repo, Next.js
renders it fully static, Cloudflare Workers serves it.

## The one diagram that matters

```
config/tools.yaml ──▶ GitHub Actions (daily 07:17 ICT) ──▶ data/*.json (committed)
                                                                 │
Cloudflare Workers ◀── OpenNext build ◀── Next.js SSG ◀─────────┘
```

Key property: **no database, no runtime API calls, no client-side tokens**.
The website is a pure function of the committed JSON. If the site shows wrong
data, look at `data/`, not the frontend.

## Architecture decisions (why it is this way)

- **Data is committed to Git** — history and diffs for free, no rate limits at
  view time, trivially forkable. Modeled after fluxcd/flux-schema.
- **Full SSG, no ISR/SSR** — every route exports `dynamic = "error"` so the
  build fails loudly if a route accidentally becomes dynamic.
- **JSON is read with `fs` at build time** (`lib/data.ts`), never `import`ed.
  Importing would bundle every release note into the worker and blow the
  3 MiB gzip limit.
- **`generatedAt` only advances when content changes** — otherwise every daily
  run would create a noise commit. Idempotency is tested and load-bearing.
- **One deploy path**: Cloudflare Workers Builds (Git integration). Do NOT add
  a deploy step to GitHub Actions — you'd get double deploys.

## Code map

| Path | What it is |
|---|---|
| `config/tools.yaml` | Source of truth: the 12 tracked tools. Edit this to add/remove tools. |
| `lib/types.ts` | Zod schemas for everything (catalog, release, index). Types flow from here. |
| `lib/releases.ts` | The correctness core: filter → merge/dedupe → cap 20 → stable serialize. Pure functions, fully unit-tested. |
| `lib/catalog.ts` | YAML loading + validation. |
| `lib/data.ts` | Build-time `fs` readers for pages. |
| `scripts/sync-releases.ts` | Octokit orchestration. Per-tool try/catch: one flaky repo never blocks the rest or wipes existing data. |
| `scripts/validate-catalog.ts` | CLI validation + regenerates `schemas/tool.schema.json` (editor autocomplete for the YAML). |
| `data/` | **Generated.** Never edit by hand; the sync overwrites it. |
| `app/`, `components/` | Next.js UI. `home-explorer.tsx` is the main client component (search/filter/favorites). |
| `.github/workflows/sync-releases.yaml` | Daily sync, `contents: write`, commits only if `data/` changed. |
| `.github/workflows/ci.yaml` | PR/push checks, `contents: read`, ignores data-only pushes. |
| `open-next.config.ts` + `wrangler.jsonc` | Cloudflare adapter. Uses `static-assets-incremental-cache` — required for SSG pages, see gotchas. |

## Daily commands

```bash
pnpm validate:catalog              # after editing tools.yaml
GITHUB_TOKEN=$(gh auth token) pnpm sync   # fetch releases locally
pnpm test && pnpm lint && pnpm typecheck
pnpm dev                           # dev server (hot reload)
pnpm preview                       # the real thing: workerd runtime locally
```

Node ≥ 22.18 runs the `.ts` scripts natively — no tsx/ts-node needed.

## Gotchas that already bit us (don't rediscover them)

1. **`defineCloudflareConfig()` alone breaks SSG pages** (500/404 on workerd).
   You must pass `incrementalCache: staticAssetsIncrementalCache`. Already
   done in `open-next.config.ts` — don't remove it.
2. **pnpm 10+ blocks postinstall scripts** (`ERR_PNPM_IGNORED_BUILDS`). The
   allowlist lives in `pnpm-workspace.yaml` (`allowBuilds`). If a new dep needs
   a build script, add it there.
3. **Hydration and time**: anything time-relative rendered on the server must
   be deterministic. `TimeAgo` renders the absolute date until hydrated;
   the home page buckets use `generatedAt` as the server clock via
   `useSyncExternalStore`. Don't call `Date.now()` in render paths.
4. **Never use `/releases/latest`** from the GitHub API — it skips prereleases
   and sorts by `created_at`. We list the ~10 newest and filter ourselves.
5. **Sync commits don't trigger CI** (GITHUB_TOKEN loop prevention) but DO
   trigger Cloudflare rebuilds (external GitHub App). This is intentional.
6. **Edge runtime is not supported** by the OpenNext adapter. Never add
   `export const runtime = "edge"`.
7. **Release notes are hostile input** — always rendered through
   `components/release-notes.tsx` (rehype-sanitize). Don't render `notes`
   any other way.

## Adding a tool (the 90% task)

1. Add an entry in `config/tools.yaml` (copy an existing one; the JSON schema
   gives autocomplete).
2. `pnpm validate:catalog` → `GITHUB_TOKEN=$(gh auth token) pnpm sync`.
3. Commit both the YAML and the generated `data/` files.
4. Push — Cloudflare rebuilds automatically.

Tag-pattern tips: most tools want `^v\d+\.\d+\.\d+$`. Grafana needs
`(\+security-\d+)?` appended. OTel Collector releases from the `-releases`
repo, Karpenter from `aws/karpenter-provider-aws`.

## Verification standard

Before merging anything: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
(CI runs the same). For UI changes, also `pnpm preview` and check the pages on
workerd — `next dev` behavior is not proof, the SSG/worker path is what ships.
Browser-verify with `agent-browser` if available (console clean, axe-core 0
violations is the current baseline).

## Deferred by design (don't build yet)

Phase 2+: RSS, Slack/Telegram digest, major/minor/patch classification, CVE &
EOL tracking, installed-version comparison. See `docs/release-radar-plan.txt`
for the full roadmap and MVP acceptance criteria.
