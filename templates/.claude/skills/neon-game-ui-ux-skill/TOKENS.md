# Tokens

Every value of the neon game UI: what it is, what it is for, and how it reaches the markup. The numbers on this page
are the system; type them into the project's own token file, theme config and base stylesheet. Do not approximate
them: the contrast figures in `MOTION-A11Y.md` were measured on exactly these values.

Names used here (`--c-*`, `surface-*`, `ink-*`, `neon-*`, `.neon-card`, `ease-glide`, ...) are the names the other
guides refer to. A project may rename them, but then it renames them everywhere.

## 1. How the layers fit

```
token file      --c-lime: 184 255 61                      RGB CHANNELS, one set per theme
Tailwind theme  neon.lime = rgb(var(--c-lime) / <alpha-value>)
markup          bg-neon-lime/10  ring-neon-lime/50  text-neon-ink-lime
tone scope      .tone-lime { --tone: var(--c-lime); --tone-ink: var(--c-lime-ink) }
component       shadow-[0_0_16px_rgb(var(--tone)/.28)]  text-[rgb(var(--tone-ink))]
```

Three files carry it:

1. **A token stylesheet**: CSS custom properties under `:root, [data-theme='dark']` (the default) and a second block
   under `[data-theme='light']` that overrides only what differs. Each block also sets `color-scheme` (`dark` /
   `light`); the icon gradients depend on it (ICONS.md §2).
2. **The Tailwind theme** (`theme.extend`, Tailwind 3.4): colours mapped from the variables, plus fonts, sizes, radii,
   shadows, gradients, keyframes, animations and easings from the tables below.
   `darkMode: ['class', '[data-theme="dark"]']`.
3. **A base stylesheet**: imports the tokens, then `@tailwind base / components / utilities`, base element rules (§12),
   the component classes (§10), the tone scopes (§5) and the reduced-motion block (MOTION-A11Y.md §5).

**Why channels, not hex.** `--c-lime: #B8FF3D` would make `bg-neon-lime/10` impossible: Tailwind builds
`rgb(var(--c-lime) / 0.1)`, and that only parses when the variable holds `184 255 61`. The whole look is built from
low-alpha tints of a few hues (a 10 % face, a 45 % ring, a 22 % glow), so alpha on every colour is a hard
requirement. With hex, every tint becomes a new hard-coded colour and the light theme can no longer override it.

**Why namespaced colour names.** `surface-*`, `ink-*`, `neon-*`, `neon-ink-*`, `line` never collide with Tailwind's
`slate` / `indigo` palette. An existing project can adopt the theme one page at a time while old pages keep working.

Mapping into Tailwind, in full (a helper `c = (name) => 'rgb(var(--c-' + name + ') / <alpha-value>)'`):

| Tailwind colour | Keys → variable |
|---|---|
| `surface` | `void` → `--c-void`, `base` → `--c-base`, `1` → `--c-surface`, `2` → `--c-raised`, `3` → `--c-shade` |
| `line` | `DEFAULT` → `--c-line`, `strong` → `--c-line-strong` |
| `ink` | `title` → `--c-title`, `DEFAULT` → `--c-body`, `soft` → `--c-soft`, `muted` → `--c-muted`, `faint` → `--c-faint` |
| `neon` | `lime aqua iris flare amber ember gold coral info` → `--c-<name>` |
| `neon-ink` | the same nine → `--c-<name>-ink` |
| `on-neon` | the literal `#05060A` (not a variable: it is the same in both themes) |

## 2. Surfaces and lines

