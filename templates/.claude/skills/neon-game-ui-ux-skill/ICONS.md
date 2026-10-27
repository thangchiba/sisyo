# Icons

How the duotone icon set is made, the rules that keep it even, and how to set up the same pipeline in another
project. Nothing here is copied from a file: a project builds its own small generator from this description. The
component that paints an icon (`<Icon name tone size glow />`) is described in `COMPONENTS.md`.

## 1. The method in one paragraph

Base shapes come from **Lucide** (ISC licence), an open icon family drawn on a 24 px grid with round caps and joins.
Each icon of the set is a short **recipe**: which Lucide icon, and which of its drawing nodes go into which **layer**
(`main`, `detail`, `fine`, `solid`, `glint`, `cut`). A small **generator** reads the recipes and Lucide's node data
and writes the **registry**: one data file with path data per layer per icon. The registry is generated and never
edited by hand; the `Icon` component and any export script only read it. A **preview sheet** renders icons from the
recipes at their real size, so every change is judged at 24 px before it is built.

```
recipes (one per icon) + Lucide node data  --generator-->  icon registry  --Icon component / export-->  UI, SVG files
```

LenS has 68 icons made this way: 67 on Lucide shapes and one drawing of its own (a treasure chest, which Lucide does
not have).

Start from an established family; do not type path coordinates by hand. A hand-typed set ends up with uneven visual
weight between neighbours, no optical correction (round shapes look smaller than boxy ones, pointed shapes look
off-centre) and a different corner radius on every icon. A family has already solved these, and the recipes add the
project's identity (duotone fill, tones, one accent) on top of it.

## 2. The layer model

Grid: 24x24 viewBox, 2 units of padding (live area 2..22), stroke 1.75, round caps and joins.

Each registry entry is `{ tone, main?, detail?, fine?, solid?, glint?, cut?, vector? }`; every layer is one SVG path
data string (several subpaths allowed). Layers are painted in this order:

| Layer | Paint | Use |
|---|---|---|
| `main` | tone gradient **stroke 1.75** + the same gradient as **fill at 18 %** | The silhouette. This fill is what makes the set "duotone". Must be closed paths |
| `detail` | gradient stroke 1.75, no fill | Inner lines, handles, check marks; whole glyphs that have no silhouette |
| `fine` | gradient stroke 1.5 | Sparks, small sparkles, speed lines |
| `solid` | gradient fill at 100 %, no stroke | Dots, pips, one filled accent shape |
| `glint` | white stroke 1.25 at 60 % opacity | A short highlight "reflection". Dropped in mono |
| `cut` | a slash stroked in the paint, **and** a mask that knocks a 4.25 unit wide gap out of every other layer | "Off" variants (mic-off): the slash gets 1.25 units of clearance on each side |

The `cut` mask: a `<mask>` in user space covering the 24 grid, a white rectangle with the slash path stroked in black
at width 4.25. Every other layer goes into a group that uses the mask; the slash itself is drawn after the group.

### Paint

- One gradient per tone: 3 stops, *light tint → the tone → the neighbouring hue*. Each stop has a colour for the dark
  theme and an ink-safe colour for the light theme:

| Tone | Offsets | Dark stops | Light stops | Glow channels |
|---|---|---|---|---|
| lime | 0 / .55 / 1 | `#F0FF9E` `#B8FF3D` `#3DF5D8` | `#4F9400` `#3D7A00` `#00786A` | 184 255 61 |
| aqua | 0 / .5 / 1 | `#B9FFF6` `#3DF5D8` `#2E9BFF` | `#00957F` `#00786A` `#1D5FD0` | 61 245 216 |
| iris | 0 / .5 / 1 | `#DAD4FF` `#8B7BFF` `#E056E8` | `#6E5CF5` `#5A45EE` `#A21FA0` | 139 123 255 |
| flare | 0 / .5 / 1 | `#FFC4F0` `#FF4FD8` `#9D6BFF` | `#CC2FB0` `#B8129A` `#6A3FD8` | 255 79 216 |
| amber | 0 / .5 / 1 | `#FFE7B0` `#FFB23E` `#FF7F3D` | `#B06A00` `#955800` `#C2410C` | 255 178 62 |
| ember | 0 / .55 / 1 | `#FFE27A` `#FF9B3D` `#FF4D3D` | `#D9530F` `#C2410C` `#B3261E` | 255 106 43 |
| gold | 0 / .5 / 1 | `#FFF2B0` `#FFD65A` `#E0A21F` | `#9C7000` `#8A6200` `#9A4F00` | 255 214 90 |
| coral | 0 / .5 / 1 | `#FFC2CD` `#FF5C7A` `#F0407E` | `#E0355A` `#CC1A40` `#A8124F` | 255 92 122 |
| spectral | 0 / .4 / .75 / 1 | `#B8FF3D` `#3DF5D8` `#8B7BFF` `#FF4FD8` | `#3D7A00` `#00786A` `#5A45EE` `#B8129A` | 61 245 216 |

  `spectral` is the 4-stop brand gradient, for the product's own mark only.
