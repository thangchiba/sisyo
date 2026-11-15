# g6-style tokens

Every colour, gradient and surface class of the style, light and dark. Type these values into the project's global
CSS (Tailwind v4: after `@import "tailwindcss";`) or its own token file. Keyframes and easings are in `motion.md`.

Names used here (`--c-*`, `surface-*`, `ink-*`, `gold`, `.g6-card`, `.led-line`, …) are the names the other files
refer to. A project may rename them (or map them onto its existing tone names), but then everywhere.

## 1. How the layers fit

```
variables     --c-gold-ink: #8a6211 (light) / #f6d58e (dark)       one set per theme, under :root
Tailwind      @theme inline { --color-ink-gold: var(--c-gold-ink) } a utility reads the variable where it is used
markup        text-ink-gold  bg-gold/12  ring-gold/40  bg-(image:--c-skylight)
tone scope    .tone-gold { --tone: #f2c76e; --tone-ink: var(--c-gold-ink) }  →  bg-tone/12 ring-tone/40 text-tone-ink
```

- **Light is the default; dark follows the device** unless the page sets `data-theme`. `[data-theme='light']` opts a
  subtree (or the whole page) out of dark, `[data-theme='dark']` forces dark.
- **`@theme inline`** (not plain `@theme`) for every colour that reads a `--c-*` variable: the utility then
  resolves the variable on the element it is used on, so a `data-theme` subtree re-themes everything inside it.
- **Tone fills, rings and glows are the same in both themes**; coloured TEXT and thin lines use the `ink-*` stop,
  which is deep gold on ivory (5.2–6.3:1) and the light itself on black.

The dark block is a custom variant used once, inside `:root`:

```css
@custom-variant theme-dark {
  @media (prefers-color-scheme: dark) { &:not([data-theme='light']) { @slot; } }
  &[data-theme='dark'], & [data-theme='dark'] { @slot; }
}
:root, [data-theme='light'] { color-scheme: light; /* light values of §2–§5 */ }
:root { @variant theme-dark { color-scheme: dark; /* dark values of §2–§5 */ } }
```

Do not use `theme-dark:` as a class on elements: it does not follow a theme picked with a toggle (`data-theme` on
`<html>`). Put per-theme values in `--c-*` variables instead and read them.

## 2. Surfaces and lines

| Variable | Tailwind colour | Light | Dark | Use |
|---|---|---|---|---|
| `--c-void` | `surface-void` | `#f7f3ec` | `#0b0906` | Page (`body` background) |
| `--c-base` | `surface-base` | `#fbf8f2` | `#100d09` | Header glass (at 75 % + blur) |
| `--c-surface` | `surface` | `#fffdf8` | `#17130d` | Cards, chips, bands (`bg-surface/55`) |
| `--c-raised` | `surface-2` | `#f4eee4` | `#1e1912` | Wells, hover, tile stages (`/70`) |
| `--c-shade` | `surface-3` | `#ebe3d5` | `#272017` | Tracks, the switch groove |
| `--c-line` | `line` | `#e6dccb` | `#31291d` | Hairlines |
| `--c-line-strong` | `line-strong` | `#d2c4a8` | `#463a28` | Outline buttons, hover borders |
| `--c-field` | `field` | `#fffdf8` | `#1e1912` | Inputs |

## 3. Ink (text)

| Variable | Tailwind colour | Light | Dark | Use |
|---|---|---|---|---|
| `--c-title` | `ink-title` | `#1c1710` | `#fbf3e2` | Headings, values |
| `--c-body` | `ink-body` | `#3b3327` | `#e3d8c3` | Body text (`body` colour) |
| `--c-soft` | `ink-soft` | `#5b5142` | `#bfb197` | Leads, notes |
| `--c-muted` | `muted` | `#6e6352` | `#9c8f76` | Secondary text; the floor for readable text |
| `--c-faint` | `faint` | `#b6aa95` | `#5a4f3c` | Decoration and disabled only, never text to read |
| `--c-primary` | `primary` | `#1c1710` | `#f6ecd6` | Strong neutral: selected tab, filled number |
| `--c-primary-hover` | — | `#3a3125` | `#e3d8c3` | Its hover |
| `--c-on-primary` | `on-primary` | `#fffaf0` | `#1c1710` | Text on `primary` |

## 4. Tones and their inks

Fills, rings and glows (the same in both themes, `@theme inline` literals):

| Tone | Tailwind colour | Value | Meaning |
|---|---|---|---|
| gold | `gold` | `#f2c76e` | Primary action, selected, done (the CTA key, success ticks) |
| champagne | `champagne` | `#ecd6a6` | Links, sharing, keyboard focus |
| bronze | `bronze` | `#e2a47c` | Profile / identity |
| rose | `rose` | `#f2b8a8` | Rare highlight |
| on-gold | `on-gold` | `#1a1307` | Text on any gold fill (white on gold fails) |