| Variable | Tailwind | Dark (channels) | Light (channels) | Use |
|---|---|---|---|---|
| `--c-void` | `surface-void` | `#05060A` (5 6 10) | `#EEF1F8` (238 241 248) | App backdrop (`body`), modal scrims (`bg-surface-void/80`) |
| `--c-base` | `surface-base` | `#0A0C14` (10 12 20) | `#F4F6FB` (244 246 251) | Top bar, side rail, bottom bar (used at 70-85 % + blur) |
| `--c-surface` | `surface-1` | `#10131D` (16 19 29) | `#FFFFFF` (255 255 255) | Cards, pills, sheets |
| `--c-raised` | `surface-2` | `#161A27` (22 26 39) | `#ECEFF7` (236 239 247) | Hover, popovers, inputs, dark button discs, toasts |
| `--c-shade` | `surface-3` | `#1E2334` (30 35 52) | `#E2E7F1` (226 231 241) | Progress tracks, pressed, selected segment, skeletons |
| `--c-line` | `line` | `#262C40` (38 44 64) | `#D9DEEA` (217 222 234) | Hairline borders, dividers |
| `--c-line-strong` | `line-strong` | `#353D57` (53 61 87) | `#BEC6D8` (190 198 216) | Hover borders, locked rings, scrollbar thumb |

The dark ladder is a cool blue-black, never neutral grey: neon hues look dirty on grey and clean on blue-black. Each
step is only a few lightness points above the previous one; depth comes from the 1 px top highlight in `shadow-edge`,
not from big brightness jumps.

## 3. Ink (text)

| Variable | Tailwind | Dark | Light | Contrast on a dark card | Use |
|---|---|---|---|---|---|
| `--c-title` | `text-ink-title` | `#F4F7FF` (244 247 255) | `#0B0E17` (11 14 23) | 17.3:1 | Headings, values, active labels |
| `--c-body` | `text-ink` | `#D5DAE8` (213 218 232) | `#262C3D` (38 44 61) | 13.3:1 | Body text (the `body` default) |
| `--c-soft` | `text-ink-soft` | `#A3ACC4` (163 172 196) | `#4A5268` (74 82 104) | 8.2:1 | Secondary text, inactive navigation |
| `--c-muted` | `text-ink-muted` | `#8089A6` (128 137 166) | `#5E6781` (94 103 129) | 5.3:1 | Meta text, captions, uppercase labels. **The floor for anything that must be read** (>= 4.5:1 on every dark layer, 4.50 on `shade`) |
| `--c-faint` | `text-ink-faint` | `#4D5573` (77 85 115) | `#A3AABB` (163 170 187) | 2.5:1 | Disabled and decorative only. Never for information |

## 4. Neon tones: one job per hue

The neon value is **the same in both themes**; only its `-ink` variant changes.

| Tone | `--c-<tone>` (both themes) | `--c-<tone>-ink` on light | Neon on a dark card | Default job |
|---|---|---|---|---|
| lime | `#B8FF3D` (184 255 61) | `#3D7A00` (61 122 0) | 15.4:1 | Primary: XP, progress, correct, selected, primary CTA |
| aqua | `#3DF5D8` (61 245 216) | `#00786A` (0 120 106) | 13.5:1 | Links, keyboard focus, "known / safe" state, secondary currency |
| iris | `#8B7BFF` (139 123 255) | `#5A45EE` (90 69 238) | 5.6:1 | Level; "the system is thinking" |
| flare | `#FF4FD8` (255 79 216) | `#B8129A` (184 18 154) | 6.5:1 | New, rare; "the system is speaking" |
| amber | `#FFB23E` (255 178 62) | `#965400` (150 84 0) | 10.3:1 | Quests, "in progress", warnings, streak at risk |
| ember | `#FF6A2B` (255 106 43) | `#C2410C` (194 65 12) | 6.5:1 | Streak |
| gold | `#FFD65A` (255 214 90) | `#8A6200` (138 98 0) | 13.3:1 | Trophies, mastered, claimable rewards |
| coral | `#FF5C7A` (255 92 122) | `#CC1A40` (204 26 64) | 6.2:1 | Wrong, danger, destructive |
| info | `#5AA8FF` (90 168 255) | `#005EC7` (0 94 199) | 7.5:1 | Informational (no tone scope; used directly) |

