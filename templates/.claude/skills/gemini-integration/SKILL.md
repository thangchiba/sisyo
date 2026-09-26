---
name: gemini-integration
description: "Google Gemini API integration rules (google-genai Python / @google/genai JS): model roles per use case (chat, generate, embedding, TTS, Live voice) via env config keys, singleton client, echo stub when no API key, Gemini 3.x request rules (thinking_level not thinking_budget, no temperature/top_p, FunctionResponse needs id+name, accumulate function calls across stream chunks, send all tool results in ONE message), server-side text chat with SSE streaming, client-side Live voice via ephemeral token (gemini-3.8-live: declare tools BLOCKING for voice, no thinking_level; per-model-family setup; sendRealtimeInput audio, PCM 16k in / 24k out), structured tool results (status/retryable/guidance), embeddings (one text per call, Matryoshka dims, re-embed on model change), LLM reranker, JSON mode, google_search / url_context grounding, PDF extract, TTS. Triggers on any Gemini / genai / GEMINI_* code, voice chat, RAG embedding, or user saying 'gemini', 'live api', 'function calling'."
license: MIT
metadata:
  author: HoangThang
  version: '1.0.0'
---

# Gemini Integration

Rules for wiring Google Gemini into a project. Read this before touching any code that
imports `google.genai` / `@google/genai` or reads a `GEMINI_*` setting.

## When to trigger

- Adding or editing Gemini calls (chat, generate, embed, TTS, Live)
- Changing a `GEMINI_*` model / env key
- Building voice chat, function calling / tools, RAG embeddings, PDF extraction
- User says **"gemini"**, **"live api"**, **"function calling"**, **"embedding"**, **"voice"**
- Debugging: 400 on request config, socket closed 1007, "connecting…" forever, empty text chunks

## Detail files — load ONLY what the task needs

| File | Load when |
|---|---|
| `TEXT-CHAT.md` | Server-side chat session, streaming to SSE, tool loop |
| `GENERATE.md` | One-shot generate: JSON mode, google_search / url_context grounding, PDF extract, TTS |
| `LIVE-VOICE.md` | Client-side voice via Live API: ephemeral token, WebSocket, audio, async (3.8) / sync (3.1) tool calls, 2.5 → 3.1 → 3.8 differences |
| `RAG-EMBEDDING.md` | Embeddings for vector search + LLM reranker |
| `TROUBLESHOOTING.md` | An error code or a hang you need to map to a cause |

## 1. One model per job — all via config keys

Never hardcode a model id in business code. Read it from settings so a box can pin or
roll back via `.env` without a deploy.

| Use case | Default model | Config key | SDK |
|---|---|---|---|
| Text chat, summary, LLM rerank | `gemini-3.5-flash-lite` | `GEMINI_CHAT_MODEL` | `google-genai` (Python) |
| Agent / Q&A generation, PDF extract | `gemini-3.8-flash` | `GEMINI_GENERATE_MODEL` | `google-genai` (Python) |
| TTS sample clips | `gemini-2.5-flash-preview-tts` | `GEMINI_TTS_MODEL` | `google-genai` (Python) |
| Embedding (RAG) | `gemini-embedding-2` | `GEMINI_EMBEDDING_MODEL` | `google-genai` (Python) |
| Voice chat (Live) | `gemini-3.8-live` | `GEMINI_LIVE_MODEL` | `@google/genai` (JS, browser) |
| Chat thinking level | `minimal` | `GEMINI_CHAT_THINKING_LEVEL` | — |

- Cheap/fast model for anything on the interactive path (chat, rerank, summary).
- Bigger model only for offline / admin generation and document extraction.
- Every model key gets a documented **rollback value** (see `TROUBLESHOOTING.md`).
- `.env` on a server is usually NOT overwritten by deploy — a pinned `GEMINI_*` there wins over
  code defaults. Expose the live model on a health/token endpoint so it can be verified.

```python
# config.py (pydantic-settings style)
GEMINI_API_KEY: str = ""
GEMINI_CHAT_MODEL: str = "gemini-3.5-flash-lite"
GEMINI_CHAT_THINKING_LEVEL: str = "minimal"  # 3.5 Flash-Lite default + fastest; 3.7/3.8 Flash reject it → "low"
GEMINI_GENERATE_MODEL: str = "gemini-3.8-flash"
GEMINI_LIVE_MODEL: str = "gemini-3.8-live"   # rollback: gemini-3.1-flash-live-preview (sync tools)
GEMINI_TTS_MODEL: str = "gemini-2.5-flash-preview-tts"
GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-2"
EMBEDDING_DIM: int = 768
```

## 2. Client setup

