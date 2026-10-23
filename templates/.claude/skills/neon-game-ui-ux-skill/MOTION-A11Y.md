# Motion and accessibility

The style is loud by design (neon, glow, celebration). These rules are what keep it usable: every animation has a
job and a budget, and every state is readable without colour, without motion and without a pointer. Token names
are those of `TOKENS.md`.

## 1. Easing and duration

| Use | Easing | Duration |
|---|---|---|
| Press | `ease-glide` `cubic-bezier(.22,1,.36,1)` | 120 ms |
| Hover, focus, colour change | `ease-glide` | 180-200 ms |
| Enter (popover, toast, sheet, menu item) | `ease-glide` | 160-280 ms |
| Fill, slide, count-up (XP bar, ring, numbers) | `ease-glide` / cubic ease-out | 600-700 ms |
| Celebration (pop-in, badge open, chip flight) | `ease-pop` `cubic-bezier(.34,1.56,.64,1)` for pops, `ease-glide` for flight | 450-700 ms |
| Ambient loop | `ease-in-out` / linear | 2.4-6 s per cycle (rays: 20 s) |

- `ease-pop` overshoots. It is reserved for **rewards** (a check appearing, a badge earned, a chest ready). On
  ordinary UI (menus, cards, navigation) overshoot reads as toy-like and tiring.
- Exits are faster than entrances (about 160 ms) and never bounce.
- With `motion/react`, pass the glide curve as `ease: [0.22, 1, 0.36, 1]`. Springs are used in two places only: the
  shared-layout pill of the segmented control (`bounce: 0.18, duration: 0.35`) and the dial menu's items flying out of the dial
  (`stiffness: 420, damping: 26`, 35 ms stagger), the one piece of navigation that is allowed a small overshoot.

## 2. What animates, and how

Animate **only** `transform`, `opacity` and `background-position` (plus `stroke-dashoffset` on the ring and the
registered `--neon-angle`). These stay off the layout path.

| Want | Do | Do not |
|---|---|---|
| A bar filling | `translateX((ratio - 1) * 100%)` on a full-width fill inside an `overflow-hidden` track | animate `width` |
| A glow appearing on hover | put the shadow on `::after`, animate its `opacity` | animate `box-shadow` on the card |
| A pulsing halo | a blurred sibling element with `animate-glow-pulse` | pulse the control's own shadow or scale |
| A key press | `translate-y-[3px]` + swap the depth shadow | animate `height` / `margin` |
| A split bar changing | `flex-grow` transition (one cheap layout, 300 ms) | re-render with a new width each frame |

Never use a global `* { transition: all }`: it animates layout properties, makes theme switching smear, and fights
`motion/react`. Transitions are listed per property (`transition-[transform,box-shadow,background-color]`).

## 3. What never animates

- Body text, headings, table rows, form fields (no entrance animation for content the user came to read).
- Page transitions: a route change is instant; only the skeleton → content swap happens.
- Layout: nothing moves other content when it animates.
- Anything during typing or a timed task, except direct feedback to that input.
- Focus rings: they appear instantly.

## 4. Loop budget

Infinite animations are the main risk of this style.

- **At most two ambient loops visible at once** (for example: the CTA gradient drift and the current step's sweep
  ring). A third loop makes the screen feel restless and costs battery.
- Prefer finite variants: `animate-float-3` (three cycles, then rest), `animate-shimmer-once` (one sweep per value
  change). A loop is justified only while something **waits for the user** (a claimable reward, the current step,
  a live recording) or is loading.
- One loop per component: the current path node has the sweep ring and a static halo, not both pulsing.
- Loops stop when their reason ends (claimed → no shimmer). Do not leave a "new" pulse on something the user has
  already seen.

## 5. Reduced motion

Three layers, all needed:

1. **CSS**, at the end of the base stylesheet, outside any layer:

   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 1ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 1ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```

   Durations are 1 ms rather than `none`, so end states still apply (a `forwards` animation lands on its last frame)
   and `animationend` / `transitionend` still fire.
2. **`<MotionConfig reducedMotion="user">`** at the root: `motion/react` drops transform and layout animations and
   keeps opacity.
3. **Component branches** where the motion carries meaning: the XP chip does not fly, it fades in above the source
   (`useReducedMotion()`); count-ups set the final number at once; the level-up badge appears without rotating;
   ambient pulses carry Tailwind's `motion-safe:` variant (`motion-safe:animate-glow-pulse`).

Under reduced motion the user still gets **every state change**: colours, icons, text, toasts and the level-up
dialog remain. Only travel, bounce and loops go.

Offer an in-app "Calm mode" switch as well if the audience includes people who cannot change OS settings (shared or
managed devices); it sets the same behaviour from a class on `<html>`.

## 6. Colour contrast

Targets: WCAG 2.2 AA. Text 4.5:1 (large text >= 24 px or bold >= 18.66 px: 3:1); meaningful graphics, control
boundaries and focus indicators 3:1.

| Rule | Reason / number |
|---|---|
| Text on a neon fill is `text-on-neon` (`#05060A`) | 6.2-16.8:1. White on neon is 1.2-3.3:1 |
| `ink-muted` is the lightest colour for text that must be read | 5.3:1 on a card, 4.5:1 on `shade`. `ink-faint` (2.5:1) is for disabled and decoration |
| Coloured text uses `neon-ink-*` | Equals the neon on dark; 5.2-6.0:1 on white in the light theme, where raw neon is about 1.2:1 |
| Coloured text is not placed on `surface-3` in the light theme | The ink stops were measured on white (5.2-6.0:1); on the light `shade` they drop below 4.5:1 |
| Neon text on a 12 % tint of itself (chips) | iris 4.9, flare 5.6, coral 5.4: passes; do not raise the tint |
| Ring and arc colours on light come from the `-ink` stops | A lime arc on a pale track disappears |
| Disabled = `opacity-40 saturate-0` | Deliberately below contrast targets, and never the only cue: the control is also non-interactive and announced as disabled |
| No glow on body text | `text-shadow` blurs glyph edges; glow is for shapes |

