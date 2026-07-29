# Release Radar

Personal DevOps/SRE release tracker — a Git-backed catalog that follows new
releases of infrastructure tools on GitHub.

```
config/tools.yaml          declarative tool catalog (source of truth)
        │
        ▼
GitHub Actions             daily sync at 07:17 Asia/Ho_Chi_Minh
        │
        ▼
data/releases/*.json       normalized release history (max 20 per tool)
data/index.json            aggregate index consumed by the site
        │
        ▼
Next.js (full SSG)         reads the committed JSON at build time
        │
        ▼
Cloudflare Workers         deployed via OpenNext, rebuilt on every commit
```

No database, no runtime GitHub API calls, no tokens in the client.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Next.js dev server |
| `pnpm validate:catalog` | Validate `config/tools.yaml` + regenerate JSON schema |
| `pnpm sync` | Fetch releases from GitHub (needs `GITHUB_TOKEN`) |
| `pnpm test` | Vitest unit tests (catalog, sync logic, sanitization) |
| `pnpm lint` / `pnpm typecheck` | ESLint / tsc |
| `pnpm build` | Next.js production build (all routes static) |
| `pnpm preview` | Build + serve on workerd (Cloudflare runtime) locally |
| `pnpm deploy` | Build + deploy to Cloudflare Workers manually |

## Adding a tool

Add an entry to `config/tools.yaml`:

```yaml
- id: my-tool
  name: My Tool
  category: observability   # platform | provisioning | delivery | observability | networking | security | data
  repository: owner/repo
  description: One-line description
  homepage: https://example.com
  tags: [metrics]
  release:
    strategy: github-releases   # github-releases | github-tags | manual
    includePrerelease: false
    tagPattern: "^v\\d+\\.\\d+\\.\\d+$"
```

Then run `pnpm validate:catalog` and `pnpm sync`. The daily workflow keeps it
updated afterwards.

## Sync behavior

- Fetches the ~10 latest releases per repo (never `/releases/latest`, which
  skips prereleases and sorts by `created_at`).
- Filters drafts, prereleases (unless enabled), and tags not matching
  `tagPattern` / matching `ignorePattern` — including retroactively on stored
  history when the config changes.
- Merges by GitHub release id (no duplicates), keeps the 20 newest.
- Deterministic output: unchanged tools are never rewritten, `generatedAt`
  only advances on real changes, so no-op runs produce no commit.
- A failing repo never wipes existing data and never blocks other tools.

## Deployment

Cloudflare Workers via the OpenNext adapter (`@opennextjs/cloudflare`), with
prerendered pages served from static assets (`static-assets-incremental-cache`
— no R2 needed). Connect the repo to Cloudflare Workers Builds (Git
integration); every push, including the daily data commit, triggers a rebuild.
Do not add a second deploy path in GitHub Actions.
