# g6-style section blueprints

Each blueprint: what the section is for, its layout, its motion, and the measurements that make it look right. The
reference stack is React + Tailwind v4 + framer-motion (`next/image` for pictures); class names below use the tokens
of `tokens.md` and the animations of `motion.md`. Write the components in the project's own structure, with its
i18n, icon set (duotone Lucide shapes work), logo and button helpers.

Two patterns every section follows:
- **One media map.** Every image and video of the page, with its alt text per language, in one file
  (`visuals.ts`): sections read from it, nobody hard-codes a path.
- **Copy per component** in every language the site has. Prices, limits and plan facts come from the product
  catalogue or shared constants, never typed into the copy (a missing catalogue id should fail the build rather
  than show a wrong price).

## Page order (a product homepage)

1. Hero (headline + lead + CTA + video button, 3D phone stack) → 2. Strip (marquee) → 3. "N ways" animated tiles
meeting at one card → 4. "More than X" (product visual + benefit grid) → 5. Product tour on the real screens
(click to play) → 6. Plans (free featured + premium black-and-gold) → 7. Products row (scrolls sideways) →
8. FAQ → 9. Closing CTA on a photo. Bands (`bg-surface/55` + a `.led-line` on the top edge) alternate with plain
sections so the page has rhythm.

## Section shell

`<section id aria-labelledby="{id}-title" class="relative overflow-x-clip py-16 md:py-24">` (+ `bg-surface/55` and an
absolute `.led-line inset-x-0 top-0` when it is a band), content `mx-auto max-w-6xl px-4`. `overflow-x-clip` (not
hidden) so glows never widen the page and sticky still works.

Heading block (in a Reveal, `max-w-2xl`, `mx-auto text-center` when centred; centred is the default):
- Eyebrow: Latin word, `flex items-center gap-3 font-display text-xs font-semibold tracking-[.22em] uppercase
  text-ink-gold`, a `.led-line w-8` dash before it and, when centred, after it.
- h2 `id="{id}-title"`: `mt-2 text-2xl leading-snug font-bold text-ink-title sm:text-3xl lg:text-4xl lg:leading-tight`.
- Lead: `mt-3 text-base leading-relaxed text-ink-soft`.
- Section content starts at `mt-10`.

Japanese headings and leads: split the text after each 、 / 。 and wrap every phrase in an `inline-block` span, so a
line never breaks inside a word (「プロフィー / ル。」). For body text in narrow columns use `[word-break:auto-phrase]`
+ `text-pretty` instead (inline-block phrases leave ragged lines in a 250 px column).

## Phone frame (shared)

A phone around a real screen capture (captures 900×1948: a 390 pt iPhone screen). Width from its column, height from
the screen's ratio, so it scales:
- Bezel: `rounded-[14%/6.5%] bg-[#15110b] p-[2.6%]` with `shadow-[0_0_0_1px_rgb(255_255_255/.1),inset_0_0_0_1px_rgb(255_255_255/.06),0_28px_70px_rgb(16_24_40/.3)]`;
  black in both themes. A featured phone adds a gold halo, e.g. `0_40px_90px_rgb(16_24_40/.36),0_0_70px_rgb(236_214_166/.22)`.
- Screen: `data-theme="light"` (a screen stays light like a real one), `relative aspect-[900/1948] overflow-hidden
  rounded-[11.5%/5.4%] bg-white`, the capture as `fill` + `object-cover object-top` with real `sizes`.
- The capture that can be the page's largest paint loads with `priority` and its phone has no entrance animation.

## 1. Hero

- `<section class="relative overflow-hidden">`; a skylight div at the top (`pointer-events-none absolute inset-x-0
  top-0 -z-10 h-[70%] bg-(image:--c-skylight)`).
- Grid `max-w-6xl px-4 pt-10 pb-12 gap-8`, from `lg` two columns `[minmax(0,1fr)_minmax(0,1.05fr)]`, `gap-10 pt-14 pb-16`.
- h1: `text-[34px] leading-[1.22] font-extrabold tracking-tight text-ink-title sm:text-5xl sm:leading-[1.16]
  lg:text-[3.6rem]`, two lines as blocks. The copy is an array of parts per line; each part an `inline-block` so the
  line wraps only between parts (Japanese runs parts together, other languages put a space between them, and
  between the two lines). Second line: `bg-gold-ink text-gradient animate-flow bg-[length:200%_200%]` on each part.
