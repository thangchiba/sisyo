# Layout and navigation

The app shell: a HUD top bar, a side rail on desktop, a bottom bar with a raised centre dial on phones and tablets,
plus the rules for responsive behaviour, safe areas, sheets, dialogs and loading skeletons. Every number is the one
LenS ships; the components named here are described in `COMPONENTS.md`.

## 1. Shell anatomy

```
< lg (phones, tablets)                    >= lg (desktop)
┌──────────────────────────────┐          ┌────┬──────────────────────────────┐
│ logo        [hex][🔥12][◔]   │ 56 px    │ ◎  │ Page title   [hex ▰▰▱][🔥][◔]│ 56 px
│▁▁▁▁▁ 2 px XP line ▁▁▁▁▁▁▁▁▁▁▁│          ├────┼──────────────────────────────┤
│                              │          │ ⌂  │                              │
│            page              │          │ ▤  │            page              │
│                              │          │ ▶  │                              │
│            ╭───╮             │          │ ⚑  │                              │
│  ⌂    ▤   ( 60% )   ⌕    ⚙   │ 64 px    │ ⚙  │                              │
└──────────────────────────────┘ + inset  └────┴──────────────────────────────┘
                                          72 px (lg) / 240 px with labels (xl)
```

Element order in the shell root (`relative min-h-dvh`): backdrop, skip link, side rail, content column (top bar +
`<main>`), bottom bar.

| Piece | Definition | z |
|---|---|---|
| Backdrop | `.neon-backdrop` (fixed, behind everything), rendered once, `aria-hidden` | -10 |
| Skip link | "Skip to content", the first focusable element: visually hidden until focused, then fixed at top-left as a small `surface-2` pill; targets `#main` | 50 |
| Top bar | `sticky top-0`, 56 px high, bottom border `line` at 70 %, `surface-base` at 70 % + `backdrop-blur-xl` | 30 |
| Side rail | `fixed inset-y-0 left`, hidden below `lg`, 72 px wide (240 px from `xl`), right border `line` at 70 %, `surface-base` at 85 % | 30 |
| Content column | `flex min-h-dvh flex-col`, left padding 72 px from `lg` and 240 px from `xl`, plus the side safe-area insets | |
| `<main>` | `flex-1`, `padding-bottom: var(--shell-bottom)`, `id="main" tabIndex={-1}`, no focus outline | |
| Bottom bar | `fixed inset-x-0 bottom-0`, 64 px + the bottom safe-area inset as padding, top border `line` at 70 %, `surface-base` at 80 % + `backdrop-blur-xl`, hidden from `lg` | 30 |
| Sheets, the dial's radial menu | portal to `<body>` | 40 |
| Reward burst overlay / reward toast / level-up modal / toasts | portal to `<body>` | 100 / 105 / 110 / 120 |

This table is the only place the z-order is defined; the other guides refer to it.

`--shell-top` (`3.5rem + 1px`: bar + border) and `--shell-bottom` (`4rem + env(safe-area-inset-bottom)`, `0px` from
1024 px) are defined on `:root`. Anything sticky inside a page offsets by them (`top: var(--shell-top)`), and
`scroll-padding-top / -bottom` on `html` uses them so a focused control never hides under a bar. A page that pins its
own bar above the bottom bar sets `--page-bar` to that bar's height, which is added to the bottom scroll padding.

`backdrop-filter` is used on the top bar, bottom bar, sheets, toasts and modal scrims **only**. Blur on cards or on
the backdrop makes scrolling janky on mid-range phones; the background lights are static gradients for that reason.

Safe areas (needs `viewport-fit=cover`): the content column is padded by `env(safe-area-inset-left / -right)`; the top
bar cancels that with equal negative margins and re-adds it as its own padding, so its **background** runs under a
landscape notch while its **content** stays clear. The rail sits at `left: env(safe-area-inset-left)`.

