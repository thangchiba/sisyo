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

- **Atrium (closing CTA)** — *photorealistic architectural interior, wide 16:9: an original luxurious multi-storey
  atrium in Tokyo at evening, ivory and cream stone, slim champagne-gold metal fins and balustrades, a luminous
  skylight made of a fine triangular lattice glowing warm white, thin warm gold LED light lines along each floor
  edge, criss-crossing escalators in the middle distance, polished light floor with soft reflections. Symmetric,
  calm, premium. The centre of the frame must be quiet enough for white headline text over a dark overlay. A few
  people far away, small and motion-blurred, no faces. No text, no letters, no logos, no shop signs.*
- **Hand + device (a "tap" moment)** — *photorealistic, vertical 9:16: one hand holds a matte black card with a very
  thin champagne-gold edge against the upper BACK of another person's smartphone; the phone's FRONT SCREEN FACES THE
  CAMERA, slightly angled; physically plausible (the card touches the rear upper edge, never through the screen). The
  phone screen is completely blank, uniform, flat very light grey, no UI, no reflections, all four screen corners
  clearly visible and not covered by fingers. A soft warm champagne-gold glow at the contact point. Warm evening
  interior, cream and gold, blurred gold bokeh. Realistic hands. No text, no logos.*

Always: "No text, no letters, no logos, no watermarks" (generated text is garbage and logos are a legal risk), and
blank screens / blank cards so the real product goes on them.

## A real screen into a generated phone

1. Capture the app at phone width (e.g. 390 px at 3x → 1170×2532, or 900×1948 stills from a recording).
2. Find the screen: `node scripts/fit-screen.cjs photo.png <seedX> <seedY> <captureW> <captureH>` → corners +
   `matrix3d` (flood fill from a pixel inside the screen, edges fitted away from the rounded corners, homography).
3. Fill `assets/screen-composite.html` (photo, capture, matrix, size, glow point) and render it with headless
   Chrome at the photo's size (command in the file's comment). Then `cwebp -q 78`.
4. Look at the result zoomed in: the screen must sit exactly in the bezel; if it leaks, lower the tolerance (6th
   argument) or move the seed.

## Video (when the page has any)

- Every video plays only when the visitor presses play: `preload="none"` + a poster, a dialog (`VideoDialog`) or an
  inline player with controls. A looping product tour starts on ▶, not on scroll.
- Re-encode: `ffmpeg -i in.mp4 -vf scale=720:1280:flags=lanczos -c:v libx264 -profile:v high -preset slow -crf 27
  -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 96k out.mp4` (a 45 s vertical promo ≈ 2.5–3 MB). Silent screen
  clips: `-vf scale=540:-2 -an -crf 29` (≈ 100–300 KB each). Poster: one frame, `-c:v libwebp -quality 76`.
- Captions burned in, so it reads with the sound off; say on the page what the video contains (length, narration).

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
