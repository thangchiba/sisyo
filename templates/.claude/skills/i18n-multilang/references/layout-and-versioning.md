# Layout, versions, delivery

## Contents
1. Folder layout in a repository
2. `i18n.config.json`
3. What goes in git, what goes to S3
4. Versions: `version`, `revision`, `compat`
5. The pack and the manifest
6. Delivery: bundled, CDN, or both
7. CDN layout and cache rules (S3 + CloudFront)
8. Publishing
9. How an app picks and updates a pack

## 1. Folder layout

One `i18n/` folder per product, at the repository root (a monorepo may put it next to the client). Engine folders
only receive **copies** made by `pack`.

```
i18n/
  i18n.config.json        the project's settings (section 2)
  .gitattributes          LF line ends for everything here; audio marked binary
  .gitignore              dist/ and voice/_audio/
  README.md               what this folder is, for people and agents without the skill
  style.md                audience, tone, per-language rules: the translator's brief
  glossary.json           names to keep, fixed terms, forbidden words
  locales/<lang>/<ns>.json   the texts; <sourceLanguage> is written by authors, the rest by "apply"
  notes/<ns>.json         context and length limits per key
  meta/<lang>.json        which source text each translation was made from; locked keys   (tool-owned)
  manifest.json           versions and hashes of the last pack                              (tool-owned)
  voice/                  only in a product with voice
    speak/<lang>.json     spoken-text overrides, written with "voice.py say": {"ns:key": {"text": …, "speak": …}}
    <lang>/manifest.json  every clip: spoken text, hashes, voice, date                      (tool-owned)
    manifest.json         versions and hashes of the last voice pack                        (tool-owned)
    _audio/               local cache of clips                                              (not in git)
  dist/                   pack output + upload plans                                        (not in git)
```

An existing project may keep its texts where they are: `localesDir` and `layout` point at them
(`"layout": "{lang}.json"` for one file per language). New projects use the default.

## 2. `i18n.config.json`

```json
{
  "schema": 1,
  "product": "mygame",
  "sourceLanguage": "vi",
  "referenceLanguage": "en",
  "compat": 1,
  "localesDir": "locales",
  "layout": "{lang}/{ns}.json",
  "languages": "default",
  "exclude": [],
  "capabilities": [],
  "bundle": { "languages": "all", "copyTo": ["../Assets/StreamingAssets/i18n"] },
  "dist": "dist",
  "cdn": { "baseUrl": "https://cdn.example.com", "textPrefix": "i18n", "voicePrefix": "voice" },
  "voice": {
    "languages": ["vi", "en", "ja"],
    "fallback": "en",
    "sets": { "common": {"include": ["voice:*"]}, "chapter01": {"include": ["chapter01:*"], "exclude": ["chapter01:*.title"]} },
    "voicePattern": "Narrator-{lang}",
    "numberStyle": { "vi": {"four": "tư"} },
    "format": "mp3"
  }
}
```

| Field | Meaning |
|---|---|
| `sourceLanguage` | the language texts are written in first (the language the team writes in: `vi`, `en`, …) |
| `referenceLanguage` | a second language shown to the translator next to the source (default `en`). Translate it first |
| `compat` | the pack format generation (section 4). Starts at 1 and almost never changes |
| `languages` | `"default"` = the 40 languages of the registry, or a list of codes. `exclude` removes some |
| `capabilities` | what the product's text renderer can do: `"rtl"`, `"shaping"`. A language that needs one that is not declared is `blocked` and never packed ([languages.md](languages.md)) |
| `bundle.copyTo` | folders (relative to `i18n/`) that receive `<lang>.json` + `manifest.json` at every `pack`: the copy shipped inside the app |
| `bundle.languages` | `"all"` (default: text packs are tiny) or a list |
| `cdn` | where packs are served from; the prefixes are the first path segments on the CDN |
| `voice` | **optional: leave the whole block out for a text-only product** (most are). Off while `languages` or `sets` is empty. See [voice.md](voice.md) |

## 3. Git or S3

| In git | Not in git |
|---|---|
| everything under `i18n/` except `dist/` and `voice/_audio/`: source texts, **all translations**, notes, glossary, meta, manifests, spoken-text overrides | audio clips (S3 / CDN), built packs (`dist/`), Addressables bundles, video |

Why: 40 languages of text are a few MB and diff well, so the repository stays the single source of truth for words.
Audio is binary, grows with every regeneration and fills Git LFS (GitHub's free plan: 10 GiB of storage and of
bandwidth a month); S3 is versioned and cheap. The clip manifests in git record each clip's SHA-256, so the repository
still says exactly which audio belongs to which commit.

The same repository holds code and texts: they change together (a new feature = new keys), and one commit must
contain both. Do not split texts into a separate repository.

Line ends: the tools write LF. On Windows with `core.autocrlf` git would turn them into CRLF at the next checkout,
so `init` puts a `.gitattributes` (`* text=auto eol=lf`) in `i18n/`; a project that adopts the standard by hand adds
the same file. The bundle copies of the packs are a single line with no line end, so their hashes are the same on
every machine wherever they are copied.

