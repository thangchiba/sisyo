# g6-style motion

Easings, every animation and its keyframes, the reduced-motion rule and the few JavaScript loops. The rules for when
to use which are in `SKILL.md` (Motion rules); this file holds the numbers.

## 1. Easings and the reveal

| Token | Value | Use |
|---|---|---|
| `--ease-glide` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entrances, hovers, list and tour transitions |
| `--ease-pop` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Things that land with a small overshoot: toast, pass, switch knob, icon tile hover scale |

Hover on cards: `transition-[transform,box-shadow] duration-300 ease-glide hover:-translate-y-1 hover:shadow-float`
(benefit cards `-translate-y-0.5`); the icon tile inside scales to 110 % with `ease-pop`.

**Reveal** (below the fold, framer-motion): `initial={{ opacity: 0, y: 16 }}`, `whileInView={{ opacity: 1, y: 0 }}`,
`viewport={{ once: true }}`, 0.5 s, glide ease, optional `delay` (tile `index × 0.08`, a 2-column grid
`(index % 2) × 0.06 + floor(index / 2) × 0.05`). With reduced motion: no delay. About ten lines; never
use it on the hero (see §2).

## 2. Animation tokens (`@theme`)

| Utility | Value | What it does |
|---|---|---|
| `animate-rise` | `rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both` | First-paint entrance: from `opacity 0, translateY(18px)` to none. Stagger with an inline `animationDelay` of `0.08 s + 0.09 s × step`. |
| `animate-flow` | `flow 5s ease-in-out infinite` | `background-position` 0 % 0 % → 100 % 100 % → back; with `bg-[length:200%_200%]` a light band travels through a metallic gradient |
| `animate-shimmer` | `shimmer 2.2s cubic-bezier(0.22, 1, 0.36, 1) infinite` | A band crossing: `translateX(-120%)` → `translateX(260%)` |
| `animate-glow-pulse` | `glow-pulse 2.4s ease-in-out infinite` | Opacity .5 → 1 → .5 with scale 1 → 1.1 → 1: the halo behind a logo or a play button |
| `animate-pop-in` | `pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both` | 0 % `opacity 0, scale(.6)`, 60 % `opacity 1, scale(1.08)`, 100 % `scale(1)`: dialogs (`open:animate-pop-in`) |
| `animate-aurora` | `aurora 16s ease-in-out infinite alternate` | 0 % `translate3d(0,0,0) scale(1)`, 50 % `translate3d(5%,-4%,0) scale(1.08)`, 100 % `translate3d(-4%,5%,0) scale(.95)`: soft pools of light |
| `animate-drift` | `drift 6s ease-in-out infinite` | `translateY` 0 → -10px → 0: floating chips and phones (offset the phase with a negative `animation-delay`) |
| `animate-marquee` | `marquee 40s linear infinite` | `translateX(0)` → `translateX(-50%)` over a row duplicated twice |
| `animate-tap` | `tap 5s ease-out infinite` | A finger tap: 0–28 % `opacity 0, scale(.4)`; 32 % `opacity .85, scale(.6)`; 48–100 % `opacity 0, scale(1.9)` |
| `animate-toast` | `toast 5s cubic-bezier(0.34, 1.56, 0.64, 1) infinite` | 0–36 % `opacity 0, translateY(14px) scale(.92)`; 44–86 % visible, no transform; 94–100 % `opacity 0, translateY(-6px)`. Same 5 s clock as `tap`, so it answers the tap. |
| `animate-scan` | `scan 2.6s ease-in-out infinite` | `translateY(0)` → `translateY(var(--scan-travel, 100%))` → back. Set `--scan-travel` to the height the line runs over (e.g. `[--scan-travel:5.9rem]` over a 104 px QR). |

Large soft light is always a radial gradient (`bg-[radial-gradient(closest-side,rgb(242_199_110/.32),transparent)]`)
on a rounded div with `animate-aurora`, never `filter: blur()`: blur on big layers is what makes phones stutter.

## 3. Story loops of the "N ways" tiles

Each loops on its own clock. Their **static style is the end state** (the card on the phone, the page open, the pass
up): with reduced motion only that static style stays (§6). Design every new loop that way.

**NFC** (4.8 s; card on a glide ease, rings ease-out, banner on the pop ease, page ease-in-out):

| Class | Static style | Keyframes |
|---|---|---|
| `.nfc-card` | `transform: rotate(-10deg)` | 0 % `opacity 0, translate(-75%, 35%) rotate(-22deg)`; 12 % `opacity 1`; 32–72 % `opacity 1, rotate(-10deg)`; 92–100 % back to the 0 % state |
| `.nfc-ring` | `opacity: 0` | 0–31 % `opacity 0, scale(.3)`; 36 % `opacity .9, scale(.5)`; 58–100 % `opacity 0, scale(1.9)`. Two rings, the second `animation-delay: .18s`, thinner border |
| `.nfc-banner` | (visible) | 0–36 % `opacity 0, translateY(-140%)`; 44–88 % visible; 96–100 % hidden again |
| `.nfc-page` | (visible) | 0–52 % `opacity 0`; 62–90 % `opacity 1`; 100 % `opacity 0` |