Check both themes. The light theme is where neon designs fail: every review of a new page includes a light-theme
pass on the gallery and on the page.

## 7. Colour is never the only signal

| State | Colour | Plus |
|---|---|---|
| Correct / wrong | lime / coral | check / cross icon, text |
| New / known / mastered | flare / aqua / gold | "NEW" tag / underline style / dot, and an `sr-only` suffix |
| Streak done / at risk / lapsed | ember / amber / grey | glow / short float / dimmed flame, and the label text |
| Quest active / complete / claimed | tone / gold / dimmed | reward chip / Claim button / "Claimed" + check |
| Locked | grey | lock badge, `aria-disabled`, hint |
| Active nav item | tone | a filled, ringed pill behind the icon (inactive tabs have none), `aria-current` (from the router's NavLink) |
| Error | coral | warning icon, `role="alert"` text |

## 8. Targets and focus

- **44x44 px minimum** for every interactive element (WCAG 2.5.8 asks 24; 44 is the touch-comfortable size this
  system uses). When the visual is smaller (36 px disc, 32 px chip, 36 px segmented option), extend the hit area
  with a pseudo-element: `relative after:absolute after:-inset-1 after:content-['']`. Neighbouring extended areas
  must not overlap.
- **Focus ring**: global `:focus-visible { outline: 2px solid rgb(var(--c-aqua-ink)); outline-offset: 2px }`.
  Aqua is the focus colour everywhere (13.5:1 on dark; the ink stop on light); lime means selection, so the two are
  never confused.
  - Composite controls draw the ring on their visible part (`group-focus-visible:outline` on the round button's
    disc, on the switch's track) and suppress it on the wrapper.
  - Controls inside a clipped container use `focus-visible:outline-offset-0` (segmented options) or a negative
    offset (menu items) so the ring is not cut off.
  - Never `outline: none` without a replacement, and never rely on glow as the focus indicator.
- **Focus is never hidden under the bars**: `scroll-padding-top/bottom` on `html` from `--shell-top` /
  `--shell-bottom` (WCAG 2.4.11).
- **Focus management**: dialogs trap and restore focus (LAYOUT-NAV.md §6); when a control removes itself
  (Claim → Claimed, Delete), move focus to a stable neighbour or the section heading (`tabIndex={-1}`); a button that
  turns disabled while focused stays focusable with `aria-disabled` (`focusableWhenDisabled`, COMPONENTS.md).
- **Keyboard**: radio groups and menus use arrow keys with roving `tabIndex`; Escape closes the top-most layer only;
  a "Skip to content" link is first in the tab order.

## 9. Screen readers

- Icons are `aria-hidden` unless they are the only content; then the **control** has `aria-label`.
- Composite HUD pieces are `role="img"` with a full sentence label ("12-day streak, done today"); their visible
  digits are `aria-hidden` to avoid double reading.
- Progress: `role="progressbar"` with `aria-valuenow` and, where the raw number is not meaningful,
  `aria-valuetext` ("Level 7: 120 of 500 XP").
- Animated numbers: an `sr-only` copy holds the final value; the animated one is `aria-hidden`.
- Live regions are mounted before they receive text (toasts, XP announcements). Small XP gains are announced politely
  without a visual toast; errors are assertive.
- Celebration overlays are `aria-hidden` and `pointer-events-none`; the level-up is a real dialog with a heading.
- Loading: `aria-busy` on the region or button; skeletons are `aria-hidden`.

## 10. Review checklist for a new screen

- [ ] 320 px wide: no horizontal scroll, labels fit, targets >= 44 px.
- [ ] Light theme: every coloured text and line readable; no raw neon text.
- [ ] Keyboard only: reach and operate everything; focus always visible; Escape closes layers in order.
- [ ] Reduced motion on: nothing travels or loops; every state still shown.
- [ ] Count the loops on screen at rest: two or fewer.
- [ ] Count the glows at rest: each one marks something active, current, or waiting.
- [ ] Each tone on the screen means what it means elsewhere.
- [ ] Loading and error states exist and keep the layout's boxes.
