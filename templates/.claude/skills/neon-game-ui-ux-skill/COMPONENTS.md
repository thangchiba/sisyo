# Components

One entry per shared component: anatomy, sizes, the look of each state, props worth having, accessibility, and the
implementation tricks that are easy to get wrong. Build each component in the project from its entry; the token and
class names are those of `TOKENS.md`. The stack assumed is React 18 + TypeScript + Tailwind 3 + `motion/react`; the
techniques (inset-shadow rings, transform-only motion, tone scopes) carry over to any stack.

Conventions shared by all of them:

- `tone` props take `lime | aqua | iris | flare | amber | ember | gold | coral | mono` and are applied with a
  `.tone-*` scope (TOKENS.md §5).
- Class names are joined with a helper that only concatenates truthy strings. It does **not** resolve conflicting
  Tailwind classes, so a `className` prop can add utilities but should not try to override one the component sets.
- A control that navigates takes a `to` prop and renders the router's link element instead of a `<button>`, with the
  same classes.
- Every interactive element is >= 44x44 px to touch, even when it looks smaller: the visual is 36 px and a
  pseudo-element widens the hit area (`relative after:absolute after:-inset-1 after:content-['']`).
- Transitions list their properties (`transition-[transform,box-shadow,background-color]`), 180 ms `ease-glide`, and
  switch to 120 ms while pressed. Never `transition: all`.

## Icon

`<Icon name tone? size=24 glow? className? title? />`

- An inline `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">`
  that paints one registry entry layer by layer (the layer model, the gradients and how the registry is made:
  `ICONS.md`).
- Without `tone` the registry's default tone is used. `tone="mono"` paints with `currentColor`: set the text colour on
  a parent.
- `glow` adds `filter: drop-shadow(0 0 6px rgb(tone / .6))` and `overflow: visible`; in mono the shadow colour is
  `color-mix(in srgb, currentColor 60%, transparent)`. **Active or celebration states only.**
- Without `title` the icon is decorative (`aria-hidden`, `focusable="false"`). With `title` it is `role="img"` with
  that label. An icon that is the only content of a control gets its name from the control's `aria-label`, not from
  `title`.
- Always `shrink-0`: in a flex row an SVG is the first thing to be squeezed.

## RoundButton

The signature control: a circular keycap with a neon ring.

| Prop | Values | Notes |
|---|---|---|
| `icon` | icon name | required |
| `size` | `sm` 36 px disc / 18 px icon, `md` 48 / 22 (default), `lg` 64 / 28, `xl` 88 / 36 | `sm` without a label gets the 44 px hit area |
| `variant` | `neon` (default), `primary`, `danger`, `ghost` | see below |
| `tone` | ring + icon tone for `neon` / `ghost` | default lime for `neon`, mono for `ghost`; `danger` forces coral |
| `label` | caption under the disc | uppercase display font, 12 px, `tracking .08em`, `ink-soft`; also the accessible name |
| `aria-label` | required when there is no `label` | log a development-only warning when both are missing |
| `active` | `true` = toggled on | primary look + pulsing halo; sets `aria-pressed`. Leave `undefined` for plain buttons, so no `aria-pressed` is emitted |
| `loading` | spinner ring | `.neon-sweep` around the disc, `aria-busy`, clicks ignored |
| `disabled`, `onClick`, `to`, `className` | | |

**Anatomy.** `button.group` (transparent, column, gap 6 px, holds the tone scope) > a relative wrapper > [halo, only
when `active`] + **disc** > `Icon`; then the caption. The disc, not the button, carries the shape and the motion, so
the caption is part of the tap target while only the disc moves.

**How the keycap is made.** There is no 3D transform: the depth is a hard, unblurred shadow.

- `neon` disc: `bg-surface-2` + a top highlight `radial-gradient(circle at 50% 30%, rgb(255 255 255/.10), transparent
  60%)` + one box-shadow list: `inset 0 0 0 1.5px rgb(tone/.75)` (the ring), `0 0 16px rgb(tone/.28)` (the glow),
  `0 4px 0 rgb(0 0 0/.45)` (the 4 px depth). Icon in the tone.
- `primary` / `active`: `bg-lime-face`, `text-on-neon`, `shadow-keycap-lime` (depth `#3F6E00`); the icon is mono, so
  it is dark on lime.
- `ghost`: `bg-ink-title/[.06]`, no ring, no depth, `ink-soft` icon; hover `bg-ink-title/10` and `ink-title`. For
  toolbars and close buttons.
- **Hover**: the disc moves up 1 px and scales to 1.04.
- **Press**: the disc translates **down 3 px** and its depth shadow shrinks **from 4 px to 1 px** in the same 120 ms
  (`neon`: ring to .9, glow to `0 0 10px .3`; `primary`: glow to `0 0 16px .4`). 3 + 1 = 4: the face lands exactly
  where its shadow ended, which reads as a key travelling into its base. Reset the hover scale to 1 while pressed.
  `ghost` only moves 1 px.