- Lead `mt-5 max-w-lg text-lg leading-relaxed text-ink-soft`; buttons `mt-8 flex flex-col gap-3 sm:flex-row`; a
  reassurance line `mt-6 text-sm font-bold text-ink-soft` with a check icon (e.g. "no purchase needed, viewers need no
  app").
- Every text block rises with CSS on first paint: `animate-rise` + `animationDelay` `0.08 + 0.09 × step` s (steps
  0–4: line 1, line 2, lead, buttons, note). Never hide hero text behind JavaScript (it is the LCP candidate).
- Buttons: the gold hero CTA (the only one with `flow`) + an outline button that opens the intro video in a dialog
  (label with its length, "Watch the intro (45s)") and a play glyph. No video yet: the second button scrolls to the
  tour (`#how`).
- **Visual** (`relative mx-auto h-[430px] w-full max-w-[560px] [perspective:1400px] sm:h-[540px] lg:h-[600px]`):
  - Aurora behind (`absolute inset-0 -z-10 sm:-inset-12`): three `animate-aurora` round divs, `closest-side` radial
    gradients: 62 % at top 4 % / left 6 % champagne `.34`; 58 % at right 2 % / bottom 6 % bronze `.28`, delay -6 s;
    46 % at top 26 % / right 18 % gold `.32`, delay -11 s.
  - A `preserve-3d` layer carrying the tilt and the sink. Two phones behind (`w-[35%] sm:w-[34%]`, top 13 % left
    1 % / top 10 % right 1 %, `sm:` 3 %), rotated -8° / +8°, opacity .95, entering at 0.35 s / 0.5 s, drifting with
    phases -2 s / -4 s. The front phone `top-[3%] left-1/2 w-[44%] sm:w-[42%] -translate-x-1/2
    [transform:translateZ(60px)]`.
  - Tilt (mouse only): pointer position in the box mapped -0.5…0.5 → `rotateY` -10…10°, `rotateX` 8…-8°, through
    `useSpring({ stiffness: 110, damping: 18, mass: 0.6 })`; back to 0 on pointer leave.
  - Scroll (`useScroll({ target, offset: ['start start', 'end start'] })`): back phones spread `x` 0 → -48 / +48 px,
    the stack sinks `y` 0 → 56 px. Reduced motion: no tilt, no spread.
  - A looping tap on a real button of the front screen: a span at the measured spot (percent of the capture, e.g.
    43 % across / 62.7 % down), `size-[22%]`, holding an `animate-tap` circle `bg-white/70 ring-2 ring-white`.
  - The toast that answers it (`animate-toast`, same 5 s clock) at the bottom centre: `rounded-2xl bg-[#15110b]/90
    py-2 pr-4 pl-2 text-white shadow-float ring-1 ring-white/10 backdrop-blur`, a gold icon tile (`bg-gold/20
    ring-gold/50`) + a bold line + a `text-2xs text-white/70` line.
  - Chips at the edges (URL, "QR too", "no app"): `flex items-center gap-2 rounded-2xl bg-surface/90 py-1.5 pr-3
    pl-1.5 shadow-float ring-1 ring-line backdrop-blur` with a tone icon tile (`size-8 sm:size-9 rounded-xl bg-tone/15
    ring-1 ring-tone/40 ring-inset`). Each in three wrappers: position + `[transform:translateZ(90px)]` →
    `animate-rise` (delays 0.7 / 0.85 / 1 s) → `animate-drift` (phases -1 / -3 / -4.5 s). On phones only the URL
    chip, tucked in the corner; the others from `sm`.
  - Floating things sit at `translateZ(90px)`, above the front phone's 60 px, or the phone hides them.

## 2. Strip (marquee)

`aria-hidden` (every item is said again on the page), `data-scroll-x`, `relative overflow-hidden py-3`, a
`.led-line` at the top and the bottom. Inside, `animate-marquee flex w-max` with
`[mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]` and
`hover:[animation-play-state:paused]`, holding the same `<ul>` twice (`flex shrink-0 gap-3 pr-3`) so the loop is
seamless. Items: `rounded-full bg-surface/80 px-4 py-2 text-sm font-bold whitespace-nowrap text-ink-title shadow-edge
ring-1 ring-line` with an 18 px icon; short benefits (free, no app, share by URL, QR, save contact, update anytime,
the languages).

## 3. "N ways" tiles meeting at one card

The strongest section of the style: each way to use the product is a tile whose top is a small looping story that
SHOWS how it works, then a number, a title and two lines that SAY it. A band section; grid `grid-cols-1 gap-4
sm:grid-cols-2 lg:grid-cols-4`.

- Tile: `.g6-card .g6-glow .tone-gold group flex h-full flex-col p-3 sm:p-4` with the card hover (motion.md §1),
  revealed with `index × 0.08` s. Under the stage: `mt-4` row with the icon tile (`size-9 rounded-xl bg-tone/12
  ring-1 ring-tone/40 ring-inset`, scales on hover) and the number `01`–`04` (`font-display text-xs font-semibold
  tracking-[.16em] text-muted`); title `mt-2 text-lg font-bold`; body `mt-1 text-sm leading-relaxed text-pretty
  text-muted [word-break:auto-phrase]`. Keep labels like "subscription" off these tiles: they explain, they do not
  sell, and none of the stage pretends to be a button.
- Stage (decorative, `aria-hidden`): `relative h-40 overflow-hidden rounded-2xl bg-surface-2/70 ring-1 ring-line` +
  an inner `bg-[radial-gradient(70%_60%_at_50%_0%,rgb(242_199_110/.18),transparent_70%)]`.
- Mini phone (CSS): `rounded-[14px] bg-[#15110b] p-[3px]` with `shadow-[0_10px_30px_rgb(20_14_4/.35),0_0_0_1px_rgb(255_255_255/.08)]`,
  screen `data-theme="light" rounded-[11px] bg-[#fffdf8]` and a notch `h-1.5 w-6 rounded-full` at the top. A mini
  profile inside: 30 % cover in `linear-gradient(135deg,#f6d58e,#e2a47c)`, a round avatar (30 %) overlapping it,
  bars for name and rows.
- **QR**: a real QR of the site's home page, generated client-side (`qrcode`, SVG, margin 0, level M, dark
  `#15110b`, transparent light) when the tile comes near, so scanning it opens the site, never a 404. A 104 px white
  card (`p-2.5 rounded-xl shadow-edge`, `data-theme="light"`), camera corner brackets (four `size-4` spans with
  2 px borders in `ink-gold`, `-2` outside each corner, rounded on the outer corner), a scan line (`animate-scan h-0.5
  bg-ink-gold shadow-glow [--scan-travel:5.9rem]`) and an `animate-toast` pill at the bottom ("open page",
  `bg-[#15110b] text-white text-xs`).
