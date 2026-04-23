---
name: Precision Analytical System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#131b2e'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fd'
  on-secondary-container: '#57657b'
  tertiary: '#131b2e'
  on-tertiary: '#ffffff'
  error: '#e11d48'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  success: '#10b981'
  warning: '#f59e0b'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  table-cell:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  status-label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 12px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-max: 1440px
  gutter: 24px
---

# Precision Analytical System — Kordi Design

## 1. Brand & Style

Kordi's visual system is engineered for a **data-dense, pro-tool** music experience. Practice sessions, chord quizzes, rankings, and social activity all produce signal — the UI's job is to surface that signal quickly and without ornamentation. The brand personality is **authoritative yet unobtrusive**: organized, predictable, exceptionally polished.

The aesthetic is **Corporate / Modern** with a strong functional minimalism. It prioritizes a high ratio of data-to-ink, using tonal shifts instead of heavy ornamentation to define structure. The UI should evoke "quiet intelligence" — the feel of a musician's digital workstation, not a gamified arcade.

Light mode is the primary (and currently only) theme. The `.dark` CSS block is retained at light values as a placeholder for a future true-dark variant.

## 2. Colors

The palette is anchored by **Deep Navy** and **Slate Grey** to establish a bedrock of professional stability.

### Surfaces
- `surface` `#f7f9fb` — page background
- `surface-container-lowest` `#ffffff` — cards, highest contrast
- `surface-container-low` `#f2f4f6` — muted fills, sidebar
- `surface-container` `#eceef0` — stat cards, trending groups, row hover
- `surface-container-high` `#e6e8ea` — deeper tonal panels
- `surface-container-highest` `#e0e3e5` — tonal max, chart backgrounds

### Primary / Structural
- `primary` `#131b2e` — deep navy. Text, primary buttons, logo, focused borders, active nav states.
- `brand-hover` `#3f465c` — hover tone for primary.
- `brand-accent` `#565e74` — softer slate for secondary data labels.
- `secondary` `#515f74`, `secondary-container` `#d5e3fd` — soft-blue tonal accent.

### On / Text
- `on-surface` `#191c1e` — default text
- `on-surface-variant` `#45464d` — secondary text, table labels
- `on-secondary-container` `#57657b` — muted captions

### Borders
- `outline` `#76777d` — primary border (rare)
- `outline-variant` `#c6c6cd` — default border for all cards/inputs/tables
- Sidebar border: `#e0e3e5`

### Semantic accents (used sparingly)
- `success` `#10b981` (Emerald) — positive growth, mastered status, upward trends, online indicators.
- `warning` `#f59e0b` (Gold) — rankings, high-value highlights, top-3 medals.
- `error` `#e11d48` (Rose) — destructive actions, critical alerts, recording states.

## 3. Typography

**Inter** is the single typeface. It's already loaded in the project via `https://rsms.me/inter/inter.css` and referenced in the Tailwind `--font-sans` stack.

Use **tabular numerals** globally (`font-feature-settings: "tnum", "cv11"` is set on `body`) so BPM, scores, timers, and table data stay aligned.

### Scale (also registered as Tailwind `text-*` utilities)

| Role | Size / LH / Weight | Tracking | Use |
|------|-------------------|----------|-----|
| `text-headline-xl` | 36/44/700 | -0.02em | Page hero metric, profile name |
| `text-headline-lg` | 24/32/600 | -0.01em | Section headers |
| `text-headline-md` | 18/28/600 | — | Card titles, stat values |
| `text-body-lg` | 16/24/400 | — | Intro copy, key descriptions |
| `text-body-md` | 14/20/400 | — | Default body, row text |
| `text-table-cell` | 13/18/400 | — | Dense table rows |
| `text-label-caps` | 12/16/600 | 0.05em, UPPER | Column headers, category labels |
| `text-status-label` | 11/12/700 | 0.05em, UPPER | Live indicators (RECORDING, INPUT ACTIVE) |

