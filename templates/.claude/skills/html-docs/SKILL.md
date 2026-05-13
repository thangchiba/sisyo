---
name: html-docs
description: "Generate standalone, beautiful HTML documents styled with Tailwind CSS for developers or end-users to read. Use whenever the user asks for a document, report, guide, handbook, release note, onboarding, README-as-HTML, API reference, design spec, or any deliverable that should look polished in a browser. Output is a single self-contained .html file with colorful modern design, rounded corners, gradient accents and great typography."
license: MIT
metadata:
  author: HoangThang
  version: '1.0.0'
---

# HTML Docs

Single-file HTML doc, Tailwind via CDN, no build step. Audience: humans (devs, PM, clients, users).

## When to trigger

User asks for: HTML doc/report/handbook/guide/release-note/changelog, API reference page, onboarding page, "export to HTML", "render as webpage", any reader-facing deliverable where visual polish matters.

Do NOT use for: internal markdown in `docs/` (that's `vibe-docs`), READMEs, raw `.md` notes.

## Hard rules

- One `.html` file. No external CSS/JS files.
- Tailwind CDN: `<script src="https://cdn.tailwindcss.com"></script>`.
- Optional Inter font via Google Fonts `<link>`.
- Responsive, mobile-first. Reading width `max-w-4xl` or `max-w-5xl`.
- Vietnamese `<html lang="vi">` by default unless content is English.
- No emoji unless requested — use inline SVG (Heroicons) or shape divs.
- Save to `docs/html/[kebab-name].html` by default.

## Defaults (use these classes unless reason to change)

- **Radius**: `rounded-2xl` for cards/sections, `rounded-3xl` for hero/big callouts, `rounded-xl` for code blocks, `rounded-full` for pills/badges.
- **Padding**: `p-6 md:p-8` inside cards, `py-12 md:py-20` for sections, `px-6` for page gutter.
- **Border**: `border border-slate-200` for definition on white cards.
- **Shadow**: `shadow-sm` (subtle) or `shadow-lg shadow-indigo-500/10` (colored soft).
- **Body text**: `text-slate-700 leading-relaxed`.
- **Headings**: `font-bold tracking-tight text-slate-900`, `text-4xl md:text-5xl` h1, `text-2xl md:text-3xl` h2, `text-xl` h3.
- **Background**: `bg-slate-50` (or `bg-stone-50` for warm themes).
- **Smooth scroll** for TOC: `html { scroll-behavior: smooth; }`.

## Color palettes (pick one per doc — bg / primary / accent)

| Theme | Hero gradient | Primary | Accent |
|---|---|---|---|
| Indigo/Violet/Pink | `from-indigo-600 via-purple-600 to-pink-500` | `indigo-600` | `violet-500` |
| Emerald/Teal | `from-emerald-500 via-teal-500 to-cyan-500` | `emerald-600` | `teal-500` |
| Rose/Amber | `from-rose-500 via-orange-500 to-amber-500` | `rose-600` | `amber-500` |
| Sky/Cyan | `from-sky-500 via-cyan-500 to-teal-400` | `sky-600` | `cyan-500` |
| Fuchsia/Pink | `from-fuchsia-600 via-pink-500 to-rose-500` | `fuchsia-600` | `pink-500` |

One palette per document. Use the hero gradient on the top banner; use primary for links/buttons; use accent sparingly.

## Component vocabulary

Default to these — agent already knows Tailwind, just compose:

- **Hero**: full-bleed gradient bg, white text, eyebrow pill (`bg-white/15 backdrop-blur`), big h1, subtitle, optional blurred decoration circles.
- **TOC**: `lg:sticky lg:top-8`, anchor links, uppercase eyebrow.
- **Section card**: white bg, `rounded-2xl border shadow-sm`, padded.
- **Callout** (tip/warn/info): tinted bg + left border — `bg-amber-50 border-l-4 border-amber-400` (warn), `bg-sky-50 border-sky-400` (info), `bg-emerald-50 border-emerald-400` (tip), `bg-rose-50 border-rose-400` (danger).
- **Code block**: `bg-slate-900 text-slate-100 rounded-xl p-4 text-sm overflow-x-auto`.
- **Badge/pill**: `inline-flex px-3 py-1 rounded-full text-xs font-medium`, tinted bg.
- **Method pill** (API): GET→emerald, POST→indigo, PUT→amber, DELETE→rose, PATCH→violet.
- **Stat card**: large number `text-4xl font-extrabold`, label below, gradient or solid bg.
- **Step list**: gradient circle index + content alongside.
- **Table**: `rounded-xl overflow-hidden`, `even:bg-slate-50`, wrap in `overflow-x-auto`.
- **Footer**: `border-t py-8 text-center text-sm text-slate-500`.

## Special bits worth showing

### Gradient text utility

```css
.gradient-text {
  background: linear-gradient(90deg, #6366f1, #a855f7, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

### Hero with decoration blobs

```html
<header class="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
  <div class="max-w-5xl mx-auto px-6 py-20 md:py-28">...</div>
  <div class="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl"></div>
  <div class="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-pink-300/30 blur-3xl"></div>
</header>
```

### Page layout grid (sticky TOC + content)

`grid lg:grid-cols-[220px_1fr] gap-10` inside `max-w-5xl mx-auto px-6 py-12`.

### Minimum boilerplate

```html
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>[Title]</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>html { font-family: 'Inter', system-ui, sans-serif; scroll-behavior: smooth; }</style>
</head>
<body class="bg-slate-50 text-slate-700 antialiased">
  <!-- hero / main / footer -->
</body>
</html>
```

## Content patterns by doc type

- **Release notes**: hero with version pill, version cards stacked vertically, change-type pills (`new`=emerald, `improved`=sky, `fixed`=amber, `breaking`=rose).
- **API reference**: sticky TOC by resource, endpoint cards with method pill, request/response in `<details>` for no-JS toggle.
- **Onboarding / handbook**: hero + CTA, numbered step cards with gradient circle index, closing "next steps" card.
- **Report / dashboard**: stat grid up top, SVG charts inline, alternating-row tables.
- **Feature spec / design doc**: status badge (draft/approved/shipped), sections — Problem / Goals / Non-goals / Approach / Open questions / Risks (callouts).

## Anti-patterns

- Sharp corners (`rounded-none`) — always at least `rounded-xl`.
- Pure white with no accent — feels unfinished.
- Walls of paragraph text — break with cards/callouts/lists.
- Inline `style="…"` when a Tailwind class exists.
- Multiple files, build step, heavy JS framework.
- External images without fallback — prefer SVG/gradient placeholder.
- `<table>` used for layout — use grid/flex.

## Quality checklist

- [ ] Opens via `file://` with no console errors
- [ ] Responsive at 375px
- [ ] TOC anchors all resolve
- [ ] Code blocks scroll horizontally
- [ ] Tables wrap in `overflow-x-auto`
- [ ] Reading width capped
- [ ] One palette, used consistently
- [ ] Title + date + author/source visible

## Output convention

1. Path: `docs/html/[kebab-name].html` (confirm if unclear).
2. After writing: log to `docs/99_progress/features.md` if it's a deliverable; add one-line entry to `docs/MAP.md`.
3. Tell user the file path — opens directly, no server needed (`open docs/html/foo.html` on macOS).

## Relation to vibe-docs

| | vibe-docs | html-docs |
|---|---|---|
| Audience | Claude + devs | Humans (devs, PM, clients, users) |
| Format | Compact `.md`, token-efficient | Polished HTML, visual |
| Location | `docs/MAP.md`, `_summary.md`, detail `.md` | `docs/html/*.html` |
| Trigger | Code/feature changes | Explicit "make this readable / shareable" |

Typical flow: `vibe-docs` keeps `docs/01_requirements/[feature].md` up to date; when user asks "make this into an HTML page for the team", `html-docs` reads that spec and renders the polished version.