On dark, every `-ink` variable is an alias: `--c-lime-ink: var(--c-lime)`. The light block replaces the nine `-ink`
values with the dark stops above and leaves the neon values untouched.

Two more plain variables: `--on-neon: #05060A` (text and icons on any neon fill) and `--comet-head` (the bright head
of the XP fill: `#fff` on dark, `rgb(var(--c-lime-ink))` on light).

Re-assign the jobs for another product (a fitness app might give ember to "calories"), but keep the rule: **a hue
means one thing everywhere**. When lime is both "correct" and "decorative divider", the user stops reading colour as a
signal and the interface degrades into a rainbow.

### The two colour families: `neon-*` and `neon-ink-*`

- `neon-*` (`bg-neon-lime`, `ring-neon-lime/50`, `shadow-[..rgb(var(--c-lime)/.4)]`): **fills, rings, glows, tints**.
- `neon-ink-*` (`text-neon-ink-lime`, `rgb(var(--c-lime-ink))`): **coloured text and thin strokes**. On dark it equals
  the neon; on light it is the dark stop (5.2-6.0:1 on white).

Rule: *if it is a glyph or a line under 3 px that carries meaning, use `-ink`.* Neon lime text on a white card is
1.2:1, invisible. This is the most common way the light theme breaks. The same applies to progress-ring arcs (their
gradient is built from `-ink` variables), the XP fill (`bg-comet` uses `--c-lime-ink`), gradient text
(`bg-flare-ink bg-clip-text text-transparent`), the fill of thin progress bars, and icon gradients (each stop has a
light value, ICONS.md §2).

Text **on** a neon fill always uses `text-on-neon` (`#05060A`, 6.2-16.8:1). White on neon is 1.2-3.3:1 and fails.
The only tolerated exception is white bold text >= 24 px on iris.

## 5. Tone scopes: passing a colour to a component

```css
.tone-lime  { --tone: var(--c-lime);  --tone-ink: var(--c-lime-ink); }
/* aqua, iris, flare, amber, ember, gold, coral: the same pattern */
.tone-mono  { --tone: var(--c-soft);  --tone-ink: var(--c-body); }
```

A component takes a `tone` prop (`lime | aqua | iris | flare | amber | ember | gold | coral | mono`), adds
`` `tone-${tone}` `` to its root and writes its styles once against `--tone` / `--tone-ink`:

```tsx
<div className={cn('neon-card neon-glow', `tone-${tone}`)}>
  <span className="bg-[rgb(var(--tone)/.10)] ring-1 ring-inset ring-[rgb(var(--tone)/.25)]" />
  <span className="text-[rgb(var(--tone-ink))]">days</span>
</div>
```

Non-obvious details:

- The `.tone-*` rules sit **outside any `@layer`** in the base stylesheet. The class name is built at runtime, so
  Tailwind's content scan never sees the full string; inside `@layer components` the rules would be purged from the
  production CSS and every toned component would render colourless (while still looking right in development).
- For the same reason never build other class names by interpolation (`` `bg-neon-${tone}` `` is purged). Use the tone
  scope + arbitrary values, or a lookup table of complete class strings.
- The scope cascades: a card with `tone-gold` tints every `rgb(var(--tone))` inside it. Set the scope on the smallest
  element that needs it.
- Use `var(--tone, var(--c-lime))` when a component must also work without a scope (the hover glow of a card).

## 6. Typography

| Family | Tailwind | Stack | Weights loaded | Use |
|---|---|---|---|---|
| Display | `font-display` | `"Chakra Petch", "Be Vietnam Pro", sans-serif` | 500 600 700 | Headings (`h1`-`h3` get it from the base rules), **all numbers**, uppercase labels, round-button captions, the CTA, tags |
| Text | `font-sans` | `"Be Vietnam Pro", Inter, system-ui, sans-serif` | 400 500 600 700 | UI text, paragraphs, form fields |
| Reading | `font-read` | `Lexend, "Be Vietnam Pro", sans-serif` | 400 500 | Long passages the user reads for minutes: 18 px / 1.75, max 68ch |
| Mono | `font-mono` | `"JetBrains Mono", ui-monospace, monospace` | 500 | Versions, tokens, gallery captions |

