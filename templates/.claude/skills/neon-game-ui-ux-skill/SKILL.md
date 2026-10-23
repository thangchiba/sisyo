---
name: neon-game-ui-ux-skill
description: "Neon, game-like UI/UX design system for web apps (React 18 + TypeScript + Tailwind 3 + motion): dark blue-black canvas, a few neon tones with one meaning each, glow as a signal, hexagon badges, round keycap buttons, duotone gradient icons, a HUD top bar (level, XP bar, streak, daily-goal ring), desktop side rail, mobile bottom bar with a raised centre progress dial that opens the activity modes as a radial menu, and a gamification layer (XP, levels, streak, daily path with a chest, quests, achievements, XP burst flying to the HUD, level-up modal). Guidance only, no source files: exact token values, per-component anatomy and implementation techniques, shell and dial geometry, the gamification data contract, and the icon method (Lucide base shapes, layer recipes, a generated registry). Triggers on: neon / cyber / game-like / gamified UI, 'like LenS', 'Aperture Neon', meshy-like dark UI, HUD, XP, level, streak, quests, achievements, daily goal, round buttons, radial menu, practice dial, duotone icons, or restyling a frontend in this style."
license: MIT
metadata:
  author: HoangThang
  version: '1.0.0'
---

# Neon Game UI/UX

A complete design system for a neon, game-like web interface, taken from a production app (LenS, "Aperture Neon";
visual direction studied from meshy.ai and given its own identity). Use it to build the same look and feel in another
project.

This skill is **guidance only**. It contains no source files: the project writes its own tokens, components, shell and
icon pipeline from the values, anatomy and techniques in the detail files. The numbers in those files are the system;
use them as written, do not approximate them. The reference stack is React 18 + TypeScript + Tailwind 3.4 +
`motion/react`; the rules themselves do not depend on it.

## When to trigger

- Building or restyling a frontend that should look neon / game-like / gamified, or "like LenS".
- Adding a HUD, XP, levels, streaks, a daily goal, quests, achievements or reward animations to an app.
- Building the app shell: top bar HUD, side rail, bottom bar with a centre dial / radial menu.
- Creating or replacing the icon set, or asked how the icons are made.
- Reviewing a screen in this style for contrast, motion or accessibility.

## Detail files: load only what the task needs

| File | Load when |
|---|---|
| `TOKENS.md` | Any styling work: every colour (dark + light, RGB channels), ink-safe variants, the Tailwind mapping, tone scopes, type, radii, shadows, gradients, animations, base element rules, theme switch |
| `COMPONENTS.md` | Building or using a shared component (icon, buttons, cards, rings, bars, badges, path, quests, achievements, controls, toasts, reward system), the root providers or the gallery page |
| `LAYOUT-NAV.md` | App shell, HUD top bar, side rail, bottom bar, the centre dial and its radial menu (sizes, arc formula, states, when not to use one), responsive rules, safe areas, sheets, dialogs, skeletons |
| `GAMIFICATION.md` | XP, levels, streak, daily path, quests, achievements, reward moments, honesty rules, the HUD / Reward data contract and the client wiring |
| `ICONS.md` | The icon method: Lucide base shapes, the layer model, recipes, customisation rules, the generator and the preview sheet, the licence obligation, alternative routes, the icon checklist |
| `MOTION-A11Y.md` | Easing and durations, what may animate, loop budget, reduced motion, contrast targets, focus, screen readers, the review checklist |

## Design DNA: twelve rules

1. **Dark blue-black canvas.** Surfaces step from `#05060A` to `#1E2334` in small increments; never neutral grey,
   never pure black cards. Depth = a 1 px top highlight + a soft drop shadow, not big lightness jumps.
2. **Few neon tones, one job each.** lime = primary / XP / correct, aqua = links / focus, iris = level, flare = new /
   rare, amber = quests / in progress, ember = streak, gold = trophies / claimable, coral = wrong / danger. A tone
   means the same thing on every screen.
3. **Glow is a signal, not decoration.** Only active, current, claimable or just-rewarded things glow. A screen at
   rest has a handful of glows; if everything glows, nothing does.
4. **Hexagons for identity** (level badge, medals, quest and empty-state tiles), **circles for actions** (round
   keycap buttons, path nodes, progress rings), **rounded rectangles (24 px) for containers**.
