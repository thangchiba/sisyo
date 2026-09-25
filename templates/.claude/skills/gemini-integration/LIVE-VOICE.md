# Live Voice (client-side WebSocket via ephemeral token)

Voice runs **in the browser** against the Live API. The backend only mints a constrained
ephemeral token; tools are still executed by the backend.

```
FE  POST /api/live/token?lang=   → BE: validate agent → client.auth_tokens.create() → {token, model, voice_name, session_id}
FE  ai.live.connect({model, config, callbacks})   (apiKey = token, apiVersion v1alpha)
FE  mic PCM 16 kHz, 20–100 ms chunks → sendRealtimeInput({ audio })
BE→FE audio PCM 24 kHz in serverContent.modelTurn.parts[].inlineData
FE  toolCall → POST /api/tools/execute → sendToolResponse({ functionResponses })
```

## Model families — branch on the family, not on one version string

| Family | Model id | Tools | Thinking | Notes |
|---|---|---|---|---|
| **3.8** (default) | `gemini-3.8-live` | `NON_BLOCKING` by default, `BLOCKING` per declaration; scheduling `WHEN_IDLE` (default) / `INTERRUPT` / `SILENT` | **none** — omit `thinking_config` | proactive audio always on (`proactive_audio: false` → error), affective dialog removed; a `BLOCKING` call the user talks over is auto-cancelled |
| 3.1 (legacy preview) | `gemini-3.1-flash-live-preview` | sync (blocking) only | `thinking_level: "minimal"` | rollback target |
| 2.5 | `gemini-2.5-flash-native-audio-preview-12-2025` | blocking by default, `NON_BLOCKING` opt-in | `thinking_budget` | text via `sendClientContent`; access limited since 2026-09-18 |

`gemini-3.8-live-extended-thinking` is **not** a drop-in: async-only tools (no `BLOCKING`, no
scheduling), `thinking_level` `low | medium | high` (no `minimal`), and `turnComplete` no longer
means idle — read `interaction_status` (`@google/genai` ≥ 2.17).

```python
def _live_family(model: str) -> str:
    for family in ("2.5", "3.1"):
        if family in model:
            return family
    return "3.8"        # gemini-3.8-live and anything newer
```

Branching on `"3.1" in model` breaks the day the model id changes: a 3.8 id then falls into the
2.5 path (`media` mic field, `sendClientContent`, no thinking config).

## Backend — mint the token

```python
from google import genai

BLOCKING_TOOLS = {"end_conversation"}      # keeps the farewell → hang-up sequence synchronous

def live_tools(family: str) -> list[dict]:
    decls = TOOL_DEFINITIONS
    if family == "3.8":
        # `behavior` is Live-only — never add it to the TOOL_DEFINITIONS text chat also sends
        decls = [{**d, "behavior": "BLOCKING" if d["name"] in BLOCKING_TOOLS else "NON_BLOCKING"}
                 for d in TOOL_DEFINITIONS]
    return [{"function_declarations": decls}] if decls else []

client = genai.Client(api_key=settings.GEMINI_API_KEY, http_options={"api_version": "v1alpha"})
family = _live_family(model)

live_config = {
    "response_modalities": ["AUDIO"],
    "system_instruction": system_instruction,          # same template as text chat + voice block
    "tools": live_tools(family),
    "speech_config": {"voice_config": {"prebuilt_voice_config": {"voice_name": voice_name}}},
    "input_audio_transcription": {},                   # server-side STT of the user → live transcript
    "output_audio_transcription": {},                  # STT of the model's speech
}
if family == "3.1":
    live_config["thinking_config"] = {"thinking_level": "minimal"}   # 3.8: NO thinking_config at all
# Never send proactivity / enable_affective_dialog: always on / removed on 3.8.

token = client.auth_tokens.create(config={
    "uses": 1,
    "expire_time": (now + 30min).isoformat(),
    "new_session_expire_time": (now + 2min).isoformat(),
    "live_connect_constraints": {"model": model, "config": live_config},
    "http_options": {"api_version": "v1alpha"},
})
return {"token": token.name, "model": model, "voice_name": voice_name, "session_id": session_id}
```

Rules:

- Validate the agent / feature flag **before** creating a session row or minting — the endpoint
  is public. Raise a dedicated `AgentNotFound` and map ONLY that to 404 (catching the
  `LookupError` base class turned `KeyError`s from deeper code into bogus 404s).
- Return `voice_name` — the FE **must** pass it again in `live.connect({ speechConfig })`; the
  server ignores the token's voice otherwise.
- Wrap `auth_tokens.create` in try/except + `logger.exception` (log model + family) — a 402
  (billing / Live not enabled) or unknown model id otherwise shows up as a silent "connecting…".
- No API key → return `{"token": "stub-token-no-api-key", ...}`.
- After changing the config, validate it offline against the SDK:
  `types.CreateAuthTokenConfig.model_validate(cfg)` raises on unknown fields / enum values
  without spending an API call.

## Frontend — connect

```ts
import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: tokenData.token, httpOptions: { apiVersion: 'v1alpha' } })
const outputCtx = new AudioContext({ sampleRate: 24000 })
if (outputCtx.state === 'suspended') await outputCtx.resume()   // else "connected but silent"

const session = await Promise.race([
  ai.live.connect({
    model: tokenData.model,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: tokenData.voice_name } } },
    },
    callbacks: { onopen, onmessage, onerror, onclose },
  }),
  timeout(15000, 'WebSocket to Gemini Live did not open (proxy / extension / CSP?)'),
])
```

- `connect()` resolves only on WS `onopen` → always race it with a timeout so the UI never
  hangs on "connecting…".