- **Halo** (`active`): an absolutely placed sibling, 6 px larger than the disc on each side, `bg-neon-lime/40`,
  `blur-md`, `motion-safe:animate-glow-pulse`. The pulse is on the halo; pulsing the disc itself would move the icon.
- **Focus**: the button has `focus-visible:outline-none` and the **disc** draws the outline through the group
  (`group-focus-visible:outline`, 2 px aqua-ink, offset 3 px). Otherwise the ring wraps disc + caption as a rectangle.
- **Disabled**: `opacity-40 saturate-0`, `cursor-not-allowed`; no hover or press styles.

## NeonButton

Pill / rounded-rectangle text button.

| Prop | Values |
|---|---|
| `variant` | `cta` (default), `secondary`, `ghost`, `danger` |
| `size` | `sm`: 36 px high, radius 12, padding-x 14, 14 px text, 16 px icon, hit area widened to 44. `md`: 44 px, radius 16, padding-x 20, 15 px text, 18 px icon. `lg`: 52 px, radius 16, padding-x 28, 16 px text, 20 px icon |
| `icon`, `iconRight` | icon names |
| `loading` | a spinner replaces the left icon; the button keeps focus and ignores clicks; `aria-busy` |
| `fullWidth`, `disabled`, `type`, `onClick`, `to`, `className` | |
| `focusableWhenDisabled` | with `disabled`: stays focusable (`aria-disabled`), ignores clicks |

- Box: `relative inline-flex`, centred on both axes, `white-space: nowrap`, `user-select: none`. Gap between icon,
  text and right icon: `sm` 6 px, `md` 8 px, `lg` 10 px.
- Typography: **only `cta` is uppercase display font.** `secondary`, `ghost` and `danger` use the text font,
  semibold, in sentence case. The uppercase caption style of TOKENS.md §6 belongs to the round button, not to these.
- `cta`: `bg-cta` at `background-size: 200% 200%` drifting with `animate-flow`; uppercase bold display font, tracking
  .06em, `text-on-neon`, mono icons. Shadow: `0 0 26px rgb(lime/.35), inset 0 1px 0 rgb(255 255 255/.6), 0 4px 0
  #3F6E00`. Hover: up 1 px, glow `0 0 34px .5`, depth 5 px. Press: down 3 px, glow `0 0 18px`, depth 1 px.
  **One per view.** Two flowing gradients compete and neither reads as primary.
- `secondary`: a dark keycap. `bg-surface-2`, `shadow-keycap`, `ring-1 ring-inset ring-line-strong`, lime-ink
  semibold text, lime icon. Hover `bg-surface-3` + `ring-neon-lime/50`. Press: down 3 px + `shadow-pressed`.
- `ghost`: text only (`text-ink`, semibold), mono icon; hover `bg-ink-title/[.06]` + `ink-title`; pressed
  `bg-ink-title/10`. No shadow and no movement.
- `danger`: `bg-neon-coral/10`, `ring-neon-coral/50`, coral-ink text and coral icon; hover tint 16 %; press 1 px.
- Spinner: a 16 px circle, `border-2 border-current`, right border transparent, `animate-spin`.
- Plain `disabled`: `pointer-events-none opacity-40 saturate-0`.
- `focusableWhenDisabled` exists because a button that becomes natively `disabled` while it has focus (Save, after
  saving) drops keyboard focus to `<body>`. In that mode the button is not natively disabled; it gets `aria-disabled`
  and its click handler calls `preventDefault` (which also blocks a form submit). The faded look is an **overlay**
  (`before:` pseudo-element: `surface-1` at 60 % + `backdrop-saturate-0`, same radius) and the outer shadows are
  removed. Opacity or a filter on the button itself would fade the focus ring too. `ghost` has no face to cover: there
  the text colour drops to `ink` at 40 % instead of the overlay.

## GlowCard

`<GlowCard tone? interactive? padding="none|sm|md|lg" as="div|section|article" className?>`

- `.neon-card`; with `tone` it adds the tone scope + `.neon-glow` (the tinted top-right corner).
- Padding: `sm` 12 px; `md` 16 px, 20 px from `sm`; `lg` 20 px, 28 px from `sm`.
- `interactive`: hover lifts 2 px and strengthens the border to `line-strong`. The hover glow
  (`0 0 28px rgb(var(--tone, var(--c-lime))/.18)`) lives on an `::after` that covers the card, with the card's radius
  and `pointer-events: none`, and only that pseudo-element's **opacity** animates 0 → 1 in 200 ms. Animating
  `box-shadow` on the card repaints it every frame.
- A card is a container, not a control: when the whole card navigates, wrap its content in one link and give that
  link the focus ring.

## ProgressRing