- **NFC**: a mini phone (68 × 136 px) and a dark card (`h-10 w-16`, `linear-gradient(135deg,#2a2116,#120e09)`,
  `ring-1 ring-[#f2c76e]/70`, a gold chip and a tiny "NFC" in `#f6d58e`) that slides to the back of the phone
  (`.nfc-card`), two rings at the contact point (`.nfc-ring`, border `ink-gold`), a notification dropping in on the
  screen (`.nfc-banner`: white, "NFC tag" + "Open {host}") and the profile fading in (`.nfc-page`).
- **Wallet**: a mini phone (74 × 144 px) with "Wallet", two passes in the stack (`#e9dcc2→#cdb98f`,
  `#d9a27c→#a8653f`) and the brand pass (`linear-gradient(160deg,#2a2116,#120e09)`, `ring-[#f2c76e]/60`, logo + name
  in tracked `#f6d58e`, a white QR square) that rises (`.wallet-pass`, `[--stack-y:58%]`) and shows its QR
  (`.wallet-qr`) after a tap (`.wallet-tap`).
- **URL**: a browser card (`inset-3 rounded-xl bg-surface shadow-edge ring-1 ring-line`), three dots (coral, amber,
  gold), an address field with a lock in `ink-gold` where `{host}/{name}` types itself (motion.md §7), a `bg-cta`
  progress line, then the mini page.
