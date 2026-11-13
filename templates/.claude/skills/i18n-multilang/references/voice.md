# Voice

## Contents
1. Scope: voice is opt-in
2. Where the voice comes from: the project's voice backend
3. Declaring voice in a project
4. The pipeline
5. Text version and voice version: when the text changes first
6. Rules on a voice server
7. Checking every clip
8. Files, formats, storage
9. In the app

## 1. Scope: voice is opt-in

- **Most products have no voice at all.** Text is the standard; voice is an option a few products add. A product
  whose config has no `voice.languages` or no `voice.sets` has nothing to do with this file.
- Text and voice are separate. A product has text in up to 40 languages and voice in **zero to ten**, each with its
  own version (section 5). Voice does not follow text one to one: a story game voices its dialogue, a game of
  buttons voices nothing.
- Voice exists only for (a) the languages in `voice.languages` and (b) the lines selected by `voice.sets`. Both are
  empty by default. **Do not add a language or a set because it seems useful: the owner names them.**
- The ten default voice languages: en, ja, es, pt-BR, ko, zh-Hans, de, fr, vi, id (`"voice": true` in the registry).
  Another language needs three things first: a voice for it in the backend, a registry entry with `"voice": true`
  (the project's `extraLanguages`), and number rules for it in `scripts/numwords.py`.

## 2. Where the voice comes from: the project's voice backend

This skill ships no TTS engine and names none. A product with voice has **one voice backend** chosen by its owner
(a self-hosted TTS or voice-cloning server, or a hosted TTS service) and one voice family on it. The backend is
described where agents will read it: in the project's `SISYO.md`, or in a file that `SISYO.md` points to (for
example `docs/09_integrations/voice-backend.md`). In this file its address is written `<voice-host>`; the real
address, like any key, belongs in the project's private docs and environment, never in a shared skill.

**Before generating anything, read that description**, and the backend's own README if it has one. It must answer:

| Question | Why it matters |
|---|---|
| Address, and which endpoint is used for synthesis | so nothing else on the server is touched |
| Where the API key lives (an env file on the server, a secret store) | the key is never printed, copied or committed |
| The voice name for each language | goes into `voice.voicePattern` / `voice.voices`; a clip is tied to the voice that made it |
| Whose voice it is and under what consent or licence | what may be done with it: commercial use, which languages, what is forbidden |
| Endpoints and actions that are forbidden | on some servers a write to history or profiles destroys the owner's saved work |
| Capacity: what else runs on the machine, allowed concurrency, time windows | a bulk run must not starve other services |
| Who operates and restarts it | an agent does not |

If the description is missing or does not answer these, stop and ask the owner. Do not guess a backend, and do not
switch to another TTS service because the named one is unavailable.

Rules that hold for any backend:
- Choose the voice by the **language of the text**. A voice made for one language gives other languages an accent
  and misreads them: a language without its own voice in the backend is not synthesised with another one. Ask the
  owner.
- A cloned voice is a real person's. It is used only within their written consent. **Never export, upload, share or
  re-encode the reference recordings or the voice profiles**, and never send them, or the voice, to another service.
  Generated clips are product assets and may be published; the references may not. Never use the voice for fraud,
  to impersonate the person, or to pass voice authentication.
- Label output as AI-generated where a law or platform requires it.
- No other voice or TTS service is used for shipped audio unless the owner says so for that product.

## 3. Declaring voice in a project

`i18n.config.json`:

```json
"voice": {
  "languages": ["vi", "en", "ja"],
  "fallback": "en",
  "voicePattern": "Narrator-{lang}",
  "sets": {
    "common":    { "include": ["voice:*"] },
    "chapter01": { "include": ["chapter01:dlg.*", "chapter01:hint.*"], "exclude": ["chapter01:*.title"] }
  },
  "numberStyle": { "vi": { "four": "tư" } },
  "format": "mp3"
}
```

- A **voice line is a text key**. Its id is `ns:key`; its words are that key's translation. There is no second list
  of sentences to keep in step.
- A **set** is a group of lines downloaded together (shared lines, one chapter, one feature). Patterns are shell-style
  (`*`) on `ns:key`; a line belongs to the first set that matches. Keep a set to what one screen or chapter needs, so
  the app downloads little at a time.