`<ProgressRing value(0..1) size=34 stroke? tone="lime|aqua|iris|flare|gold|ember" label?>children</ProgressRing>`

- A wrapper of `size` x `size` px (inline grid, centred, `shrink-0`) holding an absolutely placed SVG and, above it,
  the centre content.
- The SVG is rotated -90° so the arc starts at 12 o'clock, with `overflow: visible` for the glow. Two circles of
  radius `(size - stroke) / 2`: the track (`stroke-surface-3`) and the arc.
- Default stroke by size: <= 40 px 3.5, <= 80 px 6, larger 10.
- **How the arc draws.** `stroke-dasharray = circumference` and `stroke-dashoffset = circumference * (1 - value)`,
  round line caps, with a 600 ms `ease-glide` transition on `stroke-dashoffset`. The drawn value is state that starts
  at **0** and is set to the real value inside a `requestAnimationFrame` after mount; without that first frame at 0
  the browser has nothing to transition from and the ring appears already filled.
- The arc has `opacity: 0` while the drawn value is 0; otherwise the round cap shows as a dot at 12 o'clock.
- Arc paint: a 2-stop linear gradient (id from `useId()`) in the default `objectBoundingBox` units from `(0,0)` to
  `(1,1)`, the diagonal of the arc's box; tone → neighbouring hue, taken from the **`-ink`
  variables** so it survives the light theme: lime → aqua, aqua → info, iris → flare, flare → iris, gold → amber,
  ember = amber → ember. Glow: `drop-shadow(0 0 max(2, stroke)px rgb(first stop / .45))`.
- Clamp the value to 0..1 and treat a non-finite value as 0.
- `children` is the centre content (a percentage, an icon). Without children a check in the ring's tone pops in
  (`animate-pop-in`) at 100 %, sized `max(12, 0.42 * size)`.