- Track a **phase** state (`idle | token | opening | open | recording | ending | ended | error`)
  and log it — a hang is then observable. Log a build marker too (stale bundles look like hangs).
- `onclose`: codes 1000/1005 are normal; anything else → surface `reason` as an error.
  1007 = bad payload (see the differences table).

## Audio

| Direction | Format | API |
|---|---|---|
| Mic → model | PCM 16-bit mono, **16 kHz**, **20–100 ms chunks** | `sendRealtimeInput({ audio: pcmBlob })` |
| Model → speaker | PCM 16-bit mono, **24 kHz** | `serverContent.modelTurn.parts[].inlineData.data` |

- `ScriptProcessor` buffer 1024 @ 16 kHz = 64 ms per chunk; 4096 = 256 ms held back per send.
- Schedule output buffers back-to-back on the AudioContext clock (`nextStartTime`), don't play
  each chunk immediately.
- `serverContent.interrupted` (barge-in) → reset `nextStartTime` and clear speaking state.
- Route output through an `AnalyserNode` if the UI animates on loudness.
- Transcripts: `serverContent.inputTranscription.text` / `outputTranscription.text` arrive as
  deltas; append to the current turn's bubble, reset indexes on `turnComplete`.

## Tool calls

```ts
// Barge-in cancels in-flight calls — never answer a call the server already dropped.
for (const id of msg.toolCallCancellation?.ids || []) cancelled.add(id)

if (msg.toolCall) {
  const functionResponses = (await Promise.all((msg.toolCall.functionCalls || []).map(async fc => {
    let response: Record<string, unknown>
    try { response = { result: await executeTool(fc.name, fc.args) } }
    catch (e) { response = { error: e instanceof Error ? e.message : 'Tool execution failed' } }
    return { id: fc.id || '', name: fc.name || '', response }
  }))).filter(fr => !cancelled.has(fr.id))
  if (functionResponses.length) session.sendToolResponse({ functionResponses })   // ALL calls, ONE message
}
```

- **BLOCKING** (3.1; `end_conversation` on 3.8): the model is **silent until every call is
  answered** — a thrown tool must still respond. Show a "thinking" indicator from `toolCall`
  until the next audio chunk.
- **NON_BLOCKING** (3.8 default): the model keeps talking while the tool runs and voices the
  result once idle — `FunctionResponse.scheduling` defaults to `WHEN_IDLE`; set it only to change
  that (`INTERRUPT` cuts in, `SILENT` just adds context). 3.8 downgrades `INTERRUPT` to
  `WHEN_IDLE` while the user is speaking.
- Async tools need prompt rules in the voice block: *"While a search runs you may say ONE short
  filler, but never answer the question before the results arrive."* and *"If a search finds
  nothing, say so instead of searching again with a rephrased query. Never run more than two
  searches in a row without speaking to the customer."*
- Tool results are structured (`status`, `retryable`, `guidance`) — see `SKILL.md` §5.
- Keep the voice tool path fast (retrieve-only RAG profile, no LLM rerank) — even with async
  tools the answer can't start before the result arrives.

## end_conversation — hang up AFTER the farewell

Keep `end_conversation` **BLOCKING** (declare it so on 3.8): the farewell audio then comes
**after** your tool response. Do not close the socket inside the tool handler (that produced no
farewell + a UI stuck on "Connecting…").

1. On `end_conversation`: set `ending = true`, phase `ending`, **stop the mic before the tool
   round-trip** (on 3.8 a customer still talking auto-cancels the BLOCKING call), start a 12 s
   grace timer.
2. Send the tool response normally.
3. On `turnComplete` while `ending`: wait for the audio queue to drain (+400 ms) → disconnect →
   phase `ended` (show "Call again", not "idle").
4. Grace timer fires first → disconnect anyway.

System prompt line: *"When the customer says goodbye, say ONE short farewell sentence and call
end_conversation in that same turn."*

## Session language + greeting

- Widget passes `?lang=` → token endpoint → appended `## Voice Mode` block in the system
  prompt: default language, greeting rule, control-turn rule, tool-wait rule, farewell rule.
- The FE's first turn is a control message `[Session start] … Greet them now in {lang}` — **not**
  the greeting text. Sending the greeting as a user turn made the model mirror its language.
  Send it with `sendRealtimeInput({ text })` on 3.x; only 2.5 needs `sendClientContent`.
- Tell the model the `[Session start]` turn is a control signal: never read it aloud, never
  mirror its language.
- Per-language overrides live in `config.locales[lang]` merged over defaults by ONE resolver
  used by both the token endpoint and the public config endpoint.

## Differences 2.5 → 3.1 → 3.8

| Item | 2.5 | 3.1 | 3.8 (default) |
|---|---|---|---|
| Mic stream | `sendRealtimeInput({ media })` | `{ audio }` — `media` → close 1007 | `{ audio }` |
| Mid-session text | `sendClientContent` | `sendRealtimeInput({ text })` | `sendRealtimeInput({ text })` |
| Latency tuning | `thinking_budget` | `thinking_level: "minimal"` | none — omit `thinking_config` |
| Server events | 1 part / event | multiple parts / event → loop over all `parts` | multiple parts / event |
| Function calling | blocking; `NON_BLOCKING` opt-in | **sync only** | **`NON_BLOCKING` default**, `BLOCKING` per declaration, scheduling |
| Proactive audio / affective dialog | opt-in (`v1beta`) | not supported | always on / removed — don't configure |

Fallback: `GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview`.

## Persisting the voice transcript

Create a `live_*` session row when minting the token and return its id. FE flushes new
transcript entries on `turnComplete`, `onclose` and disconnect — fire-and-forget, watermark
advances only after a successful save, and persistence must never break the call.
