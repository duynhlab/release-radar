# Candidate audit — TanStack Start build

Measured 2026-08-06 against `pnpm preview` (workerd, `http://localhost:4173`).
Compare with `baseline/BASELINE.md`, captured the same way on the OpenNext build.

## Contract preserved

| Check | Baseline | Candidate |
|---|---|---|
| All 77 URLs | 200, no redirect | **200, no redirect** ✓ |
| `/tools/does-not-exist` | 404 | **404** ✓ |
| `/categories/nope` | 404 | **404** ✓ |
| `/nope` | 404 | **404** ✓ |
| axe wcag2a+aa, home | 0 violations | **0** ✓ |
| axe wcag2a+aa, tool page | 0 violations | **0** ✓ |
| axe wcag2a+aa, largest notes payload | 0 violations | **0** ✓ |
| axe wcag2a+aa, category | 0 violations | **0** ✓ |
| axe wcag2a+aa, 404 | — | **0** ✓ |
| Console output / page errors | none | **none** ✓ |
| Grid columns @ 1440 / 768 / 390 | 4 / 2 / 1 | **4 / 2 / 1** ✓ |
| Horizontal overflow | none | **none** ✓ |

The URL result is the one worth stating plainly: `prerender.autoSubfolderIndex`
defaults to `true`, which would have made every one of the 76 non-root URLs a
307 to a trailing slash. It is set to `false`, so the contract holds byte for
byte.

## New capability (absent in the baseline)

| Flow | Result |
|---|---|
| Search → URL | `/?q=VictoriaMetrics`, 5 cards |
| Reload keeps the filter | URL and result set both survive |
| Category chip → URL | `/?category=observability`, 21 cards (matches baseline count) |
| Back / Forward | `/` ⇄ `/?category=observability` |
| Clear filters | back to bare `/`, 68 cards |
| Favorites filter → URL | `/?favorites=true` |
| Favorites persistence | `release-radar:favorites` = `["vm-helm-charts"]`, survives reload |
| Release deep link | `#release-v1.36.2` → that release's `aria-expanded="true"` |

Favorites deliberately keep the legacy storage key and `string[]` shape, so
existing users' stars carry over.

## Accessibility detail

- 261 icon-only controls, **0 under 40×40**, **0 missing an accessible name**.
  (203 of 463 total interactive elements are under 40px — those are text links,
  which the size requirement does not cover.)

## Keyboard and focus

| Check | Result |
|---|---|
| First focusable element | **Skip to content** |
| Tab order vs visual order (20 elements) | **0 out of order** |
| Escape closes the mobile filter Sheet | **yes** |
| Focus returns to the Filters trigger | **yes** |
| axe with the Sheet open | **0 violations** |
| Favorite `aria-pressed` flips | **yes** |
| Collapsible `aria-expanded` tracks `details.open` | **yes, both directions** |

Reading `aria-expanded` synchronously after `.click()` shows a stale value —
React batches the state update. Assert after a tick, or the check reports a bug
that isn't there.

## Theme

| `prefers-color-scheme` | `<html>` class | body background |
|---|---|---|
| dark | `dark` | `oklch(0.165 0.01 264)` |
| light | `light` | `oklch(0.985 0.002 264)` |

Both themes fully authored; the toggle beats the OS via the class strategy.

## SSR resilience — scripts blocked

| Page | Result |
|---|---|
| `/` | `h1` present, **all 68 cards render** |
| `/tools/kubernetes` | **7 note blocks, 7 `<details>`, 1 open by default** |

This is the evidence for keeping native `<details>` over Radix Collapsible:
Radix unmounts closed content, which would have stripped 6 of the 7 notes from
the SSR HTML and broken both this audit and in-page Cmd+F.

## Performance — measured, not optimized

Three runs each, warm browser, localhost (so optimistic versus a real network —
these bound the client cost, they are not field data).

| Page | LCP | CLS | FCP | TTFB |
|---|---|---|---|---|
| `/` | 56 / 60 / 60 ms | 0.000 | 56–60 ms | 2–4 ms |
| `/tools/argo-cd` (largest notes payload) | 52 / 60 / 52 ms | 0.000 | 52–60 ms | 3 ms |

Targets are LCP ≤ 2.5 s and CLS ≤ 0.1. Both are met by two orders of magnitude.

Bundle, gzipped: **183 KB JS across 10 route-split chunks**, 6.9 KB CSS,
147 KB of fonts raw across 11 unicode-range subsets (only the latin subset
downloads).

The specific hypothesis worth testing was that `@tanstack/markdown` now ships to
the client, where Next kept it server-side. It does — but Vite route-splits it
into the tools chunk (9.3 KB gz), not the entry chunk, and the heaviest tool page
still renders in ~55 ms.

**No optimization was performed, because the measurements do not justify one.**
Optimizing here would add complexity that buys nothing.

## Deployed preview — Phase 5 gate CLOSED

Verified against a real Workers deployment
(`feat-tanstack-rebuild-release-radar.duyne.workers.dev`), not `vite preview`.

**Security headers all apply.** `_headers` works in production exactly as
intended; it simply is not implemented by `vite preview`, which is why the
earlier local check found nothing. All seven present on `/`:

| Header | Value |
|---|---|
| `content-security-policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; …; frame-ancestors 'none'; object-src 'none'` |
| `strict-transport-security` | `max-age=31536000; includeSubDomains` |
| `x-content-type-options` | `nosniff` |
| `x-frame-options` | `DENY` |
| `referrer-policy` | `strict-origin-when-cross-origin` |
| `cross-origin-opener-policy` | `same-origin` |
| `permissions-policy` | all sensors `()` |

| Check on the deployment | Result |
|---|---|
| All 77 URLs | **200, no redirect** |
| `/tools/does-not-exist`, `/categories/nope`, `/nope` | **404** |
| `/assets/*` cache | `public,max-age=31536000,immutable` |
| `/release-notes/*` cache | `public,max-age=300,must-revalidate` |
| `/og.png`, `/sitemap.xml`, `/robots.txt` | 200, correct content types |
| axe wcag2a+aa on `/`, tool, category, 404 | **0 violations** |
| Console / page errors | **none** |

Web Vitals over the real network, 3 runs on `/`:

| Run | LCP | CLS | TTFB |
|---|---|---|---|
| 1 | 476 ms | 0.040 | 149 ms |
| 2 | 464 ms | 0.000 | 407 ms |
| 3 | 108 ms | 0.000 | 58 ms |

Against targets of LCP ≤ 2.5 s and CLS ≤ 0.1, with real TLS and network latency
rather than localhost.

## Worker

- 24 server chunks, **326 KB gzipped** against a 1 MB budget (Workers' hard limit
  is 3 MiB).
- Catalog index present; **0 of 12 sampled release-note bodies leaked**.
- 77 prerendered pages, 77 sitemap entries.
- `pnpm audit --prod`: no known vulnerabilities.

## Method notes

`agent-browser`'s viewport does not survive a navigation and can silently no-op
after `set device`/`set media`, so every measurement above re-sets the viewport
after `open` and asserts `innerWidth` before trusting the result. One session per
viewport. Skipping this produces plausible-looking but wrong numbers — it
produced two byte-identical "different viewport" screenshots during the baseline
capture.
