---
name: g6-style
description: >-
  The "G6" homepage style: champagne / metallic gold "light LED" on warm ivory (light mode) and warm black (dark
  mode), after the lit atrium of a Ginza department store, with its motion system: CSS-first entrances, a triangle
  lattice of light behind the page, LED strips, a 3D phone stack hero with real screens, animated "how it works"
  tiles (QR scan, NFC tap, wallet pass, URL typing) whose lines of light meet at one card, a click-to-play product
  tour, a black-and-gold plan, a products row, a photo closing CTA. Guidance only, no source files: exact token
  values (light + dark), keyframes, section anatomy for React + Tailwind v4 + framer-motion, codex exec image
  prompts, how to fit a real screen into a generated photo, a button-overflow audit method. Use this skill whenever
  the user wants a homepage, landing page, product page or marketing site that looks premium, luxurious, gold,
  "sang trọng", "pro, animation hơn", like Ginza Six / G6 / the Hokidon homepage, or asks to restyle an existing
  site into gold light-and-dark with motion, even if they only say "make the homepage more professional and
  animated".
license: MIT
metadata:
  author: HoangThang
  version: '1.0.0'
---

# g6-style

A premium product homepage: quiet ivory (or warm black) surfaces, gold used like light rather than like paint, and
motion that explains the product instead of decorating it. It was built for the Hokidon digital-business-card site
(Next.js 15 static export, Tailwind CSS v4, framer-motion) and reads well for any app with a phone UI to show.

This skill is **guidance only**. It contains no source files: the project writes its own tokens, components and
scripts from the values, anatomy and methods in the reference files. The numbers there are the system (contrast was
checked on exactly these values); use them as written, do not approximate them.

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

## Reference files: load only what the task needs

| File | Read it when |
|---|---|
| `references/tokens.md` | Always: colour tokens (light + dark), the theme mechanism, the Tailwind v4 mapping, gradients, the backdrop, LED line, card, sweep and tone scopes. |
| `references/motion.md` | Any animation: easings, the animation tokens, every keyframe (entrance, ambient loops, the story loops of the tiles, form fill), reduced motion, JavaScript loops. |
| `references/sections.md` | Planning or building any section: page order, section shell, hero, strip, animated tiles, "more than X", product tour, plans, products row, closing CTA, phone frame, buttons, switch, a form filled by an API. |
| `references/imagery.md` | Making pictures: codex exec photo prompts, fitting a real screen into a generated photo, video encoding and click-to-play, QR codes in images, image sizes. |
| `references/checks.md` | Before shipping: screenshots, reduced motion, horizontal scroll, the button-overflow audit, languages, network. |

## Workflow

1. **Read the project first.** Stack (Tailwind v4? v3? plain CSS?), its design tokens, i18n, image pipeline, how it
   builds and deploys, its checks. Keep its conventions (file layout, copy rules, analytics hooks, test ids); this
   skill brings the look and the motion, not a new architecture. If the project already has a palette with tone
   names, map the G6 values onto those names (the Hokidon site did: lime → gold, aqua → champagne, iris → bronze,
   flare → rose) instead of renaming every class.