- Under the row: on `lg` the SVG of lines of light (motion.md §4); on phones an arrow chip instead (`animate-drift
  size-10 rounded-full bg-surface text-ink-gold shadow-glow-sm ring-1 ring-gold/50`). Then "your page" in
  `.g6-sweep rounded-[1.75rem]` around a `.g6-card .g6-glow .tone-gold` (`p-5 sm:p-6`, `max-w-xl`): the logo (64 px)
  over an `animate-glow-pulse` halo, an eyebrow, `{host}/{name}` (`font-display text-lg sm:text-xl`, truncating) and
  pills of what the page holds. Then one closing line `text-xl sm:text-2xl font-bold` in `bg-gold-ink text-gradient`.

## 4. "More than X"

Grid `items-center gap-10`, from `lg` `[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-14`.
- Left (`max-w-[420px] py-6`): an aurora pool (gold `.3` → bronze `.12`) behind a phone at 56 % width with the real
  screen, and three glass chips (`rounded-2xl bg-surface/90 shadow-float ring-1 ring-line backdrop-blur`) floating
  with `animate-drift` on phases 0 / -2 / -4 s, one per thing the product does: a post (top left, 42 % wide, an image
  block + bars), a contact just added (right, at 44 %), a card being read under a scan line (bottom left, 44 % wide,
  a white `aspect-[91/55]` card with `animate-scan [--scan-travel:2.6rem]`).
- Right: `grid gap-3 sm:grid-cols-2` of benefit cards: `.g6-card .tone-{tone} p-4 sm:p-5` with the smaller hover,
  icon tile `size-10`, title `mt-3 font-bold`, body `text-sm text-muted [word-break:auto-phrase]`, an optional caveat
  `text-xs text-muted/80`. The tone follows the meaning (bronze = identity, gold = done/connect, champagne = sharing).
  A paid feature gets a small badge like 「プラン特典」 rather than the plan's name.
- Under it, one line about how it goes with the old way (e.g. paper cards), centred, `text-sm font-bold text-ink-soft`.

## 5. Product tour

A phone that shows the real app step by step (short silent screen recordings, ~5 s each, 540 px wide, `-an`), the
list of steps beside it. Grid `items-center gap-8 md:grid-cols-2 lg:gap-14`; the phone `md:order-2`, `w-[66%]
max-w-[300px] md:w-[72%]`, an aurora pool behind it, a `1 / 6` counter under it (`font-display tabular-nums`).

