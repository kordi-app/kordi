---
name: Lovable Cream System
source: https://getdesign.md/lovable/design-md (adapted)
colors:
  canvas: '#f7f4ed'
  surface: '#f7f4ed'
  surface-container-lowest: '#fcfbf8'
  surface-container-low: '#f4f1e9'
  surface-container: '#efebe2'
  surface-container-high: '#eceae4'
  surface-container-highest: '#e4e0d6'
  on-surface: '#2b241e'
  on-surface-variant: '#6b6259'
  on-secondary-container: '#6b6259'
  outline: '#8c8478'
  outline-variant: '#eceae4'
  primary: '#332b24'
  on-primary: '#fcfbf8'
  brand: '#332b24'
  brand-hover: 'rgba(43, 36, 30, 0.82)'
  brand-accent: '#6b6259'
  secondary: '#efebe2'
  on-secondary: 'rgba(43, 36, 30, 0.82)'
  accent: '#efebe2'
  ring: 'rgba(59, 130, 246, 0.5)'
  success: '#2f7a55'
  warning: '#b26a00'
  error: '#b3372c'
  destructive: '#b3372c'
typography:
  family: Pretendard Variable
  headline-xl:
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.025em
  headline-lg:
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.02em
  headline-md:
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  table-cell:
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  status-label:
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.375rem
  md: 0.5rem
  lg: 0.75rem
  xl: 1rem
  full: 9999px
---

# Lovable Cream System — Kordi Design

Adapted from the Lovable design analysis at getdesign.md. Two deliberate
departures from the source are documented in §2 and §3 — read those before
assuming a rule carried over verbatim.

## 1. Brand & Style

kordi is a place to sit down and practice. The system is **warm, analog, and
unhurried** — closer to a well-made notebook than to a dashboard. The page sits
on a creamy parchment ground (`#f7f4ed`) chosen specifically to step away from
the cold-white convention of developer tools, and near-black text (`#2b241e`)
rather than pure black keeps the contrast easy over long sessions.

Ornament is carried by **warmth and space**, not by chrome. Containment comes
from a soft border, never a drop shadow. Depth is shallow on purpose: the only
real dimensional move in the system is the inset shadow on dark buttons, which
reads as pressed *into* the page rather than floating above it.

Light mode is the only theme. The source system has no dark variant, and kordi
ships no theme toggle — `.dark` is kept at light values so nothing breaks.

## 2. Colors

### The grays are one color — and it is not neutral