## 4. Versions

| Number | Scope | Changes when | Used for |
|---|---|---|---|
| text `version` (integer) | one language's text pack | its content hash changed at `i18n.py pack` | an app compares the bundled and the downloaded copy: **the higher version wins** |
| voice `version` (integer) | one voice set of one language (only in a product with voice) | its clips, or the texts they are accepted for, changed at `voice.py pack` | the app re-reads the set's index and fetches the clips that changed |
| `textVersion` | a voice language | every `voice.py pack` | says which text version the voice sets were packed for: text may be ahead of voice |
| `revision` (integer) | the whole manifest | anything in it changed | cheap "is there anything new" check; logging |
| `compat` (integer) | the product's packs | the pack format or the key scheme changes so that already-shipped apps could not read new packs | the CDN path (`i18n/c1/…`): old apps keep reading their own folder |
| `hash` (SHA-256) | every file | content | names on the CDN, integrity check after download |

Rules:
- **Only `pack` writes versions.** Never edit `manifest.json` by hand. After a merge conflict in it, take the higher
  numbers and run `pack` again.
- **Versions only go up.** To undo a bad translation, fix the text and pack again (roll forward). An app never
  replaces a pack by a lower version.
- **Within one `compat`, never change what an existing key means or which placeholders it takes.** An app released
  last month will download today's pack and call that key with last month's values. A different meaning is a new key
  ([format.md](format.md)).
- **Removing a key is safe when every text language is bundled** (the default): an old app that still uses the key
  finds it in its own bundled pack, which stays the floor under any downloaded pack. If a product bundles only some
  languages, keep a key until no supported app version uses it.
- **Text and voice have separate versions.** A text change never forces a voice download, and voice can lag: the
  voice manifest records the text version it was packed for and, per set, how many lines are `behind` (the text
  changed, the old clip still plays) or `silent`. `python i18n.py versions` prints both sides per language
  ([voice.md](voice.md) §5).
- **Bump `compat` only for a break**: a new pack schema, a mass key rename, a placeholder syntax change. Then versions
  restart at 1 in the new `c<N>` folder and the old folder is left in place for old apps.

## 5. The pack and the manifest

`python i18n.py pack` builds, for every language that has translations and is not blocked:

- `dist/i18n/c<compat>/<lang>/<lang>.<hash12>.json`: one file per language, all namespaces, **flat keys**:

  ```json
  {"schema":1,"lang":"ja","strings":{"common":{"action.ok":"OK"},"shop":{"items_other":"{{count}}こ","title":"ショップ"}}}
  ```

  Only texts that are translated **and up to date** are in it. A missing or stale text is left out, so the runtime
  falls back for that key instead of showing a sentence that no longer matches.
- `dist/i18n/c<compat>/manifest.json` and the same file as `i18n/manifest.json` (committed):

  ```json
  {
    "schema": 1, "product": "mygame", "compat": 1, "revision": 7, "updatedAt": "2026-11-13T09:38:03Z",
    "sourceLanguage": "vi", "fallbackLanguage": "en", "texts": 1416,
    "languages": {
      "ja": { "name": "Japanese", "native": "日本語", "dir": "ltr", "script": "Jpan",
              "version": 5, "hash": "<sha256>", "file": "ja/ja.3f2a9c1b77d0.json", "bytes": 151234,
              "texts": 1416, "coverage": 1.0, "status": "ready", "fallback": ["en", "vi"] }
    }
  }
  ```

  `status` is `ready` (every text translated and current) or `partial`. `aliases` lists device locale codes that map
  to the language. The manifest is all a runtime needs: names for the picker, matching, fallback order, file, hash.
- The bundle copies in every `bundle.copyTo` folder: `<lang>.json` (stable names, so engine meta files do not churn)
  and a `manifest.json` whose `file` fields point at them. Same bytes, same hash, same version as the CDN files.
- `dist/upload-plan.text.json`: every file with its CDN key, content type and cache header, the manifest last.

`pack` refuses to run when `check` has errors, and when a language that was `ready` in the last pack no longer is
(a feature added texts that nobody translated). Translate, then pack. `--allow-regress` exists for the owner's
explicit decision to ship without a language.

Voice sets are packed the same way by `voice.py pack` ([voice.md](voice.md)).

## 6. Delivery modes

| Mode | When | How |
|---|---|---|
| **Bundled** | always for text in games and apps; websites that import JSON at build | `bundle.copyTo` → the app reads its own copy; works offline from the first second |
| **CDN** | to fix or add translations without a store release; to add languages later; voice | upload `dist/` to the product's bucket; the app checks the manifest |
| **Both** (default for games and apps) | text | bundled pack = floor, CDN pack = update. Higher `version` wins per language |

Text packs are about 25–45 KB per language compressed, so bundling all of them costs about 1–2 MB and removes the
"first launch without network shows the wrong language" problem. Voice is never bundled by default: it is downloaded
per set when first needed (lazy), because it is 2–14 MB per language.