Load the four families with one stylesheet link and `display=swap`, after `preconnect` hints to the font host. All
four cover Vietnamese. If the product needs another script (Japanese, Korean, Arabic), replace **the text font** with
one that covers it and keep Chakra Petch for digits and Latin labels only; a squared display font with fallback
glyphs for half the characters looks broken.

Scale used by the components:

| Role | Classes |
|---|---|
| Stat value | `font-display text-3xl font-bold leading-none tabular-nums text-ink-title` |
| Page / card title | `text-xl sm:text-2xl font-bold` (h2), `text-base font-semibold` (card header) |
| Uppercase label | `font-display text-2xs font-semibold uppercase tracking-[.14em] text-ink-muted` |
| Round button caption | `font-display text-xs font-semibold uppercase tracking-[.08em]` (the quest Claim keycap uses the same style in bold). Text buttons do **not** use it: COMPONENTS.md, NeonButton |
| HUD number | `font-display text-[11px] font-semibold tracking-[.04em] tabular-nums` |
| Body | `text-sm` / `text-[15px]`, line-height 1.5 |
| Meta | `text-xs text-ink-muted` |

Two sizes are added to Tailwind's scale: `text-2xs` = 0.625 rem (10 px) with line-height 0.875 rem, and `text-3xs` =
0.5625 rem (9 px) with line-height 0.75 rem (labels inside badges only).

Numbers that change always carry `tabular-nums`, or the HUD jitters as digits change width.

## 7. Radii and shape

| Shape | Value | Use |
|---|---|---|
| `rounded-full` | circle / pill | Round buttons, chips, pills, tracks, segmented control |
| `rounded-xl` | 12 px | Small controls (`sm` buttons, icon tiles, toast action) |
| `rounded-2xl` | 16 px | Buttons `md` / `lg`, navigation items, toasts |
| `rounded-3xl` | 24 px | Cards (`.neon-card`), popovers |
| `rounded-4xl` | 28 px (`1.75rem`, added to the theme) | Sheets, the login panel |
| `.hex` | `clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)` | Level badge, achievement medals, quest and empty-state tiles |

The hexagon is pointy-top with width : height about 0.87: 28x32, 34x38, 40x44, 56x64, 140x160 px are the sizes in use.

`clip-path` clips `box-shadow`, so a hexagon **glows with `filter: drop-shadow(...)` on a wrapper element**, and its
**border is a second, smaller hexagon**: the outer hex is painted in the border colour, an inner `.hex` inset by
1.5 px is painted in the face colour.

## 8. Shadows and glows

| Token | Value | Use |
|---|---|---|
| `shadow-edge` (`--shadow-edge`) | dark: `inset 0 1px 0 rgb(255 255 255/.06), 0 24px 60px rgb(0 0 0/.35)`; light: `inset 0 1px 0 rgb(255 255 255/.9), 0 1px 2px rgb(16 24 40/.06), 0 12px 32px rgb(16 24 40/.08)` | Every card and popover: top highlight + depth |
| `shadow-glow-sm` | `0 0 10px rgb(lime/.25)` | Small lime tags |
| `shadow-glow` | `0 0 18px rgb(lime/.40)` | XP fill, selected chip, XP chip |
| `shadow-glow-lg` | `0 0 28px 2px rgb(lime/.40), 0 8px 30px rgb(lime/.25)` | Hero CTA only |
| `shadow-glow-<tone>` | `0 0 18px rgb(tone/α)`: aqua .40, iris .45, flare .40, amber .45, ember .50, gold .45, coral .45 | The same glow in another tone |
| `shadow-ring-lime` | `inset 0 0 0 1.5px rgb(lime/.85)` | Selected outline |
| `shadow-keycap` | `inset 0 1px 0 rgb(255 255 255/.10), 0 4px 0 rgb(0 0 0/.45)` | Dark keycap button: a 4 px solid "depth" under it |
| `shadow-keycap-lime` | `inset 0 1px 0 rgb(255 255 255/.6), 0 4px 0 #3F6E00, 0 0 22px rgb(lime/.45)` | Lime keycap: dark-lime depth + glow |
| `shadow-pressed` | `inset 0 1px 0 rgb(255 255 255/.10), 0 1px 0 rgb(0 0 0/.45)` | Pressed keycap: depth collapses to 1 px while the face moves down 3 px |