Ink stops (coloured text and thin lines; Tailwind `ink-<tone>` = `var(--c-<tone>-ink)`):

| Variable | Light (on ivory) | Dark (on black) |
|---|---|---|
| `--c-gold-ink` | `#8a6211` | `#f6d58e` |
| `--c-champagne-ink` | `#6e5526` | `#efdcb2` |
| `--c-bronze-ink` | `#97502d` | `#f0b994` |
| `--c-rose-ink` | `#a3413a` | `#f6c2b4` |
| `--c-amber-ink` | `#965400` | `#ffb23e` |
| `--c-coral-ink` | `#cc1a40` | `#ff5c7a` |
| `--c-sheen-ink` | `#b8862c` | `#fff1c9` |

`--c-sheen-ink` is the bright band of metallic gold text (large text only, 3.2:1 on ivory); it has no Tailwind
colour of its own, only `bg-gold-ink` (§6) reads it. Coral and amber exist as inks only; where a fill is needed (the
three dots of a drawn browser bar) use `#ff5c7a` and `#ffb23e` at 70 %.

Tone scopes pass a tone to a component without building class names. Map `--color-tone: var(--tone, #f2c76e)` and
`--color-tone-ink: var(--tone-ink, var(--c-gold-ink))` in `@theme inline`, then:

| Class | `--tone` | `--tone-ink` |
|---|---|---|
| `.tone-gold` | `#f2c76e` | `var(--c-gold-ink)` |
| `.tone-champagne` | `#ecd6a6` | `var(--c-champagne-ink)` |
| `.tone-bronze` | `#e2a47c` | `var(--c-bronze-ink)` |
| `.tone-rose` | `#f2b8a8` | `var(--c-rose-ink)` |

Inside a scope: icon tile `bg-tone/12 ring-1 ring-tone/40 ring-inset` (chips use `/15`), text `text-tone-ink`.

## 5. Depth, scrim and light

| Variable | Light | Dark |
|---|---|---|
| `--c-shadow-edge` (Tailwind `shadow-edge`) | `inset 0 1px 0 rgb(255 255 255 / .9), 0 1px 2px rgb(60 42 12 / .06), 0 12px 32px rgb(60 42 12 / .08)` | `inset 0 1px 0 rgb(255 240 210 / .06), 0 24px 60px rgb(0 0 0 / .4)` |
| `--c-shadow-float` (`shadow-float`) | `0 1px 2px rgb(60 42 12 / .06), 0 18px 48px rgb(60 42 12 / .14)` | `inset 0 1px 0 rgb(255 240 210 / .07), 0 24px 60px rgb(0 0 0 / .6)` |
| `--c-keycap-depth` | `#dccfb5` (a light key sits on a sand base) | `rgb(0 0 0 / .5)` |
| `--c-scrim` | `rgb(28 23 16 / .45)` | `rgb(11 9 6 / .72)` |
| `--c-lattice` | `rgb(184 134 44 / .16)` | `rgb(242 199 110 / .13)` |
| `--c-way-line` | `rgb(184 134 44 / .6)` | `rgb(242 199 110 / .45)` |
| `--c-way-light` | `#b07a1c` | `#fff3d1` |
| `--c-way-glow` | `rgb(184 134 44 / .7)` | `rgb(242 199 110 / .9)` |

`--c-way-*` are the lines of light that travel (tiles meeting at one card, `motion.md` §4). On ivory the moving light
must be DEEP gold with a glow: the pale cream that looks like an LED on black disappears on the light page.

