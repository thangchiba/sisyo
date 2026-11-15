# g6-style imagery: photos, real screens, video

The style mixes three kinds of picture. Use each where it is strongest:

| Kind | Where | Why |
|---|---|---|
| Real screen captures of the product, in CSS phones | hero stack, "more than X", product tour | proof: the visitor sees the actual product, not an illustration |
| Generated photos in the gold light | "N ways" (a hand tapping a card), closing CTA (an atrium) | mood and the human moment; same warm gold as the UI |
| CSS-drawn mini scenes | the animated tiles (QR, NFC, wallet, URL) | crisp at any size, theme-aware, cost no download |

## Generating photos with `codex exec`

Work in a folder outside the repo (e.g. `<project>/videos/landing-gold/`), put reference images in `ref/`, write
the brief to `prompt.md`, then run (codex's built-in `image_gen` tool, no API key needed):

```bash
cd <work-folder>
codex exec -s workspace-write --skip-git-repo-check \
  -i ref/mood.png -i ref/layout.png -o last-message.md - < prompt.md > codex.log 2>&1
```

Ask in the brief for: the exact file names, the aspect (`wide landscape 16:9, at least 1600 px` / `vertical 9:16
about 941x1672`), "check each result yourself and regenerate if it breaks a rule", and an `image-prompts.md` with
the final prompts. A mood photo the user gives (e.g. a real department-store atrium) is a MOOD reference only:
"do NOT copy this building, invent an original space, no recognisable real building, no store names".

Prompts that worked (adapt the subject):

- **Atrium (closing CTA)**: *photorealistic architectural interior, wide 16:9: an original luxurious multi-storey
  atrium in Tokyo at evening, ivory and cream stone, slim champagne-gold metal fins and balustrades, a luminous
  skylight made of a fine triangular lattice glowing warm white, thin warm gold LED light lines along each floor
  edge, criss-crossing escalators in the middle distance, polished light floor with soft reflections. Symmetric,
  calm, premium. The centre of the frame must be quiet enough for white headline text over a dark overlay. A few
  people far away, small and motion-blurred, no faces. No text, no letters, no logos, no shop signs.*
- **Hand + device (a "tap" moment)**: *photorealistic, vertical 9:16: one hand holds a matte black card with a very
  thin champagne-gold edge against the upper BACK of another person's smartphone; the phone's FRONT SCREEN FACES THE
  CAMERA, slightly angled; physically plausible (the card touches the rear upper edge, never through the screen). The
  phone screen is completely blank, uniform, flat very light grey, no UI, no reflections, all four screen corners
  clearly visible and not covered by fingers. A soft warm champagne-gold glow at the contact point. Warm evening
  interior, cream and gold, blurred gold bokeh. Realistic hands. No text, no logos.*

Always: "No text, no letters, no logos, no watermarks" (generated text is garbage and logos are a legal risk), and
blank screens / blank cards so the real product goes on them.

## A real screen into a generated phone

1. **Capture** the app at phone width (e.g. 390 px at 3x → 1170×2532, or 900×1948 stills from a recording).
2. **Find the screen in the photo** with a small script (Node or Python; read the pixels with ffmpeg as raw RGB24,
   or with any image library). Input: the photo, a seed pixel inside the blank screen (look at the photo), the
   capture's width and height, a tolerance (default 48). Method:
   1. The screen's colour = the average of a 9×9 window around the seed.
   2. Flood fill (4-neighbour) from the seed over pixels whose `|ΔR| + |ΔG| + |ΔB|` to that colour is below the
      tolerance. Fewer than ~1000 pixels means a bad seed: stop and say so.
   3. Boundary pixels = filled pixels with a non-filled neighbour.
   4. First guess of the four corners (a phone held roughly upright, tilts up to ~40°): the boundary points with the
      smallest `x + y` (top left), `−x + y` (top right), `−x − y` (bottom right), `x − y` (bottom left).
   5. For each side, fit a line (total least squares, angle `½·atan2(2·Sxy, Sxx − Syy)` through the mean) to the
      boundary points between 20 % and 80 % of the way from one corner to the next and within 25 px of that segment:
      the rounded corners are left out. The four line intersections are the sharp corners. Repeat this step 3 times.
   6. Homography from the capture rectangle `(0,0) (w,0) (w,h) (0,h)` to the corners `tl tr br bl`: the usual
      8 × 8 linear system (Gaussian elimination with pivoting), then the CSS `matrix3d` in column-major order:
      `h0, h3, 0, h6, h1, h4, 0, h7, 0, 0, 1, 0, h2, h5, 0, 1`.
   7. Print JSON `{ width, height, corners, matrix3d }`.
3. **Composite** in a small HTML page rendered by headless Chrome at the photo's size (`--headless=new
   --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=W,H --screenshot=out.png
   file://…/composite.html`), body `margin: 0; overflow: hidden` at exactly the photo's size:
   - the photo as an absolute image filling the page;
   - optionally a glow where a card meets the phone: a 300 px circle centred on that point,
     `radial-gradient(circle, rgba(255,226,160,.95) 0%, rgba(242,199,110,.55) 26%, rgba(184,134,44,.18) 52%,
     rgba(184,134,44,0) 70%)`, `mix-blend-mode: screen; opacity: .55`;
   - the screen: a div of the capture's size at `left: 0; top: 0`, `transform-origin: 0 0; transform:
     matrix3d(…)`, `overflow: hidden; border-radius: ~12 % of the capture's width; background: #fff`, holding the
     capture, a warm wash `linear-gradient(160deg, rgba(255,236,200,.1), rgba(255,214,150,.06) 55%,
     rgba(60,40,10,.08))` and a soft sheen `linear-gradient(120deg, transparent 30%, rgba(255,255,255,.16) 42%,
     transparent 54%)` so the screen sits in the room's light; a dynamic island (`#0b0906`, 210 × 62 px pill,
     34 px from the top) when the capture has no status bar of its own.
   Then `cwebp -q 78`.