- `voicePattern`: the backend's voice name per language, with `{lang}` replaced by the language code (default
  `{lang}`); `voices` (`{"pt-BR": "Narrator-pt"}`) overrides single languages. The voice name is part of every
  clip's identity: changing it makes all clips of that language stale.
- `fallback`: the voice language used when the user's text language has no voice (`"en"`), or `"none"` for silence.
  A product decision: for young children, hearing English under Thai text may be worse than no voice.
- **Spoken-text overrides** in `i18n/voice/speak/<lang>.json`, for a line whose spoken words differ from the shown
  text (a number with a symbol or a counter, an abbreviation, a name that needs a phonetic spelling, "v2.0"). Write
  them with `voice.py say`, which ties each one to the shown text and checks its numbers
  ([numbers.md](numbers.md)):

  ```json
  { "game:say.reward": { "text": "<the shown text it was written for>", "speak": "<what is said, no digits>" } }
  ```
- A plural key or a text with a `{{placeholder}}` cannot be one clip. Give it fixed spoken words with `say`, split
  it into fixed lines, or leave it out of the set.
- **A new spoken line the owner asked for** goes where an existing set's pattern selects it (name the key to match,
  for example `game:say.reward` for the set `game:say.*`), or the set's `include` gains a pattern for it. That is
  filling a set the owner already has, not adding one. A new set, or voice for lines nobody asked voice for, is the
  owner's call.

## 4. The pipeline

```bash
python <skill>/scripts/voice.py plan                                   # per language and set: ready / behind / new / stale / blocked
python <skill>/scripts/voice.py say --lang ja --id ns:key "…"          # settle each blocked line (or fix its shown text)
python <skill>/scripts/voice.py plan --lang vi --out todo.vi.json      # the lines to make, with speak text and numbers
#   make and check the clips with the project's voice tool (sections 6 and 7)
python <skill>/scripts/voice.py add --lang vi --map clips.vi.json      # register them
python <skill>/scripts/voice.py pack                                   # sets + voice manifest for the CDN
```

These tools never talk to a voice backend. They decide **what** must be said and keep the record; making the audio
is the project's own voice tool.

`plan` gives each line a state:

| State | Meaning | Do |
|---|---|---|
| `ok` | a registered clip matches the current spoken text and voice | nothing |
| `missing` | no clip yet | synthesise |
| `behind` | the text changed a little and someone decided the old clip still fits (`voice.py keep`): it keeps playing | synthesise again when voice is next updated |
| `stale` | the spoken text (or the voice name) changed since the clip was made, and nobody has decided: the line is left out, so it is silent | decide: `voice.py keep`, or synthesise again (section 5) |
| `blocked` | the spoken text is unsettled: a number or symbol the tool will not guess, a placeholder, an override written for an older text or one that does not say the text's numbers ([numbers.md](numbers.md)) | fix the shown text, or `voice.py say` |
| `untranslated` | the text in that language is missing or stale | translate first |

**Run `voice.py pack` every time `i18n.py pack` runs** (text first, then voice), also when no clip could be made
yet. Only lines in state `ok` or `behind` go into a set; `voice.py pack` prints which lines are behind and which are
silent, and refuses to run if the text was edited after the last text pack.

`todo.<lang>.json` holds, per line: `id`, `set`, `text` (shown), `speak` (sent to the voice: no digits), `numbers`
(for the check), `speakHash`, `textHash`, `voice`. The answer for `add` maps ids to clips and repeats the hash, so a
clip made from an old text is refused:

```json
{ "chapter01:dlg.elder.0": { "file": "out/c01_dlg_elder_0.mp3", "speakHash": "79fc6ec7d1f8d17e", "checked": "whisper-large-v3: words ok, numbers ok" } }
```

Order of work when the owner asks for voice in a new language or set:
1. Text for those lines translated and reviewed (`i18n.py status`).
2. `voice.py plan`: clear every `blocked` line.
3. **A listening sample first**: about 30 lines per language, chosen to include numbers, questions, names and the
   longest line. Give the owner the clips to listen to. Bulk generation starts only after the owner says the sample
   is good.