- The gradient is a `linearGradient` in `userSpaceOnUse` from `(3,3)` to `(21,21)`. An icon can override the
  direction with `vector: [x1, y1, x2, y2]` (a flame runs bottom to top, a bolt tip to tip).
- **Theme switch inside the SVG**: each `<stop>` carries the dark colour as its `stop-color` attribute and
  `style="stop-color: light-dark(<light>, <dark>)"`. The attribute is the fallback; `light-dark()` follows the
  `color-scheme` set on the root per theme (TOKENS.md §1). Without `color-scheme` the light stops never apply.
- Gradient and mask ids must be unique per rendered icon (React: `useId()` with the colons removed). Two icons with
  the same hard-coded id share one gradient, and the second paints with the first one's colours.
- `tone="mono"` paints every layer with `currentColor`, emits no gradient and drops the glint; the 18 % fill stays, so
  a mono icon is still duotone.
- Keep the registry and the tone table as **pure data with no runtime imports**, so a build script can load the same
  files the app uses.

## 3. Recipes

A recipe assigns Lucide nodes to layers. Each icon of the `lucide-react` package is one module,
`lucide-react/dist/esm/icons/<kebab-name>.js`, that exports `__iconNode`: an ordered array of nodes
(`[tag, attributes]`, tags `path`, `circle`, `rect`, `line`, `polyline`, `ellipse`). A node is referred to by its
index in that array. Print the array once when writing a recipe (index, tag, attributes):

```bash
node -e "import('lucide-react/dist/esm/icons/trophy.js').then(m => m.__iconNode.forEach((n, i) => console.log(i, n[0], JSON.stringify(n[1]))))"
```

`__iconNode` and the module path are internals of the package, not a documented API: that is one more reason for the
exact version pin (§5). If another version lays them out differently, read the node data from wherever that version
keeps it and keep the rest of the method.

```js
// one Lucide icon: node 3 is the closed book outline, 0-2 are the text lines
reading:  { tone: 'aqua', from: 'book-open-text', main: [3], detail: [0, 1, 2], glint: 'M4.5 7.5v-2' }

// two Lucide icons: whole nodes are scaled and moved, never retyped
level:    { tone: 'iris', parts: [{ from: 'hexagon', main: 'all' },
                                  { from: 'chevrons-up', detail: 'all', scale: 0.75, dx: 3, dy: 3 }] }

// a glyph with no silhouette: stroke only
check:    { tone: 'lime', from: 'check', detail: 'all' }

// no Lucide equivalent (last resort): a drawing of the project's own
chest:    { tone: 'gold', custom: { main: '...', detail: '...', glint: '...' } }
```

| Key | Meaning |
|---|---|
| `tone` | The default paint: one of the eight tones, `mono` or `spectral` |
| `from` | The Lucide icon name (kebab-case) |
| `main` `detail` `fine` `solid` `glint` `cut` | What goes into the layer: node indexes (`[0, 2]`), `'all'`, `'rest'` (the nodes no other layer took), raw path data (`'M6 8l1-1'`), or a list mixing indexes and path data |
| `scale` `dx` `dy` | Uniform scale about the origin, then a translate: `p' = p * scale + (dx, dy)`. To scale about the centre of the grid use `dx = dy = 12 * (1 - scale)`. Applies to Lucide nodes only; **raw path data is never transformed** |
| `parts` | A list of `{ from, scale, dx, dy, <layers> }` to combine icons. Layers written next to `parts` may only be raw path data |
| `custom` | `{ <layer>: path data }`: a drawing of the project's own |
| `vector` | Gradient vector override |
| `openMain` | `true` once the preview has confirmed that an open `main` path fills correctly; silences the warning |

A node may sit in two layers (three dots as `detail: 'all', solid: 'all'` stay solid at stroke 1.75). A helper
`dot(cx, cy, r)` that returns the path of a circle keeps pips identical across the set.

Three recipe techniques recur:

- **Split**: the closed outer node → `main`, everything else → `detail` (`trophy`, `calendar`, `settings`).
- **Combine**: a container from one icon and a mark from another, scaled and centred (a hexagon + a check for the
  quiz, a circle + a small solid sparkle for "new", a medal + a solid star for "mastered").
- **Re-cut**: when Lucide draws one path that mixes a closed part and an open part (headphones: ear cups + band), the
  same coordinates are written as two path strings, the closed part in `main` and the open part in `detail`. The
  coordinates are Lucide's; nothing is redrawn.

## 4. The customisation rules

1. **One closed silhouette per object icon goes to `main`.** Closed shape = fill; open glyph = stroke only. Pure
   glyphs (check, cross, chevrons, arrows, plus, menu, more, search, link, edit, external, log-out) have no `main`.
   A filled lens or door bracket reads as a button at 13-18 px.
2. **At most one accent per icon**: a `solid` pip **or** a `glint`, never both. A pip is a dot of radius 1.25 (it
   keeps a 1.5 unit gap to its frame). A glint is 2 units long, sits top-left inside the silhouette and follows its
   contour; it is for glossy objects (bolt, flame, trophy, gem, book, bulb, chest).
3. **`fine` sparks only on game icons that celebrate.** In practice use them even less: LenS keeps a spark on a
   single icon, because the reward icons also run at 14-16 px inside chips, where a spark turns into noise, and every
   base shape already fills the 2..22 box.
4. **Keep Lucide's proportions and corner radii.** Combine icons with `scale` / `dx` / `dy`, never by retyping
   coordinates. A custom drawing uses the same vocabulary: 24 grid, 2 units of padding, corner radii 1 and 2, round
   joins.
5. **Equal visual weight at 22-24 px.** Icons that sit side by side (a navigation row, a transport set) must fill the
   same optical box. Lucide's play / pause / stop are 18 units tall and heavier than its other actions, so LenS
   scales them to about 15 units about the grid centre (`scale .78-.85`). Keep the inside open: at most 3-4 strokes
   inside the silhouette, gaps of at least 1.5 units (four half-size sound bars touch at 22 px; three at a 3.5 unit
   pitch do not).
6. **Every icon must read in mono and on the light theme.** No meaning carried by the gradient alone.
7. **A family of states shares one frame.** LenS's item states are built around one circle (or its medal) with a
   single mark each (sparkle, check, half disc, turning arrows, star), so they differ by the mark alone at 16-20 px.

## 5. The generator

A script of a few hundred lines, run by a package script (`icons:build`). `lucide-react` is a **pinned development
dependency**: an exact version, not a range (LenS: `"lucide-react": "1.7.0"`). Node indexes can change between
versions, and a silent upgrade would reshuffle layers. The generator and the preview are its only readers. Two more
development dependencies do the heavy lifting in LenS, as examples: `svgpath` (transform and rounding of path data)
and `@resvg/resvg-js` (SVG to PNG for the preview sheet).

What it does:

1. Reads an ordered **name list** (sections and icon names). The icon-name type of the app is derived from the
   registry keys, so renaming an icon is a breaking change that the type-checker finds.
2. For each recipe, loads the Lucide icon's nodes, converts every node to path data (circle, rect with rounded
   corners, line, polyline, ellipse → `M ... Z` paths), applies `scale` / `dx` / `dy`, rounds to two decimals and
   concatenates the nodes of each layer into one string. The path-data library does the transform and the rounding.
3. Validates, then writes the registry file with a "generated, do not edit" header that names the Lucide version and
   the licence file.

It must **fail without writing** on: an unknown Lucide icon or node index; an unknown recipe key or tone; a name that
is missing, duplicated, unlisted or out of order compared with the name list; a `'rest'` that selects nothing; a
`from` that no layer uses; any coordinate outside the 0..24 grid (sample points along curves, not only end points).

It **warns** on: an open subpath in `main` or `solid` (the fill would get a straight, unstroked closing edge; check
the preview, then set `openMain`); a solid pip together with a glint.

Unit-test the path helpers (node → path, transform, bounds, closed-subpath detection) and the resolver's failures.

Adding an icon is three steps: add the name to its section in the name list; add the recipe at the same position;
preview it, run the build, and commit the recipe together with the regenerated registry.

## 6. The preview sheet

A second script renders a contact sheet PNG **straight from the recipes** (not from the registry), so an edit is
visible before any build. It uses the same layer-to-paint function as the app and an SVG rasteriser (§5), and writes
its output outside the repository, so many previews can run in parallel without touching tracked files.

Per icon the sheet shows its name, tone and Lucide base, then the icon at **24 / 32 / 48 px** in three rows:

- in its tone on the dark surface (`#0A0C14`);
- in its tone on the light surface (`#F4F6FB`) with the light gradient stops;
- in mono (ink `#D5DAE8` on dark).

Options worth having: pick by section, by name or all; a compare mode that puts the previously committed icon next to
the new one; the number of columns; the device scale (2 by default).

How to judge: **look at the 24 px column first**, next to the icon's neighbours. Zoomed-in beauty is irrelevant.
Keep a sheet to about 12 icons so an image viewer does not shrink it below real size.

An export step can follow the build for consumers outside the app: one standalone SVG per icon in its default tone,
PNGs at 2x, and a static gallery page with every icon at 48 / 24 / 16 px and a strip of all tones. Those files are
regenerated from the registry and never edited.

## 7. Licence obligation

Lucide is ISC licensed; parts of it derive from Feather, which is MIT. Both require that the copyright notice and the
licence text accompany copies. Path data taken from Lucide and re-layered is a derived work, so:

- **Ship the licence text next to the registry** (a `LICENSE-lucide.txt` beside the generated file), as a verbatim
  copy of `node_modules/lucide-react/LICENSE`, the licence file of the installed package.
- Name the source and the version in the generated file's header.
- Copy the licence again whenever the pinned version changes, then rebuild and check the preview.

## 8. Alternative routes

| Route | What it is | Trade-off |
|---|---|---|
| **Another open stroke family** | Tabler (MIT, 24 grid, stroke 2), Iconoir (MIT, stroke 1.5), Heroicons outline (MIT, stroke 1.5), Material Symbols (Apache 2.0). The same recipe method applies: their SVGs are 24 grid, unfilled, round caps. Use **one** family for the whole set and one stroke width | The set looks like that family; node structure and coverage differ, so recipes are not portable between families. Read the licence of the release in use and ship it the same way |
| **A ready-made duotone family** | Phosphor duotone (MIT, 256 grid, filled outlines + a 20 % background shape), Solar duotone (CC BY 4.0: **attribution required**) | Two-layer art out of the box, but the shapes are fills, not strokes: scale to 24, put outlines in `solid` and add a fill-only tint layer. The stroke width can no longer be tuned. Paid duotone sets (Font Awesome Pro) must not be copied |
| **Drawing in a vector tool** | One 24x24 frame per icon, 20x20 live area, keyline shapes (circle 20, square 18, portrait 16x20, landscape 20x16), strokes not outlined, layers named after the layer model; export, optimise, copy each layer's path into the registry | Best quality and a unique look; needs a person with a designer's eye and is the slowest route |
| **Image-model concepts, then redraw** | Generate one contact sheet so the style is shared, use it as a **reference** and redraw each icon on the grid | Good for finding metaphors quickly. Never ship traced output: tracing yields filled blobs with hundreds of nodes, no stroke and no layers. Check the model's terms for commercial use |

The recipe method and a vector tool combine well: a family for the generic 90 %, `custom` drawings for the few icons
that carry the product's identity.

## 9. Checklist before an icon is committed

The drawing rules are §4 (silhouette in `main`, one accent, the family's radii, equal optical box, open insides); the
generator enforces the grid and warns about open fills (§5). What is left to check by eye and by hand:

- [ ] Judged at **22-24 px**, at 1x, on the dark canvas, next to its neighbours; then at 16 px where it is used small.
- [ ] Reads in mono (toolbar, disabled, on a lime disc) and on the light theme.
- [ ] One stroke width for the whole set (1.75); `fine` (1.5) only for sparks.
- [ ] Names are nouns for the object or the job, kebab-case, stable.
- [ ] Recipe, regenerated registry and exported files are committed together; nothing generated was hand-edited.
- [ ] The licence text sits next to the registry and matches the pinned version.

## 10. Using icons in the UI

- Sizes: 22 px in tabs and the rail, 16-20 px inside buttons, 18-36 px on round buttons by size, 26 px on the dial's
  menu items, 13-15 px in chips.
- A tone is a meaning (TOKENS.md §4): an icon takes the tone of the thing it stands for, not a random pretty colour.
  Inactive, disabled and "on a neon fill" are `mono`.
- `glow` only for the active navigation item, the current step, a just-earned reward.
- Decorative by default; an icon-only control gets `aria-label` on the control.
- Icon names that come from a server (a quest's icon) are looked up with a fallback: an unknown name must render a
  default icon, not crash the page.
- Brand logos (a sign-in provider's mark) are used as supplied, unrecoloured, without glow.