(`rgb(lime/α)` stands for `rgb(var(--c-lime) / α)`.)

Neon ring recipe of the round button (`neon` variant; per tone, via the scope):
`inset 0 0 0 1.5px rgb(var(--tone)/.75), 0 0 16px rgb(var(--tone)/.28), 0 4px 0 rgb(0 0 0/.45)`. A ring is an **inset
box-shadow**, not a border: it does not change the element's size and it can share one `box-shadow` list with the glow
and the depth, so all three transition together.

Navigation items use the same technique with their own values and **no depth shadow** (they are flat, not keycaps):
the rail item and the bottom-bar pill are given in LAYOUT-NAV.md §3 and §4.

Glow budget: a glow is a **signal** (active, current, claimable, just rewarded). A screen at rest shows the glow of
the active navigation item, the XP fill, the current step, and nothing else. Never put a glow on body text
(`text-shadow` blurs glyph edges and lowers legibility) and never on every card.

## 9. Gradients (`backgroundImage`)

| Class | Value | Use |
|---|---|---|
| `bg-flare` | `linear-gradient(120deg, lime 0%, aqua 38%, iris 72%, flare 100%)` | The brand spectrum: rare tier, brand marks |
| `bg-flare-ink` | the same from the four `-ink` variables | Gradient **text** (`bg-clip-text text-transparent`), readable on light |
| `bg-cta` | `linear-gradient(150deg, #E6FF9C 0%, lime 40%, aqua 100%)` | Primary CTA face; with `bg-[length:200%_200%] animate-flow` it drifts |
| `bg-lime-face` | `linear-gradient(160deg, #E6FF9C, lime 55%, #7EE000)` | Lime keycap discs, "done" nodes |
| `bg-iris` | `linear-gradient(135deg, iris, flare)` | Level badge |
| `bg-ember` | `linear-gradient(180deg, #FFE27A, #FF9B3D 55%, #FF4D3D)` | Flame fills |
| `bg-gold` | `linear-gradient(160deg, #FFF2B0, gold 50%, #E0A21F)` | Claim button, gold tier |
| `bg-comet` | `linear-gradient(90deg, rgb(lime-ink/.15), rgb(lime-ink) 82%, var(--comet-head))` | XP fill: a tail that brightens to a white head (a lime-ink head on light, where a white head vanishes on the pale track) |
| `bg-sheen` | `linear-gradient(118deg, transparent 30%, rgb(255 255 255/.14) 50%, transparent 70%)` | Skeleton and reward sheen, moved by `animate-shimmer` |
| `bg-glass` | `linear-gradient(rgb(255 255 255/.03), rgb(255 255 255/.01))` | Card face (part of `.neon-card`) |
| `bg-grid` | two 1 px `line` gradients, one `to right`, one `to bottom` (`rgb(line) 1px, transparent 1px`) | Backdrop grid, sized `48px 48px` |
| `bg-backdrop` | `var(--neon-backdrop)` | The static "bokeh" lights below |

`--neon-backdrop`, dark: three radial gradients, each fading to transparent at 70 %:
`ellipse 80% 55% at 50% -8%` lime at 10 %, `600px 380px at 92% 12%` iris at 10 %, `520px 360px at 6% 88%` aqua at 7 %.
Light: only the first one, lime at 18 %.

