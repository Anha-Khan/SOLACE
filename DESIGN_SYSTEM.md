# Design System — Between

Source of truth for the landing page. All tokens live in `app/flowstate.css`, which is imported
after `app/globals.css` so it wins the cascade.

`app/globals.css` is a legacy pre-compiled Tailwind v4 artifact and is **not** processed at
build time. Do not add new utility classes expecting them to work — the landing page uses only
the hand-authored `fs-*` classes.

---

## Thesis

> **The dark fluid is the stage. The botanical system is the texture and the voice.**

The site is a dark, immersive, full-bleed landing page whose structure, accents and character
come from Between's original warm, botanical system. Nothing is pasted from the old light
theme; every element is translated.

---

## Colour

### Core (night — the only theme)

| Token | Value | Use |
| --- | --- | --- |
| `--hero-base` | `#04050c` | Page + hero background, behind the shader |
| `--heading` | `#eef0f6` | Headings, bright text |
| `--body-muted` | `#b9becf` | Body copy, nav links, footer |
| `--on-media` | `#ffffff` | Wordmark and icons sitting on the shader |
| `--action-inverse` | `#ffffff` | Primary pill background |
| `--action-inverse-fg` | `#2f2f33` | Text on the primary pill |
| `--glass-fill` | `rgba(255,255,255,.08)` | Glass pills, bars, tiles |
| `--glass-border` | `rgba(255,255,255,.16)` | Glass edges |
| `--hairline` | `rgba(255,255,255,.14)` | Rules and dividers |
| `--accent` | `#e0a48d` | Active states, call buttons, step numerals |
| `--scrim` / `--scrim-strong` / `--scrim-soft` | `rgba(4,5,12,.46/.68/.12)` | Radial scrim over the shader |

### Botanical accents (carried from the original system)

| Token | Value | Use |
| --- | --- | --- |
| `--bot-sage` | `#7f9d8b` | Structure — step numeral strokes, garden grid, creature strokes |
| `--bot-sage-deep` | `#22564d` | Reserved for light surfaces |
| `--bot-clay` | `#a86650` | Secondary emphasis |
| `--bot-peach` | `#dca58e` | Active step numerals |
| `--bot-lavender` | `#afa7be` | Strike-through on the "what this is not" list |
| `--bot-butter` | `#e9dfbd` | Warm highlight |
| `--bot-leaf` | `#c3d6a9` | Joyful creature state, leaves |
| `--bot-line` | `rgba(127,157,139,.22)` | Botanical hairline |

### Layers (z-index)

| Layer | z | Element |
| --- | --- | --- |
| Shader | 0 | `.fs-canvas` (fixed, full viewport) |
| Scrim | 1 | `.fs-scrim` (fixed radial gradient) |
| Garden grid | 1 | `.fs-garden` (fixed 42px grid, ~5% sage) |
| Content | 3+ | `.fs-page` and everything inside it |

---

## Typography

| Role | Face | Weights | Notes |
| --- | --- | --- | --- |
| UI / body | Onest | 400, 500 | `--font-onest`, self-hosted via `next/font` |
| Display accent | Fraunces | 400, 500 | `--font-serif`, used on exactly two spots: `.fs-statement` and `.fs-closing p` |
| বাংলা | Noto Sans Bengali | 400, 500 | `--font-bn`, swapped in under `html[lang="bn"]` |

### Adaptive rem grid

```css
html { font-size: 16px; }
@media (max-width: 1920px) { html { font-size: 0.833333vw; } }
@media (max-width: 1440px) { html { font-size: 1.111111vw; } }
@media (max-width: 1024px) { html { font-size: 1.5625vw; } }
@media (max-width: 640px)  { html { font-size: min(4.444444vw, 16px); } }
```

Every size in the system is in `rem`, so the whole page scales proportionally.

### Scale

| Element | Base | ≥640 | ≥1024 |
| --- | --- | --- | --- |
| Hero `h1` | `2rem` | `3.5rem` | `5rem` |
| Hero sub | `1rem` | `1.1rem` | `1.2rem` |
| Band `h2` | `1.5rem` | `2rem` | `2.75rem` |
| Step numeral | `clamp(3.5rem, 11vw, 8rem)` | | |
| Statement | `clamp(2.25rem, 5.5vw, 4.5rem)` | | |
| Closing | `clamp(1.75rem, 5vw, 3.5rem)` | | |
| Crisis number | `clamp(2rem, 6.5vw, 5rem)` | | |
| Nav link | `0.95rem` | | |
| Body | `0.95–1.05rem` | | |