- All steps' media stacked in the phone: a poster (still) per step and, over it, its clip (`muted playsInline
  preload="none"`); the active one at opacity 100, the others 0 (`transition-opacity duration-500`). The last step can
  be a still that stays 4.5 s.
- **Nothing plays or loads until the visitor presses ▶ or a step.** Until then a play overlay over the phone
  (`bg-[#15110b]/10`, a 56 px play glyph over an `animate-glow-pulse` halo, a "Play the screens" pill). Once started:
  play the active clip from 0, pause every other one, advance on `ended`, play only while `useInView(…, { amount:
  0.4 })`; after the last step, rest on the first step, not started. A pause button (`size-10 rounded-full
  bg-[#15110b]/75 backdrop-blur`, two bars) at the bottom right while it runs.
- Steps (`<ol class="space-y-2">`): each a button (`rounded-2xl px-4 py-3 text-left`, `aria-current="step"` on the
  active one) with a number disc (`size-8`: active `bg-cta text-on-gold shadow-glow-sm`, done `bg-gold/20
  text-ink-gold` with a check, upcoming `bg-surface-2 text-muted ring-1 ring-line`), a label (`text-2xs font-bold
  tracking-[.14em] uppercase text-ink-champagne`) and a title. Active: `bg-surface shadow-edge ring-1 ring-gold/70`,
  its description opening with a grid-rows `0fr → 1fr` transition (500 ms) and a `bg-cta` progress bar (`h-0.5`,
  `scaleX` = clip time / duration) on its bottom edge. Others `opacity-70`, full on hover.
- A note under the list when the screens show made-up data ("demo sample, a made-up person").

## 6. Plans

Grid `mx-auto max-w-5xl items-stretch gap-5 md:grid-cols-2`, the second card revealed 0.1 s later.
- **Free first and featured**: `.g6-card .g6-glow .tone-gold border-gold shadow-glow p-6 sm:p-8`, name `text-2xl
  font-bold` with a "Start here" badge, a tagline, ¥0 (`font-display text-5xl font-bold tracking-tight tabular-nums`)
  + "monthly", its benefits listed with gold check icons (show that free is enough), the gold CTA full width at the
  bottom (`mt-auto pt-8`).
- **The paid plan as a black-and-gold card in both themes**: a `.g6-sweep rounded-card` wrapper around a `.g6-card`
  with `data-theme="dark"` (the dark tokens apply inside) and `bg-[linear-gradient(160deg,#1e1912,#0b0906)]`; the
  plan name in `bg-foil text-gradient`; monthly and yearly prices (`text-4xl`, a tax note) in a `<dl>`, both read from
  the product catalogue; the yearly saving COMPUTED from them (`round(12 − yearly / monthly)` months), never typed in
  the copy, shown as a badge and as a gift line (`tone-gold rounded-2xl bg-tone/12 p-3 text-sm font-bold
  text-tone-ink ring-1 ring-tone/40 ring-inset`) only when it is above 0; its CTA a 48 px `bg-foil` key with
  `shadow-[0_4px_0_#9a6f22,0_0_22px_rgb(242_199_110/.35)]`, pressed `active:translate-y-[3px]
  active:shadow-[0_1px_0_#9a6f22]`.
- Renewal terms and secondary products stay off the homepage. If the project tracks it, send a "pricing viewed"
  event once per visit when the section's top enters the upper 60 % of the screen (IntersectionObserver with
  `rootMargin: '0px 0px -40% 0px'`).

## 7. Products row

A band section. A row that scrolls sideways: `<ul data-scroll-x class="-mx-4 flex snap-x snap-mandatory gap-5
overflow-x-auto px-4 pt-2 pb-4 [scrollbar-width:thin] sm:mx-auto sm:w-fit sm:max-w-full sm:px-1">`, items `w-[82%]
max-w-[340px] shrink-0 snap-start sm:w-[340px]`. Centred while it fits; prev / next arrows (`size-11 rounded-full
bg-surface shadow-edge ring-1 ring-line`, disabled at each end, scroll by 340 px smoothly) only once it overflows,
from `sm`: watch `scrollLeft` / `scrollWidth` on scroll and with a ResizeObserver (4 px slack).

Each card: `.g6-card .g6-glow .tone-gold group flex h-full flex-col overflow-hidden p-5 sm:p-6` with the card hover;
the product image at 72 % width, tilted ±3°, `drop-shadow-xl`, scaling to 104 % on hover, on a `h-48`
`radial-gradient(80%_70%_at_50%_40%,rgb(242_199_110/.22),transparent_70%)` that bleeds to the card edges; name
`text-lg font-bold`, one line, the price big (`font-display text-4xl font-bold tracking-tight tabular-nums`) + tax /
shipping note, three ticks, an outline CTA full width (with an `aria-label` naming the product). Adding a product =
one entry in the list. A line under the row when the product is optional ("you can use it free without a card").

## 8. FAQ

The project's accordion in the section shell; answers short, facts true today.

## 9. Closing CTA

