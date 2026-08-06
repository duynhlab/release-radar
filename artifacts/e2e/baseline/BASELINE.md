# Phase 0 — legacy contract baseline

Captured 2026-08-05 against the OpenNext/Next.js 16 build served on **workerd** via `pnpm preview`
(`http://localhost:8787`), i.e. the path that actually ships — not `next dev`.

Data snapshot: `data/index.json` `generatedAt` **2026-08-05T15:24:49.824Z**, **68 tools**, **8
categories**, **8 groups**.

## URL inventory — 77 routes

`urls.txt` holds the full list: `/` + 8 `/categories/{slug}` + 68 `/tools/{id}`.

**Every one of the 77 returns HTTP 200 with no redirect.** This is the contract the rebuild must
preserve, and it is the reason `prerender.autoSubfolderIndex: false` is mandatory — the TanStack
default (`true`) emits `about/index.html` and serves `/about` as a 307 to `/about/`, which would put a
redirect hop on 76 of 77 URLs and change every canonical URL.

| Path | Status |
|---|---|
| all 77 inventoried URLs | **200** |
| `/tools/does-not-exist` | **404** |
| `/categories/nope` | **404** |
| `/nope` | **404** |

## Metadata contract

| Route | `<title>` | `description` |
|---|---|---|
| `/` | `Release Radar` | Daily tracker for new releases of DevOps and SRE tools on GitHub |
| `/categories/observability` | `Observability · Release Radar` | *(inherits root)* |
| `/tools/kubernetes` | `Kubernetes · Release Radar` | `Production-grade container orchestration` |
| `/nope` | `Release Radar` | *(inherits root)* |

**`canonical` and all Open Graph tags are absent on every route.** They are additions in the rebuild,
not regressions to avoid — nothing to preserve.

## Heading outline

| Route | Outline |
|---|---|
| `/` | `h1: DevOps release tracker` → `h2: Released today{n}` → `h3: {tool name}` |
| `/categories/observability` | `h1: Observability` → `h2: Tools` (sr-only) → `h3: {tool name}` |
| `/tools/kubernetes` | `h1: Kubernetes` → `h2: Release history last {n} releases` → `h3: {version}` |
| `/nope` | `h1: Page not found` |

Note there is **no `h1`–`h6` from release notes** — they are deliberately downgraded to styled `<p>`
so the page outline stays valid (axe `heading-order`). Preserve this.

## Accessibility and console

`agent-browser a11y --tags wcag2a,wcag2aa` (vendored axe-core):

| Route | Violations |
|---|---|
| `/` | **0** |
| `/tools/kubernetes` | **0** |
| `/tools/argo-cd` (largest notes payload) | **0** |
| `/categories/observability` | **0** |

`console` and `errors` both empty across all four. This confirms the baseline README claims: zero
console errors, zero axe-core violations.

## Responsive contract

Measured with `innerWidth` verified before each read:

| Viewport | Grid columns | Horizontal overflow | `scrollWidth` |
|---|---|---|---|
| 1440×1000 | **4** | none | 1440 |
| 768×1024 | **2** | none | 768 |
| 390×844 | **1** | none | 390 |

Matches the §11 criterion (1/2/4 at the audited viewports) and confirms keeping the four-step grid
`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` — the `lg` step only governs 1024–1279px,
outside the audited set.

## Screenshots

`home|tool|category|notfound` × `desktop 1440×1000 / tablet 768×1024 / mobile 390×844` × `dark|light`,
all `--full`, all captured at **verified** dimensions.

## agent-browser gotchas — hit during this capture, must carry into every later audit

1. **`set viewport` does not survive a navigation.** After any `open`, the viewport reverts to the real
   window size (1280×577 here). Re-set it after every navigation.
2. **`set viewport` is unreliable once `set device` or `set media` has been issued in that session** —
   it can silently no-op, leaving the previous size. Two captures came out byte-identical
   (desktop == tablet) before this was caught.
3. **Therefore: one session per viewport** (as plan §10 line 618 already prescribes), and **assert
   `innerWidth`/`innerHeight` with `eval` before trusting any screenshot or layout measurement.** A
   silently-wrong viewport invalidates every responsive assertion while still producing a plausible
   PNG.
4. The `agent-browser` binary here is **0.33.1** (Homebrew); npm latest is 0.33.2. Pin an exact version
   in devDependencies so local and CI agree.

## Intentional differences already agreed for the rebuild

Not regressions — record so the Phase 6 diff review does not re-litigate them:

- Dark-first default with an explicit theme toggle (today: pure `prefers-color-scheme`, no toggle).
- Filter state in typed URL search params (today: `useState` only — nothing shareable).
- Clear-filters control and a global result count (today: neither exists).
- `/` or `Mod+K` search shortcut (today: none).
- Copy-version action (today: none).
- Stable per-release URL fragments for deep-linking (today: no `id` attributes at all).
- Mobile filter Sheet (today: controls just wrap).
- Skip link, `focus-visible` styles everywhere, `prefers-reduced-motion` handling (today: absent).
- External release-note links open in a new tab (today: same tab).
- `latest` sort gains the `name` tiebreaker the category page already has (today they disagree).
- Search also matches tags (today: name, id, group name only).
- Canonical + Open Graph + sitemap + robots (today: absent).
- Fonts actually render as Geist (today a stray `body { font-family: Arial }` defeats them).
- **Accepted regression:** bare URLs in release notes lose their links — **221 notes (37.0%) across
  40/68 tools**, 152 of them mentioning a Full Changelog line — because `@tanstack/markdown` has no
  autolink literals. Measured by AST walk; see `artifacts/markdown/corpus-report.md`.
- Raw HTML in 28 notes (8 tools) renders as escaped literal text rather than markup. Zero dangerous
  HTML, zero indented code blocks, zero Setext headings, zero links rejected by the link policy.
