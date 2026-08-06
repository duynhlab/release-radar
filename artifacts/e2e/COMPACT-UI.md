# Compact Technical UI — measured result

Measured on `pnpm preview` (workerd) at the stated viewport, comparing against
the pre-redesign values recorded in `CANDIDATE.md`.

## Typography and controls

| | Before | After | Target |
|---|---|---|---|
| body | 16px | **14px** | 14 |
| page title | 24px / 700 | **22px / 600** | 22 / 600 |
| card title | 16px | **15px** | 15 |
| description | 14px | **14px** | 14 |
| badge | 12px | **11px** | 11 |
| section label | 14px | **11px uppercase** | 11 |
| filter chip | 12px, no height | **13px, h=28** | 13 |
| search / select | 40px | **36px** | 36 |
| button | 40px | **32px** | 32 |
| icon button | 40px | **32px visual, 40px hit** | 32 / 40 |

Type sizes are now eight named tiers chosen by role. Before, the same datum — a
release version — rendered at 16, 20, 18 and 12px in four files.

## Layout

| | Before | After | Target |
|---|---|---|---|
| header | 65px | **57px** | 56 |
| container | 1280px | **1360px** | 1320–1360 |
| **card height** | 249px | **208px** (67/68 in range) | 190–215 |
| chrome above grid | 341px | **310px** | reduce |
| cards visible @1440×900 | 8 | **8** | ≥8 |
| home page height | 5108px | **4397px** | — |
| **detail header** | 302px | **151px** | ≤220 |
| **latest release** | 134px card | **50px strip** | 72–88 |
| **collapsed release row** | 114px | **50px** | 56–64 |
| tool page height | 1026px | **900px** | — |

## Responsive

Grid 4 / 3 / 2 / 1 at ≥1280 / 900–1279 / 640–899 / <640, verified at 2048, 1440,
1024, 899, 768 and 390. **No horizontal overflow at any viewport**, on home or
detail, in either theme.

## Contrast — measured by sampling rendered pixels

`getComputedStyle()` returns `oklch()` for these tokens, so a naive RGB parse
produces garbage (it returned exactly 1.00 for everything, which is what gave it
away). Real values come from painting the colour to a 1×1 canvas and reading the
pixel back.

| Token | Light | Dark |
|---|---|---|
| body foreground | 15.98 | 17.40 |
| fg-muted | 6.52 | 8.98 |
| **fg-subtle** | **5.04** (was 4.29) | 5.73 |
| category badges, all 8 hues | 6.05–6.92 | 9.36–9.86 |
| stable channel | 6.38 | 9.49 |

**`fg-subtle` failed WCAG AA in light mode at 4.29:1** and carries 12px metadata
— relative times and release gap lines. Darkened from `oklch(0.57 …)` to
`oklch(0.53 …)`, now 5.04. **axe did not report this**, because it cannot resolve
`oklch()` colours; only direct measurement found it.

## Accessibility

- **0 axe wcag2a+aa violations** across home, tool, category and 404 — in **both**
  themes (8 combinations).
- No console output or page errors.
- Whole-card navigation via a stretched link: card centre navigates, the
  favourite toggles without navigating, the category badge goes to its category.
- Release row: clicking Compare does not toggle the disclosure, clicking the row
  does, and `aria-expanded` tracks it.
- Scripts blocked: the tool page still renders all 7 note blocks with the first
  open, so native `<details>` continues to earn its place over Radix Collapsible.
- Reduced motion: transitions collapse to `1e-05s` and `scroll-behavior` becomes
  `auto`.

## agent-browser gotchas — a third one, on top of the two already recorded

1. Viewport does not survive a navigation; re-set and assert `innerWidth` after
   every `open`.
2. `set viewport` can silently no-op after `set device`/`set media`; one session
   per viewport.
3. **`set media` does not combine values.** `set media "light reduced-motion"`
   leaves `matchMedia("(prefers-reduced-motion: reduce)").matches === false`
   while looking like it worked — it reports no error and the colour scheme does
   apply. Set reduced-motion on its own. This briefly looked like the CSS was
   broken when it was fine.