Apple guideline 4.2.3: if the app downloads something sizeable (voice sets, chapters), show the size and ask first.
Packs are data, never code: nothing in a pack is executed.

## 7. CDN layout and cache rules

One bucket + CloudFront distribution per product (a custom domain → CloudFront → a private S3 bucket, defined in the
product's Terraform). The address below is written `cdn.<your-domain>`; the real one is the project's `cdn.baseUrl`.

```
https://cdn.<your-domain>/
  i18n/c1/manifest.json                       Cache-Control: public, max-age=60
  i18n/c1/<lang>/<lang>.<hash12>.json         public, max-age=31536000, immutable
  voice/c1/manifest.json                      public, max-age=60
  voice/c1/<lang>/<set>.<hash12>.json         immutable   (index of a voice set: line id -> clip file)
  voice/clips/<lang>/<sha16>.<ext>            immutable   (one clip; named by its content, shared by every version)
```

- Everything except the two manifests has its hash in its name and never changes, so it is cached for a year. A new
  version is a new file name. This is what makes updates safe: the manifest switches in one step.
- Clips are content-addressed and live outside `c<compat>`: a set's new version re-downloads only the clips that
  changed, and a `compat` bump re-uploads nothing.
- S3 stays private (CloudFront OAC). Never let apps download from the bucket URL: S3 egress costs about $0.09/GB.
- **Infra to check once per product** (Terraform, owner applies): the bucket policy must let the CDN read the
  `i18n/*` and `voice/*` prefixes, and the short-TTL cache behaviour must match only `*/manifest.json` there. If
  the distribution already serves other content and gives every `*.json` a short TTL, add behaviours for
  `i18n/*/manifest.json` and `voice/*/manifest.json` (short) ahead of `i18n/*` and `voice/*` (immutable), so the
  hashed pack files are cached for a year. An agent writes the change and runs `plan`; applying is the owner's step.
- Optional private prefix `voice-master/<lang>/…` (not served) for the lossless WAV takes.

## 8. Publishing

Publishing changes what real users see, so it is a deliberate step, not part of `pack`.

1. `i18n.py check`, `i18n.py pack` and, for a product with voice, `voice.py pack` on the commit that will be
   released. Commit the manifests. If `voice.py pack` reports lines that will be silent (their text changed and the
   new clips do not exist yet), stop: publishing the text now or waiting for the clips is the owner's decision
   ([voice.md](voice.md)). Voice files go up before the text manifest.
2. Upload from `dist/` in the order of the upload plan: **every hashed file first, the manifest last**. If the upload
   stops halfway, the old manifest still points at complete old files.

   ```bash
   aws s3 cp dist/i18n/c1/ s3://<bucket>/i18n/c1/ --recursive --exclude manifest.json \
       --cache-control "public, max-age=31536000, immutable" --content-type "application/json; charset=utf-8"
   aws s3 cp dist/i18n/c1/manifest.json s3://<bucket>/i18n/c1/manifest.json \
       --cache-control "public, max-age=60" --content-type "application/json; charset=utf-8"
   ```

   A product with its own deploy script extends that script to read the upload plans instead of hand-running `aws`.
3. Verify from outside: fetch `<baseUrl>/i18n/c1/manifest.json`, then one pack file, and compare its SHA-256 with the
   manifest.
4. No CloudFront invalidation is needed: the manifest expires in 60 s and nothing else is ever overwritten.

Who runs it: a person, or the lead agent by hand, after the owner has approved publishing for that product; never a
background sub-agent. The first publish of a product, any Terraform apply and any change to bucket policy wait for
the owner.

Additive changes (new keys, better translations, a new language) can be published at any time: old apps ignore keys
they do not use. Publish them **before or together with** the app release that needs them; an app whose bundled pack
is newer than the CDN simply keeps its bundled pack.

## 9. How an app picks and updates a pack

The contract every runtime implements ([platform-unity.md](platform-unity.md), [platform-web.md](platform-web.md)):

1. At start, read the bundled `manifest.json` and any previously downloaded manifest from the app's data folder
   (`<persistent>/i18n/c<compat>/`).
2. For the active language, load the copy with the **higher `version`** (downloaded or bundled). Keep the bundled pack
   loaded underneath it for keys the downloaded one lacks.
3. In the background (at most once per launch, never blocking the first screen), fetch the CDN manifest. For the
   active language and any language the user downloaded before: if the CDN `version` is higher, download the file,
   check its SHA-256 against the manifest, write it to a temporary name, then rename it into place. Apply it at the
   next language load (or raise the language-changed event).
4. A language that is not bundled is downloaded when the user picks it; show progress and keep the old language until
   the new pack is verified.
5. Any failure (offline, wrong hash, bad JSON) leaves the current pack untouched. Never show an empty UI.
6. Lookup order for a key: active language (downloaded over bundled) → the language's `fallback` list → the source
   language → the key itself (and a log line in development builds).
