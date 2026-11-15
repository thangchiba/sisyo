# g6-style checks before shipping

Run these once at the end of a batch of sections (and the per-section screenshots while building, SKILL.md step 4).
Use the project's own checks where it has them; the audit below is for projects that have none.

## Checklist

- [ ] Light and dark screenshots of every section at 390 px and 1440 px, looked at, especially light effects in
      light mode (LED lines, lines of light, scan lines, rings).
- [ ] `prefers-reduced-motion: reduce`: hero text visible at once, every story loop shows its end state, no video
      starts, no tilt.
- [ ] No horizontal scroll at 320 / 360 / 375 px (the project's mobile check, or `scrollWidth - innerWidth` in the
      page; elements in `[data-scroll-x]` are wide on purpose).
- [ ] The button-overflow audit (below) on the changed pages, every language; look at each finding.
- [ ] Every language: the longest labels (English, Vietnamese…) wrap inside their buttons; Japanese headings break
      between phrases; fonts have the glyphs of every language (a font without Vietnamese or Japanese glyphs falls
      back mid-word and looks broken).
- [ ] Network panel on load: no video bytes before a click; images WebP and sized for 2x.
- [ ] Every QR on the page or in a picture opens a page that exists.
- [ ] The project's own gate (lint, typecheck, build, tests, e2e) is green; screenshots of the result shown to the
      user.

## Button-overflow audit

A headless-browser script (puppeteer-core or Playwright with the installed Chrome) that opens each page at several
widths and languages and reports buttons whose label spills out, that stick out of their frame, or that pass the
screen edge. Write it once per project (scripts/ or the e2e folder).

**Inputs** (env or arguments): `BASE` (required), `ROUTES` (default `/`), `WIDTHS` (default
`320,360,375,390,414,768,1024,1280`), `LOCALES` and how the site picks its language (e.g. a localStorage key written
before the page loads with `evaluateOnNewDocument`, or a URL prefix), `COOKIE` for signed-in pages.

**Per page**: viewport `width × 900` at device scale 1; `goto` with `networkidle2`; scroll through the page once
(600 px steps, ~60 ms apart) so scroll-revealed content is there, back to the top, wait ~600 ms; then in the page:

1. Candidates: `button, a, [role="button"], [role="switch"], input[type="submit"]`. Skip anything inside
   `[data-scroll-x]`, `.table-scroll`, `[aria-hidden="true"]` or `.sr-only`, anything hidden (`display: none`,
   `visibility: hidden`, opacity 0) or smaller than 4 × 4 px. Keep only what looks like a button: a `<button>`, a
   button or switch role, or a non-transparent background, a border, or a box shadow (plain text links are not
   audited).
2. **Content vs box**: the bounding box of a Range over the element's contents. Problem when it passes the
   element's box by more than 1.5 px left or right ("content wider than box"), else top or bottom ("content taller"),
   else when `scrollWidth − clientWidth > 1` without `text-overflow: ellipsis`.
3. **Out of frame**: walk up the ancestors to the first one that is drawn (background, border or shadow) or clips
   (`overflow-x` not visible) and is narrower than the viewport; problem when the button passes it by more than
   1.5 px on either side. Stop at the first such frame.
4. **Off screen**: the button's box past `0` or the viewport width by more than 1 px.

**Report**: group identical findings (route + label + problems with the numbers masked) and list the widths and
languages where each occurs, with the element's classes; print the count and exit non-zero when there are findings.

**Known false positives** (look at each, do not "fix" blindly): a collapsed panel inside an `overflow-hidden` button
(its hidden text counts as content), `sr-only` text inside a step label, a fixed sheet compared with the card under
it.

Fixes, in order of preference: `max-w-full` on the button (every button of the style has it), `min-w-0` and a
truncating label in narrow tiles, shorter copy agreed with the user, a container query where the column is narrow on
a wide screen.
