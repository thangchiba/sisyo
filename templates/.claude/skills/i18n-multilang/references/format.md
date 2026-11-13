# Text format: i18next JSON v4, the portable subset

i18next is the most widely used format on the web (`i18next`, `react-i18next`, `next-i18next`). Games and apps read
the **same files**, so one tool chain and one translation memory serve everything. "Portable subset" means: only the i18next features a small
game runtime can implement exactly. `i18n.py check` enforces the rules below.

## A locale file

`locales/<lang>/<namespace>.json`, UTF-8, LF, 2-space indent. Example `locales/en/shop.json`:

```json
{
  "_about": "The shop screen. Keys that start with _ at the top level are comments.",
  "title": "Shop",
  "buy": "Buy for {{price}} coins",
  "greeting": "Welcome back, {{name}}!",
  "items_one": "{{count}} item",
  "items_other": "{{count}} items",
  "error": {
    "notEnough": "Not enough coins"
  }
}
```

| Element | Rule | Why |
|---|---|---|
| Namespace | one file per feature area (`common`, `lobby`, `shop`, `chapter01`); name `[A-Za-z0-9_-]+`. A new screen or feature with more than a handful of texts gets its own file; a few texts that belong to an existing screen go into that screen's file | small diffs, parallel work, lazy loading on the web |
| Key | nested objects, addressed as `shop:error.notEnough`; parts are `[A-Za-z0-9_-]`, lowerCamelCase; a key is a text **or** a parent, never both | the i18next default; flat dotted keys (`"error.notEnough": "…"`) are also read, but do not mix the two styles in one file |
| Value | a string. No arrays, numbers, null or objects-as-values | arrays and `returnObjects` do not port |
| Placeholder | `{{name}}`: letters, digits, `_`. Named, never positional in new texts | translators must know what the value is; word order differs by language |
| Plural | one key per CLDR form: `key_one`, `key_other` (also `_zero _two _few _many`), selected by the `count` value. The **source needs `_other`**; each language provides exactly its own forms ([languages.md](languages.md)) | i18next JSON v4; `i18n.py apply` rejects a language's answer that lacks a form |
| Comment | top-level keys starting with `_` (for example `_about`) | ignored by the tools, never packed |

A key that ends in `_zero`, `_one`, `_two`, `_few`, `_many` or `_other` is **always** a plural form. Do not end an
ordinary key that way.

## Not portable: do not use in shared texts

| i18next feature | Use instead |
|---|---|
| Nesting `$t(other.key)` | repeat the words, or pass the text in as a placeholder |
| Formatters `{{value, number}}`, `{{date, datetime}}` | format the value in code for the current locale, pass the finished string |
| Context suffixes (`friend_male`) | two separate keys |
| Arrays / `returnObjects` | numbered keys (`tip1`, `tip2`) or a namespace |
| `<1>…</1>` component tags | only in web-only namespaces; tags must match the source |
| Unescaped HTML in values | never: every runtime prints the text as text |

`check` warns about these. A web-only namespace may use them if the product has no game or app runtime.

## Writing source texts (it decides the quality of 40 translations)

- **Whole sentences.** Never glue fragments in code (`"You have " + n + " stars"`): word order and agreement differ.
  One key = one complete sentence with placeholders.
- **One meaning per key.** "Open" (verb) and "Open" (state) are two keys. Reusing a key because the English matches
  breaks other languages.
- **Anything with a count is a plural key**, even if the source language has one form (Vietnamese, Japanese):
  `stars_other`, with `{{count}}`. Russian needs four forms, Arabic six, and they can only exist if the key is plural.
- **No text in images**, no text baked into prefabs or HTML without a key.
- **Give context** in `notes/<ns>.json` for anything short or ambiguous: where it shows, what the placeholder holds, a
  hard length limit. The file is **flat**: each note is keyed by the dotted key without the namespace
  (`"error.notEnough"`), and a plural key by its base name (`"items"`, not `"items_other"`). `check` warns about a
  note whose key matches no text.

  ```json
  { "buy": {"note": "Button under an item. {{price}} is a whole number.", "max": 22},
    "title": "Screen title.", "items": "{{count}} is how many items are in the bag.", "error.notEnough": "Toast." }
  ```
- **Names and fixed terms** go in `glossary.json` (`keep`, `terms`, `forbidden`), not into each note.
- **Numbers the app computes** (scores, prices, counts, dates): the app formats them for the locale and the text only
  has the placeholder.
- **Numbers that are part of the sentence** (a fixed reward in a story line, "3 steps"): digits in the text are
  fine. Write a whole number below 10,000 **without a grouping mark** (`1500`, not `1.500` or `1,500`): the mark
  means different things in different languages and blocks the voice tool. From 10,000 up, each language uses its
  own grouping (`12.000` vi / `12,000` en / `12 000` fr with a no-break space).
- **A spoken line** (one the product has voice for) lives where a voice set's pattern selects it: look at
  `voice.sets` in `i18n.config.json` before choosing its namespace and key ([voice.md](voice.md)). A feature's
  screen texts and its spoken lines may therefore sit in different files.

## Changing a text

| Change | Do | Effect |
|---|---|---|
| New text | add the key in the source language | every language shows it as `missing` until translated |
| Reword, same meaning | edit the source text in place | translations become `stale` and are redone |
| Different meaning, or different placeholders | **new key**; delete the old one when the code stops using it | old app versions keep working with their bundled text |
| Text no longer used | delete it from the source, then `i18n.py sync --write` | removed from every language |
| Typo in one translation | fix that language's file, or `apply` a corrected answer | stays stamped; `apply --lock` protects a human fix from being overwritten |

**Reword or new key?** Ask: is the new text still right in every place, and in every released app version, that
shows this key? An app released last month will download the new wording into its old screen. A greeting that becomes
a warmer greeting passes (same place, same role): edit in place. A button that now does something else, a sentence
that gained or lost a placeholder, or a text reused for a second purpose does not: new key.

## Legacy formats

`check` reads single-brace `{name}` and positional `{0}` as placeholders too, and warns that they are legacy, so an
existing project can be validated before it is converted. Converting is mechanical: move the files into the layout,
change `{name}` to `{{name}}` in the files and in the runtime's formatter in the same commit (a positional `{0}` may
become `{{0}}` first, which is a valid name, and get a real name when the text is next touched), check the
translations that already exist and record them with `i18n.py stamp --all`.