## 2. Top bar: the HUD

Inner row: 56 px high, 12 px gaps, horizontal padding 16 px (24 from `sm`, 32 from `lg`).

Left: the logo link below `lg` (min height 44 px); from `lg` the page title instead (display font 18 px semibold,
truncated), because the rail carries the logo there.

Right: a group with a 4 px gap (8 px from `sm`) holding the HUD button and, from `md`, the theme toggle and the
account menu. The HUD is **one button** that opens a details panel; its parts sit in a row with an 8 px gap (12 px
from `sm`), in this order:

1. `LevelBadge` `md` (34 x 38 hexagon)
2. `XpBar` (176 px, `LV 7` / `120 / 500 XP`): from `md` only. Its wrapper is marked `data-xp-target`.
3. `StreakPill`
4. `ProgressRing` 34 px for the daily goal, with the percentage inside (9 px bold display font, lime-ink) until
   100 %; then the ring's own check pops in. **Floor** the percentage, here and in the dial (§4), so 99.6 % never
   reads "100%" next to a ring that is not closed. (LenS rounds in this ring and floors in the dial; use one rule.)

Then, from `md`: a ghost `RoundButton` `sm` theme toggle (shows the sun on dark, the moon on light; its label says
which theme it switches to) and the account menu. On phones those two live on the Settings page, not in the bar: at
320 px the bar holds logo + hexagon + streak + ring and nothing else.

Phones: the XP bar becomes a **2 px line on the bottom edge of the top bar** (`absolute inset-x-0 -bottom-px`, the
compact `XpBar`, hidden from `md`), also marked `data-xp-target`, so the reward burst always has a visible landing
point. How the burst chooses between the two targets: COMPONENTS.md, Reward system.

HUD button details:

- Slightly padded (6 px sideways, 4 px vertical, with matching negative margins so it does not shift the row),
  `rounded-2xl`, hover tint `ink-title` at 4 %.
- Its accessible name is the whole state in words: "Level 7, 120 of 500 XP. 12-day streak, done today. Daily goal
  40 of 60 XP. Show details". The parts inside are presentational for assistive tech (roles inside a button are
  flattened), so without this label a screen-reader user hears only "button".
- `aria-expanded` + `aria-controls`; the panel is a non-modal `role="region"` popover labelled "Your progress":
  anchored to the button's right edge, 8 px below, width `min(20rem, 100vw - 1.5rem)`, `rounded-3xl`, `border-line`,
  `bg-surface-2`, `shadow-edge`, padding 16 px. It enters in 160 ms (opacity 0 → 1, y -6 → 0, scale .98 → 1, origin
  top right). An outside pointer-down or Escape closes it; Escape returns focus to the button.
- The panel repeats the three facts as rows separated by hairlines (`line`); each row has 16 px of vertical padding
  (none above the first or below the last) and a 14 px gap between its graphic and its text:
  - a `lg` level badge + a full-width XP bar + "380 XP to level 8";
  - a flame tile (44 px, `rounded-2xl`, ember at 10 %, an inset 1 px ember ring at 30 %, a 24 px flame: ember, with
    `glow` when today is done, mono when there is no streak) + "12-day streak · best 21" + one sentence for the state;
  - a 44 px goal ring with stroke 4 + "40 / 60 XP today" + "20 XP to reach your daily goal." or "Daily goal reached.
    Nice work!".
- While the HUD read is pending, show a skeleton with the same boxes (34 x 38 hexagon, 176 x 24 bar from `md`,
  64 x 36 pill, 34 px circle), so the bar does not reflow when data arrives. If the read failed, render nothing: the
  bar still works without the game.

Account menu (pattern): a 44 px avatar button (the user's initial inside a thin spectral ring: a conic gradient with
1.5 px padding around a `surface-1` disc), `aria-haspopup="menu"`. The popover is 256 px wide, `rounded-2xl`, with the
name and e-mail, a hairline, then a `role="menu"` of 44 px rows (Settings; Log out in coral). Focus moves to the first
item on open; arrow keys, Home and End move; Tab closes; Escape closes and returns focus.