### Principles
- Headlines are **assertive**: tight negative tracking at large sizes (-0.02em / -0.01em).
- Labels are **expanded**: positive tracking (0.05em) and UPPERCASE for visual calm at small sizes.
- Data numbers always `tabular-nums` so widths don't jitter on update.
- **Three functional weights**: 400 (read), 600 (emphasize / headings / labels), 700 (status / numeric impact).

## 4. Layout & Spacing

12-column fluid grid, 24px gutters, 4px base unit.

### Spacing scale (Tailwind utilities)
- `spacing-xs` 4px · `spacing-sm` 8px · `spacing-md` 16px · `spacing-lg` 24px · `spacing-xl` 40px · `spacing-gutter` 24px
- `max-w-container-max` → 1440px

### Layout patterns
- **Shell**: fixed top bar (64px) + left sidebar (256px, md+) + main content + bottom nav (md-).
- **Page margin**: 24px on desktop, 16px on mobile.
- **Dashboard gutters**: 24px between bento widgets.
- **Data tables**: 12–16px cell padding (sm–md) to maximize rows per screen without losing row distinction.
- **Vertical rhythm**: 8 → 16 → 24 → 40 → 64.

## 5. Elevation & Depth

Hierarchy via **tonal layers** and **low-contrast outlines**, not aggressive shadows.

