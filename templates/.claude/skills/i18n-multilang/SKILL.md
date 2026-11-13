---
name: i18n-multilang
description: One standard for multi-language text (and, only where a product has it, voice) across games, apps and websites - i18next-format JSON in a fixed i18n/ folder, AI translation into a default set of 40 languages, language packs with versions that ship inside the app and/or on a CDN (S3 + CloudFront); optional voice in 10 languages for the lines the owner names, with its own version next to the text version, and numbers that a TTS voice always reads correctly. Use this skill whenever work touches text a user reads or hears - adding or changing any user-facing string, translate, localization, i18n, l10n, "đa ngôn ngữ", "thêm ngôn ngữ", "dịch", a language picker or default language, language packs or their versions, voice lines, TTS, "giọng đọc", "đọc số" - and before writing a new user-facing string, even when the request never mentions translation.
license: MIT
metadata:
  author: HoangThang
---

# Multi-language text and voice

One standard for all of a team's games, apps and websites, so that a language added once works everywhere and every
agent puts files in the same place. Text is the standard; voice is an option a few products add. "The owner" below
is whoever decides for the product.

`<skill>` below is this folder (`.claude/skills/i18n-multilang` in a project set up with sisyo). The tools need only
Python 3.8+.

## The standard

### Text: every product

1. **Format**: i18next JSON v4, the portable subset: nested keys, `{{name}}` placeholders, plural keys
   `key_one` / `key_other`. The same files serve the web (i18next) and the games. → [references/format.md](references/format.md)
2. **Place**: one `i18n/` folder per product: `locales/<lang>/<ns>.json`, notes, glossary, style, meta, manifest,
   voice. Engine folders only get copies written by `pack`. Code and texts share one repository; audio does not live
   in git. → [references/layout-and-versioning.md](references/layout-and-versioning.md)
3. **Source first**: a text is written once, in the project's source language, as a whole sentence with a key. Code
   never glues fragments and never holds a user-facing string without a key.
4. **Text languages**: by default all 40 languages of the registry, minus those the product's text renderer cannot
   show (right-to-left and complex scripts stay blocked until the platform proves it can render them). A language is
   offered to users only when it is `ready`: every text translated and current. → [references/languages.md](references/languages.md)
5. **Translation is part of the feature**: the agent translates with the `todo` → `apply` loop, which validates
   placeholders, plural forms, length and forbidden words. A feature that adds text is not done until every language
   is back to `ready`. → [references/translation.md](references/translation.md)
6. **Versions**: `pack` builds one pack per language plus a manifest and bumps a language's `version` when its
   content changed. Higher version wins on a device; versions never go down; an existing key never changes meaning.
7. **Delivery**: text packs are bundled in the app (they are tiny) **and** published to the product's CDN for updates
   and new languages; hashed file names, manifest uploaded last.

### Voice: optional, and most products have none

A product is text-only until the owner names voice languages and lines for it. While `voice.languages` or
`voice.sets` is empty in its config (the default), **skip rules 8–10 and everything about voice in the references**:
no voice files, no voice steps, nothing to report about voice.

8. **Opt-in**: only the 10 voice languages, only the languages and line sets the owner named for that product, made
   with the project's own voice backend under that backend's rules, downloaded lazily per set from the CDN.
   → [references/voice.md](references/voice.md)