A Reveal block `relative isolate mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#0d0a06] px-6 py-16
text-center shadow-float ring-1 ring-white/10 sm:px-12 sm:py-20` over a photo (an atrium in warm gold light works:
generated, see imagery.md): the photo `fill -z-20 scale-105 object-cover object-[50%_45%] opacity-80`, an overlay
`bg-[radial-gradient(90%_80%_at_50%_100%,rgb(5_6_10/.92),rgb(5_6_10/.55)_60%,rgb(5_6_10/.35))]`, an aurora pool
rising from the bottom. Dark in both themes, so the text is always white: eyebrow `tracking-[.18em] text-[#ecd6a6]`,
headline `text-2xl font-extrabold text-white min-[400px]:text-3xl sm:text-4xl lg:text-5xl` with the second part in
`bg-foil animate-flow text-gradient bg-[length:200%_200%]`, lead `text-white/80`, the gold CTA (no travelling light:
that is the hero's), "photo for illustration" in `text-2xs text-white/50` in the bottom right corner.

## Buttons (if the project has none)

- **Gold key**: `bg-cta font-bold text-on-gold` + `shadow-[inset_0_1px_0_rgb(255_255_255/.6),0_4px_0_#9a6f22,0_0_22px_rgb(242_199_110/.35)]`;
  hover lifts 1 px and the glow grows; active travels 3 px (`active:translate-y-[3px]`, depth 1 px). The hero's one
  adds `bg-[length:200%_200%] animate-flow`.
- **Outline key**: `bg-surface ring-1 ring-line-strong` + `0_4px_0_var(--c-keycap-depth)`.
- Heights 36 / 44 / 48 px, radius 1 rem (`rounded-control`), `inline-flex max-w-full items-center justify-center
  gap-2`, `transition-[transform,box-shadow] duration-200 ease-glide`. `max-w-full` so a long label (English,
  Vietnamese…) never makes the button wider than its box.
- **Play glyph** (video buttons, the tour): a gold disc `#f2c76e` with a dark triangle `#0d0a06` (24-unit viewBox:
  circle r 12; triangle from about (9.6, 7.6) to (17.3, 12) to (9.6, 16.4) with rounded joins), the same in both
  themes, `aria-hidden`.

## Video dialog

A button that opens a native modal `<dialog>` (focus, Esc and the top layer come from the browser): `showModal()`
then `play()` (the press is the user's gesture, so sound is allowed); closing pauses. Click on the backdrop closes
(`event.target === dialog`). Dialog `m-auto max-h-none max-w-none overflow-visible bg-transparent p-0
backdrop:bg-[rgb(5_6_10/.84)] backdrop:backdrop-blur-sm open:animate-pop-in`, `aria-label` = the video's title. The
video `controls playsInline preload="none"` with a poster, `aspect-[9/16] w-auto rounded-card bg-black
shadow-float`, `height: min(86dvh, calc((100vw - 2rem) * 16 / 9))` (`w-auto`: the width attribute would otherwise
beat aspect-ratio and letterbox it). A round close button (`size-11`) at `-top-3 -right-3`.

## Small controls

- **Switch**: a label row (`flex items-start justify-between gap-4`: bold label + an optional `text-xs text-muted`
  line) and a `<button role="switch" aria-checked>` track `h-7 w-12 rounded-full`: on = `bg-cta shadow-glow-sm`
  (the gold key), off = `bg-surface-3 ring-1 ring-line-strong ring-inset`; the white knob (`size-5`, `top-1 left-1`,
  `shadow-[0_1px_3px_rgb(0_0_0/.25)]`) slides 1.25 rem (`translate-x-5`) with the pop ease, 200 ms. Disabled:
  `opacity-60 cursor-not-allowed`.
- **A form filled by the app** (OCR, autofill): fill the fields one after the other, top to bottom (~260 ms apart),
  give each the `.fill-in` class and a new React `key` so the animation restarts; never overwrite what the user
  typed; while waiting, a `.scan-down` line over the photo and a status line that moves on every ~1.8 s (stopping on
  its last step) so a few seconds never look stuck. Around it: scale the photo in the browser to ≤ 1600 px and send
  it as JPEG (small uploads on a phone connection, EXIF rotation applied by the decode); when the reading runs
  longer than one request, ask again a bounded number of times (e.g. 6 long polls of ~9 s); drop an answer that
  belongs to an older photo (retaken or removed); a photo that cannot be read stays attached and the user types.
