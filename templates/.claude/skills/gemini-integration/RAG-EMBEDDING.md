# Embeddings + LLM Reranker (RAG)

## Embedder

```python
class GeminiEmbedder:
    def __init__(self):
        self.model = settings.GEMINI_EMBEDDING_MODEL     # gemini-embedding-2
        self.dim = settings.EMBEDDING_DIM                # 768 via Matryoshka
        self._client = None

    def _get_client(self):
        if self._client is None:
            from google import genai
            if not settings.GEMINI_API_KEY:
                raise RuntimeError("GEMINI_API_KEY not set — cannot use GeminiEmbedder")
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        # ONE text per call. gemini-embedding-2 is multimodal and treats a LIST in
        # `contents` as the parts of a SINGLE input → N chunks collapse into 1 vector.
        out = []
        for text in texts:
            resp = self._get_client().models.embed_content(
                model=self.model, contents=text,
                config={"task_type": "RETRIEVAL_DOCUMENT", "output_dimensionality": self.dim},
            )
            out.append(resp.embeddings[0].values)
        return out

    def embed_query(self, text: str) -> list[float]:
        resp = self._get_client().models.embed_content(
            model=self.model, contents=[text],
            config={"task_type": "RETRIEVAL_QUERY", "output_dimensionality": self.dim},
        )
        return resp.embeddings[0].values
```

Rules:

- `task_type`: `RETRIEVAL_DOCUMENT` for indexing, `RETRIEVAL_QUERY` for search. Mixing them
  degrades recall.
- Request `output_dimensionality` explicitly so the vector store collection width is fixed
  by config, not by the model default.
- **Changing the embedding model changes the vector space.** Existing vectors become
  incomparable → ship a `migrate_embeddings --recreate` script and mention it in the docs next
  to the config key.
- Put the embedder behind an interface (`source = "gemini"`) so a swap to another provider is
  one class.

## LLM reranker (small candidate sets)

Ask the **chat** model (fast, cheap) to score candidates as JSON. Good up to ~20 passages;
beyond that use a dedicated reranker.

```python
_SYS = ("You are a relevance reranker. Given a user query and numbered candidate passages, score "
        "each 0.0–1.0 for relevance. Return ONLY valid JSON, using the passage numbers as ids: "
        "{\"scores\": [{\"id\": 0, \"score\": 0.85}]}")

# Number the candidates — echoing a 36-char chunk UUID per candidate roughly triples the JSON
# the model must write, and output length dominates rerank latency.
prompt = "\n".join([f"Query: {query}", "Candidates:"] +
                   [f"[{i}] {c.text[:600]}" for i, c in enumerate(candidates)])

resp = client.models.generate_content(
    model=settings.GEMINI_CHAT_MODEL,
    contents=prompt,
    config={
        "system_instruction": _SYS,
        "response_mime_type": "application/json",
        "thinking_config": {"thinking_level": settings.GEMINI_CHAT_THINKING_LEVEL},  # minimal on flash-lite
    },
)
scores: dict[int, float] = {}
for s in _parse_json(resp.text or "").get("scores", []):
    try:
        i, sc = int(float(str(s["id"]).strip("[] "))), float(s["score"])   # 3, "3", "[3]"
    except (TypeError, ValueError, KeyError, OverflowError):
        continue
    if 0 <= i < len(candidates):
        scores[i] = sc
order = sorted(range(len(candidates)), key=lambda i: scores.get(i, 0.0), reverse=True)  # stable
```

Rules:

- Skip the call for 0–1 candidates.
- On any exception or empty scores → return the input order (`candidates[:top_n]`), log it.
- Truncate passage previews (~600 chars) — reranking must stay sub-second on the chat path.
- Voice forces the fast retrieval profile (no LLM rerank) — latency matters more than
  precision when someone is listening.
