# Troubleshooting

Symptom → cause → fix. Check the **live** model first: `.env` on the server overrides code
defaults and deploy does not rewrite it. Verify via the token / health endpoint `model` field.

## Request errors (400)

| Symptom | Cause | Fix |
|---|---|---|
| 400 mentioning `thinking_budget` | 3.5+/3.8 dropped it | `thinking_config={"thinking_level": ...}` |
| 400 `thinking_level=minimal` | 3.7/3.8 Flash (and 3.8 Live Extended Thinking) reject `minimal` | `low` there; 3.5 Flash-Lite and 3.1 Live accept `minimal` |
| Live setup rejected / 400 mentioning `thinking_level` on `gemini-3.8-live` | 3.8 Live has no `thinking_level` | Omit `thinking_config` for the 3.8 family |
| 400 on `temperature` / `top_p` / `top_k` / `candidate_count` | Deprecated on 3.x | Remove them |
| 400 "function response … id/name" on the next turn | A `FunctionResponse` without `id` + `name`, or a call left unanswered | Accumulate calls across chunks; answer every call; include id + name |
| Multi-turn tool calls fail after a model bump | Old `google-genai` without thought signatures | `google-genai>=2.0.0` |

## Chat behaviour

| Symptom | Cause | Fix |
|---|---|---|
| Reply ignores earlier tool results | One `send_message_stream` per response | Send all responses as ONE `parts` list |
| `chunk.text` raises / empty | Chunk carries only function calls | `_safe_get_text()` wrapper |
| Chat got slower after bump | `medium` (3.7/3.8 default), `low` pinned on 3.5 Flash-Lite (its default is `minimal`), or generate model on the chat path | `minimal` on 3.5 Flash-Lite; chat/rerank on flash-lite |
| LLM rerank takes seconds | Output JSON echoes a long chunk id per candidate | Number candidates `[0]…[n-1]`, map back by index (see `RAG-EMBEDDING.md`) |
| `[Echo] …` replies in prod | `GEMINI_API_KEY` empty on that box | Set the key; echo is the stub mode |
| Embeddings: N chunks → 1 vector | Passed a list to `contents` | Embed one text per call |
| Search results nonsense after embedding model change | Vector space changed | Re-embed everything (`--recreate`) |

## Live voice

| Symptom | Cause | Fix |
|---|---|---|
| "Connecting…" forever, no error | `connect()` never resolves; or stale FE bundle | 15 s timeout race; log a build marker on `connect()`; hard reload |
| Socket closed **1007** right after mic start | `sendRealtimeInput({ media })` on 3.1 | Use `{ audio }` (3.x docs only list `audio`) |
| 3.8 id behaves like 2.5 (1007, text ignored, no thinking) | Code branches on `"3.1" in model` | Branch on the model family (`2.5` / `3.1` / else 3.8) |
| Setup error mentioning `proactivity` / `enable_affective_dialog` on 3.8 | Always on / removed on 3.8 | Drop those keys |
| Token endpoint 402 | Billing / Live API not enabled for the key | Enable in AI Studio; log exception on mint |
| Token endpoint 404 "Agent not found" for a real agent | Router caught `LookupError` base (KeyError/IndexError inside) or stale negative cache | Catch a dedicated `AgentNotFound`; short negative-cache TTL; `ConsistentRead` |
| Token endpoint 403 | `voice_enabled` false on agent or plan | Expected — hide the voice toggle in the UI |
| Connected but silent | `AudioContext` suspended (not from a user gesture) | `await ctx.resume()` after creating it |
| Wrong voice every other session | FE didn't pass `speechConfig` on `connect` | Pass `voice_name` from the token response |
| Model goes silent after a tool call | BLOCKING call (3.1, or `behavior: BLOCKING` on 3.8); a tool threw and never answered | Respond `{ error }` for failed tools, all in one `sendToolResponse` |
| 3.8 answers before the search result arrives / makes things up | Tools are `NON_BLOCKING` by default — the model keeps talking | Voice prompt: "one short filler, never answer before the results arrive"; keep the voice tool path fast |
| 3.8 searches again and again with rephrased queries | Empty or unexplained tool result | Return `status: no_results`, `retryable: false`, `guidance`; prompt: "never more than two searches in a row" |
| Error / odd reply after answering a tool call the customer talked over | Server cancelled it (`toolCallCancellation.ids`) | Drop responses for cancelled ids |
| 3.8 call doesn't hang up after goodbye (grace timer fires) | Customer kept talking → the BLOCKING `end_conversation` call was auto-cancelled | Mute the mic before the tool round-trip |
| No farewell, UI stuck after `end_conversation` | Disconnected inside the tool handler | Mute mic, send response, wait `turnComplete` + audio drain, then close |
| Greets in the wrong language | Greeting text sent as a user turn → model mirrors it | Send a `[Session start]` control turn; put the greeting rule in the system prompt |
| Only first audio part plays | 3.x sends multiple parts per event | Loop over all `parts` |
| AI keeps talking for seconds after the customer interrupts | `interrupted` only reset `nextStartTime`; buffers already scheduled keep playing (audio arrives faster than real time) | `stop()` every scheduled `AudioBufferSourceNode` on `interrupted`; drop chunks still decoding |
| Replies switch to the wrong language after a barge-in | Prompt rule "switch to the customer's language" + a misheard overlapping fragment | `RESPOND IN {LANG}. YOU MUST RESPOND UNMISTAKABLY IN {LANG}.`; switch only on an explicit request; stop playback on `interrupted` |
| Waiting filler sounds unnatural (English phrase in a VI/JA call) | Example filler in the prompt gets parroted | Admin-configured filler per language; none → stay silent |
| Mid-session text ignored on 3.1 | Used `sendClientContent` | `sendRealtimeInput({ text })` (the documented text path on 3.x) |
| Voice sample button slow / times out | TTS on demand | Pre-generate at startup, cache on S3, key by version |

## Rollback values

| Key | Rollback |
|---|---|
| `GEMINI_CHAT_MODEL` | `gemini-3.1-flash-lite` (`minimal`/`low` valid there) — the `-preview` id was shut down 2026-05-25 |
| `GEMINI_CHAT_THINKING_LEVEL` | `low` (deeper but slower than `minimal`) |
| `GEMINI_LIVE_MODEL` | `gemini-3.1-flash-live-preview` (sync tools, `thinking_level=minimal`); last resort `gemini-2.5-flash-native-audio-preview-12-2025` (access limited since 2026-09-18) |
| `GEMINI_TTS_MODEL` | 2.5 TTS access limited since 2026-09-18 — successors `gemini-3.8-flash-lite-tts` / `gemini-3.8-flash-tts` |
| `GEMINI_EMBEDDING_MODEL` | Previous model **plus** full re-embed — no hot rollback |

Always record the rollback + the date of the bump in `docs/09_integrations/gemini.md`.
