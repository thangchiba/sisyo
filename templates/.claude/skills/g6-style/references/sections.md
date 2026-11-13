# g6-style section blueprints

Each blueprint: what the section is for, its layout, its motion, and the reference implementation in
`components/` (React + Tailwind v4 + framer-motion, from the Hokidon homepage). The components use that project's
helpers; swap them for the target project's:

| In the components | What it is | Replace with |
|---|---|---|
| `defineMessages` / `useMessages` / `useLocale` | per-component copy in ja / en / vi | the project's i18n, or plain strings |
| `Icon name="…" tone="…"` | duotone icon (Lucide shapes) | `lucide-react` icons, colour from the tone |
| `Reveal` | fade + rise when scrolled into view (framer-motion `whileInView`, once; reduced motion = no delay) | same idea, ~10 lines |
| `LogoMark` | the brand mark | the project's logo |
| `buttonClasses()`, `HERO_CTA`, `CTA`, `SECONDARY_CTA` | keycap buttons (gold key with a 4 px depth that the face travels 3 px into) | see "Buttons" below |
| `VISUALS` | one map of every image / video + alt per language | keep the pattern: one file, all media |
| tone names lime / aqua / iris / flare | = gold / champagne / bronze / rose | the alias block in tokens.css maps them |

## Page order (a product homepage)

1. Hero (headline + lead + CTA + video button, 3D phone stack) → 2. Strip (marquee) → 3. "N ways" animated tiles
meeting at one card → 4. "More than X" (product visual + benefit grid) → 5. Product tour on the real screens
(click to play) → 6. Plans (free featured + premium black-and-gold) → 7. Products row (scrolls sideways) →
8. FAQ → 9. Closing CTA on a photo. Bands (`bg-surface/55` + a `.led-line` on the top edge) alternate with plain
sections so the page has rhythm.

## Section shell — `LandingSection.tsx`

`<section id aria-labelledby class="relative overflow-x-clip py-16 md:py-24">`, content `max-w-6xl px-4`.
Heading block: eyebrow (Latin, tracking 0.22em, uppercase, gold ink, a 2 rem `.led-line` dash on each side when
centred) → h2 (2xl / 3xl / 4xl, bold) → lead (muted, max-w-2xl). `overflow-x-clip` (not hidden) so glows never
widen the page and sticky still works. Japanese headings: `Phrases` makes each part up to 、 / 。 an inline-block
so a line never breaks inside a word; for body text in narrow columns use `[word-break:auto-phrase]` +
`text-pretty` instead (inline-block phrases leave ragged lines in a 250 px column).

## 1. Hero — `Hero.tsx`, `HeroVisual.tsx`

- Two columns from `lg` (text 1fr, visual 1.05fr), stacked on phones. A skylight div at the top
  (`bg-(image:--c-skylight)`, 70 % high, `-z-10`).
- Text rises in with CSS on first paint: `animate-rise` + inline `animationDelay` 0.08 s + 0.09 s × step. Never
  hide hero text behind JavaScript (it is the LCP candidate and the first thing people read).
- Second headline line: `bg-gold-ink text-gradient animate-flow bg-[length:200%_200%]` (metallic text with a light
  band moving through it).
- Buttons: the gold CTA (`flow` on this one only) + an outline button that opens the intro video in a dialog
  (`VideoDialog.tsx`, `PlayGlyph.tsx`). When there is no video yet, the second button scrolls to the tour.
- Visual: three phones with REAL screen captures — the main screen in front (`priority`, the LCP image, no
  entrance animation of its own), two others behind, rotated ±8°, drifting on their own phase. The stack tilts
  towards a mouse pointer (`useMotionValue` + `useSpring`, ±10° Y / ±8° X, mouse only) and spreads / sinks as the
  hero scrolls away (`useScroll` + `useTransform`). Chips float at the edges (URL, "QR", "no app"); a looping tap
  ring on a button inside the front screen plus a toast that answers it (`animate-tap` / `animate-toast`, same
  5 s clock). Floating things sit at `translateZ(90px)`, above the front phone's 60 px, or the phone hides them.
- Aurora: three radial-gradient pools (no blur filter — cheap on phones) drifting behind (`animate-aurora`).

## 2. Strip — `Marquee.tsx`

Pill items (icon + short benefit) in a row duplicated twice, `animate-marquee` (translateX −50 %), paused on hover,
a mask fading both ends, a `.led-line` above and below. `aria-hidden` (every item is said again on the page) and
`data-scroll-x` (wide on purpose).

## 3. "N ways" tiles meeting at one card — `FourWays.tsx`

The strongest section of the style: each way to use the product is a tile whose top is a small looping story
("stage", h-40, `bg-surface-2/70` + a gold radial at the top) that SHOWS how it works, then a number, a title and
two lines that SAY it. Stages built in CSS, no video:
- QR: a real QR of the site (generated client-side with `qrcode` when the tile comes near — scanning it opens the
  site, never a 404) inside camera corner brackets, a scan line (`animate-scan`, `--scan-travel`), a toast.