2. **Write the tokens.** Put the values of `references/tokens.md` and the keyframes of `references/motion.md` into the
   global CSS (after `@import "tailwindcss";` on Tailwind v4, or into the project's own variables), render one
   fixed `.g6-backdrop` (`aria-hidden`) in the page shell, and give the header a translucent ivory / black glass
   (`bg-surface-base/75 backdrop-blur-xl`).
3. **Plan the page with the user's content.** Use the order in `references/sections.md` as the default and keep only
   the sections the product needs. Facts in the copy must be true today (no feature that is not live, prices from
   the product catalogue, never typed twice). Ask the user for anything that is a business decision (prices on the
   page or not, which video goes where).
4. **Build top-down**, one section at a time, from its anatomy. After each section, screenshot it at 390 px and
   1440 px in light AND dark (headless Chrome with `prefers-color-scheme` emulated) and look at the pictures; fix
   before moving on.
5. **Media.** Real screens first (capture the actual app), generated photos where a human moment helps
   (`references/imagery.md`). Encode videos small; every video waits for a click.
6. **Verify** (`references/checks.md`), then ship through the project's normal gate (PR, CI).

## Motion rules (why the page feels smooth and stays fast)

- **Entrance on first paint is CSS** (`animate-rise` with a stagger), never framer-motion `initial` on the hero:
  server-rendered `opacity: 0` would wait for JavaScript and delay the largest paint.
- **Below the fold**, `whileInView` reveals once (16 px rise, 0.5 s, glide ease, ≤ 0.1 s stagger).
- **Ambient loops are CSS keyframes** on transform / opacity only (aurora, drift, marquee, scan, tap, toast, the
  story loops). No `filter: blur()` on big layers: use radial gradients for soft light.
- **JavaScript loops run only while visible** (`useInView`), e.g. the typing address, the tour.
- **Story loops end on the meaning**: give each animated element a static style equal to its end state (card on the
  phone, page open, pass up). With `prefers-reduced-motion` the global rule plays one 1 ms pass with no fill, so the
  static state is what stays, still explaining the step.
- **One transform per element.** Tailwind v4's `translate-*` / `rotate-*` use the separate `translate` / `rotate`
  properties, so they combine with a keyframe on `transform`; framer-motion `style={{ x, rotateX }}` writes
  `transform`, so nest: motion wrapper → CSS-animated wrapper → rotated wrapper → content.
- **Pointer tilt only for a mouse** (`pointerType === 'mouse'`), springy (stiffness ~110, damping ~18), off with
  reduced motion.
- **Videos never autoplay.** A dialog with `preload="none"` for intros; a tour that starts on ▶ or a step and runs one
  pass. Autoplay costs every visitor data and battery for something most do not watch.

## Colour rules that are easy to get wrong

- **Light effects must be redesigned for the light page.** A pale cream LED line or travelling light that glows on
  black is invisible on ivory: give each light its own per-theme variables (`--c-way-light` is `#b07a1c` deep gold
  with a glow on ivory, `#fff3d1` on black) and use the `ink-*` tones for rings and scan lines that must read in both.
- **Coloured text uses `ink-*`, never the raw tone** (raw gold on ivory is ~1.5:1). Text on a gold fill is `on-gold`
  (near black), never white.
- **Per-theme values live in `--c-*` variables**, read with `bg-(image:--c-…)` or `var()`. The `theme-dark` custom
  variant is for `:root` only; on an element it misses a theme picked with a toggle.
- **A dark card inside the light page** (the premium plan): `data-theme="dark"` on it so the dark tokens apply inside.
  Likewise `data-theme="light"` on a drawn phone screen, which stays light in both themes like a real one.

## Layout rules

- Sections `overflow-x-clip`; anything wider than the screen on purpose (marquee, sideways rows) carries
  `data-scroll-x` and clips or scrolls itself.
- Buttons `max-w-full`; tiles in narrow columns get `min-w-0` and a truncating label.
- Columns that depend on the room a component has (an editor between a menu and a preview) use container queries
  (`@container` + `@md:grid-cols-5`), not screen breakpoints: the screen can be wide while the column is narrow.
- Japanese text: headings in phrase blocks (each part up to 、/。 an inline-block); body text in narrow columns with
  `[word-break:auto-phrase]` + `text-pretty`.
- Phones 320–414 px: no horizontal scroll, chips that would cover the phone move under it.

## Pitfalls met while building it

- Headless Chrome's user agent says "HeadlessChrome": APIs that block bots refuse it. Set a phone user agent when
  testing a flow that calls such an API.
- Running `next build` while `next dev` serves the same checkout breaks the dev server (both write `.next`): stop dev
  first, or build in another worktree.
- A JSON 404 from an API behind a CDN with custom error pages may come back as the site's HTML 404 page: check the
  status, not only the body.
- Generated images: ask for blank screens and blank cards, then put the real product on them; never ship generated
  text or logos.