Tier faces that are not theme tokens: bronze `linear-gradient(160deg, #E0A070, #9A5B2E)`, silver
`linear-gradient(160deg, #E6ECF5, #9AA6BD)`.

## 10. Component classes (base stylesheet)

| Class | Definition |
|---|---|
| `.neon-backdrop` | `pointer-events: none; position: fixed; inset: 0; z-index: -10; background: var(--neon-backdrop)`. Its `::after` covers it with `bg-grid` at `48px 48px`, opacity .3, masked by `linear-gradient(#000, transparent 70%)` so the grid fades out downwards. Render **once**, in the shell. It is a static gradient: no blur filter, no animation, so it costs nothing while scrolling |
| `.neon-card` | `position: relative; border-radius: 24px; border: 1px solid line; background: surface-1 + bg-glass; box-shadow: shadow-edge` |
| `.neon-glow` | Replaces the card's background image with `radial-gradient(240px 150px at 100% 0%, rgb(var(--tone)/.14), transparent 70%)` over the glass gradient: a tinted top-right corner. Needs a `.tone-*` scope |
| `.neon-sweep` | A rotating spectral ring drawn 3 px outside the element. The element gets `position: relative; isolation: isolate`; its `::before` has `inset: -3px; padding: 3px; border-radius: inherit; pointer-events: none`, a `conic-gradient(from var(--neon-angle), lime, aqua, iris, rgb(lime/.15) 70%, lime)` background, and a two-layer mask (`linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)` composited with `exclude` / `-webkit-mask-composite: xor`) that leaves only the 3 px padding band visible. `animation: neon-spin 6s linear infinite`, whose only keyframe is `to { --neon-angle: 360deg }` |
| `.hex` | The hexagon clip-path (§7) |

`--neon-angle` must be registered, or the browser cannot interpolate it and the ring jumps instead of turning:

```css
@property --neon-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
```

The component classes go in `@layer components`; they are written out in markup, so Tailwind keeps them.

## 11. Motion tokens

| Token | Value | Use |
|---|---|---|
| `ease-glide` / `--ease-glide` | `cubic-bezier(.22, 1, .36, 1)` | Everything that enters or moves |
| `ease-pop` / `--ease-pop` | `cubic-bezier(.34, 1.56, .64, 1)` | Rewards only (overshoot) |
| `--ease-std` | `cubic-bezier(.4, 0, .2, 1)` | Plain colour fades |

`ease-glide` and `ease-pop` are added to Tailwind's `transitionTimingFunction`. Which easing and duration goes with
which kind of change: `MOTION-A11Y.md` §1.

| Animation class | Keyframes | Timing |
|---|---|---|
| `animate-glow-pulse` | opacity .5 ↔ 1, scale 1 ↔ 1.1 | 2.4 s ease-in-out infinite. Halo behind an active toggle or a claimable button: on a blurred sibling, never on the control |
| `animate-float` | translateY 0 ↔ -4 px | 2.4 s ease-in-out infinite |
| `animate-float-3` | the same keyframes | 2.4 s, **3 iterations**, then rest. "START" tag, at-risk flame |
| `animate-shimmer` | translateX -120 % → 260 % | 2.2 s glide, infinite. Skeleton sheen, a reward waiting to be claimed |
| `animate-shimmer-once` | the same keyframes | 1.6 s glide, delay .4 s, `both`, once. One sweep per XP change |
| `animate-flow` | background-position `0% 0%` ↔ `100% 100%` | 5 s ease-in-out infinite. CTA gradient drift |
| `animate-pop-in` | 0 %: opacity 0, scale .6 → 60 %: opacity 1, scale 1.08 → 100 %: scale 1 | .45 s `ease-pop`, `both`. Check marks, new badges, ready chest |
| `animate-xp-burst` | 0 %: opacity 0, `translate(0,0) scale(.3)` → 15 %: opacity 1 → 100 %: opacity 0, `translate(var(--dx, 0px), var(--dy, -48px)) scale(1)` | .6 s glide, `forwards`. Burst dots; set `--dx` / `--dy` inline per dot |
| `animate-iris-open` | opacity 0, `rotate(-60deg) scale(.4)` → opacity 1, `rotate(0) scale(1)` | .7 s glide, `both`. Level-up badge |
| `animate-orb-breathe` | scale .97 ↔ 1.03, brightness 1 ↔ 1.15 | 4 s ease-in-out infinite. An idle "live" orb |
| `animate-ripple` | scale .85 → 1.45, opacity .8 → 0 | 2.4 s glide, infinite. Rings around a live source (speaking, recording) |

