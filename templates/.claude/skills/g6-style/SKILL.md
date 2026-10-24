---
name: g6-style
description: >-
  The "G6" homepage style — champagne / metallic gold "light LED" on warm ivory (light mode) and warm black (dark
  mode), after the lit atrium of a Ginza department store — with its motion system: CSS-first entrances, a triangle
  lattice of light behind the page, LED strips, a 3D phone stack hero with real screens, animated "how it works"
  tiles (QR scan, NFC tap, wallet pass, URL typing) whose lines of light meet at one card, a click-to-play product
  tour, a black-and-gold plan, a products row, a photo closing CTA. Tokens, keyframes, React/Tailwind v4 components,
  codex exec image prompts, a script that fits real screens into photos, a button-overflow audit. Use this skill
  whenever the user wants a homepage, landing page, product page
  or marketing site that looks premium, luxurious, gold, "sang trọng", "pro, animation hơn", like Ginza Six / G6 /
  this Hokidon homepage, or asks to restyle an existing site into gold light-and-dark with motion — even if they only
  say "make the homepage more professional and animated".
---

# g6-style

A premium product homepage: quiet ivory (or warm black) surfaces, gold used like light rather than like paint, and
motion that explains the product instead of decorating it. It was built for the Hokidon digital-business-card site
(Next.js 15 static export, Tailwind CSS v4, framer-motion) and reads well for any app with a phone UI to show.

What makes it look expensive, so keep these when adapting:
- **Few colours, one meaning each.** Gold = action / selected / done, champagne = links and focus, bronze = identity,
  rose = rare highlight. Everything else is warm neutrals. Glow marks only the one thing that matters on screen.
