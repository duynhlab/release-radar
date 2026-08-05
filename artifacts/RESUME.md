# Resume point — TanStack Start rebuild

Branch `feat/tanstack-rebuild`. Plan file:
`/Users/duy.do/.claude/plans/c-ke-hoach-release-radar-greenfield-txt-sorted-kazoo.md`

## Done and verified

- **Phase 0** committed (`1383f9e`): legacy contract frozen in
  `artifacts/e2e/baseline/BASELINE.md` — 77 URLs all 200 no-redirect, 0 axe
  wcag2a/aa violations, grid 4/2/1 at 1440/768/390.
- **Spikes S0–S3 resolved**, plan updated with the corrections:
  - prerender runs in **workerd**, `node:fs` unavailable there → asset-fetch is
    the only path for release notes (no fs fallback)
  - `throw notFound()` alone gives a real 404 *and* SSRs the notFoundComponent —
    `setResponseStatus` / `createServerOnlyFn` / splat route all unnecessary
  - Start's import-protection fails the build on `@tanstack/react-start/server`
    imports from route code, even behind `await import()` in an SSR branch
  - `autoSubfolderIndex: false` is mandatory or all 77 URLs gain a 307 hop
- **Build is green**: 77 prerendered pages, 77 sitemap entries.
- **`pnpm check:bundle` passes**: catalog in the worker, 0/12 sampled release
  notes leaked, worker 325 KB gzipped (budget 1 MB).
- **`pnpm vitest run --project unit` passes: 76 tests** (43 ported + 33 new
  markdown security, incl. the empty-href and protocol-relative gaps).

## Next action — where it stopped

`pnpm typecheck` fails. All remaining errors are `noUncheckedIndexedAccess`,
newly enabled in tsconfig.json:

- `src/domain/releases.ts:126` — `catalog.groups[tool.group].name`; the guard
  checks the same expression but TS cannot narrow a second index. Hoist to a
  local.
- `src/server/catalog-edit.ts:22,34` — `repository.split("/")[1]` is
  `string | undefined`.
- `scripts/sync-releases.ts:48,49,57,58,64,65` and `scripts/add-tool.ts:47,57,58`
  — same `split("/")` destructuring into Octokit `{ owner, repo }`.
- `tests/unit/*.test.ts` (~31) — fixtures indexed like `catalog.tools[0]`.

Decision to make first: keep `noUncheckedIndexedAccess` and fix the src/scripts
sites properly (they are genuine), then either fix the tests or give
`tests/` its own tsconfig without the flag. Do **not** silently drop the flag
from the root config — the src findings above are real.

## Then, in order

1. `pnpm lint` (first run of the new flat config — verify the plugin export
   names, a wrong one is a silent no-op).
2. Worker + dom test projects: `tests/worker/catalog.worker.test.ts`,
   `tests/dom/*` (theme boot script, favorites store, hotkey, hydration).
3. New unit tests: dates, urls/fragments, search-params, filters,
   catalog-relations, generated-catalog determinism, prerender-pages.
4. `scripts/audit-markdown-corpus.ts` (AST-driven, writes
   `artifacts/markdown/corpus-{report.md,baseline.json}`) + wire
   `audit:markdown --check` into ci.yaml **and** sync-releases.yaml.
5. Update `.github/workflows/*` (no deploy step — Workers Builds owns deploys).
6. `pnpm preview` + agent-browser audit vs the Phase 0 baseline. Remember: one
   session per viewport, re-set the viewport after every navigation, and assert
   `innerWidth` before trusting a capture.
7. Tag `legacy-opennext` on the last OpenNext commit of `main`, update
   CLAUDE.md / README.md (68 tools, 77 pages, new stack, markdown policy,
   accepted bare-URL regression, `.ts`-extension import rule), open the PR.