5. **Keycap buttons.** Buttons have a visible 4 px depth and travel 3 px into it when pressed. Primary = lime face
   with dark text; neutral = dark disc with a neon ring.
6. **Duotone icons.** 24 px grid, 1.75 stroke, tone gradient stroke + the same gradient at 18 % as fill, at most one
   accent (a pip or a white glint). Base shapes from one open icon family. Inactive / disabled / on-neon icons are mono.
7. **Three fonts with fixed roles.** Display (Chakra Petch) for headings, numbers and uppercase labels; text
   (Be Vietnam Pro) for UI; reading (Lexend) for long passages. Numbers always `tabular-nums`.
8. **Numbers are alive.** Values count up, bars slide, rings draw in: once, in 600-700 ms, with the glide easing.
9. **Rewards land on the HUD.** An XP gain bursts from the control the user pressed and flies to the XP bar, which
   then updates. Intensity matches rarity: chip < toast < claim glow < level-up modal.
10. **One primary action per view.** A single flowing-gradient CTA; everything else is secondary or ghost.
11. **The HUD is always there and always true.** Level, XP, streak and daily goal in the top bar on every page; all
    values come from the server.
12. **Mobile first, thumb first.** A bottom bar with the core activity as a raised centre dial that doubles as
    today's progress ring; desktop gets a side rail instead.

## Bring it to a new project: build order

Work in this order; each step has a check that must pass before the next one starts.

| # | Create | From | Check |
|---|---|---|---|
| 1 | **Document head**: `data-theme="dark"` + `dark` class on `<html>`, viewport with `viewport-fit=cover`, `theme-color`, `color-scheme`, the font stylesheet, the inline theme script | TOKENS.md §6, §12 | Reload with a saved light theme: no dark frame flashes |
| 2 | **Token stylesheet**: the dark block and the light override. Adjust tone *jobs* to the product; keep one job per hue | TOKENS.md §2-§4, §8, §9, §11 | Every variable holds RGB channels, not hex |
| 3 | **Tailwind theme**: colours, fonts, sizes, radius, shadows, gradients, keyframes, animations, easings | TOKENS.md §1, §6-§11 | `bg-neon-lime/10` and `text-neon-ink-lime` produce CSS |
| 4 | **Base stylesheet**: base element rules, shell variables, component classes, tone scopes outside any layer, the reduced-motion block | TOKENS.md §5, §10, §12; MOTION-A11Y.md §5 | `body` is `#05060A`, headings use the display font, focus rings are aqua; a **production build** still contains `.tone-gold` |
| 5 | **Theme hook** | COMPONENTS.md, hooks | Toggling updates every consumer and survives a reload |
| 6 | **Icon system**: pin Lucide, name list, recipes, generator, preview sheet, licence file, the `Icon` component | ICONS.md; COMPONENTS.md, Icon | The generator fails on a wrong node index; the preview sheet reads at 24 px in dark, light and mono |
| 7 | **Core components and root providers** | COMPONENTS.md | Type-check passes; each component matches its entry |
| 8 | **Gallery page** (development only) showing every component, state and icon | COMPONENTS.md, last section | Reviewed in both themes, at 320 px, with the keyboard, with reduced motion. Do this before any product page |
| 9 | **Shell**: top bar HUD, side rail, bottom bar, dial and radial menu, modal focus | LAYOUT-NAV.md | Unit tests of the arc geometry pass for 3-6 items at 320 / 360 / 390 / 768 px; the open menu fits at 320 px; Tab stays inside it |
| 10 | **Gamification wiring**: agree the HUD read model and the Reward object with the backend, then "play a reward" on every action that grants XP | GAMIFICATION.md §10 | A grant makes the chip land on the XP bar and the bar fill at that moment; a repeated request celebrates nothing |
| 11 | **Pages**: home first (path hero card, stat tiles, quests, achievements), then the rest. Every page gets a skeleton with the same boxes, an empty state and an inline error state | LAYOUT-NAV.md §5, §7 | No layout shift when data arrives |
| 12 | **Verify** | MOTION-A11Y.md §10 | Type-check, production build, and the review checklist on every screen |