## 3. Side rail (desktop)

- Header: a 56 px row with the logo link (mark only at `lg`, mark + wordmark at `xl`), a hairline under it. List:
  12 px side padding, 16 px top, 6 px between items. Footer: the app version in mono 9 px, `ink-muted`.
- `lg`: 72 px, icons only, with a tooltip to the right of the item on hover **and keyboard focus** (a small
  `surface-2` label, `shadow-edge`, `line-strong` ring, fades in 150 ms); every link has an `aria-label`.
- `xl`: 240 px with labels (14 px medium), items left-aligned with 12 px padding; no tooltip.
- Item: 48 px high, `rounded-2xl`, 22 px icon, in the destination's tone scope. Active = `bg-surface-2` +
  `inset 0 0 0 1.5px rgb(tone/.7), 0 0 18px rgb(tone/.22)` + `ink-title` text + icon `glow`; at `xl` the face becomes
  a 7 % tone tint. Inactive = `ink-soft`, hover tint `ink-title` at 5 %.
- The rail lists **every** destination, including the activity modes that the phone dial fans out. Desktop has the
  room; nothing is hidden behind a menu there.
- Icons keep their tone when inactive in the rail (it is a colour map of the app); in the bottom bar inactive icons
  are mono, because five coloured icons in 320 px read as noise.
- A navigation item is one record `{ to, label, short, icon, tone }`; the rail, the bottom bar, the dial menu and the
  page title all read the same list. An item is active when the path equals `to` or starts with `to + '/'`.

## 4. Bottom bar with the centre dial (phones, tablets)

Five slots: **two destinations · the dial · two destinations** (LenS: Home, Words, **Practice**, Dictionary,
Settings). The dial replaces a row of activity tabs and a "More" sheet: the product's core activities sit behind one
big, central control, so the bar keeps four stable places and every page stays one or two taps away. Theme and
log-out, which a "More" sheet would hold, live on the Settings page.

The bar's list is `grid grid-cols-5`, 64 px high, `max-width: 32rem`, centred. `<nav aria-label="Main">`.

### Flat tabs

- Slot: a column, centred, 4 px gap: a 56 x 32 px `rounded-full` pill holding a 22 px icon, then an 11 px display-font
  label (semibold, `leading-none`, tracking .04em).
- Active: pill `bg-tone/.14` + `inset 0 0 0 1px rgb(tone/.45), 0 0 14px rgb(tone/.22)`, icon in its tone with `glow`,
  label in tone-ink. Inactive: mono icon and label in `ink-muted`, no pill.
- The whole slot is the link (64 px tall, a fifth of the width: 64 px wide at 320 px).
- Labels are one word. If a label does not fit at 320 px, give the destination a shorter word (the `short` field),
  never a smaller font.

### Centre dial: the pattern

The centre slot holds one round, raised button that does two jobs: it **shows today's progress** (the daily-goal
ring) and it **opens the activity modes** as a radial menu above itself. LenS labels it "Practice" and fans out Quiz,
Read, Speak and Dictation.

Rules:

