# Browser audit record

Measured on `pnpm preview` (workerd) or on production, never on `vite dev`.
`urls.txt` is the full 80-URL inventory used by the sweeps below.

Supersedes the earlier `BASELINE.md` (legacy OpenNext) and `CANDIDATE.md`
(TanStack rebuild); both were two generations stale and largely duplicated this.

## URL contract — the thing most likely to break silently

**All 80 URLs return 200 with no redirect.** 1 home + 11 categories + 68 tools.
Unknown tool, category and path each return a real 404.

This holds only because `prerender.autoSubfolderIndex` is `false`. The default
`true` emits `foo/index.html`, which makes Workers Assets serve `/foo` as a
**307** to `/foo/` — a redirect hop on 79 of 80 URLs and a change to every
canonical URL. A redirect-following `curl` would not notice.

The four slugs retired in the 8→11 taxonomy change (`platform`, `provisioning`,
`delivery`, `data`) return 404 by design; no redirects were added. On the home
route they behave differently: `?category=platform` is *not* a 404, because
`parseHomeSearch` is total — it drops the unknown facet and normalises the URL,
so the page falls back to the unfiltered view rather than an empty one.

## Current measured state (1440×900)

| | Value | Target |
|---|---|---|
| body | 14px | 14 |
| page title | 22px / 600 | 22 / 600 |
| card title / description | 15px / 14px | 15 / 14 |
| badge · section label | 11px | 11 |
| filter chip | 13px, h=28 | 13 |
| search / select | 36px | 36 |
| button · icon button | 32px · 32px visual, 40px hit | 32 · 32/40 |
| header | 57px | 56 |
| **grid container** | **1152px** (`max-w-6xl`) | ~1100 |
| **reading container** (tool page) | **896px** (`max-w-4xl`) | ~900 |
| card width | **376px** | ~360 (t3 is 360) |
| **card height** | **208px** | 190–215 |
| **detail header** | **151px** | ≤220 |
| **latest release** | **50px strip** | 72–88 |
| **collapsed release row** | **50px** | 56–64 |
| **largest gap between row items** | **8px** (was 944) | — |
| release notes | 668px (72ch) | ≤80ch |

Grid 3 / 2 / 1 at ≥900 / 640–899 / <640, verified at 2048, 1440, 1024, 768, 390.
No horizontal overflow at any viewport, on either page, in either theme.

**Category chip row** (12 chips: "All" + 11 categories) — scrolls as one 28px
row below 900px, wraps to two rows (62px) at and above it:

| Viewport | 390 | 640 | 768 | 899 | 900 | 1440 |
|---|---|---|---|---|---|---|
| visual rows | 1 | 1 | 1 | 1 | 2 | 2 |
| row height | 28 | 28 | 28 | 28 | 62 | 62 |
| scrolls | ✓ | ✓ | ✓ | ✓ | — | — |

It wraps at `cards` (900px), not `sm`. Wrapping at `sm` put three rows — 96px of
chips — above the results across the whole 640–899 band, because 11 labels are
much wider than the 8 they replaced. Page overflow is 0 at every width.

### Why two container widths

A grid page and a reading page want different widths, and they used to share one
at 1360px. That left a release row spreading a version, a badge, a date and two
links across 1312px with **944px empty — 72% of the row**. Narrowing the column
halved it; removing the left/right split closed it entirely. The 517px that
remains is trailing margin at the end of the row, not a hole between two
islands.

`t3.gg/sponsors` was the reference. Two things it does are worth noting: its
content column is 1104px with 360px cards, which is where the widths above come
from — but its grid stays at exactly three 360px columns even at 2048, wasting
the extra width. That part is deliberately not copied.

## Accessibility

**0 axe wcag2a+aa violations** on home, category and 404 in **both** themes,
with no console output or page errors.

**The tool page is the exception**: axe-core 4.12.1 reports 1 serious
`nested-interactive` violation (14 nodes) — the release row nests a control
inside its `<summary>`. It reproduces identically on production, so it predates
the taxonomy change and is not caused by it. This section previously claimed
zero across all four routes; that claim was wrong for the tool page. Tracked
separately — fixing it means restructuring the disclosure row, not a doc edit.

Behavioural checks that axe cannot make:

- Whole-card navigation: card centre navigates, the favourite toggles without
  navigating, the category badge goes to its category.
- Release row: clicking Compare does not toggle the disclosure, clicking the row
  does, `aria-expanded` tracks it.
- Scripts blocked: home renders all 68 cards; the tool page renders all 7 note
  blocks with the first open. This is why native `<details>` stays instead of
  Radix Collapsible, which unmounts closed content.
- Reduced motion: transitions collapse to `1e-05s`, `scroll-behavior` → `auto`.

## Contrast — measure by sampling pixels, not by parsing

`getComputedStyle()` returns `oklch()` for these tokens. Parsing that as RGB
produced exactly `1.00` for every pair — a clean-looking table of garbage. Real
values come from painting the colour to a 1×1 canvas and reading the pixel back.

| Token | Light | Dark |
|---|---|---|
| body foreground | 15.98 | 17.40 |
| fg-muted | 6.52 | 8.98 |
| fg-subtle | 5.04 | 5.73 |
| category badges, all 11 hues | 6.07–6.99 | 9.36–9.84 |

`fg-subtle` was 4.29 in light — under the 4.5 AA floor, on the tier that carries
12px metadata. **axe never reported it**, because it cannot resolve `oklch()`.

## agent-browser gotchas

All four produce confident wrong readings rather than errors, which is exactly
what makes them worth writing down.

1. **Viewport does not survive a navigation.** Re-set it after every `open` and
   assert `innerWidth` before trusting a capture.
2. **`set viewport` can silently no-op** after `set device` / `set media`. Use one
   session per viewport. Skipping this produced two byte-identical screenshots
   labelled as different viewports.
3. **`set media` does not combine values.** `set media "light reduced-motion"`
   applies the colour scheme but leaves the reduced-motion query `false`. Set
   reduced-motion on its own — this briefly looked like broken CSS.
4. **A stale `vite preview` keeps the port and serves a deleted `dist/`.** After
   `rm -rf dist && pnpm build`, an older preview still bound to 4173 answers
   `200` on HTML while its hashed CSS 404s — so the page renders *unstyled* and
   every measurement is silently wrong. It produced two full rounds of garbage
   here: chips 21px instead of 28, wrapping where the design scrolls. `pkill`
   is not enough; free the port with `lsof -ti tcp:4173 | xargs kill -9`, then
   **block until the CSS asset itself returns 200** before measuring.
   Cheap insurance: assert a known-styled property inside the eval — a chip
   whose `border-radius` is `0px` means Tailwind never loaded, so return early
   instead of reporting numbers.

And a fifth, not specific to the tool: **parse HTML with a real parser.**
`grep`/`sed` fail silently on these single-line documents and produced two false
findings in this project — an "empty 404 body" and a "missing canonical tag",
both of which were fine.

## Markdown corpus

Release-note syntax inventory and the accepted bare-URL regression live in
`../markdown/corpus-report.md`, regenerated by `pnpm audit:markdown`.
