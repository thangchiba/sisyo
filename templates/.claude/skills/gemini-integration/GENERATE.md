# One-shot Generate (JSON, grounding, PDF, TTS)

Use `client.models.generate_content` on `GEMINI_GENERATE_MODEL` for offline / admin work
(config generation, Q&A generation, document extraction). Never on the interactive chat path.

## JSON output

```python
resp = client.models.generate_content(
    model=settings.GEMINI_GENERATE_MODEL,
    contents=prompt,
    config={
        "system_instruction": SYS,
        "response_mime_type": "application/json",
        "thinking_config": {"thinking_level": "low"},
    },
)
data = _parse_json(resp.text or "")
```

```python
def _parse_json(text: str) -> dict:
    text = text.strip()
    try:
        return json.loads(text)
    except Exception:
        pass
    m = re.search(r"\{.*\}", text, flags=re.DOTALL)   # tolerate ```json fences / prose
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            pass
    return {}
```

Always parse defensively and have a fallback (empty dict, original order, etc.).

## Grounding: Google Search + URL context

For "generate an agent config from this business URL" style tasks:

```python
from google.genai import types

resp = client.models.generate_content(
    model=settings.GEMINI_GENERATE_MODEL,
    contents=prompt_with_urls,
    config={
        "system_instruction": GENERATE_PROMPT,
        "tools": [
            types.Tool(google_search=types.GoogleSearch()),
            types.Tool(url_context=types.UrlContext()),
        ],
    },
)
```

- Tell the model in the system prompt to browse the URLs first and search for the business
  before generating; otherwise it invents data.
- When regenerating (e.g. "10 more Q&A"), pass the existing items and say "do NOT duplicate".
- Grounded calls are slow (seconds) — run them from admin endpoints / background jobs only.

## PDF / document extraction

Send the file bytes inline and ask for Markdown. Cap size (~19 MB inline limit).

```python
from google.genai import types

resp = client.models.generate_content(
    model=settings.GEMINI_GENERATE_MODEL,
    contents=[
        types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
        "Extract ALL text from this document as clean Markdown. Preserve tables as Markdown "
        "tables and keep headings in reading order. Output only the extracted content.",
    ],
)
text = (resp.text or "").strip()
if not text:
    raise ValueError("PDF text extraction returned no text (scanned/empty document?)")
```

Raise a `ValueError` with a short message on failure so the upload UI can show it.

## TTS (voice sample clips)

```python
resp = client.models.generate_content(
    model=settings.GEMINI_TTS_MODEL,
    contents=text,
    config={
        "response_modalities": ["AUDIO"],
        "speech_config": {"voice_config": {"prebuilt_voice_config": {"voice_name": voice_name}}},
    },
)
pcm = b"".join(p.inline_data.data for p in resp.candidates[0].content.parts
               if p.inline_data and p.inline_data.data)
# → wrap as WAV: mono, 16-bit, 24000 Hz
```

Rules for TTS previews:

- **Pre-generate and cache** (S3 / disk) every voice × language at startup in a background
  thread; the play button must be a URL lookup, never a live TTS wait.
- Key clips by a version string (`voice-samples/v1/{voice}_{lang}.wav`). Bump the version when
  the sample text or TTS model changes; provide a `--force` regenerate script.
- Pace calls (`sleep 1s` between, `5s` after a failure) to stay under rate limits; one bad clip
  must not stop the batch.
- Voice ids: Live API subset (`Kore, Puck, Charon, Aoede, Fenrir, Leda, Orus, Zephyr`).
  Store the Gemini id; show friendly names in the UI. Unknown id → default `Kore`.