- The dial is navigation, not an action: it never starts an activity directly, it opens the choice.
- The ring shows a real number from the server (today's XP / daily goal, capped at 1). No decorative spinning ring.
  While the number is unknown the ring is empty and an icon shows; the button never changes size.
- When the current route is one of the dial's modes, the dial is the **active** tab (tone ink + glow), because the
  four flat tabs are all inactive at that moment.
- The dial is not the XP landing target; the XP bar is. Two competing targets make the burst ambiguous.
- Only the disc rises above the bar; the bar's height and `--shell-bottom` do not change. Content that a page pins
  directly above the bar (a sticky action bar, a feedback sheet) keeps its controls out of the centre fifth, or sits
  at least 1 rem above `--shell-bottom`.
- Hide the whole bar while a full-screen mode has the screen (LenS: a voice call). The bar is not rendered, an
  attribute on `<html>` shrinks `--shell-bottom` to the safe-area inset alone, and an open menu is closed. A stray
  tap on a tab must not end a call or a timed exercise.
- Desktop (`lg+`) has no dial: the side rail lists the modes directly. The menu closes itself when the viewport
  reaches `lg`, so it can never leave the page inert behind a hidden bar.

**Tone scopes.** Every slot of the bar carries the `.tone-*` scope of its destination (on the list item), and the
dial's slot carries the **primary tone** (`tone-lime`); "the dial's tone" below means that. The radial menu is
portalled to `<body>`, **outside** the bar, so it inherits no scope: set it again inside the portal, `tone-<mode
tone>` on each item's positioned wrapper and `tone-lime` on the close button. Without it `rgb(var(--tone)/...)` has
no value there, and the rings and glows of the menu items and of the close disc are simply not painted.

### Sizes

```
          (B)     (C)                 56 px discs, 11 px label under each, item box 64 px wide,
      (A)             (D)             on an arc above the dial; the lowest disc centres are 62 px above the dial's centre
              ╭───╮
 ─────────────│ ✕ │──────────────     bar top edge; the 60 px disc stands 17 px above it
   ⌂     ▤    ╰───╯    ⌕     ⚙        bar: 64 px + safe-area inset, five equal slots
  Home  Words Practice Dict  Settings
```

| Part | Value |
|---|---|
| Disc | 60 px, `bg-surface-2`, `ring-4 ring-surface-base` (an opaque 4 px collar in the bar's colour, so page content does not show through next to the raised part). 60, not 64: the disc and its label together must still read as one tab. Transition: `box-shadow` and `transform`, 200 ms, glide easing |
| Ring | `ProgressRing` at 60 px, stroke 5, wrapped in `aria-hidden` |
| Disc position | The button fills the slot (`h-full w-full`); its content is a column **pinned to the slot's bottom** (`absolute inset-x-0 bottom-0`, 8 px bottom padding, 2 px gap between disc and label), so the disc overflows upwards instead of pushing the label out. The disc's centre is therefore `8 + 11 + 2 + 30 = 51 px` above the bar's bottom edge |
| Label | The tab label style: display font 11 px semibold, `leading-none`, tracking .04em |
| Menu item | 56 px disc with a 26 px icon in the mode's tone, a 4 px gap, the 11 px label (`ink-title`, `nowrap`); box 64 px wide and about 71 px tall, above the 44 px minimum |
| Scrim | `fixed inset-0`, `surface-void` at 80 % + `backdrop-blur-sm`, over the page and both bars, hidden from `lg` |

The **51 px constant ties the dial and its menu together**: the menu anchors a zero-size element at
`left: 50%; bottom: calc(env(safe-area-inset-bottom) + 51px)`, exactly on the dial's centre, and places everything
from it. Change the disc size, the label or the padding and this constant changes with them.

### States of the disc

| State | Centre | Look |
|---|---|---|
| Progress unknown (loading, or the read failed) | a 22 px mono target icon | empty ring, `ink-title`, drop shadow `0 4px 14px rgb(0 0 0/.35)` |
| In progress | `60%` in the display font, 15 px bold, `leading-none`, `tabular-nums`, **floored** (99.6 % must not read as 100 %) | the same |
| Goal reached | a 24 px check in the dial's tone (lime), with `glow` when active | the same; full ring |
| Active (a mode's route is current) | as above | text and label in tone-ink, glow `0 0 20px rgb(tone/.45)` instead of the drop shadow |
| Open | a 22 px mono cross | active look; this is the menu's own copy of the disc, inside the portal under its own `tone-lime` scope |
| Pressed | | the disc scales to .95 |

Menu item states, in the mode's tone (the scope on the item's wrapper): default = `bg-surface-2` +
`inset 0 0 0 1.5px rgb(tone-ink/.7), 0 0 14px rgb(tone/.22)`; the current mode =
`inset 0 0 0 2px rgb(tone-ink), 0 0 22px rgb(tone/.5)` and icon `glow`; pressed = scale .95 (150 ms).

### The geometry rule

Offsets are measured from the dial's centre to each item's disc centre, x to the right, y down; every y is negative.
Keep this as a pure function with unit tests: it is the part that breaks silently.

1. **Even spread on an arc, mirrored around the vertical axis.** For `count` items over `span` degrees:
   `angle_i = (i / (count - 1) - 0.5) * span`, `x_i = radiusX * sin(angle_i)`, `y_i = -radius * cos(angle_i)`.
   A single item sits straight above the dial (`angle = 0`).
2. **Span by item count:** 3 → 100°, 4 → 120°, 5 → 136°, 6 → 150° (2 → 64°, though two items should not be a radial
   menu). Each span is wide enough that neighbouring discs and labels do not touch on a 320 px screen.
3. **Radius:** `radius = max(112, 62 / cos(span / 2))`. The second term keeps the **outer** items exactly 62 px above
   the dial's centre whatever the span, so their labels (ending 43 px under the disc centre) clear the bar's top
   edge by 6 px. Results: 112, 124, 165.5 and 239.5 px for 3, 4, 5 and 6 items.
4. **Squeeze, do not shrink.** When the circle is wider than the screen, only the horizontal radius is reduced:
   `radiusX = min(radius, (viewportWidth / 2 - margin - itemWidth / 2) / sin(span / 2))` with `margin = 8` and
   `itemWidth = 64`. The arc becomes an ellipse: heights stay, the outer items move in, and nothing is cut off by the
   screen edge. Item sizes and labels never change.
5. Read the viewport width from `document.documentElement.clientWidth` and recompute on `resize`.

| Items | 320 px wide | 360 px | 390 px and wider |
|---|---|---|---|
| 3 | (±86, -72) (0, -112) | the same | the same |
| 4 | (±107, -62) (±42, -117) | the same | the same |
| 5 | (±120, -62) (±72, -137) (0, -166) | (±140, -62) (±84, -137) (0, -166) | (±153, -62) (±93, -137) (0, -166) |
| 6 | (±120, -62) (±88, -169) (±32, -231) | (±140, -62) (±102, -169) (±38, -231) | (±155, -62) (±113, -169) (±42, -231) at 390; a full circle only from about 545 px: (±231, -62) (±169, -169) (±62, -231) |

Each item is positioned absolutely from the anchor: `left = x - 32`, `top = y - 28`, `width = 64`.

What the tests assert, for 3 to 6 items at 320, 360, 390 and 768 px: mirror symmetry and left-to-right order; every
item inside the viewport with the 8 px margin; every item at least 60 px above the dial's centre and at least 8 px
clear of the dial (centre distance >= 30 + 28 + 8); discs at least 4 px apart; no label box touching a neighbouring
disc or label. Re-run them after changing any constant. Labels are assumed to fit in 64 px: one short word
("Dictation" is about the limit at 11 px).

### Motion

- Scrim: opacity 0 → 1 in 180 ms.
- Items: each starts **on the dial's centre** (translated by `(-x, -y)`), scale .4, opacity 0, and springs to its
  place (stiffness 420, damping 26) with a 35 ms stagger left to right. Exit: back into the dial in 140 ms, no
  stagger. Only `transform` and `opacity` animate.
- The dial does not move or morph: the menu draws its own disc exactly over it, so the swap is invisible.
- Reduced motion: the root motion setting drops the travel and the scale; the items fade in place.

### Accessibility

- Dial: `<button aria-haspopup="menu" aria-expanded>`; accessible name "Practice", "Practice, 60% of today's goal" or
  "Practice, today's goal reached". The ring inside is `aria-hidden` (a `progressbar` nested in a button is ignored
  by assistive tech), so the name carries the value.
- Menu: `role="menu"` with a label ("Practice modes") and `aria-orientation="horizontal"`; each mode is a router link
  with `role="menuitem"`, its positioned wrapper `role="none"`. The current mode gets `aria-current` from the router
  and the stronger ring.
- It is **modal** (§6): focus starts on the first mode, Tab stays inside (modes, then the close button), Escape
  closes, the app root is inert and scroll-locked, and focus returns to the dial on close.
- Arrow Right / Down and Left / Up move between modes and wrap; Home and End jump to the first and last.
- Because the app root (and with it the real dial) is inert while the menu is open, the close control must live
  **inside the portal**: a second button ("Close practice modes") placed exactly over the dial
  (`left: -30px; top: -30px` from the anchor) with the same face showing a cross. The thumb that opened the menu
  closes it without moving.
- Closes on: choosing a mode, the close button, a scrim tap, Escape, the viewport reaching `lg`, and the bar being
  hidden.
- The menu is mounted only while open, inside an exit-animation boundary: the modal-focus behaviour runs on mount.

### When not to use a radial menu

- **Fewer than 3 or more than 6 items.** One or two do not make an arc (use a plain raised link, or two flat tabs);
  seven or more cannot keep 56 px discs apart at 320 px (use a bottom sheet with a list).
- **Long or translated labels.** Each label has 64 px. If the names do not fit in one short word in every language
  the product ships, use a sheet.
- **Items that are not peers.** The arc says "equal choices of one kind". Do not mix modes with settings, account
  actions or destructive commands; those belong in Settings or a sheet.
- **A list that changes** (per user, per day, feature flags that reorder). A radial menu is learned by position;
  moving items breaks that.
- **Desktop or pointer-first layouts.** The arc exists for a thumb at the bottom edge of a phone. With a rail or a
  top navigation, list the destinations.
- **A product with one core activity.** A menu with one real choice is a detour: make the centre button a plain
  raised link to it.
- **Nested menus.** Never open a second level from an arc item.

## 5. Responsive rules

| Breakpoint | Shell | Notes |
|---|---|---|
| 320-639 | Bottom bar + compact HUD (hexagon, streak, ring; XP as a 2 px line) | Design here first. Paths zigzag; cards stack; page padding 16 px |
| `sm` 640 | The same shell | Horizontal path; two-column stat rows; padding 24 px |
| `md` 768 | Bottom bar; the full XP bar, theme toggle and account menu appear in the top bar | Toasts move from top-centre to bottom-left |
| `lg` 1024 | 72 px icon rail, no bottom bar | `--shell-bottom: 0px`; padding 32 px |
| `xl` 1280 | 240 px rail with labels | Home gets a side column (quests, week strip) |

- No hover-only actions: everything reachable by hover is also reachable by tap and by keyboard focus.
- Phones get **sheets** where desktop gets popovers.
- Use `min-h-dvh` / `100dvh`, not `100vh`: mobile browser bars change the viewport height.
- Long lists: `content-visibility: auto` on rows.
- Page container: centred, max width 1320 px, the paddings above, 24 px top (32 from `lg`); 68ch for reading text.

## 6. Sheets and dialogs

All of them: portal to `<body>`, `role="dialog" aria-modal="true"`, a label (`aria-labelledby` or `aria-label`),
`tabIndex={-1}` on the panel (so a click on its plain content keeps focus inside), and the modal-focus behaviour
below. The dial's radial menu (§4) is the one modal layer that is a `role="menu"` instead of a dialog; it uses the
same behaviour.

Modal focus, as one hook `(dialogRef, onClose, initialFocus?)` that acts while the dialog is mounted:

| Behaviour | Why |
|---|---|
| On mount, remember the focused element, then move focus into the dialog: the `initialFocus` selector, else the first focusable, else the panel | Keyboard and screen-reader users land where the action is |
| Tab / Shift+Tab wrap inside; a Tab pressed while focus is outside or on the panel itself goes to the first / last focusable | Focus cannot wander into the page behind |
| Escape closes; the key listener is on `document`, not on the dialog | Keys still work after focus lands on `<body>` (a click on plain text) |
| Sets `inert` on the app root (`#root`) and `overflow: hidden` on `body` (remembering the previous value) | The page behind is unreachable for pointer, keyboard and assistive tech; no scroll bleed |
| Keeps a module-level stack of open dialogs; only the top one handles keys; the lock is applied by the first and released when the last closes | A dialog opened from a sheet works |
| On unmount, returns focus to the remembered element | The user continues where they were |

"Focusable" = links with `href`, enabled buttons, inputs, selects, textareas, and anything with a `tabindex` other
than -1. Keep `onClose` in a ref so a new callback identity does not re-run the effect.

Consequences to respect:

- **Dialogs must be portalled outside the app root**, or they become inert with it.
- Providers that render overlays (rewards, toasts) also portal to `<body>` for the same reason.
- The behaviour runs on mount: mount the dialog component only while it is open, inside the exit-animation boundary;
  do not keep it mounted and hidden.
- If the trigger disappears while the dialog is open (a Claim button), move focus somewhere sensible on close.

Bottom sheet (phones): scrim `surface-void` at 70 % + `backdrop-blur-sm` (fades 200 ms); the panel is pinned to the
bottom, `max-height: 85dvh`, scrolls inside, `rounded-t-4xl`, top border `line`, `bg-surface-1`, `shadow-edge`, and
slides from `y: 100%` in 280 ms `ease-glide`; padding includes the safe area
(`padding-bottom: calc(1.25rem + env(safe-area-inset-bottom))`); a 40 x 4 px `line-strong` grab handle (decorative)
and a real close button (ghost `RoundButton` with an `aria-label`).

Centre modal (confirmation, level-up): scrim `surface-void` at 80 % + `backdrop-blur-md`; the scrim container scrolls
vertically and holds an inner `grid min-h-full place-items-center` with 24 px padding, so on a short screen the dialog
scrolls and its primary button stays reachable. Clicking the scrim closes; clicks inside the panel stop propagation.

Destructive confirmation: the title states the action and object ("Delete 3 items?"), the body states the
consequence, the buttons are a `ghost` Cancel + a `danger` verb. Initial focus on Cancel.

Non-modal popovers (HUD panel, account menu): no inert, no scrim; closed by an outside pointer-down or Escape. A menu
uses `role="menu"` / `menuitem`, arrow keys, and closes on Tab.

## 7. Page skeletons and route loading

- Each page is its own lazily loaded chunk. The suspense boundary sits **inside** the shell, around the page outlet:
  the bars stay on screen and only the page area shows a skeleton.
- The route skeleton (a heading bar, a line, two 160 px cards in the page container) appears only after **150 ms**, so
  a cached or fast chunk never flashes it. It is a `role="status"` with an `sr-only` "Loading".
- A skeleton has the same boxes as the loaded page section (same card, same heights). Layout shift on load is
  treated as a bug.
- Data inside a loaded page: per-card skeletons, never a full-page spinner. Buttons that wait show their own spinner,
  keep their size and keep focus.
- Errors: an inline `role="alert"` line in coral-ink next to the control that failed, with a retry; an `EmptyState`
  when there is nothing yet. A failed HUD read hides the HUD, it does not block the page. A page whose chunk failed to
  load shows an `EmptyState` with a Reload button in the page area, inside the shell, and navigating to another route
  clears it.
- On navigation: scroll to top, set `document.title` to the page name, keep the HUD mounted (it must not flash).