**Wallet** (5.2 s; pass on a glide ease, QR ease-in-out, tap ease-out):

| Class | Static style | Keyframes |
|---|---|---|
| `.wallet-pass` | (risen) | 0–24 % `translateY(var(--stack-y, 58%))`; 38–84 % `none`; 96–100 % back in the stack |
| `.wallet-qr` | (visible) | 0–34 % `opacity 0, scale(.8)`; 44–84 % visible; 92–100 % `opacity 0` |
| `.wallet-tap` | `opacity: 0` | 0–12 % `opacity 0, scale(.4)`; 16 % `opacity .85, scale(.6)`; 30–100 % `opacity 0, scale(1.8)` |

**Value flip** (6 s, glide ease; a title that changed, static = the new one):
`.swap-out` static `opacity 0`; 0 % `opacity 0`, 6–38 % visible, 46–100 % `opacity 0, translateY(-110%)`.
`.swap-in` 0–38 % `opacity 0, translateY(110%)`, 46–92 % visible, 100 % `opacity 0`.

**An edit going live** (3.6 s): `.fill-bar` (glide) 0 % `scaleX(0)`, 45–88 % `scaleX(1)` opacity 1, 100 % opacity 0
(`origin-left`); `.fill-tick` (pop) 0–42 % `opacity 0, scale(.7)`, 52–90 % visible, 100 % `opacity 0`.

## 4. Lines of light meeting at one card

SVG under the tile row (desktop only), `viewBox="0 0 1000 120"`, one path per tile from its centre to the middle:
`M{x} 0 C {x} 80, 500 30, 500 120` with `x` = 125, 375, 625, 875 for four columns. Each path is drawn twice with
`pathLength="100"`:

- `.way-line`: `fill: none; stroke: var(--c-way-line); stroke-width: 1.5; stroke-dasharray: 1 2.2` (dotted).
- `.way-light`: `fill: none; stroke: var(--c-way-light); stroke-width: 3; stroke-linecap: round;
  stroke-dasharray: 14 200; stroke-dashoffset: 14; filter: drop-shadow(0 0 6px var(--c-way-glow));
  animation: way-light 2.8s cubic-bezier(0.45, 0, 0.55, 1) infinite` with `stroke-dashoffset` 14 → -100, and a
  delay of `i × 0.35 s` per path so the lights arrive one after the other.

## 5. A field filled by the app (OCR, autofill)

- `.fill-in`: `animation: fill-in 1.1s cubic-bezier(0.22, 1, 0.36, 1) both`. 0 %: `color: transparent;
  text-shadow: 0 0 10px var(--c-gold-ink); background-color: rgb(242 199 110 / .16); box-shadow: 0 0 0 3px
  rgb(242 199 110 / .55), 0 0 22px rgb(242 199 110 / .4)`. 45 %: `color: transparent; text-shadow: 0 0 3px
  var(--c-title)`. 100 %: `text-shadow: 0 0 0 transparent`. The text comes in from a blur and the field glows gold
  once.
- `.scan-down`: a line running down over a photo while it is read (absolute, `h-0.5`, in a relative box).
  `top: 0; animation: scan-down 1.4s ease-in-out infinite alternate`, `top` 0 → `calc(100% - 2px)`.

The behaviour around it is in `sections.md` (Small controls).

## 6. Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important; animation-iteration-count: 1 !important;
    transition-duration: 1ms !important; scroll-behavior: auto !important;
  }
  .animate-rise { animation-delay: 0s !important; }
}
```

1 ms, not `animation: none`: end states with `both` fill still apply (the hero text is visible at once), and story
loops (no fill) fall back to their static end state. Only the entrance loses its delay: a real delay elsewhere may be
a fallback timer. In JavaScript, `useReducedMotion()` turns off the pointer tilt, the scroll spread and the typing
loop, and the Reveal delay.

## 7. JavaScript loops (only while visible)

- **Typing address** (URL tile): `useInView(ref, { amount: 0.6 })` and not reduced motion → type one character every
  90 ms with a 1 px blinking caret, then "loading" (a `bg-cta` bar `h-0.5` scaling 0 → 1 over 700 ms, `origin-left`),
  after 800 ms "done" (bar fades, the mini page fades in over 500 ms), next round 3.6 s after typing ended. Off screen
  or reduced: the full address and the page, still. Clear every interval and timeout in the effect's cleanup.
- **Product tour**: plays only after a press (▶ or a step) and only while `useInView(ref, { amount: 0.4 })`; see
  `sections.md` §5.
- **Pointer tilt / scroll spread** (hero): framer-motion `useMotionValue` + `useSpring` and `useScroll` +
  `useTransform`; numbers in `sections.md` §1.
- **Lazy libraries**: anything heavy for a decorative stage (the QR generator) loads with `import()` when the element
  comes near (`useInView(ref, { once: true, margin: '200px' })`), never with the page.