Every gray is `#2b241e` at some opacity. Note the hue: R−B = +13. A perfectly
neutral dark (R=G=B, as the source system's `#1c1c1c`) reads as harsh black
against warm cream because the two disagree on temperature. The ink is warmed to
match the paper. Large solid masses use `#332b24`, a step lighter and warmer
still, so a filled button or the logo plate does not land as a black slab. This is the system's structural idea and
the reason it stays coherent: there are no arbitrary gray hexes to drift apart.

| Token | Value | Use |
|---|---|---|
| Ink 100% | `#2b241e` | Primary text, headings |
| Ink fill | `#332b24` | Large solid masses: buttons, active nav, logo plate |
| Charcoal 82% | `rgba(43,36,30,0.82)` | Body copy, secondary text |
| Charcoal 40% | `rgba(43,36,30,0.4)` | Interactive borders, input outlines |
| Charcoal 4% | `#efebe2` (flattened) | Hover backgrounds, micro-tints |
| Charcoal 3% | `#f4f1e9` (flattened) | Barely-visible overlays |

Opacity values are flattened to opaque cream equivalents where a token must
composite predictably over varying backgrounds; where it sits directly on the
canvas, the `rgba()` form is kept.

### Surfaces — warm cream ladder

- `surface` `#f7f4ed` — page background. **Never pure white.**
- `surface-container-lowest` `#fcfbf8` — popovers, the lightest lift
- `surface-container-low` `#f4f1e9` — sidebar, muted fills
- `surface-container` `#efebe2` — row hover, secondary fills
- `surface-container-high` `#eceae4` — the signature warm divider line
- `surface-container-highest` `#e4e0d6` — deepest tonal panel

### Borders

- `outline-variant` `#eceae4` — passive: cards, dividers, images
- `outline` `#8c8478` / `rgba(43,36,30,0.4)` — interactive: inputs, outlined buttons

Do not mix the two. Passive containment and interactive affordance are different
signals in this system.

### Semantic accents — a deliberate departure

Lovable's rule is *"don't introduce saturated accent colors."* kordi breaks it,
narrowly and on purpose: the quiz is a timed correct/incorrect loop, and a player
must read the verdict instantly without parsing text. So these three keep real
chroma — but muted and earthy, tuned to sit on cream rather than shout over it.

- `success` `#2f7a55` — correct answer, mastered status, online
- `warning` `#b26a00` — rankings, top-3, held states
- `error` `#b3372c` — wrong answer, destructive actions, recording

Nothing else in the UI may introduce chroma. These three are the entire budget.

## 3. Typography

**Pretendard Variable** is the single typeface, loaded from jsDelivr as a dynamic
subset. It covers Latin and Hangul in one family, so Korean and English never
mismatch in weight or x-height mid-sentence.

This is the second departure from the source. Lovable's system is built on
**Camera Plain Variable**, a proprietary face that is not publicly available and
that the source calls its "secret weapon." Pretendard is a cleaner, more neutral
face — less humanist warmth than Camera Plain. In this adaptation the warmth is
carried by the **palette and spacing** instead, not the letterforms.

### Rules

- **Maximum weight is 600.** No bold (700+) anywhere. Emphasis comes from size,
  space, and color — never from heavier type.
- **Two functional weights:** 400 for reading and UI, 600 for headings and labels.
- **Display runs tight.** Negative tracking at large sizes (-0.02em to -0.025em).
- **Labels run wide.** Positive tracking (0.05em) and uppercase at small sizes.
- **Numbers are tabular.** `font-feature-settings: "tnum"` is set on `body` so
  scores, timers, and BPM don't jitter as they update.

### Scale

| Role | Size / LH / Weight | Tracking | Use |
|------|-------------------|----------|-----|
| `text-headline-xl` | 36/40/600 | -0.025em | Page hero, profile name |
| `text-headline-lg` | 24/30/600 | -0.02em | Section headers |
| `text-headline-md` | 18/28/600 | — | Card titles, stat values |
| `text-body-lg` | 16/24/400 | — | Intro copy |
| `text-body-md` | 14/20/400 | — | Default body, row text |
| `text-table-cell` | 13/18/400 | — | Dense table rows |
| `text-label-caps` | 12/16/600 | 0.05em, UPPER | Column headers, metadata |
| `text-status-label` | 11/12/600 | 0.05em, UPPER | Live indicators |

## 4. Layout & Spacing

Base unit **8px**. The scale expands generously at the top end — section
boundaries want 80px+ of vertical room. On a warm cream ground, large empty
expanses read as cozy rather than barren, which is what makes the generosity
affordable here.

- Content: 8 · 12 · 16 · 24 · 32 · 40px
- Section: 56 · 80 · 96 · 128px
- Rhythm: tight inside cards (12–24px), wide between sections. The alternation
  is the point — it gives the page a reading cadence.
- Max content width ≈ 1200px, centered.

> Not yet tokenized. Spacing lives in Tailwind utilities at call sites; the
> values above are the convention, not enforced variables. The previous DESIGN.md
> listed `spacing-*` and `container-max` tokens that were never implemented in
> `globals.css` — they are not reintroduced here.

## 5. Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | No shadow, cream ground | Page surface, most content |
| 1 — Bordered | `1px solid #eceae4` | Cards, images, dividers |
| 2 — Inset | `btn-inset` utility | Dark buttons, primary actions |
| 3 — Focus | `rgba(0,0,0,0.1) 0 4px 12px` | Active / focus, floating panels |
| Ring | `rgba(59,130,246,0.5)` 2px | Keyboard focus on inputs |

**Borders are the containment mechanism, not shadows.** The one signature move is
the multi-layer inset on dark buttons — a white hairline along the top edge, a
dark ring, and a soft drop:

```css
box-shadow:
  rgba(255,255,255,0.2) 0 0.5px 0 0 inset,
  rgba(0,0,0,0.2)       0 0 0 0.5px inset,
  rgba(0,0,0,0.05)      0 1px 2px 0;
```

Available as the `btn-inset` utility. Active state drops opacity to 0.8.

## 6. Shapes

| Token | Value | Use |
|---|---|---|
| `rounded-sm` | 4px | Micro elements |
| `rounded` | 6px | **Default** — buttons, inputs, nav |
| `rounded-md` | 8px | Compact cards |
| `rounded-lg` | 12px | Standard cards, image containers |
| `rounded-xl` | 16px | Large containers |
| `rounded-full` | 9999px | Action pills and icon buttons **only** |

Full-pill is reserved. Do not apply it to rectangular text buttons.

## 7. Component Patterns

### Cards
`card-flat` — cream fill + `#eceae4` border + `rounded`. The default container.
`card-elevated` — adds the soft diffused shadow. Only for genuinely floating
surfaces (dropdowns, session log panel).

### Buttons
- Primary: `btn-inset` — charcoal fill, off-white text, inset shadow.
- Secondary: `#efebe2` fill, no border.
- Outlined: transparent fill, `rgba(43,36,30,0.4)` border.
- Ghost: transparent, hover to `#efebe2`.
- Active state on all: `opacity: 0.8`.

### Inputs
Cream fill, `rgba(43,36,30,0.4)` border, `rounded`. Focus uses the soft blue ring
plus the diffused shadow — **never a sharp outline**.

### Status pills
`pill-success` / `pill-warning` / `pill-error` / `pill-neutral` — earthy tint at
~10–12% over cream, full-pill radius, 11px uppercase at weight 600.

### Tables
`table-header` for column headers (uppercase, tracked, muted). `table-row-hover`
tints to `surface-container`. Numeric columns right-aligned, always tabular.

## 8. Kordi-Specific Patterns

### Piano keyboard
The keys are the one surface where the cream system yields to the instrument —
but the hues are warmed to match it. Both are defined inline in
`shared/ui/piano-key.tsx` as OKLCH, not as tokens:

- White keys: `oklch(0.97 0.012 85)` — warm off-white, not pure white
- Black keys: `oklch(0.22 0.012 75)` — warm charcoal
- Ringing (pedal-sustained): hue 150 at low chroma
- Active (pressed): hue 150 at higher chroma

Hue 150 green is a **functional signal** — "this note is sounding" — and is
exempt from the accent budget in §2.

### Chord display (piano, quiz)
The single largest type on any screen. Breaks the weight-600 cap: the detected
chord name is the app's hero element and needs the mass. Keep it charcoal on
cream, tabular, with the alternate reading in the caption slot beneath.

### Stat card
`stat-card` — `surface-container` fill with a 4px charcoal left border.

### Ranking card
`ranking-card` — cream fill, `#eceae4` border, 2px `warning` top border for
featured entries.

### Instrumentation readout
Small all-caps metadata rows (`LATENCY: 12ms · SAMPLE RATE: 48kHz`) using
`label-caps` at `on-surface-variant`. Carried over from the previous system — it
survives the reskin because it reads as quiet annotation, not as chrome.

## 9. FSD Layer Mapping

| Pattern | Layer |
|---------|-------|
| Button, Input, Badge, Avatar, Tabs primitives | `shared/ui/*` |
| `card-flat`, `stat-card`, `pill-*`, `table-header` utilities | `shared` (CSS only in globals.css) |
| AppHeader, AppSidebar, AppBottomNav shell | `widgets/app-header`, `widgets/app-sidebar`, `widgets/app-bottom-nav` |
| Piano keyboard, chord prompt, quiz score, metronome | `widgets/piano-keyboard`, `widgets/chord-quiz-game/*` |
| Ranking table with medal icons | `widgets/ranking-board` |
| Friends table, Pending invites list | `widgets/friends-panel` |
| Consistency grid, Mascot card, Session log | `widgets/` (new, composed in `views/piano`, `views/me`) |
| Page compositions | `views/{piano,me,friends,ranking,chord-practice,chord-quiz,login}` |
| Routes (thin shells) | `app/[locale]/(routes)/*` |
## 10. Do's and Don'ts

### Do
- Use the cream `#f7f4ed` as the page foundation — the warmth is the brand.
- Derive every gray from `#2b241e` at varying opacity for tonal unity.
- Use `#eceae4` borders instead of shadows to contain cards.
- Use `btn-inset` on primary buttons for the tactile pressed-in feel.
- Keep the weight system narrow: 400 body, 600 headings.
- Apply `opacity: 0.8` on active states for responsive feedback.
- Let sections breathe — 80px+ at boundaries.
- Keep numerals tabular on every changing value.

### Don't
- **Don't use pure white (`#ffffff`) as a background.** The cream is deliberate.
- Don't use heavy drop shadows for cards — borders do the containment.
- Don't use weight 700+. 600 is the ceiling (chord display excepted, §8).
- Don't introduce chroma beyond `success` / `warning` / `error`.
- Don't apply `rounded-full` to rectangular text buttons — pills are for
  icon and action toggles.
- Don't use sharp focus outlines — focus is a soft shadow plus the blue ring.
- Don't mix border styles: `#eceae4` passive, `rgba(43,36,30,0.4)` interactive.
- Don't add letter-spacing to headings — display type runs tight here.
- Don't use `neon-*` or `glass-*` utilities — legacy shims, slated for removal.