4. Bulk run in small jobs with the guards of section 6, resumable, every take checked (section 7).
5. `add`, `pack`, upload (the owner approves publishing), then the app-side work if it is a new language.

**When the sample is needed.** A new voice language, a new set, a new or changed voice, or any run of more than
about 50 clips: sample first, then the owner's word. A few new or reworded lines in a language and set the owner has
already approved go straight through the per-clip checks; tell the owner which lines were made so they can listen.

## 5. Text version and voice version: when the text changes first

Text is cheap to change and voice is not, so text regularly moves ahead of voice. The two are versioned separately
and the link between them is recorded:

| What | Where | Meaning |
|---|---|---|
| text `version` of a language | `i18n/manifest.json` | bumps when that language's texts change (`i18n.py pack`) |
| voice `version` of a set | `i18n/voice/manifest.json` | bumps when that set's clips or their accepted texts change (`voice.py pack`) |
| `textVersion` of a voice language | `i18n/voice/manifest.json` | the text version the voice sets were packed for |
| per set: `clips`, `lines`, `behind`, `silent` | `i18n/voice/manifest.json` | how far the set is from complete and current |
| per clip: `textHash`, `textVersion`, `keptFor` | `i18n/voice/<lang>/manifest.json` | the text a clip was recorded for, and the later text it was kept for |

```
$ python <skill>/scripts/i18n.py versions
mygame: compat 1, text revision 14 (…), voice revision 6 (…)
lang     text    state      voice set        voice  for text  clips   behind  silent
vi       v12     ready      common           v4     v12       140/141 1       1
                            chapter01        v3     v12       135/135 0       0
en       v12     ready      common           v4     v11 !     …
ko       v9      ready      -
```

`*` after a text version: the files were edited since the last text pack. `!`: the voice sets were packed for an
older text version (run `voice.py pack`).

**What happens to a voiced line when its text changes** (in that language), before anyone remakes the clip:

| The change | State | In the app | Do |
|---|---|---|---|
| Only punctuation, case or spacing: the same words | `ok` | the clip plays | nothing |
| A small rewording the old audio still fits: nobody listening would be misled ("Xin chào các bạn nhỏ!" → "Xin chào các bạn!") | `stale` until decided, then `behind` | the old clip keeps playing | `voice.py keep --lang L --id ns:key --why "…"`; remake it with the next voice update |
| The audio would now be wrong: another instruction, name, answer or direction; a sentence added or removed | `stale` | silent | leave it; synthesise again |
| A number changed | `stale` | silent | synthesise again. `keep` refuses: a clip that says another number is never kept |

The agent that changes the text makes this decision in the same piece of work, by reading "clip says / text now" in
`voice.py plan`, and reports both lists (kept, silent) to the owner. When unsure, do not keep: a silent line is a
smaller fault than a voice that says something the screen does not. `keep --undo` takes a decision back. A new clip
(`add`) ends the lag, and a further change to the text ends an earlier `keep`.

Publishing: text and voice are uploaded together (voice files first, then the text manifest). If lines would go
out silent, the owner chooses between waiting for the clips and publishing now; say which lines.

## 6. Rules on a voice server

A self-hosted voice server is usually shared: the same GPU serves other things, and the server keeps the owner's
saved takes and voice profiles. A careless bulk run can wipe saved work or get the voice process killed for lack of
memory. The backend's own rules (section 2) come first; where they are silent, these hold:

- **Use only the stateless synthesis endpoint** the backend's rules name (on an OpenAI-compatible server:
  `POST <voice-host>/v1/audio/speech` with `model`, `voice`, `input`, `response_format`). Stay away from endpoints
  that write history, profiles or presets, and from reference uploads: on some servers every history row pushes out
  an older take and its audio.
- **One request at a time**, with a lock, in small jobs with pauses. Before each job check free RAM and GPU memory;
  stop on an out-of-memory answer, on repeated 5xx answers or timeouts, or if something the run must not change has
  changed. Fail closed: if a guard cannot be read, do not generate.
- Never restart, reconfigure, `docker exec` into or install anything on the voice server. If it needs a restart,
  tell the owner.