9. **Numbers are never left to the voice**: the spoken text contains no digit (`numwords.py` writes "một nghìn hai
   trăm ba mươi bốn", "một trăm linh năm"), and every clip with a number is checked by a recogniser afterwards.
   → [references/numbers.md](references/numbers.md)
10. **Text version and voice version are separate.** A language's text pack and each voice set carry their own
    version, and a voice set records the text version it was packed for; `i18n.py versions` shows both side by
    side. Text may move ahead of voice. When a voiced line's text changes before its clip is remade: the same words
    (only punctuation or case changed) → the clip stays valid; a small rewording the old words still fit →
    `voice.py keep`, the old clip keeps playing and the line counts as `behind` until remade; anything else → the
    line is silent until the new clip exists. A clip that says a different number is never kept.
    → [references/voice.md](references/voice.md) §5

## Find your task

| The task | Steps | Read first |
|---|---|---|
| A feature added, changed or removed user-facing text | the everyday loop below | format.md |
| Set up i18n in a new product | `i18n.py init`, fill `style.md` and the config, wire the runtime | layout-and-versioning.md + the platform file |
| Bring an existing product to the standard | plan it as its own approved batch; convert files, `stamp`, then the runtime | format.md (legacy formats), platform-unity.md §7 or platform-web.md |
| Translate / add a language | `status` → `todo` → translate → `apply` → `check` | translation.md, languages.md |
| Language picker, default language, fallback | implement the contract | languages.md + the platform file |
| Runtime loading, updates from the CDN | implement the contract | layout-and-versioning.md §9, platform file |
| Publish packs | `pack`, upload in plan order, verify | layout-and-versioning.md §7–8 |
| Voice lines for a product | only if the owner named languages and lines: `voice.py plan` → sample → bulk → `add` → `pack` | voice.md, numbers.md |
| A voice reads a number wrong | fix the spoken text with `numwords.py`, regenerate, check with `heard` | numbers.md |

Platform files: [references/platform-unity.md](references/platform-unity.md) (runtime contract, fonts, tests,
adopting the standard in an existing game), [references/platform-web.md](references/platform-web.md) (i18next setup,
language matching code, SEO, apps).

## The everyday loop: a feature touched text

```bash
python <skill>/scripts/i18n.py status          # 1. see the state before you start
#  2. write the new texts in i18n/locales/<source>/<ns>.json (whole sentences, {{named}} values, plural keys for
#     counts) and a note in i18n/notes/<ns>.json for anything short or ambiguous; use the keys in code
python <skill>/scripts/i18n.py status          # 3. every other language now shows new / stale texts
python <skill>/scripts/i18n.py todo --lang en --out <scratch>/todo.en.json     # 4. per language: translate the
python <skill>/scripts/i18n.py apply <scratch>/done.en.json                    #    answer file, apply; English first
python <skill>/scripts/i18n.py check           # 5. no errors; read the warnings
python <skill>/scripts/i18n.py pack            # 6. packs + manifest + bundle copies; versions bump
#  7. only if the product has voice (voice.languages and voice.sets are set):
python <skill>/scripts/voice.py plan           #    lines that became new, stale or blocked; shows "clip says / text now"
python <skill>/scripts/voice.py say --lang L --id ns:key "…"     # settle blocked lines (or fix their shown text)
python <skill>/scripts/voice.py keep --lang L --id ns:key --why "…"   # a stale line whose old words still fit
python <skill>/scripts/voice.py pack           #    always, after i18n.py pack: voice version, behind and silent lines
python <skill>/scripts/i18n.py versions        #    text version and voice version side by side
#     new clips need the voice server and its rules (voice.md): report the lines to make, with their spoken text
#  8. commit i18n/ and the bundle copies together with the code. Publishing to the CDN is a separate, approved step.
```

- Reworded text, same meaning: edit in place (translations go stale and are redone). Different meaning or different
  placeholders: a **new key**. Deleted text: remove it from the source, then `i18n.py sync --write`.
- `pack` refuses when a language that was `ready` no longer is. That refusal is the reminder to translate, not an
  obstacle to bypass: `--allow-regress` is for the owner's explicit decision.
- With 40 languages, give each language (or small group) to a sub-agent running the same loop; `check` and `pack`
  once at the end.
- A text the product speaks aloud (`"voice": true` in `todo`): write numbers as plain digits without a grouping mark
  (`1500`). Changing its wording leaves its clip one step behind the text: decide per line whether the old clip
  still fits (`keep`) or the line must wait for a new clip, and report both lists to the owner before anything is
  published.
- Keep `todo` / answer files outside the repository (a scratch folder).
- A project not yet on the standard: follow its existing localisation docs for the change at hand, keep to rules 3
  and 5 in spirit (source text first, all shipped languages translated), and do not half-migrate in passing.

## Tools

| Command | What it does |
|---|---|
| `i18n.py init --product P --source vi` | scaffold `i18n/` |
| `i18n.py status [--json]` | per language: ready / partial / blocked, what is new, stale, incomplete |
| `i18n.py todo --lang L [--ns a,b] [--limit N] [--out F]` | the texts to translate, with reference, notes, glossary, plural forms |
| `i18n.py apply F [--lock] [--force]` | merge an answer file; rejects broken items with the reason |
| `i18n.py check [--lang L] [--strict]` | validate everything; exit 1 on errors |
| `i18n.py pack [--allow-regress] [--no-bundle]` | build `dist/`, `manifest.json`, bundle copies, upload plan |
| `i18n.py sync [--write]` | remove keys the source no longer has |
| `i18n.py stamp --lang L \| --all` | adopt existing translations as current |
| `i18n.py languages` | the registry and this project's view of it |
| `i18n.py versions [--json]` | per language: text version and state; voice version, the text version it was packed for, clips behind and silent |
| `voice.py plan [--lang L --out F]` | voice lines: ready, behind, new, stale, blocked; the list to synthesise with spoken text and numbers |
| `voice.py say --lang L --id ns:key "…"` | write a line's spoken text by hand, tied to its shown text and checked for its numbers |
| `voice.py keep --lang L --id ns:key… [--why "…"] [--undo]` | the text changed a little: the old clip keeps playing until remade (refused when a number changed) |
| `voice.py add --lang L --map F` | register checked clips |
| `voice.py pack` | voice sets, voice manifest, upload plan; only current clips go in |
| `numwords.py spell N --lang L \| --all`, `speak`, `heard`, `selftest` | numbers as words; digits in a text → words; was the number said |

All of them find `i18n.config.json` from the current folder (or take `--config`). Files in `meta/`, both
`manifest.json` files and the bundle copies are written by the tools only.

## Ask the owner before

- adding a voice language or a voice set to a product, and before any bulk voice run (a listening sample comes first);
- publishing to a production CDN for the first time, applying Terraform, changing bucket or cache policy;
- `pack --allow-regress`, removing a language users already have, `apply --force` on a locked text;
- declaring `rtl` / `shaping` for a platform, or adding a language that is not in the registry;
- using any voice, TTS or translation service other than the ones the project names;
- bumping `compat`.

Never, whatever the task: export or upload a cloned voice's reference recordings or profiles; use a voice-server
endpoint its rules forbid; print or commit an API key or a private address; hand-edit a manifest or a bundle copy.

## Report honestly

When the work is done, say per language what its state is (`status`), what `check` printed, which versions `pack`
bumped, and what was **not** done (languages left partial, lines blocked, nothing published). "Translated" means
`apply` accepted it and `check` passes, not that a file was written.
