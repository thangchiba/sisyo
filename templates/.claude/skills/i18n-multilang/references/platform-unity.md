# Unity games

## Contents
1. The runtime contract
2. Where the files go
3. Loading and updating packs
4. Text, fonts and layout
5. Language setting, picker, the wire
6. Tests a game must have
7. Adopting the standard in an existing game

There is no shared Unity package yet. The first game to implement this contract should write it as a small UPM
package (pure C# core with no engine references + a thin Unity layer), so the second game installs it instead of
copying. Until then each game's own `Loc` class must behave as described here.

## 1. The runtime contract

A game's localisation code does exactly these things, and the same way in every game:

| Behaviour | Rule |
|---|---|
| Key | `ns:key.path` (a default namespace may be implied). Lookup is a dictionary hit on the pack's flat keys |
| Placeholders | `{{name}}` replaced from named values; an unknown name is left as written and logged in development builds |
| Plurals | with a `count` value: look up `key_<category>` where the category comes from the language's CLDR rule, then `key_other`, then the fallback chain. Port `plural_category()` from `scripts/i18n.py` |
| Fallback | active language (downloaded pack over bundled pack) → the manifest's `fallback` list → source language → the key itself |
| Change | `SetLanguage(code)` raises one event; every visible label re-reads its text in that frame. No restart, no scene reload unless content itself is per-language |
| Formatting | numbers, dates and durations are formatted in code for the active language before they go into a placeholder |
| Safety | a pack is data. Its texts are never evaluated, used as format strings for `string.Format`, or shown as rich text unless the label is meant to hold rich text |

Minimal API shape (names may follow the game's existing class):

```csharp
Loc.T("shop:title");
Loc.T("shop:buy", ("price", price));
Loc.T("shop:items", ("count", n));          // picks shop:items_one / _few / _many / _other
Loc.Language;                               // "ja", "pt-BR", "zh-Hans"
Loc.SetLanguage("ko");                      // event: Loc.Changed
Loc.Available;                              // ready languages from the manifest: code, name, native, state
```

Do not keep a second copy of the source text in code (`Loc.T("key", "Tiếng Việt")`) in new code: the source file is
the single place a text lives, and a test (section 6) catches a key that is missing from it.

## 2. Where the files go

- `i18n/` at the repository root is the source of truth ([layout-and-versioning.md](layout-and-versioning.md)).
- `bundle.copyTo` → `Assets/<Game>/Resources/i18n/`: `pack` writes `<lang>.json` and `manifest.json` there with
  stable names. `Resources` is deliberate: packs must be readable synchronously before the first scene on every
  platform (on Android, `StreamingAssets` sits inside the APK and needs a web request). Each language is its own
  `TextAsset`, so only the active one and its fallbacks are loaded into memory.
- Downloaded packs: `Application.persistentDataPath/i18n/c<compat>/` (`manifest.json`, `<lang>.<hash12>.json`).
- Voice clips: `Application.persistentDataPath/voice/clips/<lang>/…` with the set indexes beside them. A clip is
  played only when the hash of the text now shown for that key is in the index entry's `text` list
  ([voice.md](voice.md) §9: the index lists the hashes of the texts a clip may be played with); add a test with the
  vector given there.
- Never edit the copies under `Assets/`: change `i18n/locales`, run `pack`.

## 3. Loading and updating packs

Start-up (before the first scene, `RuntimeInitializeOnLoadMethod(BeforeSceneLoad)`):
1. Read the saved language, or choose the default ([languages.md](languages.md)).
2. Load the bundled manifest; load the downloaded manifest if there is one.
3. For the language and each fallback, load the copy with the higher `version`; keep the bundled one underneath.

Background, after the first screen is up, at most once per launch:
4. `GET <cdn>/i18n/c<compat>/manifest.json` (5 s timeout). On any error: stop silently.
5. For the active language and every language already downloaded: if the CDN `version` is higher, download `file`,
   check SHA-256 against `hash`, write to `*.tmp`, rename over the final name, save the new manifest. Apply on the
   next `SetLanguage` or at the next launch; applying immediately is allowed if the screen can refresh.
6. Delete downloaded packs that are older than the bundled ones (after an app update) and files no manifest names.

A language that is in the CDN manifest but not in the app (added after the release) is downloaded when the user picks
it: show progress, keep the old language until the hash check passed.

Addressables content (chapters, models) stays in Addressables. Text packs and voice clips are plain files on purpose:
a new language or a corrected sentence must not need a Unity build.

## 4. Text, fonts and layout

- **Capabilities**: legacy uGUI `Text` and plain TextMeshPro do not shape Arabic, Persian, Urdu, Hindi, Bengali,
  Tamil or Thai and do not lay out right-to-left. Leave `capabilities` empty until a shaping solution is in and a
  screenshot of real sentences proves it. Those 8 languages are then simply not offered: better than broken text.
- **Fonts**: check every script the product offers on a real device of each platform. The game's own font covers
  some scripts (M PLUS Rounded 1c: Latin, Cyrillic, Greek, Japanese); for others a dynamic font falls back to the
  operating system's fonts, which usually exist for Korean, Chinese and Thai but look different and can be missing on
  desktop. Where the fallback is missing or unacceptable, ship a font for that script (Noto Sans KR / SC / TC / Thai)
  as a downloadable asset tied to the language, not inside the base app: a CJK font is 5–10 MB.
- **Layout**: labels grow. Enable best-fit or wrapping with a minimum size on buttons and tabs, never a fixed width
  cut to the Vietnamese word. German and Russian are the overflow test; Thai, Korean and Chinese are the font test.
- **Line breaking**: Japanese, Chinese and Thai have no spaces. If the text component breaks only at spaces, insert
  zero-width spaces at allowed break points when loading the pack, or keep such texts short.
- Baked labels in scenes and prefabs hold a key (a `LocalizedText` component), not a sentence. Editor builders attach
  it when they create a label.
- Text inside textures, videos and 3D signs is content: either keep it language-neutral or treat it as a
  per-language asset.

## 5. Language setting, picker, the wire

- Store the language as its **code string** (`"pt-BR"`), in settings and in every network message. An enum or a byte
  cannot name a language added by a download.
- Default on first launch: the device's ordered language list, matched against the ready languages
  ([languages.md](languages.md)). Read the list natively (iOS `NSLocale.preferredLanguages`, Android
  `LocaleList.getDefault()`); `Application.systemLanguage` is the fallback.
- An install that already has a saved language keeps it through updates.
- The picker: searchable list, rows `English name (native name)`, state per row, globe icon
  ([languages.md](languages.md)).
- **Server-written texts** (refusals, notices): the server sends `key` + named values and the client renders them in
  its own language. The server then needs no translation tables and speaks all 40 languages at once. For old clients,
  keep sending a rendered source-language string beside the key until they are gone. A protocol change follows the
  project's own contract rules.
- iOS: put the ready languages in `CFBundleLocalizations` (post-process the Xcode project). Android: `locales_config`.

## 6. Tests a game must have

| Test | Catches |
|---|---|
| EditMode: `python i18n.py check` exits 0 (run it from the test or from the build script) | broken placeholders, missing plural forms, forbidden words |
| EditMode: every key the code uses exists in the source (extract `Loc.T("…")` literals and keys held by `LocalizedText`) | a typo in a key, a deleted text still in use |
| EditMode: the C# plural rule returns the category in `assets/plural-vectors.json` for every language and number | a wrong plural port |
| EditMode: bundled `manifest.json` hashes equal the SHA-256 of the bundled files | a hand-edited copy under `Assets/` |
| PlayMode: for each ready language, open the main screens and capture them | overflow, missing glyphs (tofu boxes), untranslated labels |
| PlayMode: first launch with device language X selects X (inject the device list) | default-language regressions |
| Device: download of a newer pack with the network cut mid-way leaves the old pack working | update safety |

## 7. Adopting the standard in an existing game

Do it as its own approved piece of work, never in passing while changing something else. Re-read the game's
localisation code first: the table lists what such code usually looks like and where it goes.

| Usually found | Standard |
|---|---|
| string tables under `Assets/…/Resources/`, one per language, sometimes wrapped (`{"language": …, "strings": {…}}`) | `i18n/locales/<lang>/<ns>.json` holding the strings only; `pack` writes the bundle copies back under `Resources/i18n/` |
| the source text also written in code (`Loc.T("key", "source text")`) and pulled out by an extractor | keep the extractor for now and point its output at `i18n/locales/<source>/`; new code uses keys only |
| positional `{0}` or single-brace `{name}` placeholders | `{{name}}`: convert the files and the formatter in one commit, with its tests ([format.md](format.md), legacy formats) |
| languages hard-coded in an array or an `enum`, sometimes sent over the network as a byte | the manifest decides the list; the language is a code string in settings and on the wire (a contract change) |
| a server-side table with one column per language | a `server` namespace in the locales; the server sends key + values |
| "write the sentence so one form fits every number" | plural keys wherever a count is shown, before adding a language that needs them |
| product rules about words (a word that must never be shown, names never translated) | `glossary.json`: `forbidden`, `keep` |
| translations that already exist | check them, then `i18n.py stamp --all` |
| voice clips inside the app | they may stay; a new voice language is CDN-only, so the player needs a path that plays downloaded clips |
| numbers composed from recorded pieces by per-language code | the reading rules as data, tested against `numwords.py` with the product's `numberStyle` |
| a content CDN that already serves other downloads | add the `i18n/` and `voice/` prefixes and their cache behaviours ([layout-and-versioning.md](layout-and-versioning.md) §7) |