- The API key stays where the backend's description says it lives: read it into memory there, never print, copy or
  commit it.
- Recognition and scoring (section 7) run on the agent's own machine, on CPU, not on the voice server's GPU.
- Bulk runs happen in the time window the owner gives.
- A hosted, paid TTS service: count the characters first (a dry run) and get the owner's word on the spend.

A project that already has a voice tool with these guards uses it. A new project copies the guards before it writes
its first request loop: they are the part that incidents taught.

## 7. Checking every clip

A clip is registered with `add` only after it passed, per take:

1. **Words**: a recogniser (Whisper large-v3 on CPU; plus a language-specific one where available) hears the line.
   Names and invented words are compared loosely, everything else strictly.
2. **Numbers**: `numwords.heard(numbers, transcript, lang)` is true ([numbers.md](numbers.md)). No exceptions.
3. **Language**: the recogniser's language-ID probability for the target language is at least 0.8 (catches an accent
   from the wrong voice).
4. **Shape**: no silence longer than about 1 s inside the line; duration plausible for its length; numbers and
   questions not rushed.
5. **Loudness**: normalised to the product's level so languages and sets match.

Take the best of up to three seeds; a line that still fails is rewritten or reported, never shipped. Record in the
`add` map what was checked (`"checked": "whisper-large-v3 wer 0, numbers ok"`): it is stored with the clip.

After a set is complete, listen to a few assembled sequences as the user will hear them (a question followed by its
answer, two dialogue lines in a row): single clips can each pass and still not fit together.

## 8. Files, formats, storage

- One encoded format per product (`voice.format`): `mp3` mono, about 48–64 kbit/s plays everywhere (Unity, web, iOS,
  Android). `ogg` is an option for a Unity-only product.
- `i18n/voice/<lang>/manifest.json` (git): for every clip its spoken text, `speakHash`, voice, SHA-256, size, date.
- Audio itself is **not in git**: `i18n/voice/_audio/` is a local cache; the durable copy is the CDN bucket, where
  clips are named by their content (`voice/clips/<lang>/<sha16>.mp3`) and so never overwritten. Lossless WAV takes may
  be kept under a private prefix such as `voice-master/`.
- `voice.py pack` writes, per language and set, an index `voice/c<compat>/<lang>/<set>.<hash12>.json`
  (`{"clips": {"ns:key": {"file": "<sha16>.mp3", "bytes": 12345, "text": ["<hash of a shown text>", …]}}}`), copies
  the clips it has locally to `dist/voice/clips/`, writes `voice/c<compat>/manifest.json` (per language
  `textVersion`; per set `version`, `hash`, `file`, `lines`, `clips`, `behind`, `silent`, `bytes`, `complete`) and
  `dist/upload-plan.voice.json`. Upload order: clips, indexes, the manifest last
  ([layout-and-versioning.md](layout-and-versioning.md), sections 7 and 8).
- Voice clips that already ship inside an app may stay there; new languages go to the CDN only.

## 9. In the app

- Voice language is its own setting: the text language if it has voice, else `fallback`.
- **Lazy download**: when a set is first needed (the user opens chapter 1 in Spanish), fetch the voice manifest, then
  the set's index, then its clips (a few in parallel), verifying sizes; show progress and the size before a large
  download. Play from the local copy. A set counts as ready when all its clips are present.
- **A clip is played only with a text it was made or kept for.** Each index entry carries `text`: a list of
  hashes, each the first 12 hex characters of the SHA-256 of a shown text (UTF-8, NFC). The list holds the text the
  clip was recorded for and, after `keep` or a punctuation-only change, the current text. Before playing, the app
  hashes the text it is showing for that key and plays the clip only if the hash is in the list. Text packs and
  voice sets update separately, so without this an app could show one wording and speak another. Test vector:
  `"Xin chào các bạn nhỏ!"` → `7fedecb3477a`.
- A line without a matching clip is shown without sound; the app never plays another language's clip for a single
  line in the middle of a set.
- A newer set version re-downloads only the clips whose file name changed. Remove clips no index refers to any more.
- Keep text and voice in step: the index is keyed by `ns:key`, the same id the text uses.
