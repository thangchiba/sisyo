# Languages: which ones, when they show, how one is chosen

The registry is `assets/languages.json` (code, English name, native name, script, direction, plural forms, voice,
rendering needs, aliases, fallback). `python scripts/i18n.py languages` prints it with the project's view.

## The two sets

| Set | Languages | Rule |
|---|---|---|
| **Text (default)** | 40: en, ja, es, pt-BR, ko, zh-Hans, de, fr, vi, id, zh-Hant, it, ru, tr, pl, nl, th, uk, cs, sv, da, nb, fi, el, hu, ro, sk, hr, bg, ca, ms, fil, hi, bn, ta, ar, he, fa, ur, pt-PT | every product translates its text into all of them, minus what its renderer cannot show (below). |
| **Voice** | 10: en, ja, es, pt-BR, ko, zh-Hans, de, fr, vi, id | the default voice set, the languages a voice backend is expected to cover. Voice is made only for the languages **and** lines a product names ([voice.md](voice.md)) |

Codes are BCP-47: language, then script or region where it matters (`zh-Hans`, `zh-Hant`, `pt-BR`, `pt-PT`). Use
exactly these codes in folders, config, manifests, settings and on the wire. Legacy codes are mapped, never stored:
`jp`→`ja`, `iw`→`he`, `in`→`id`, `tl`→`fil`, `no`→`nb`, `zh-CN`→`zh-Hans`, `zh-TW`→`zh-Hant`.

A language outside the registry (a new market) is added in the project's `extraLanguages` with the same fields, or to
the registry itself when every product should get it. Take the plural forms from
`new Intl.PluralRules(code).resolvedOptions().pluralCategories`.

## What the renderer can show: `capabilities`

Some scripts need more than glyphs. A language that needs a capability the project has not declared is `blocked`: it
is not translated, not packed, not offered. Declaring a capability is a claim that was **tested with a screenshot**.

| Capability | Needed by | What it means |
|---|---|---|
| `rtl` | ar, he, fa, ur | right-to-left paragraphs, mirrored layout, bidirectional text with numbers and Latin words |
| `shaping` | ar, fa, ur, hi, bn, ta, th | letters join or reorder, marks stack (OpenType GSUB/GPOS). Without it the text is wrong, not just ugly |

| Platform | `capabilities` |
|---|---|
| Web (browser), Electron, native iOS/Android text, React Native, Flutter | `["rtl", "shaping"]`; RTL still needs the layout checked (`dir="rtl"`, logical CSS properties) |
| Unity uGUI legacy `Text`, TextMeshPro without a plugin | `[]` → 32 languages (the 8 above stay blocked) |
| Unity with a shaping solution (UI Toolkit's Advanced Text Generator in Unity 6, or an RTL/HarfBuzz plugin) | declare what a screenshot test of real sentences proves |

Fonts are a separate matter from shaping: CJK, Cyrillic, Greek and Thai glyphs must exist in a font the product ships
or can fall back to. Per script, the Noto family is the safe default (Noto Sans JP / KR / SC / TC / Thai / Devanagari /
Bengali / Tamil / Arabic / Hebrew; Latin, Greek and Cyrillic are in Noto Sans). See the platform file for how each
runtime loads them.

## When a language appears in the app

A language is offered only when its manifest entry says `status: "ready"`: every text is translated and current. A `partial` language is packed (so a user who already chose it keeps it
and gets fallbacks for the gaps) but is not listed for new users.

This is why translating belongs to the feature: adding one untranslated text turns 39 languages `partial`, and
`pack` refuses to write that regression.

## The language picker

- A searchable list (type-ahead), one row per ready language: **`<English name> (<native name>)`**, for example
  `Japanese (日本語)`, `Vietnamese (Tiếng Việt)`. Both names come from the manifest.
- The search matches the English name, the native name and the code, ignoring case and accents: "tieng viet" finds
  Tiếng Việt; "japan", "ja" and "日本" find Japanese.
- Order: the device's languages first, then the current one, then the rest by English name.
- Each row shows its state: in the app / downloaded / needs download with the size. Changing language applies
  immediately, without a restart, and is saved.
- The control that opens the picker carries a globe icon and the word "Language" in the current language **and** in
  English, so someone who landed in a language they cannot read finds the way back.
- Voice, where a product has it, is a second setting ("Voice: …") that lists only the voice languages that product
  ships. It defaults to the text language when that has voice, else to the product's `voice.fallback`.

## The default language on first launch

1. Read the device's **ordered list** of preferred languages (iOS `Locale.preferredLanguages`, Android `LocaleList`,
   browser `navigator.languages`). Unity's `Application.systemLanguage` gives one coarse value and cannot tell
   `pt-BR` from `pt-PT` or `zh-Hans` from `zh-Hant`: use it only as the last resort.
2. For each device language in order, take the first ready language that matches by: exact code → `aliases` → same
   language and script (`zh-Hant-HK` → `zh-Hant`) → same base language (`es-MX` → `es`, `fr-CA` → `fr`).
3. Nothing matched → `en`; no English → the source language.
4. Save the choice. From then on only the user changes it. An app update never changes a saved language.

Stores read the supported languages from the build: list the ready languages in iOS `CFBundleLocalizations` and
Android `locales_config` / `resConfigs`, so the store page and the per-app language setting show them.

## Fallback for a missing text

`active language → its fallback list → source language → the key`. The manifest's `fallback` list is the registry's
(`pt-PT → pt-BR`, `ca → es`) followed by `en` and the source language. Never fall back across unrelated languages
(Ukrainian does not fall back to Russian, Traditional Chinese does not fall back to Simplified).

## Plural forms per language

| Forms | Languages |
|---|---|
| other | ja, ko, zh-Hans, zh-Hant, vi, id, th, ms |
| one, other | en, de, nl, sv, da, nb, fi, el, hu, tr, bg, fil, hi, bn, ta, fa, ur |
| one, many, other | es, pt-BR, pt-PT, fr, it, ca (`many` is used for exact millions: give it the `other` wording) |
| one, few, other | ro, hr |
| one, few, many, other | ru, uk, pl, cs, sk |
| one, two, other | he |
| zero, one, two, few, many, other | ar |

On the web `Intl.PluralRules` picks the form. A runtime without it ports `plural_category()` from `scripts/i18n.py`
and tests itself against `assets/plural-vectors.json` (taken from ICU). "one" is not always the number 1: in French
and Brazilian Portuguese it is 0 and 1; in Russian it is 1, 21, 31…