| Level | Treatment | Use |
|-------|-----------|-----|
| Base | `bg-background` (#f7f9fb) | Page canvas |
| Surface | `bg-card` (#fff) + `border-outline-variant` | Cards, tables, inputs |
| Muted | `bg-muted` (#f2f4f6) | Table headers, hover baseline, sidebar |
| Container | `bg-secondary` (#eceef0) | Stat cards, row hover, quiet panels |
| Elevated | `card-elevated` (`shadow 0 4px 20px rgba(19,27,46,0.06)`) | Dropdowns, modals, toasts |
| Focus | `ring-1 ring-primary/20` | Input focus, active selection |

Shadows are **ambient**: very diffused (20px blur), low opacity (5–10%), slightly tinted with primary navy. Reserved for truly floating elements.

## 6. Shapes

**Soft, grid-aligned** — 4px default, 8px for larger containers.

- `rounded-sm` 2px — pills in tables, inline badges
- `rounded` (default) 4px — buttons, inputs, standard cards
- `rounded-md` 6px — small panels
- `rounded-lg` 8px — featured cards, dashboard sections
- `rounded-xl` 12px — modals, sheets
- `rounded-full` 9999px — status pills, avatars

Piano keys use `rounded-b-lg` on the bottom edges only while keeping the top flush where they meet the instrument housing.

## 7. Component Patterns

### Data Tables
The system's core surface. Header row uses `table-header` utility (`bg-muted` + 12px uppercase + 0.05em tracking). Row hover: `hover:bg-secondary` (#eceef0). Borders horizontal-only. Numeric columns right-aligned with `tabular-nums`.

### Status Pills
Low-opacity fill + high-contrast text. Preset utilities: `pill-success` (emerald), `pill-warning` (gold), `pill-error` (rose), `pill-neutral`. 11px, 700 weight, UPPERCASE, full-round.

### Cards
Flat by default: `card-flat` (white bg + 1px outline-variant + 4px radius). Elevated when floating: `card-elevated` (+ambient shadow).

**Ranking Card** (featured entries): `ranking-card` — adds 2px gold top border to signify importance.

### Stat Card
`stat-card` utility — `bg-secondary` + `border-l-4 border-primary` + `px-4 py-2`. Pattern: small UPPERCASE label above a large numeric value (`text-headline-md` or `text-headline-lg`). Used in profile bento, dashboards, quiz results.

### Buttons
- **Primary**: `bg-primary text-primary-foreground` — solid navy, white text.
- **Secondary (ghost)**: `border border-outline-variant text-on-surface hover:bg-muted` — thin border, slate text.
- **Destructive**: `bg-destructive text-white`.
- **Utility (row action)**: no border, label only (`CHALLENGE`, `MESSAGE`). Label caps style.
- Hover: slight opacity shift (`hover:opacity-90`) on primary, bg shift on ghost.

### Inputs
1px `outline-variant` border, 4px radius. Focus: border shifts to `primary` + `ring-1 ring-primary/20`. Labels sit **above** the field in `text-body-md font-semibold` — no placeholder-as-label.

### Navigation
**Top bar**: white bg, `border-b outline-variant`, 64px tall. Logo wordmark in `text-2xl font-black uppercase tracking-tighter`. Nav links `text-sm font-medium text-muted-foreground`; active link adds `border-b-2 border-primary text-foreground font-bold`.

**Sidebar** (md+): `bg-muted` panel, 256px wide. Nav items: 12px padding, rounded-md, `text-sm font-medium`. Active item: `bg-primary text-primary-foreground scale-[0.98] shadow-sm`.

**Bottom nav** (md-): white bg, `border-t outline-variant`. 4 tabs, icon + `text-[10px] font-bold uppercase` label.

## 8. Kordi-Specific Patterns

### Current Note Card (Piano)
Centered card `card-flat` + large note name `text-6xl font-black tracking-tighter` + status row (emerald dot `animate-pulse` + `INPUT ACTIVE` status label).

### Consistency Grid (Profile)
52-column CSS grid, 2px gaps, cells `consistency-cell` with 4 tonal levels:
- `bg-secondary` (empty/low)
- `bg-slate-300`
- `bg-slate-500`
- `bg-primary` (peak)

Legend row: "Less" → swatches → "More" in `label-caps`.

### Session Log (Piano, right-floating panel)
`card-flat` with header strip (`bg-secondary` + label-caps title + small history icon). Rows: `font-body-md font-bold` chord name + right-aligned `text-[10px] text-on-secondary-container` timestamp. Subtle row hover.

### Recording Card
`card-flat` + `border-l-4 border-l-destructive`. Red pulse dot + `status-label text-destructive`. Timer `text-2xl font-bold tabular-nums`. Secondary row shows filename in `label-caps text-on-surface-variant`. Pause/stop buttons in a 2-col grid with ghost styling.

### Mascot Card (Profile)
Full-bleed `bg-primary text-primary-foreground`. Section headline, Customize ghost button (`border border-white/30 hover:bg-white hover:text-primary`), large mascot illustration, Evolution Rank progress bar (`bg-white/20` track, `bg-white` fill).

### Piano Keyboard
Container: `bg-slate-900 pt-8 pb-4 px-gutter` (dark inset breaks the bright page). Keys:
- White: `bg-white border-x border-slate-300 rounded-b-lg shadow-[inset_0_-8px_0_#f1f5f9]`
- Black: `bg-slate-900 rounded-b shadow-[inset_0_-4px_0_#000]`
- Active white: `bg-slate-100 ring-4 ring-inset ring-primary/20 translate-y-1` + remove base shadow
- Octave Up / Down buttons: `card-flat` pill with `label-caps` text.

### Footer Stats (Piano)
Row of `text-[10px] label-caps text-on-surface-variant`:
`LATENCY: 12ms · SAMPLE RATE: 48kHz · POWERED BY KORDI AUDIO ENGINE`

Sprinkle this "instrumentation readout" pattern on other pages too (`ranking: UPDATED 2s AGO`, `quiz: ACCURACY 87.5%`) — it's a signature of the system.

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
- Use tabular numerals on every numeric display.
- Apply `label-caps` generously for any metadata smaller than body text.
- Prefer tonal differences over shadows for hierarchy.
- Reserve emerald / gold / rose for their exact semantic roles.
- Right-align numeric columns in tables.
- Use ghost buttons for row-level actions (MESSAGE, CHALLENGE, FOLLOW).

### Don't
- Don't introduce chromatic brand colors beyond navy + slate + the three accents.
- Don't use `neon-*` or `glass-*` utilities — they're legacy shims and will be removed.
- Don't use `text-brand-accent` for heading emphasis — use `text-primary`.
- Don't use drop shadows for card elevation on the page canvas; prefer outline + (only if truly floating) ambient shadow.
- Don't use rounded-full or rounded-xl for small data-table cells.
- Don't set font-feature-settings "cv01"/"ss03" — those were Linear's Inter; we use `tnum` instead.