Page backdrop `--c-backdrop` (three radial gradients, the page's only "lighting"):

| Layer | Light | Dark |
|---|---|---|
| Top glow | `radial-gradient(ellipse 80% 55% at 50% -8%, rgb(242 199 110 / .2), transparent 70%)` | same shape, `/ .14` |
| Top right | `radial-gradient(600px 380px at 92% 6%, rgb(236 214 166 / .22), transparent 70%)` | `at 92% 12%`, `/ .08` |
| Side | `radial-gradient(520px 360px at 4% 30%, rgb(226 164 124 / .08), transparent 70%)` | `at 6% 88%`, `/ .07` |

Hero skylight `--c-skylight` (read with `bg-(image:--c-skylight)`):
light `radial-gradient(55% 60% at 50% 0%, rgb(255 236 190 / .45), rgb(242 199 110 / .12) 45%, transparent 75%)`,
dark `radial-gradient(55% 60% at 50% 0%, rgb(242 199 110 / .24), rgb(242 199 110 / .06) 45%, transparent 75%)`.

## 6. Other theme values and gradient utilities

`@theme` (not inline): `--radius-control: 1rem`, `--radius-card: 1.5rem`, `--text-2xs: 0.625rem` with line height
`0.875rem`, `--shadow-glow-sm: 0 0 10px rgb(242 199 110 / .25)`, `--shadow-glow: 0 0 18px rgb(242 199 110 / .4)`.
Glow is a signal: the selected, current or primary thing only.

Gradients as `@utility` classes:

| Utility | Value | Use |
|---|---|---|
| `bg-cta` | `linear-gradient(150deg, #fff3d1 0%, #f2c76e 38%, #e2b45c 62%, #fff0c4 80%, #d4a24a 100%)` | The metallic gold key. With `bg-[length:200%_200%] animate-flow` light travels over it; only the one hero CTA of a page gets that. |
| `bg-foil` | `linear-gradient(120deg, #f6d58e 0%, #fff4d6 28%, #e2b45c 52%, #fff1c9 74%, #e2a47c 100%)` | Gold foil: brand marks, plan name and CTA on the dark plan card, highlight text on dark photos |
| `bg-gold-ink` | `linear-gradient(120deg, var(--c-gold-ink) 0%, var(--c-sheen-ink) 34%, var(--c-gold-ink) 58%, var(--c-sheen-ink) 80%, var(--c-bronze-ink) 100%)` | Metallic gold TEXT readable in both themes (with `text-gradient`) |
| `text-gradient` | `-webkit-background-clip: text; background-clip: text; color: transparent` | Turns a gradient background into text colour |
| `bg-sheen` | `linear-gradient(118deg, transparent 30%, rgb(255 255 255 / .35) 50%, transparent 70%)` | A light band over a surface |

Base layer: `body { background-color: var(--c-void); color: var(--c-body) }`,
`:focus-visible { outline: 2px solid var(--c-champagne-ink); outline-offset: 2px }`.

## 7. Surface classes

**`.g6-backdrop`**: one fixed layer behind the page, rendered once, static. `pointer-events: none; position: fixed;
inset: 0; z-index: -10; background: var(--c-backdrop)`. Its `::after` draws the triangle lattice of light that fades
downwards:

```css
.g6-backdrop::after {
  content: ''; position: absolute; inset: 0; opacity: .9;
  background-image:
    repeating-linear-gradient(0deg,   var(--c-lattice) 0 1px, transparent 1px 41.57px),
    repeating-linear-gradient(60deg,  var(--c-lattice) 0 1px, transparent 1px 41.57px),
    repeating-linear-gradient(120deg, var(--c-lattice) 0 1px, transparent 1px 41.57px);
  mask-image: linear-gradient(#000, transparent 60%);   /* + -webkit-mask-image */
}
```

**`.led-line`**: a strip of gold light, the same in both themes. Section band edges, above and below a marquee,
eyebrow dashes (`w-8`). `height: 1px; background: linear-gradient(90deg, transparent, rgb(242 199 110 / .85) 18%,
#fff3d1 50%, rgb(242 199 110 / .85) 82%, transparent); box-shadow: 0 0 10px rgb(242 199 110 / .5), 0 0 2px
rgb(255 243 209 / .8)`.

**`.g6-card`**: `position: relative; border-radius: var(--radius-card); border: 1px solid var(--c-line);
background-color: var(--c-surface); box-shadow: var(--c-shadow-edge)`.

**`.g6-glow`** (needs a `.tone-*` scope): a tinted top-right corner, `background-image: radial-gradient(240px 150px
at 100% 0%, color-mix(in srgb, var(--tone, #f2c76e) 14%, transparent), transparent 70%)`.

**`.g6-sweep`**: a ring of light turning around the one element a section points at; one per screen. The element
gets `position: relative; isolation: isolate` and the radius of its child; the ring is a masked conic gradient on
`::before` turned by an animated custom property:

```css
@property --g6-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
.g6-sweep::before {
  content: ''; position: absolute; inset: -3px; padding: 3px; border-radius: inherit; pointer-events: none;
  background: conic-gradient(from var(--g6-angle), #f2c76e, #ecd6a6, #e2a47c, rgb(242 199 110 / .15) 70%, #f2c76e);
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor;
  animation: g6-spin 6s linear infinite;
}
@keyframes g6-spin { to { --g6-angle: 360deg; } }
```

Wrap the card (`<div class="g6-sweep rounded-[1.75rem]"><div class="g6-card …">`), do not put the class on the card
itself: the card's own `overflow-hidden` would clip the ring.