When each may run, and the loop budget: `MOTION-A11Y.md` §4.

## 12. Base element rules

| Rule | Value | Why |
|---|---|---|
| Shell variables on `:root` | `--shell-top: calc(3.5rem + 1px)`; `--shell-bottom: calc(4rem + env(safe-area-inset-bottom))`, and `0px` from 1024 px | The heights of the sticky top bar and the fixed bottom bar; see LAYOUT-NAV.md §1 |
| `html` | `-webkit-tap-highlight-color: transparent`; `text-size-adjust: 100%`; `scroll-padding-top: calc(var(--shell-top) + .5rem)`; `scroll-padding-bottom: calc(var(--shell-bottom) + var(--page-bar, 0px) + .5rem)` | Focus and anchor scrolling stop clear of the bars |
| `body` | `min-height: 100vh` (`min-h-screen`), `bg-surface-void`, `font-sans`, `text-ink`, antialiased, line-height 1.5 | |
| `h1, h2, h3` | `font-display`, `text-ink-title`, `text-wrap: balance` | |
| `a` | `color: rgb(var(--c-aqua-ink))` | Aqua = links |
| `:focus-visible` | `outline: 2px solid rgb(var(--c-aqua-ink)); outline-offset: 2px` | One focus colour everywhere |
| `::selection` | background `rgb(var(--c-lime) / .3)`, colour `rgb(var(--c-title))` | |
| Scrollbars | `scrollbar-width: thin`; `scrollbar-color: rgb(var(--c-line-strong)) transparent`; WebKit: 8 px, transparent track, `line-strong` thumb with a 2 px transparent border and 8 px radius, `muted` on hover | A default light scrollbar is a white stripe on the dark canvas |

### Theme switch without a flash

- `<html lang data-theme="dark" class="dark">` in the static HTML; dark is the default.
- An **inline script in `<head>`**, before any stylesheet or bundle: read `localStorage.theme` inside try/catch; if it
  is `light`, set `data-theme="light"`, remove the `dark` class and set the `theme-color` meta to `#EEF1F8`. Because
  it runs before first paint, a returning light-theme user never sees a dark frame.
- Meta tags: `viewport` with `viewport-fit=cover` (safe-area insets), `theme-color` `#05060A`, `color-scheme`
  `dark light`.
- At runtime the DOM attribute is the source of truth (COMPONENTS.md, hooks).

## 13. Changing the palette for another brand

1. Keep the structure: 7 surfaces, 5 inks, 8 tones + info, each tone with an `-ink`.
2. Pick the new primary and put it in lime's **role**. If the variable is renamed, rename it everywhere: the theme
   mapping, the base stylesheet, the icon gradient table, and the hard-coded keycap colours that belong to lime
   (`#3F6E00` depth, `#7EE000` and `#E6FF9C` face stops; gold's Claim button uses `#8A6200` as its depth).
3. For every tone compute contrast: the neon on `#10131D` >= 4.5:1 for text use; `--on-neon` on the neon >= 4.5:1; the
   `-ink` stop on `#FFFFFF` >= 4.5:1 and on the light `--c-raised` >= 4.5:1.
4. Update the icon gradients (3 stops per tone, a dark and a light colour each, plus the glow channels: ICONS.md §2).
5. Open the gallery page in both themes before touching any product page.