Bengali overrides: hero `1.7 / 2.9 / 3.9rem`, looser leading, tracking `0`.

---

## Spacing & layout

- `--gutter: clamp(1rem, 2.2vw, 2rem)` — the small professional margin on every edge. The
  hairline rules still run the full viewport width; only content sits on the gutter.
- Hero: `grid-template-rows: auto minmax(0,1fr) auto` — nav, centred column, footer.
- Bands: `.fs-row` full width, `border-top: 1px solid var(--hairline)`.
- Band body: `.fs-cols` — 12 columns; label `1 / span 4`, body `5 / -1`, hairline between.
- Stepper and tiles: 3 columns at ≥768px, each cell with a vertical hairline divider.
- Radius: `--fs-radius: 1.25rem` standard; the release panel uses the leaf radius
  `1.25rem 3rem 1.25rem 1.25rem`.
- Depth: soft blur for glass surfaces, hard offset (`7px 8px 0 rgba(0,0,0,.42)`) for the panel.

---

## Motion

| Token | Value |
| --- | --- |
| `--ease-entrance` | `cubic-bezier(0.2, 0, 0, 1)` |
| `--duration-fast` | `150ms` |
| Block reveals | 700ms fade + 1.25rem rise |
| Word reveals | heading 720ms / 26px, sub 600ms / 14px |
| Scroll reveals | 800ms, driven by `IntersectionObserver` with a 2s failsafe |
| Creature | 500ms settle on load, 3.8s leaf-breathe loop when joyful |

`prefers-reduced-motion: reduce` disables every reveal, the leaf animation and all transitions.

---

## Component vocabulary

| Class | Purpose |
| --- | --- |
| `.fs-page` | Page shell above the shader |
| `.fs-canvas` `.fs-scrim` `.fs-garden` | Background layers |
| `.fs-hero` `.fs-nav` `.fs-brand` `.fs-nav-links` `.fs-nav-link` `.fs-nav-right` | Hero chrome |
| `.fs-icon-btn` `.fs-pill` `.fs-outline` `.fs-text-link` `.fs-chip` | Controls |
| `.fs-center` `.fs-h1` `.fs-sub` `.fs-form-wrap` `.fs-form` `.fs-glass-bar` `.fs-input` `.fs-success` | Hero copy and form |
| `.fs-hero-creature` `.fs-companion` | The companion creature |
| `.fs-row` `.fs-row-head` `.fs-row-note` `.fs-cols` `.fs-col-label` `.fs-col-body` | Band structure |
| `.fs-split` `.fs-tag` `.fs-big` `.fs-strikes` | What this is / is not |
| `.fs-steps` `.fs-step` `.fs-step-num` `.fs-step-label` `.fs-step-detail` | Interactive stepper |
| `.fs-tiles` `.fs-tile` `.fs-glyph` `.fs-tile-title` `.fs-tile-detail` | Interactive safety tiles |
| `.fs-panel` `.fs-release-row` `.fs-release-icon` `.fs-release-name` `.fs-release-state` `.fs-pulse` | Release panel |
| `.fs-statement` | Giant display statement (Fraunces) |
| `.fs-spec-list` `.fs-spec-row` | Label / value rows |
| `.fs-crisis` `.fs-crisis-title` `.fs-crisis-number` `.fs-crisis-note` `.fs-call` | Crisis band |
| `.fs-closing` | Closing statement (Fraunces) |
| `.fs-reveal` `.fs-word` `.fs-scroll` | Animation hooks |

---

## The companion creature

`components/hero-companion.tsx` — the original Between creature, re-skinned for dark.

- States: `rest`, `calm`, `low`, `joyful`, each with its own eye and mouth paths.
- Driven by the page: `rest` → `calm` (a step is picked) → `low` (journal step) →
  `joyful` (waitlist joined).
- The face group translates toward the pointer, so the creature watches you move.
- Botanical colours: sage strokes, leaf-green joyful body, lavender low state.

---

## Accessibility

- Skip link to `#content`.
- `:focus-visible` — 2px ring, 3px offset, never animated.
- All interactive targets ≥ 44×44px.
- Steppers use `role="tablist"` + arrow keys; tiles use `aria-expanded`; the waitlist success is
  `role="status"`.
- The `lang` attribute tracks the active language.
- `prefers-reduced-motion` fully supported.

---

## Local storage

| Key | Value |
| --- | --- |
| `between.language` | `"en"` \| `"bn"` |
| `between.waitlist` | JSON array of email strings |

Both are read/written defensively — the UI works even when storage is blocked.