- `role="progressbar"`, `aria-valuemin 0`, `aria-valuemax 100`, `aria-valuenow` (rounded percent), `aria-label` from
  `label`. When the ring sits **inside a button** (the HUD button, the bottom bar's dial), wrap it in `aria-hidden`
  and put the value in the button's accessible name: roles nested in a button are ignored.

## XpBar

`<XpBar current max level compact? className? />` where `current` = XP inside the level and `max` = the level's span
(GAMIFICATION.md §3). `max <= 0` means max level (the bar is full and the text says `MAX`).

- Default width 176 px. Header row above the bar: `LV 7` in `ink-soft` on the left, `120 / 500 XP` in lime-ink
  `tabular-nums` on the right, display font 11 px semibold; the row is `aria-hidden`.
- Track: 10 px high, `rounded-full`, `bg-surface-3`, `overflow: hidden`, a 1 px inset white line at 6 %.
- **How the fill moves.** The fill is as wide as the track (`absolute inset-0`), painted `bg-comet` + `shadow-glow`,
  and shifted with `transform: translateX((ratio - 1) * 100%)`: at 0 it is fully off to the left, at 1 it covers the
  track. Transition on `transform`, 700 ms `ease-glide`. No width animation, so no layout work. Like the ring, the
  shown ratio starts at 0 and is set in a `requestAnimationFrame`, so the bar slides in on mount.
- One sheen sweep per XP change: a narrow span (40 % wide, a transparent → white 35 % → transparent gradient,
  `animate-shimmer-once`) inside the fill, **keyed by `current`**. A new key remounts it, which replays the
  animation. It is not a loop.
- `role="progressbar"` with `aria-valuetext` "Level 7: 120 of 500 XP" (or "Level 7, max level").
- `compact`: a 2 px line with no header and no sheen, for the bottom edge of the mobile top bar; its `aria-label` is
  the value text.
- Mark the bar's wrapper with `data-xp-target`: it is where the reward burst lands (the lookup: Reward system).

## LevelBadge

`<LevelBadge level size="sm|md|lg|xl" />`

| Size | Hexagon (w x h) | Number | Caption | Glow on the wrapper |
|---|---|---|---|---|
| `sm` | 28 x 32 | 12 px | none | `drop-shadow(0 0 5px rgb(flare/.4))` |
| `md` | 34 x 38 | 14 px | none | `0 0 8px flare/.45` |
| `lg` | 56 x 64 | 24 px | "LEVEL", 9 px, tracking .14em | `0 0 14px flare/.45` |
| `xl` | 140 x 160 | 60 px | "LEVEL", 12 px, tracking .2em | `0 0 32px iris/.6` |

Anatomy: a wrapper `span` (carries the `drop-shadow`, because `clip-path` would clip a box-shadow) > a `.hex` painted
`bg-iris` > a second `.hex` overlay with a glassy highlight
(`radial-gradient(circle at 30% 18%, rgb(255 255 255/.5), transparent 55%)`) > the number in bold display font,
`tabular-nums`, `text-on-neon`. `role="img"` with `aria-label="Level 7"`; the inner text is `aria-hidden`.

## StreakPill

`<StreakPill days state="done|at-risk|zero" />`

A 36 px high pill: `bg-surface-1`, `ring-1 ring-inset`, padding 8 px left / 12 px right, a 20 px flame icon, the day
count in bold display font 15 px `tabular-nums`.

| State | Ring | Flame | Number | Meaning |
|---|---|---|---|---|
| `done` | ember at 35 % + `0 0 14px rgb(ember/.18)` | ember, with `glow` | `ink-title` | Active today |
| `at-risk` | amber at 70 % | ember, `animate-float-3` (three floats, then rest) | amber-ink | Streak alive, nothing done today |
| `zero` | `line` | mono, 45 % opacity, greyscale | `ink-muted` | No streak |

`role="img"`, label "12-day streak, done today" / "..., practise today to keep it" / "..., no streak yet"; the digits
are `aria-hidden`. The three states differ by ring, motion and label text, not by colour alone.

## StatTile

`<StatTile label value unit? sub? tone icon />`

- `.neon-card .neon-glow` in the tone scope, padding 16 px (20 px from `sm`), column with 8 px gaps.
- Row 1: the uppercase muted label; top-right a 36 px icon tile (`rounded-xl`, tone face at 10 %, inset tone ring at
  25 %, 20 px icon). Row 2: the value in the stat-value style, then `unit` in display font 16 px, tone-ink. Row 3:
  `sub`, 12 px semibold, lime-ink.
- **Count-up.** A numeric value counts from the previously shown value to the new one in 600 ms with a cubic ease-out
  (`1 - (1 - t)^3`), driven by `requestAnimationFrame`, rounded and formatted with thousands separators each frame.
- A `setTimeout` fallback at 700 ms cancels the frame loop and sets the final number. `requestAnimationFrame` can
  stall (hidden tab, headless capture); without the fallback a tile can stay at 0 forever.
- Screen readers get the final value in an `sr-only` span; the animated digits are `aria-hidden`.
- With reduced motion the value is set instantly.

## ProcessPath

The daily path: 64 px round nodes joined by connectors, a chest at the end.

`<ProcessPath steps orientation="auto|horizontal|zigzag" />`, `step = { id, label, icon, state, progress?, to?,
reward?, hint? }`, `state = locked | current | in-progress | done | chest`.

**Node anatomy.** A 64 px box holds, in order: a slot **above** the node (one of: floating tag, reward chip, locked
tooltip), an optional halo or ring behind the node, the disc itself, and a label **below** (absolute, 96 px wide,
centred, uppercase display font 12 px, with a `surface-1` at 90 % background behind the text so it stays readable
over a connector). The slot and the label are absolutely positioned, so the node's box stays 64 px and the geometry
below holds.

| State | Disc | Extras |
|---|---|---|
| `locked` | `bg-surface-1`, inset 1.5 px `line-strong` ring, 28 px mono icon in `ink-faint`, a 24 px lock chip at the bottom-right corner | Rendered as a button with `aria-disabled="true"` (focusable, so the hint is reachable) and `aria-describedby` the tooltip; the tooltip (`hint`, default "Finish the previous step to unlock") fades in on hover **and** focus |
| `current` | `bg-surface-2`, `0 0 0 6px rgb(lime/.10), 0 0 28px rgb(lime/.35)`, `.neon-sweep`, 30 px icon with `glow` | A static blurred lime halo behind it; a lime "START" tag above (`animate-float-3`) |
| `in-progress` | the same face without the sweep | An 80 px `ProgressRing` (stroke 4) centred on the node; a "RESUME" tag |
| `done` | `bg-lime-face shadow-keycap-lime`, a 30 px mono check | A reward chip above (`+20 XP`, lime-ink on `surface-2`, lime ring 40 %) |
| `chest` not ready | `bg-surface-1`, inset 1.5 px gold ring at 35 %, chest icon at 50 % | Reward chip in gold-ink |
| `chest` **ready** (every earlier step is `done`) | `bg-surface-2`, inset 2 px gold ring at 85 % + `0 0 24px rgb(gold/.35)`, chest icon with `glow` | The node pops in (`animate-pop-in`) and 10 burst dots fly out once |

- The chest burst: 10 dots of 8 px placed at the node's centre, evenly spaced angles starting at the top, alternating
  radius 62 / 44 px and colour lime / gold, each with its own `--dx` / `--dy` and `animate-xp-burst` delayed .25 s.
  The positions are computed once as constants: random values in render would change on every re-render.
- A node with `to` is a link (hover up 2 px, press down 2 px, focus outline offset 6 px so it clears the sweep ring);
  without `to` it is a `role="img"`.
- Accessible name of a node: `label, state description, reward` ("Quiz, up next", "Read, in progress, 40%",
  "Chest, reward ready, +30 XP"). The visual label and the chips are `aria-hidden`.
- At most one loop per node: the current node's sweep ring is its only animation; its halo is static and its tag
  floats three times and stops.

**Layout.** `auto` is horizontal from 640 px (a row needs about 480 px) and a zigzag below.

- Horizontal: an `<ol>` flex row with 48 px padding above (room for the tag) and 40 px below (room for the label).
  Each item is node + connector; the connector is a 4 px high bar that takes the remaining width (`flex-1`, min 24 px,
  6 px side margins). Pending = a dashed bar made with `repeating-linear-gradient(90deg, line-strong 0 8px,
  transparent 8px 14px)`; done (the step **before** it is done) = lime → aqua gradient with `0 0 10px rgb(lime/.5)`.
- Zigzag: a column 240 px wide. Node `i` is centred at `x = 120 + [0, 44, 0, -44][i % 4]`,
  `y = 44 + i * 136 + 32` (64 px node + 72 px gap = 136 px pitch; 44 px on top for the tag). Total height
  `44 + count * 136 - 72 + 40`. Connectors are SVG lines between consecutive centres, drawn **under** the nodes:
  4 px wide, round caps, dashed `8 8` in `line-strong` when pending, a lime → aqua gradient along the line with a
  lime drop-shadow when done.
- A skeleton with the same geometry (64 px circles at the same positions, the same paddings and height) is shown
  while the data loads, so the card does not change size when the steps arrive.

## QuestCard

`<QuestCard icon tone title progress goal reward state onClaim? />`, `state = active | complete | claimed | expired`.

- `.neon-card`, padding 16 px, a flex row with 12 px gaps, `overflow: hidden` (for the sheen).
- Left: a 40 x 44 hexagon tile. The outer `.hex` is painted in the tone at 40 % (the rim); two inner hexes inset
  1.5 px paint `surface-1` and then the tone at 12 % (the face); a 22 px icon on top.
- Right, row 1: the title (14 px semibold, at most two lines) and the count `3/5` (display font, `tabular-nums`).
  Row 2: a 6 px progress bar and, at its right, the reward chip or the action. The bar is the XP bar technique
  (full-width fill + `translateX`, 700 ms): fill `rgb(var(--tone-ink))` with `0 0 8px rgb(tone/.55)`.
- Reward chip: 28 px high pill on `surface-2`, a 15 px icon + text in bold display font 12 px. A bolt and lime-ink
  when the text matches `/xp/i`, otherwise a gem and aqua-ink.
- `complete`: the card switches to the **gold** tone scope, a gold border at 60 % and `0 0 24px rgb(gold/.18)`; the
  chip turns gold. With `onClaim`, the chip is replaced by a gold **Claim** keycap (36 px high, radius 12, `bg-gold`,
  uppercase bold 12 px, `text-on-neon`, depth `0 3px 0 #8A6200`, hit area widened) with a pulsing blurred gold halo
  behind it, and a sheen (`bg-sheen`, two thirds of the card wide) loops across the card (`animate-shimmer`). Without
  `onClaim` the sheen sweeps once.
- `claimed`: graphics (hex tile, bar) at 60 % opacity; the action becomes a lime check + "Claimed"; title `ink-soft`.
  `expired`: graphics at 50 % + greyscale; "EXPIRED" in `ink-muted`; title `ink-muted`.
- Dimming applies to **graphics only**; text switches to a quieter ink instead of being faded, so it keeps AA
  contrast.
- The bar is a `role="progressbar"` labelled by the title, with `aria-valuemax = goal`.

## AchievementBadge

`<AchievementBadge name description? tier="bronze|silver|gold|rare" state="earned|progress|locked|secret"
progress? icon? isNew? />`

- An 84 x 84 box holding a 56 x 64 hexagon medal; under it the name (12 px semibold), an optional description
  (10 px, `ink-muted`), max width 144 px, centred.
- The medal is two hexagons: the outer one is the **rim**, an inner one inset 1.5 px is the **face**. On top: a glint
  (`radial-gradient(circle at 32% 20%, rgb(255 255 255/.45), transparent 50%)`, clipped by its own `.hex`) and a
  28 px mono icon.

| State | Rim | Face | Icon | Extras |
|---|---|---|---|---|
| `earned` | the tier gradient (the whole medal is the gradient) | | `text-on-neon` | Tier glow as a `drop-shadow` on a wrapper (10-12 px, tier colour at 30-50 %); a sheen crosses the medal on hover (translateX -100 % → 100 %, 700 ms) |
| `progress` | `line-strong` | tier gradient at 70 % opacity, greyscale | `text-on-neon` | An 84 px gold `ProgressRing` (stroke 3.5) around the medal; the percentage in gold-ink under the name |
| `locked` | `line-strong` | `surface-2` | `ink-muted` at 35 % | A 24 px lock chip at the bottom-right |
| `secret` | `line-strong` | `surface-2` | a bold "?" | The name reads `???`, no description |

- Tier faces: bronze and silver gradients (TOKENS.md §9), gold = `bg-gold`, rare = `bg-flare`.
- `isNew`: the box pops in and, when earned, a flare "NEW" ribbon sits at the top centre (9 px bold display font,
  `text-on-neon`, `shadow-glow-flare`).
- The state is also in an `sr-only` line ("Earned", "In progress, 40%", "Locked", "Secret achievement").

## State chips (pattern)

LenS marks vocabulary words as new / known / mastered; the pattern generalises to any item with a small set of states.

- Chip: 32 px high pill, padding-x 12, 13 px medium text, `ring-1 ring-inset`. Neutral: `bg-surface-1 ring-line`.
  "New": `bg-neon-flare/10 ring-neon-flare/55` + a tiny `NEW` tag (8 px bold display font, flare-ink). "Known",
  accented: `bg-neon-aqua/[.08] ring-neon-aqua/45`. "Mastered": a 6 px gold dot with a gold glow before the text.
  Selected: `bg-neon-lime text-on-neon shadow-glow`, semibold, markers hidden.
- Inline variant (inside running text): known = a dotted 1.5 px aqua-ink underline, offset 5 px; new = a flare tint
  at 15 % + a 2 px flare underline drawn as an inset bottom shadow + a superscript `NEW`; mastered = a small gold dot
  after the word.
- Every state has a non-colour marker (tag, dot, underline style) and an `sr-only` suffix (" (new word)").
- Clickable chips are buttons with `aria-pressed` and a widened hit area (4 px sideways, 6 px up and down).
- A check that pops in (`animate-pop-in`) marks "used" or "saved", with the meaning added to the `sr-only` suffix.

## Segmented

`<Segmented value options={[{value,label,icon?}]} onChange size="sm|md" aria-label|aria-labelledby aria-describedby? />`

- Container: `inline-grid auto-cols-fr grid-flow-col max-w-full`, `rounded-full`, `bg-surface-1`, padding 4 px, inset
  `line` ring. Equal-width options that shrink together; labels truncate.
- Option heights: `md` 44 px on touch widths / 40 px from `sm`; `sm` 36 / 32 px with the hit area extended
  vertically to 44 px.
- A real radio group: `role="radiogroup"` / `role="radio"` with `aria-checked`, roving `tabIndex` (only the selected
  option, or the first when none is selected, is in the tab order), arrow keys + Home / End move focus **and
  select**, wrapping at the ends.
- **The sliding pill.** The selected option renders one absolutely placed `motion.span` (`inset-0`, `rounded-full`,
  `bg-surface-3`, shadow `inset 0 1px 0 rgb(255 255 255/.08), 0 0 0 1px rgb(lime/.4), 0 0 14px rgb(lime/.14)`) with a
  `layoutId` that is unique per instance (`useId()`). When the selection changes, the library animates the pill from
  the old option's box to the new one: spring, bounce 0.18, 350 ms. Label and icon sit above it (`relative`).
- Focus outline offset 0, because the container clips anything outside the option.
- Icons: 16 px (`sm`: 14), in their tone when selected, mono otherwise.

## Switch

`<Switch checked onChange label? disabled? aria-label? />`

- `role="switch"` + `aria-checked` on a button that is the **whole row** (label + track), min height 44 px.
- Track 44 x 26 px, `rounded-full`. On: `bg-neon-lime` + `0 0 14px rgb(lime/.45)`. Off: `bg-surface-3` + an inset
  1 px `line-strong` ring.
- Knob 20 px, 3 px from the top-left; on = moved 18 px right and painted `on-neon` (dark on lime), off = `ink-soft`.
  Transform transition 200 ms.
- The focus ring is drawn on the track (group focus), not around the row.

## Split control (pattern)

A "mix" setting (LenS: the share of new vs known items). A label row with a live text `80% known · 20% new` (each
part in its ink colour), a two-segment bar (10 px high, 4 px gap, aqua | flare, each segment's `flex-grow` set to its
percentage and transitioned over 300 ms; the smaller one has a 4 px minimum), and a `Segmented size="sm"` of the
allowed steps. The live text has `aria-live="polite"` and is the group's `aria-describedby`.

## Skeleton

`<Skeleton className circle? />`: a block of `surface-3` at 80 %, radius 12 px (or a circle), `overflow: hidden`,
with one sheen span inside (`bg-sheen`, two thirds wide, `animate-shimmer`). Size and shape come from `className`
(`"h-4 w-32"`, `"hex h-[38px] w-[34px]"`). `aria-hidden`; put `aria-busy` or a `role="status"` on the region instead.
A skeleton must have the **same box** as the loaded content: the layout never jumps.

## EmptyState

`<EmptyState title description? icon tone action? />`: centred column, padding 40 px vertical; a 56 x 64 hexagon tile
(rim tone at 35 %, face `surface-1` + tone at 10 %, 28 px icon), an `h3` (18 px semibold), one line of text
(`ink-soft`, max 384 px) and one action (usually a `NeonButton`). Say what will appear here and how to make it appear.

## Toast

`const { show, dismiss } = useToast()`; `show({ tone: 'success'|'error'|'info', title, description?, action?,
duration? })` returns an id. A provider at the root holds the list and renders the viewport in a portal on `<body>`.

- Card: `rounded-2xl`, `surface-2` at 95 % + `backdrop-blur-md`, inset tone ring at 40 %, shadow
  `0 16px 40px rgb(0 0 0/.35), 0 0 24px rgb(tone/.14)`. Contents: a 32 px icon tile, title (14 px semibold, wraps
  anywhere) + description (12 px), an optional action button (tone-ink text), a dismiss button.
- Tone map: success = lime + check, error = coral + warning, info = aqua + info.
- Up to 3 stacked (the oldest is dropped); 5 s, errors 8 s.
- **The countdown pauses while the toast is hovered or focused**: keep the remaining time in a ref; on pause clear
  the timer and subtract the elapsed time (never below 1 s), on resume start a timer for what is left. On blur, only
  resume when focus really left the toast (`relatedTarget` outside it).
- Position: top centre under the top bar on phones (`top: var(--shell-top) + 12px`, max width 448 px, newest on top);
  from `md` bottom left of the content, 380 px wide, `bottom: var(--shell-bottom) + 20px`, and offset past the side
  rail (`left: 24px`, `72px + 24px` from `lg`, `240px + 24px` from `xl`).
- Enter: opacity 0 → 1, y 8 → 0, scale .98 → 1 in 240 ms glide; exit 160 ms; `layout` so the stack closes ranks.
- Announcements go through **two always-mounted live regions** (`aria-live="polite"`, and `assertive` for errors)
  that sit next to the stack in an `sr-only` box and receive the text `title + description`. A live region that is
  mounted together with its text is often not announced, which is why the visual toast is not the live region.
- An `action` is a shortcut, never the only way to do something (a toast disappears). Using it also dismisses.
- Dismiss button and action are 44 px targets. The viewport is `pointer-events-none`; each card re-enables them.

## Reward system

`const { rewardXp } = useReward()`;
`rewardXp({ xp, anchor?, levelUp?: { level, unlocked? }, achievements?: [{ name }] })`. `anchor` is an element (its
centre is used) or a viewport point `{ x, y }`; default: the screen centre.

A provider at the root does four things:

1. **Merges** gains that arrive within **400 ms** into one: the first call opens the window and measures the anchor
   **at once** (the element may be gone when the window closes); later calls add their XP, merge the level-up (the
   higher level, the union of unlocks) and append achievements.
2. **XP burst**, when the window closes and XP > 0:
   - 8 to 12 dots of 6 px at the anchor, each with a random `--dx` / `--dy` of ±40-70 px, every third one aqua, the
     rest lime, using `animate-xp-burst`.
   - A chip (`+N XP` with a 16 px bolt: pill on `surface-2` at 90 %, lime-ink bold display font 14 px, `nowrap`,
     lime ring 50 %, `shadow-glow`; padding 4 px vertical, 6 px left, 10 px right, 4 px gap) that flies to the target
     in **700 ms** with the glide easing.
   - **Centring.** The anchor and the target are points. The chip's moving wrapper is `position: absolute` at
     `left: 0; top: 0` of the fixed overlay and is animated with x / y transforms to those points; the chip inside it
     is translated by -50 % / -50 %, so its **centre** sits on the animated point. Each dot is `position: absolute`
     at `left: anchor.x; top: anchor.y` with a -3 px margin on the left and top (half its 6 px). Without these offsets
     the chip lands half its width to the right of the XP bar and the dots burst from a point beside the tap.
   - **How the chip finds the HUD.** It queries every `[data-xp-target]` in the document and takes the **first whose
     bounding box has a non-zero size**: the desktop XP bar is `display: none` on phones and is skipped, and the 2 px
     line on the mobile top bar is taken instead. If none is visible it falls back to a point near the top-right
     corner (`x = viewport width - 72, y = 28`).
   - **The flight path** is an arc, not a line: three keyframes (start, mid, end) for x and y, where the mid point is
     the midpoint of the chord pushed sideways by 18 % of the chord's length along the perpendicular that points up
     the screen, and never above y = 16. Scale .6 → 1.1 → .55; opacity 0 → 1 (at 12 %) → 1 (at 85 %) → 0.
   - On landing the burst is removed and the target **pulses**: a 520 ms Web Animations `filter` animation with the
     glide easing, `none` → `brightness(1.45) drop-shadow(0 0 8px lime/.8)` → `none` (skipped with reduced motion).
3. **Toast**, 2.5 s: visible for gains >= 50 XP or any achievement. Smaller gains render the text `+N XP` as
   `sr-only` in the same `aria-live="polite"` region: announced, not shown.
   - Contents: a 28 px glowing icon (a lime bolt when there is XP, otherwise a gold trophy), then `+N XP` in lime-ink
     bold display font 18 px and one "Achievement unlocked: <name>" line each (12 px, `ink-soft`, the name semibold in
     `ink-title`).
   - Card: a row with a 12 px gap, `rounded-2xl`, `surface-2` at 95 % + `backdrop-blur-md`, a 1 px lime ring at 40 %,
     shadow `0 16px 40px rgb(0 0 0/.35), 0 0 24px rgb(lime/.2)`, padding 12 px vertical / 16 px horizontal, max width
     384 px.
   - Motion: enters with opacity 0 → 1, y 12 → 0, scale .96 → 1 in 240 ms glide; leaves upwards (y -8, scale .98).
   - Position: the region is fixed and `pointer-events: none`; on phones bottom centre, 84 px + the bottom safe-area
     inset above the bottom edge, with 16 px side padding; from `md` at `top: 80px; right: 24px`, right-aligned.
4. **Level-up modal**, opened when the chip lands (at once when there was no XP):
   - Scrim `surface-void` at 80 % + `backdrop-blur-md`, fades 200 ms, scrolls vertically on a short screen,
     `overflow-x: hidden` so the rays never widen the page. Clicking it closes.
   - Rays behind the badge: a 540 px circle of `repeating-conic-gradient(rgb(iris/.34) 0 5deg, transparent 5deg
     18deg)`, masked by `radial-gradient(circle, #000 16%, transparent 62%)`, rotating once per 20 s.
   - `LevelBadge xl` entering with `animate-iris-open`; "LEVEL UP" (14 px display, tracking .3em, `ink-soft`); the
     heading "LEVEL N" in `bg-flare-ink` gradient text, 48 px bold; an optional list of "Unlocked: ..." rows; one
     full-width **Continue** CTA.
   - A real dialog: `role="dialog" aria-modal="true"`, labelled by the heading, focus trapped, Continue focused, Esc
     / scrim click / Continue close it (LAYOUT-NAV.md §6).

Details:

- The burst overlay is `pointer-events-none fixed inset-0 overflow-hidden`, `aria-hidden`, portalled to `<body>`: a
  celebration never blocks input.
- Reduced motion: no dots and no flight; the chip fades in 40 px above the source, holds and fades out over the same
  700 ms. The badge appears without the rotation.
- z-order of the burst, the reward toast and the level-up modal: LAYOUT-NAV.md §1.
- All timers are tracked and cleared on unmount.
- Turning a server reward into these calls, and patching the HUD when the chip lands: GAMIFICATION.md §10.

## Hooks worth having

- **Theme** `{ theme, toggleTheme, setTheme }`. The DOM (`data-theme` on `<html>`) is the source of truth, read with
  `useSyncExternalStore` and a `MutationObserver` on that attribute, so every consumer updates without a context
  provider. Applying a theme sets the attribute, toggles the `dark` class, updates the `theme-color` meta
  (`#05060A` / `#EEF1F8`) and writes `localStorage.theme` inside try/catch (storage can be blocked).
- **Modal focus** `(dialogRef, onClose, initialFocus?)`: LAYOUT-NAV.md §6.
- **Media query** `(query) → boolean`: `useSyncExternalStore` over `matchMedia`, with a `change` listener.
- **Dismiss** `(open, containerRef, onDismiss(reason))`: while open, a `pointerdown` outside the container or Escape
  calls back with `'outside'` or `'escape'`; for non-modal popovers. Keep the callback in a ref so the listeners are
  not re-bound on every render.

## Root providers

Wrap the app, outermost first: the data-cache provider, `MotionConfig reducedMotion="user"`, the router, the reward
provider, the toast provider. Both providers portal their overlays to `<body>`, outside `#root`, so they stay usable
while a dialog makes `#root` inert.

## The gallery page

Build a development-only route (`/dev/ui`, registered only in development builds) **before any product page**:

- Sections with anchors: Icons (every icon at 24 px + a tone strip), Buttons (every size x variant x state), Progress
  (rings, XP bar, level badges, streak pills), Cards, Path (every node state, both layouts), Quests, Chips,
  Achievements, Controls, Rewards (buttons that trigger a 10 XP and a 60 XP gain, a level-up, an achievement), Toasts.
- A sticky header with a theme toggle and a live `XpBar` marked `data-xp-target`, so the burst has somewhere to
  land; credit the XP to that bar 700 ms after the trigger, when the chip arrives.
- Each example in a labelled `<figure>` with a mono caption naming the props.
- Exclude the gallery's folder from Tailwind's `content` in production builds, so gallery-only utilities never ship.

It is the fastest way to check both themes, 320 px width, keyboard focus and reduced motion for every component at
once, and it is where a new icon set is judged.