- NFC: a card slides to the back of a CSS phone, rings spread from the contact, a notification drops in, the
  page fades in (`.nfc-*`).
- Wallet: a phone with a stack of passes; a tap; the brand pass rises and shows its QR (`.wallet-*`).
- URL: a browser whose address types itself (a JS loop that only runs while in view), a progress line, the page.
Under the row (desktop) an SVG of dotted lines from each tile centre to one point, a light running down each
(`.way-line` / `.way-light`, `pathLength="100"`, staggered delays), meeting a card for "your page" wrapped in
`.g6-sweep` (a ring of light turning). Phones: an arrow chip instead of the lines. Then one closing line in metallic
gold text. Keep labels like "subscription" off these tiles: they explain, they do not sell.

## 4. "More than X" — `PersonalPage.tsx`

Left: the product (a phone with the real screen) with three glass chips floating around it (`animate-drift` on
different phases): one per thing the product does (a post, a card being read under a scan line, a contact added).
Right: a 2-column grid of benefit cards (icon tile in its tone, title, body; a paid feature gets a small badge
like 「プラン特典」 rather than the plan's name). One line about how it goes with the old way (e.g. paper cards).

## 5. Product tour — `Walkthrough.tsx`

A phone that shows the real app step by step (short silent screen recordings, ~5 s each, 540 px wide, `-an`),
the list of steps beside it (current one expanded with its description and a progress bar that fills with the
clip). **Nothing plays or loads until the visitor presses ▶ or a step**: posters (stills) until then,
`preload="none"`; then it advances on `ended`, runs one pass while the section is on screen, rests on the first
step; a pause button. Never autoplay videos on a page: it costs every visitor's data and battery.

## 6. Plans — `Pricing.tsx`

Free first and featured (gold border + glow, "Start here" badge, ¥0, its benefits listed — show that free is
enough). The paid plan as a black-and-gold card in both themes: `data-theme="dark"` on it so the dark tokens apply
inside, `bg-[linear-gradient(160deg,#1e1912,#0b0906)]`, wrapped in `.g6-sweep`; the plan name in `bg-foil
text-gradient`; monthly and yearly prices read from the product catalogue, the yearly saving COMPUTED from them
(`12 − yearly / monthly` months), never typed in the copy; its CTA in `bg-foil` with a 4 px dark-gold depth.

## 7. Products row — `Products.tsx`

A row that scrolls sideways (`flex snap-x snap-mandatory overflow-x-auto`, cards `w-[82%] max-w-[340px]` on phones,
`sm:w-[340px]`), centred with `sm:mx-auto sm:w-fit sm:max-w-full` while it fits, prev / next arrows only once it
overflows (ResizeObserver + scroll position). Each card: the product image on a gold radial, name, one line, the
price big (`font-display text-4xl tabular-nums`) + tax note, three ticks, an outline CTA. Adding a product = one
entry in `ITEMS`. `data-scroll-x` on the row.

## 8. Closing CTA — `ClosingCta.tsx`

A rounded block (2 rem) over a photo (an atrium in warm gold light works: generated, see imagery.md) at 80 %
opacity under a dark radial overlay, white headline with the second part in `bg-foil text-gradient animate-flow`,
the gold CTA (no travelling light: that is the hero's), "photo for illustration" in tiny text in a corner.

## Buttons (if the project has none)

Gold key: `bg-cta font-bold text-on-gold` + `shadow-[inset_0_1px_0_rgb(255_255_255/.6),0_4px_0_#9a6f22,0_0_22px_rgb(242_199_110/.35)]`,
hover lifts 1 px and the glow grows, active travels 3 px (`active:translate-y-[3px]`, depth 1 px). Outline key:
`bg-surface ring-1 ring-line-strong` + `0_4px_0_var(--c-keycap-depth)`. Heights 36 / 44 / 48 px, radius 1 rem,
`inline-flex max-w-full items-center justify-center gap-2` — `max-w-full` so a long label (English, Vietnamese…)
never makes the button wider than its box.

## Small controls

- `Switch.tsx`: `role="switch"`, gold key track when on (`bg-cta shadow-glow-sm`), neutral groove off, the knob
  slides 1.25 rem with the pop ease.
- A field filled by the app (OCR, autofill — `FormFillFromApi.tsx`): fill the fields one after the other
  (~260 ms apart), give each the `.fill-in` class (text from a blur to sharp, a gold ring that fades) and a new
  React `key` so the animation restarts; never overwrite what the user typed; while waiting, a scan line over the
  photo and a status line that moves on every ~1.8 s so a few seconds never look stuck. (The component uses the
  class names `.meishi-fill` / `.meishi-scan`; in tokens.css they are `.fill-in` / `.scan-down`.)
