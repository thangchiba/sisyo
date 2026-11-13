# i18n: the texts and voices of __PRODUCT__

Managed with the `i18n-multilang` skill (`.claude/skills/i18n-multilang`, installed by sisyo). Agents: load that skill before changing anything here.

| Path | What | Edited by |
|---|---|---|
| `i18n.config.json` | product, source language, languages, bundle folders, CDN, voice sets | people / agents |
| `locales/<lang>/<ns>.json` | the texts (i18next JSON). `__SOURCE__` is the source: write new texts there first | source: authors; other languages: `i18n.py apply` |
| `notes/<ns>.json` | context and length limits for translators | authors |
| `glossary.json`, `style.md` | names, fixed terms, forbidden words, tone | authors |
| `meta/<lang>.json` | which source text each translation was made from | `i18n.py` only |
| `manifest.json` | versions and hashes of the last pack | `i18n.py pack` only |
| `voice/` (only if the product has voice) | spoken-text overrides (`voice.py say`), clip manifests and the voice manifest with its own versions | `voice.py` only |
| `dist/`, `voice/_audio/` | build output and audio cache: not in git | tools |

After adding or changing a text: `status` → `todo` / translate / `apply` per language → `check` → `pack` → commit.
`python .claude/skills/i18n-multilang/scripts/i18n.py versions` shows the text version of every language (and the voice version, if any).
