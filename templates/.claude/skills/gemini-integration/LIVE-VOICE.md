# Live Voice (client-side WebSocket via ephemeral token)

Voice runs **in the browser** against the Live API. The backend only mints a constrained
ephemeral token; tools are still executed by the backend.

```
FE  POST /api/live/token?lang=   → BE: validate agent → client.auth_tokens.create() → {token, model, voice_name, session_id}
FE  ai.live.connect({model, config, callbacks})   (apiKey = token, apiVersion v1alpha)
FE  mic PCM 16 kHz → sendRealtimeInput({ audio })
BE→FE audio PCM 24 kHz in serverContent.modelTurn.parts[].inlineData
FE  toolCall → POST /api/tools/execute → sendToolResponse({ functionResponses })
```

## Backend — mint the token

```python
from google import genai

client = genai.Client(api_key=settings.GEMINI_API_KEY, http_options={"api_version": "v1alpha"})

live_config = {
    "response_modalities": ["AUDIO"],
    "system_instruction": system_instruction,          # same template as text chat + voice block
    "tools": [{"function_declarations": TOOL_DEFINITIONS}],
    "speech_config": {"voice_config": {"prebuilt_voice_config": {"voice_name": voice_name}}},
    "input_audio_transcription": {},                   # server-side STT of the user → live transcript
    "output_audio_transcription": {},                  # STT of the model's speech
}
if "3.1" in model:
    live_config["thinking_config"] = {"thinking_level": "minimal"}   # 3.1 only; NOT thinking_budget

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
- Wrap `auth_tokens.create` in try/except + `logger.exception` — a 402 (billing / Live not
  enabled) or unknown model id otherwise shows up as a silent "connecting…".
- No API key → return `{"token": "stub-token-no-api-key", ...}`.

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
  and log it — a hang is then observable.
- `onclose`: codes 1000/1005 are normal; anything else → surface `reason` as an error.
  1007 = bad payload (see 2.5 → 3.1 table).

## Audio

| Direction | Format | API |
|---|---|---|
| Mic → model | PCM 16-bit mono, **16 kHz** | `sendRealtimeInput({ audio: pcmBlob })` |
| Model → speaker | PCM 16-bit mono, **24 kHz** | `serverContent.modelTurn.parts[].inlineData.data` |

- Schedule output buffers back-to-back on the AudioContext clock (`nextStartTime`), don't play
  each chunk immediately.
- `serverContent.interrupted` (barge-in) → reset `nextStartTime` and clear speaking state.
- Route output through an `AnalyserNode` if the UI animates on loudness.
- Transcripts: `serverContent.inputTranscription.text` / `outputTranscription.text` arrive as
  deltas; append to the current turn's bubble, reset indexes on `turnComplete`.

## Tool calls on 3.1 — synchronous

```ts
if (msg.toolCall) {
  const functionResponses = await Promise.all((msg.toolCall.functionCalls || []).map(async fc => {
    let response: Record<string, unknown>
    try { response = { result: await executeTool(fc.name, fc.args) } }
    catch (e) { response = { error: e instanceof Error ? e.message : 'Tool execution failed' } }
    return { id: fc.id || '', name: fc.name || '', response }
  }))
  session.sendToolResponse({ functionResponses })   // ALL calls, ONE message
}
```

- The model is **silent until every call is answered** — a thrown tool must still respond.
- Show a "thinking" indicator from `toolCall` until the next audio chunk arrives.

## end_conversation — hang up AFTER the farewell

Tool calls are sync, so the farewell audio comes **after** your tool response. Do not close the
socket inside the tool handler (that produced no farewell + a UI stuck on "Connecting…").

1. On `end_conversation`: set `ending = true`, phase `ending`, **stop the mic**, start a 12 s
   grace timer.
2. Send the tool response normally.
3. On `turnComplete` while `ending`: wait for the audio queue to drain (+400 ms) → disconnect →
   phase `ended` (show "Call again", not "idle").
4. Grace timer fires first → disconnect anyway.

System prompt line: *"When the customer says goodbye, say ONE short farewell sentence and call
end_conversation in that same turn."*

## Session language + greeting

- Widget passes `?lang=` → token endpoint → appended `## Voice Mode` block in the system
  prompt: default language, greeting rule, control-turn rule, farewell rule.
- The FE's first turn is a control message `[Session start] … Greet them now in {lang}` — **not**
  the greeting text. Sending the greeting as a user turn made the model mirror its language.
- Tell the model the `[Session start]` turn is a control signal: never read it aloud, never
  mirror its language.
- Per-language overrides live in `config.locales[lang]` merged over defaults by ONE resolver
  used by both the token endpoint and the public config endpoint.

## 2.5 → 3.1 Live differences (branch on `'3.1' in model`)

| Item | 2.5 | 3.1 |
|---|---|---|
| Mic stream | `sendRealtimeInput({ media })` | `sendRealtimeInput({ audio })` — `media` → close 1007 |
| Mid-session text | `sendClientContent` | `sendRealtimeInput({ text })` |
| Latency tuning | `thinking_budget` | `thinking_config.thinking_level = "minimal"` |
| Server events | 1 part / event | multiple parts / event → loop over all `parts` |
| Function calling | async (NON_BLOCKING) possible | **sync only** |
| Proactive audio / affective dialog | yes | not supported |

Fallback: `GEMINI_LIVE_MODEL=gemini-2.5-flash-native-audio-preview-12-2025`.

## Persisting the voice transcript

Create a `live_*` session row when minting the token and return its id. FE flushes new
transcript entries on `turnComplete`, `onclose` and disconnect — fire-and-forget, watermark
advances only after a successful save, and persistence must never break the call.