When restyling an existing app, the namespaced colour names (`surface-*`, `ink-*`, `neon-*`) do not collide with
Tailwind's default palette, so pages can be migrated one at a time.

## Hard rules

| Rule | What goes wrong when it is broken |
|---|---|
| Colour tokens are **RGB channels** (`--c-lime: 184 255 61`), mapped as `rgb(var(--c-x) / <alpha-value>)` | `bg-neon-lime/10` and every tint, ring and glow stop working; tints get hard-coded and the light theme cannot override them |
| Coloured **text and thin lines** use `neon-ink-*` / `--tone-ink`; fills and glows use `neon-*` / `--tone` | Light theme: neon text on white is about 1.2:1, unreadable |
| Text on a neon fill is `text-on-neon` (`#05060A`), never white | White on lime / gold / aqua is 1.2-3.3:1 |
| `ink-muted` is the floor for readable text; `ink-faint` is decoration / disabled only | Meta text drops under 4.5:1 |
| **Tone = meaning**, never decoration; one job per hue | Colour stops being a signal; the UI reads as a rainbow |
| A tone is passed with a `.tone-*` scope; never interpolate Tailwind class names (`` `bg-neon-${t}` ``) | The class is not in the source text, Tailwind purges it, production renders colourless |
| `.tone-*` rules stay outside `@layer` | Same purge problem for the scopes themselves |
| No glow on body text; glow only on active / current / claimable / rewarded | Blurred glyphs; visual noise; no hierarchy |
| Every state has a non-colour cue (icon, tag, text, shape) | Colour-blind and screen-reader users lose correct / wrong / new / locked |
| Hit areas >= **44x44 px** (extend small visuals with a pseudo-element) | Mis-taps on phones, especially in the bottom bar and chips |
| Visible **focus ring** everywhere: 2 px aqua, offset 2 px; drawn on the visible part of composite controls | Keyboard users are lost; glow is not a focus indicator |
| **Reduced motion** respected at three levels: CSS block, `MotionConfig reducedMotion="user"`, component branches | Vestibular discomfort; loops that cannot be stopped |
| Animate only `transform`, `opacity`, `background-position`; at most two ambient loops on screen | Jank on phones, battery drain, a restless screen |
| `ease-pop` (overshoot) only for rewards | Ordinary UI feels toy-like |
| Dialogs and overlays portal to `<body>` and use the modal-focus behaviour (LAYOUT-NAV.md §6) | They become inert with `#root`, or focus escapes behind the scrim |
| Game numbers come from the server; rewards are idempotent; the HUD is patched optimistically then refetched | Double payouts, a HUD that disagrees with the server, celebrations for nothing |
| No fake scarcity or loss-framing; rewards are shown before they are earned and paid exactly | The game layer becomes a dark pattern and users stop trusting it |
| Both themes are checked for every new screen | Dark-only review ships unreadable light pages |

## Minimal example

```tsx
<GlowCard tone="lime" padding="lg" as="section">
  <p className="font-display text-2xs font-semibold uppercase tracking-[.16em] text-ink-muted">Today</p>
  <h2 className="mt-1.5 text-xl font-bold">2 of 4 steps done</h2>
  <div className="mt-4 flex items-center gap-4">
    <ProgressRing value={0.5} size={64} label="Daily goal">
      <span className="font-display text-sm font-bold tabular-nums text-neon-ink-lime">50%</span>
    </ProgressRing>
    <NeonButton size="lg" iconRight="next" to="/play">Continue</NeonButton>
    <RoundButton icon="mic" tone="flare" aria-label="Voice mode" to="/voice" />
  </div>
</GlowCard>
```

What makes it "this style": the card's corner tint and edge highlight, an uppercase display-font label in muted ink,
a ring with ink-safe coloured text, one flowing CTA, one toned round button with a real accessible name.

## Notes

- The components in the example are names from `COMPONENTS.md`; each project implements them itself. Class and token
  names (`.neon-card`, `ease-glide`, `tone-*`) are the ones the guides use; rename them consistently or not at all.
- Product-specific pieces are described as patterns, not as components: the logo / app mark, the account menu, state
  chips and the split control.
- The icon registry is generated from recipes over Lucide shapes. Path data derived from Lucide carries its ISC
  licence text with it (`ICONS.md` §7).