- **Light, not paint.** Gold appears as LED strips (`.led-line`), a lattice of light behind the page, a skylight at
  the top of the hero, a ring of light turning around the one card a section points at (`.g6-sweep`), metallic
  gradients with a light band travelling through them (the hero CTA, the headline's second line).
- **Real product, real photos.** Real screen captures in phones; generated photos only for mood and the human
  moment, in the same warm gold light; tiny CSS scenes for "how it works".
- **Motion tells the story** (a card taps a phone, a pass rises, an address types itself, lines of light meet at
  "your page") and every loop ends on a readable picture.

## Files

| File | Read it when |
|---|---|
| `references/tokens.css` | Always: the colour tokens (light + dark), utilities and every keyframe. Paste into the global CSS (Tailwind v4) or port to the project's CSS variables. |
| `references/sections.md` | Planning or building any section: blueprints for hero, strip, animated tiles, "more than X", product tour, plans, products row, closing CTA, buttons, switch, a form filled by an API. |
| `references/components/*.tsx` | Building a section: the working implementation it describes (adapt imports; see the table at the top of sections.md). |
| `references/imagery.md` | Making pictures: codex exec photo prompts, compositing real screens into photos, video encoding and click-to-play, QR codes in images. |
| `scripts/fit-screen.cjs` | A generated photo has a blank phone screen to fill with a real capture. |
| `assets/screen-composite.html` | Rendering that composite with headless Chrome. |
| `scripts/overflow-audit.cjs` | Before shipping: every button checked for spilling / sticking out at 8 widths × each language. |

## Workflow

1. **Read the project first.** Stack (Tailwind v4? v3? plain CSS?), its design tokens, i18n, image pipeline, how it
   builds and deploys, its checks. Keep its conventions (file layout, copy rules, analytics hooks, test ids); this
   skill brings the look and the motion, not a new architecture. If the project already has a palette with tone
   names, map the G6 values onto those names (as the Hokidon site did: lime → gold, aqua → champagne…) instead of
   renaming every class.
2. **Install the tokens.** Paste `references/tokens.css` after `@import "tailwindcss";` (remove the alias block if
   you will not copy the components), render `<div class="g6-backdrop" aria-hidden>` once in the page shell, and
   give the header a translucent ivory/black glass (`bg-surface-base/75 backdrop-blur-xl`).
3. **Plan the page with the user's content.** Use the order in sections.md as the default and keep only sections
   the product needs. Facts in the copy must be true today (no feature that is not live, prices from the product
   catalogue — never typed twice). Ask the user for anything that is a business decision (prices on the page or
   not, which video goes where).
4. **Build top-down**, one section at a time, from the blueprint + its reference component. After each section,
   screenshot it at 390 px and 1440 px in light AND dark (headless Chrome with `prefers-color-scheme` emulated) and
   look at the pictures; fix before moving on.
5. **Media.** Real screens first (capture the actual app), generated photos where a human moment helps
   (`references/imagery.md`). Encode videos small; every video waits for a click.
6. **Verify** (checklist below), then ship through the project's normal gate (PR, CI).

## Motion rules (why the page feels smooth and stays fast)

- **Entrance on first paint is CSS** (`animate-rise` with a stagger), never framer-motion `initial` on the hero:
  server-rendered `opacity: 0` would wait for JavaScript and delay the largest paint.
- **Below the fold**, `whileInView` reveals once (16 px rise, 0.5 s, glide ease, ≤ 0.1 s stagger).
- **Ambient loops are CSS keyframes** on transform / opacity only (aurora, drift, marquee, scan, tap, toast, the
  story loops). No `filter: blur()` on big layers — use radial gradients for soft light.
- **JavaScript loops run only while visible** (`useInView`), e.g. the typing address, the tour.
- **Story loops end on the meaning**: give each animated element a static style equal to its end state (card on the
  phone, page open, pass up). With `prefers-reduced-motion` the global rule plays one 1 ms pass with no fill, so the
  static state is what stays — still explaining the step.
- **One transform per element.** Tailwind v4's `translate-*` / `rotate-*` use the separate `translate` / `rotate`
  properties, so they combine with a keyframe on `transform`; framer-motion `style={{ x, rotateX }}` writes
  `transform`, so nest: motion wrapper → CSS-animated wrapper → rotated wrapper → content.
- **Pointer tilt only for a mouse** (`pointerType === 'mouse'`), springy (`stiffness ~110, damping ~18`), off with
  reduced motion.
- **Videos never autoplay.** A dialog with `preload="none"` for intros; a tour that starts on ▶ or a step and runs one
  pass. Autoplay costs every visitor data and battery for something most do not watch.

## Colour rules that are easy to get wrong

- **Light effects must be redesigned for the light page.** A pale cream LED line or travelling light that glows on
  black is invisible on ivory: give each light its own per-theme variables (`--c-way-light: #b07a1c` deep gold with a
  glow on ivory, `#fff3d1` on black) and use the `ink-*` tones for rings and scan lines that must read in both.
- **Coloured text uses `ink-*`, never the raw tone** (raw gold on ivory is ~1.5:1). Text on a gold fill is `on-gold`
  (near black), never white.
- **Per-theme values live in `--c-*` variables**, read with `bg-(image:--c-…)` or `var()`. The `theme-dark` custom
  variant is for `:root` only; on an element it misses a theme picked with a toggle.
- **A dark card inside the light page** (the premium plan): `data-theme="dark"` on it so the dark tokens apply inside.

## Layout rules

- Sections `overflow-x-clip`; anything wider than the screen on purpose (marquee, sideways rows) carries
  `data-scroll-x` and clips or scrolls itself.
- Buttons `max-w-full`; tiles in narrow columns get `min-w-0` and a truncating label.
- Columns that depend on the room a component has (an editor between a menu and a preview) use container queries
  (`@container` + `@md:grid-cols-5`), not screen breakpoints — the screen can be wide while the column is narrow.
- Japanese text: headings in phrase blocks (each part up to 、/。 an inline-block); body text in narrow columns with
  `[word-break:auto-phrase]` + `text-pretty`.
- Phones 320–414 px: no horizontal scroll, chips that would cover the phone move under it.

## Verification checklist

- [ ] Light and dark screenshots of every section at 390 px and 1440 px, looked at — especially light effects in light mode.
- [ ] `prefers-reduced-motion: reduce`: hero text visible at once, every story loop shows its end state, no video starts.
- [ ] No horizontal scroll at 320 / 360 / 375 px (the project's mobile check, or `scrollWidth - innerWidth`).
- [ ] `node scripts/overflow-audit.cjs` with BASE / ROUTES / LOCALES (+ COOKIE for signed-in pages): look at each finding;
      known false positives are listed in the script's header.
- [ ] Every language: the longest labels (English, Vietnamese…) wrap inside their buttons.
- [ ] Network panel on load: no video bytes before a click; images WebP and sized for 2x.
- [ ] Every QR on the page or in a picture opens a page that exists.
- [ ] The project's own gate (lint, typecheck, build, tests, e2e) is green; screenshots of the result shown to the user.

## Pitfalls met while building it

- Headless Chrome's user agent says "HeadlessChrome": APIs that block bots refuse it — set a phone user agent when
  testing a flow that calls such an API.
- Running `next build` while `next dev` serves the same checkout breaks the dev server (both write `.next`): stop dev
  first, or build in another worktree.
- A JSON 404 from an API behind a CDN with custom error pages may come back as the site's HTML 404 page — check the
  status, not only the body.
- Generated images: ask for blank screens and blank cards, then put the real product on them; never ship generated
  text or logos.