- Python: `google-genai>=2.0.0` for 3.5+ models (thought signatures in multi-turn tool calls).
  JS: `@google/genai` (browser, Live only — the API key never ships to the browser).
- **Singleton client**, lazily created, SDK imported inside the function so the module loads
  without the SDK installed in tests:

```python
_client = None

def get_gemini_client():
    global _client
    if not settings.GEMINI_API_KEY:
        return None                     # → echo stub mode
    if _client is None:
        from google import genai
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _client
```

- Live ephemeral tokens need `http_options={"api_version": "v1alpha"}` on a separate client.

## 3. Echo stub mode — mandatory

When `GEMINI_API_KEY` is empty the app must still boot and the UI must still be testable:

- Text chat returns `[Echo] {message}` through the same SSE events.
- Voice token endpoint returns `{"token": "stub-token-no-api-key", ...}` (won't connect).
- Embedding / rerank / TTS raise a clear `RuntimeError("GEMINI_API_KEY not set")` — never a
  silent empty result.

## 4. CRITICAL — Gemini 3.x request rules

Apply to every `generate_content` / `chats.create` / `embed_content` on 3.5+ / 3.8:

- **`thinking_budget` is NOT supported.** Use `thinking_config={"thinking_level": ...}`.
  Levels differ per model: 3.5 Flash-Lite accepts `minimal` (its default, the fastest);
  3.7/3.8 Flash reject `minimal` with 400 — use `low` — and default to `medium`, which is
  noticeably slower for a support chat. Live: 3.1 takes `thinking_level` (`minimal`),
  `gemini-3.8-live` takes **no** `thinking_level` at all (omit `thinking_config`).
- **Do NOT send** `temperature`, `top_p`, `top_k`, `candidate_count` — deprecated on 3.x.
- Every `FunctionResponse` **must carry `id` + `name`**, or the next turn is rejected.
- **Accumulate function calls across ALL stream chunks** — parallel calls can span chunks;
  a call left without a response breaks the session.
- Send **all** function responses of a turn in **ONE** `send_message_stream(parts)`. One call per
  response only streams the reply to the last one and silently drops the rest.
- A chunk may contain only function calls and no text — wrap `chunk.text` in a safe getter.
- JSON output: `response_mime_type="application/json"` + still parse defensively (regex the
  first `{...}` on failure).

## 5. Function calling (server-side tools)

- Declare tools once (`TOOL_DEFINITIONS`) in Gemini schema form (`"type": "OBJECT"`,
  `"STRING"`). Share the same list between text chat and Live so both channels have identical
  capabilities.
- Tools are executed by **your backend**, never inside the model prompt. For Live, the browser
  receives the `toolCall`, POSTs to your `/api/tools/execute`, then `sendToolResponse`.
- Tool descriptions are prompts: say **when** to call it and what it returns.
- Always ship an `end_conversation`-style tool if the model may close a session, and handle it
  after the farewell turn (see `LIVE-VOICE.md`).
- A tool that throws must still answer with `{"error": "..."}` — a missing response makes the
  model wait forever.
- Return **structured** results, never `{}` / `None`: `status` (`ok` | `no_results` |
  `invalid_argument` | `error`), plus `retryable` and a model-facing `guidance` sentence when
  nothing usable came back. Gemini 3.8 Live re-queries with rephrased variations on an
  unexplained empty result. Keep any `message` short if an admin UI shows it verbatim.
- `behavior` (`BLOCKING` / `NON_BLOCKING`) is a Live-only declaration field — add it while
  building the Live token config, not to the shared `TOOL_DEFINITIONS` text chat also sends.

## 6. Security

- API key only on the server, sent via header (`x-goog-api-key`) — never `?key=` in a URL
  (lands in access logs).
- Browser gets a **single-use ephemeral token** constrained to model + system prompt + tools
  + voice config; expire ~30 min, new-session window ~2 min.
- Public token endpoints must validate the resource (agent id, feature flag) **before** minting
  a token or creating any DB row — otherwise unauthenticated callers can spend your quota.
- Log the model + voice on every token mint so a "wrong voice / wrong model" report is
  traceable.

## 7. Docs — what to record (vibe-docs)

After integrating or changing Gemini usage, update `docs/09_integrations/gemini.md`
(`_summary.md` + MAP.md line as usual) with:

1. **Models table** (use case → model → config key → SDK) and the rollback value per key
2. Dated "what changed" notes per model bump (e.g. rules that started failing)
3. Tools table (name → description)
4. Live differences handled in code (only if voice is used)
5. Echo stub behaviour

Keep the sections chronological with a date header — model migrations are the #1 thing the
next session needs to know.
