# Translating with an agent

The agent is the translator. The tool hands over exactly what needs translating, with context, and refuses answers
that would break the app. Nothing is sent to an outside translation service.

## The loop for one language

```bash
python <skill>/scripts/i18n.py status                                  # which languages need work
python <skill>/scripts/i18n.py todo --lang ja --limit 150 --out todo.ja.json
#   translate: write done.ja.json
python <skill>/scripts/i18n.py apply done.ja.json                      # validates, writes locales/ja, stamps meta
python <skill>/scripts/i18n.py todo --lang ja …                        # repeat until "0 of 0"
python <skill>/scripts/i18n.py check --lang ja
```

Keep `todo` / `done` files in a scratch folder, not in the repository.

`todo.<lang>.json` gives, per text: `id` (`ns:key`), `state` (`missing`, `stale`, `incomplete`), `source`,
`reference` (the same text in the reference language, when it is current), `note` (context, `max` length),
`current` (the old translation of a stale text: change only what the new source requires), `forms` (the plural forms
this language needs), `voice: true` (the line is spoken aloud in this language: see "Voice lines" below). At the top:
the language, its plural forms, and the glossary for it.

The answer file:

```json
{
  "lang": "ru",
  "items": {
    "shop:title": "Магазин",
    "shop:buy": "Купить за {{price}} монет",
    "shop:items": { "one": "{{count}} предмет", "few": "{{count}} предмета", "many": "{{count}} предметов", "other": "{{count}} предмета" }
  }
}
```

`apply` rejects an item (and says why) when a placeholder is lost or invented, a plural form is missing, a forbidden
word appears, the note's `max` is exceeded, or the key is locked. Fix and apply again; accepted items are already saved.

## Order and scale

1. **English first** when the source is not English. It becomes the `reference` every other language sees, which
   steadies meaning for languages where direct Vietnamese→X data is thin.
2. Then the other voice languages, then the rest.
3. Work in batches of 100–200 texts per language so every item gets attention and the answer file stays reviewable.
   One namespace at a time (`--ns`) keeps context coherent.
4. Many languages at once: one sub-agent per language (or per small group), each running the loop above on its own
   `--lang`. They write different files, so they do not collide; run `check` and `pack` once at the end, in the lead.
   Translation batches are execution work: give them to the cheaper model tier, and keep the lead on the session
   model for the review.

## Before translating: read

- `i18n/style.md`: audience, tone, form of address, per-language rules. If it is empty, fill in the top part from the
  product's docs first: a translation without a brief guesses the register.
- `i18n/glossary.json`: `keep` (names never translated), `terms` (fixed translations), `forbidden`.
- The `note` of each text. When a short text has no note and its meaning is unclear ("Open", "Back", "Light"), look
  at where the key is used in the code before translating, then add the note so the next language does not ask again.

## Rules for the translation itself

- Translate the **meaning for that screen**, not the words. A button is an action; a title is a noun phrase.
- **Placeholders** `{{name}}` are copied exactly, moved to where the grammar wants them. Never translate, rename or
  drop one. (`{{count}}` may be omitted from a `_one` / `_zero` / `_two` form that spells the number out.)
- **Plural forms**: write every form the language has, each a full natural sentence. For es / pt / fr / it / ca the
  `many` form (exact millions) is normally the `other` wording. Where a noun must agree with the number (Russian,
  Polish, Arabic), make it agree; do not paste one form into all slots.
- **Length**: stay near the source length for buttons, tabs and labels. German, Russian, Finnish and Greek run 20–35%
  longer: prefer the shorter natural wording. `max` in a note is a hard limit.
- **Register**: one form of address per language for the whole product, taken from `style.md` (for example informal
  `du` / `tu` / `tú` in a children's game, polite form for payment and account screens if the brief says so).
- **Names and brands** in `keep` stay as written, in Latin letters, in every language.
- **Punctuation and typography of the target language**: full-width 、。！？ in Japanese and Chinese; ¿…? ¡…! in
  Spanish; in French a **no-break space (U+00A0)** before `: ; ! ?` (not a plain space, which lets the mark wrap
  alone onto the next line, and not the narrow U+202F, which many game fonts lack; `check` warns about the plain
  space); „…“ in German; no space before 。; the ellipsis character where the language uses it. Keep line breaks
  (`\n`) and leading/trailing spaces as in the source.
- **Scripts**: zh-Hans and zh-Hant are different vocabularies as well as different characters (软件 / 軟體): translate
  each, do not convert. pt-BR and pt-PT differ in wording and spelling.
- **Do not localise what the app formats**: digits, dates, prices and units arrive through placeholders already
  formatted.
- **Digits written in the source sentence** keep their value. A whole number below 10,000 has no grouping mark in any
  language (`1500`); from 10,000 up use the target language's grouping (`12,000` en, `12.000` de / vi, `12 000` fr
  and ru with a no-break space). If the source itself has `1.500`, fix the source to `1500` first.
- **Culture**: replace an idiom by the natural expression of the target language; keep jokes only if they survive.
  Nothing that reads as religious, political or rude in the target market.
- If a source text is itself wrong or unclear, do not translate around it: fix the source (or ask), then translate.

## Voice lines (`"voice": true` in `todo`)

The line will be spoken by the voice in this language, so translate it for the ear as well as the eye:

- Short, natural spoken sentences. No abbreviations, symbols (`%`, `&`, `+`, `/`), emoji or brackets that a voice
  would have to guess: write the words.
- Numbers as plain digits without a grouping mark, so the tool can read them.
- Japanese and Korean put counters on numbers (`3つ`, `105まい`, `3개`), and the counter changes how the number is
  read. Write the natural sentence; the tool will then mark the line `blocked`, and the same pass that translated it
  writes its spoken text:

  ```bash
  python <skill>/scripts/voice.py plan --lang ja                       # which lines are blocked, and why
  python <skill>/scripts/voice.py say --lang ja --id game:say.reward "ほしを せんごひゃっこと コインを ひゃくごまい もらったよ！"
  ```

  `say` ties the spoken text to the shown text and checks that it says the same numbers ([numbers.md](numbers.md)).
- Changing the words of a voice line puts its clip one step behind the text: the clip must be remade, or kept on
  purpose if the old words still fit ([voice.md](voice.md) §5). Do not reword a voiced line for taste alone.

## Review before it counts

1. `i18n.py check` with no errors; read every warning ("no … characters", "identical to the source", "Vietnamese
   letters are left") and fix or consciously accept it.
2. Self-review each batch once as a reader of that language: does every line sound like something a native app would
   say on that screen?
3. For the voice languages and the product's main markets, a second agent (fresh context) spot-checks a sample of
   30–50 texts by translating them back and comparing meaning. Disagreements are fixed, not averaged.
4. Layout: after a language is first added, capture the main screens in that language (the product's screenshot
   tests) and look for clipped or overflowing text. German and Russian find most overflow; Thai and CJK find most
   font gaps.

## Corrections from people

A person's correction outranks the agent's wording. Apply it and lock it:

```bash
python <skill>/scripts/i18n.py apply fix.ja.json --lock
```

A locked text is never overwritten by a later `apply` unless `--force` is passed, and `--force` needs the owner's
word. When the source of a locked text changes, it shows up as `stale` with `"locked": true` in `todo`: propose the
new translation to the owner instead of applying it silently.

## Adopting translations that already exist

A project that already has translations shows them as `untracked`: present, but
never stamped against a source text. After checking that they match the current source, record that:

```bash
python <skill>/scripts/i18n.py stamp --lang en     # or --all
```

From then on a source change marks exactly the affected texts `stale`.
