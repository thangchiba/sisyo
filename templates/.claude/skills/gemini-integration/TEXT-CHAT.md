# Text Chat (server-side, streaming + tools)

Backend owns the chat session. Client only sees SSE events.

## Flow

```
POST /api/chat/session  → client.chats.create(system_instruction, tools, thinking)  → session_id
POST /api/chat/message  → chat.send_message_stream(text)   → SSE: text* | function_calls | done
        (server executes tools)
POST /api/chat/tool     → chat.send_message_stream(parts)  → SSE: text* | function_calls | done
```

Loop `message → function_calls → tool → …` until a turn ends with no function calls.

## Create the session

```python
chat = client.chats.create(
    model=settings.GEMINI_CHAT_MODEL,
    config={
        "system_instruction": system_instruction,
        "tools": [{"function_declarations": TOOL_DEFINITIONS}] if TOOL_DEFINITIONS else [],
        "thinking_config": {"thinking_level": settings.GEMINI_CHAT_THINKING_LEVEL},
        # NO temperature / top_p / top_k / candidate_count on 3.x
    },
)
```

- The chats API keeps history automatically — do not re-send previous turns.
- Keep the `chat` object in an in-memory store keyed by `session_id` (with TTL). Persist the
  transcript to your DB separately; the Gemini object is not serializable.
- Client is `None` (no API key) → still create a session id, reply `[Echo] ...`.

## Stream a message

```python
def _safe_get_text(chunk) -> str:
    try:
        return chunk.text or ""        # raises / empty on function-call-only chunks
    except Exception:
        return ""

def _extract_function_calls(chunk) -> list[dict] | None:
    try:
        calls = chunk.function_calls
        if calls:
            return [{"id": getattr(fc, "id", "") or "", "name": fc.name, "args": fc.args} for fc in calls]
    except Exception:
        pass
    return None

async def stream_chat_message(session_id: str, message: str):
    chat = store.get(session_id)
    if chat is None:
        yield {"event": "text", "data": json.dumps({"text": f"[Echo] {message}"})}
        yield {"event": "done", "data": "{}"}
        return

    stream = chat.send_message_stream(message)
    pending_calls = None
    full = []
    for chunk in stream:
        text = _safe_get_text(chunk)
        if text:
            full.append(text)
            yield {"event": "text", "data": json.dumps({"text": text})}
        calls = _extract_function_calls(chunk)
        if calls:
            # Accumulate: parallel calls can span chunks; 3.x rejects the next turn
            # unless EVERY call gets a FunctionResponse (id + name).
            pending_calls = (pending_calls or []) + calls

    if pending_calls:
        yield {"event": "function_calls", "data": json.dumps({"calls": pending_calls})}
    yield {"event": "done", "data": "{}"}
```

## Return tool results — ONE call, all responses

```python
from google.genai import types

parts = [
    types.Part(function_response=types.FunctionResponse(
        id=fr["id"], name=fr["name"], response=fr["response"],
    ))
    for fr in function_responses
]
stream = chat.send_message_stream(parts)   # same chunk loop as above
```

- Sending one `send_message_stream` per response only streams the reply to the LAST one.
- `response` is a dict (`{"result": ...}` or `{"error": "..."}`) — never a bare string.

## SSE contract (keep it stable for the FE)

| event | data |
|---|---|
| `text` | `{"text": "..."}` — append to the current assistant bubble |
| `function_calls` | `{"calls": [{"id","name","args"}]}` — FE calls `/api/chat/tool` after server executes |
| `error` | `{"message": "..."}` |
| `done` | `{}` |

Wrap the whole generator in `try/except` → `error` event; log with `logger.exception`.

## Summaries and other side calls

Use `generate_content` on the **chat** model with a tight system instruction, same
`thinking_config`, and return `""` on any failure — a summary must never break a conversation.

```python
resp = client.models.generate_content(
    model=settings.GEMINI_CHAT_MODEL,
    contents=conversation_text,
    config={
        "system_instruction": "Summarize in 1-2 sentences, same language as the conversation.",
        "thinking_config": {"thinking_level": settings.GEMINI_CHAT_THINKING_LEVEL},
    },
)
```

## System prompt — knowledge via tool, not stuffing

If the agent has a knowledge base, do NOT paste it into the prompt. Describe what is
available and **mandate** a `search_knowledge_base` tool call before answering business
questions. Build that block in ONE shared function and reuse it for text chat and voice, so
both channels reach the same knowledge.

## Timing

Log time-to-first-chunk and total per call (`gemini.chat.send TTFC` / `TOTAL`, with
`tool_call=bool`). This is how you notice a model bump made chat slower.