4. **Look at the result zoomed in**: the screen must sit exactly in the bezel; if it leaks, lower the tolerance or
   move the seed (raise the tolerance for a screen with a soft gradient).

## Video (when the page has any)

- Every video plays only when the visitor presses play: `preload="none"` + a poster, a dialog (sections.md, Video
  dialog) or an inline player with controls. A looping product tour starts on ▶, not on scroll.
- Re-encode: `ffmpeg -i in.mp4 -vf scale=720:1280:flags=lanczos -c:v libx264 -profile:v high -preset slow -crf 27
  -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 96k out.mp4` (a 45 s vertical promo ≈ 2.5–3 MB). Silent screen
  clips: `-vf scale=540:-2 -an -crf 29` (≈ 100–300 KB each). Poster: one frame, `-c:v libwebp -quality 76`.
- Captions burned in, so it reads with the sound off; say on the page what the video contains (length, narration).
- Serve every byte from the site's own origin.

## QR codes in pictures

A QR in a screenshot points wherever the capture was made (often a demo account that does not exist on the live
site): a visitor who scans it lands on a 404. Replace it before publishing: generate a QR of the real home page
(`qrcode` npm, `toFile(…, { width, margin: 0 })`), measure the old code's box (dark-pixel bounds), overlay with
ffmpeg (`overlay=x:y`, `scale=…:flags=neighbor`). QRs drawn by the page itself: generate them from the site's own
origin at runtime, lazily (`import('qrcode')` when the element comes near).

## Images on the page

WebP, sized to what they show at 2x (screens 600 px wide, photos ~940 px or 1600 px wide for full-width bands);
`next/image` with `fill` + `sizes`; one map file for every image with its alt text per language; "写真はイメージです"
/ "photo for illustration" on generated photos, "画面はデモ用サンプルです" / "demo data" on screens with made-up data.
