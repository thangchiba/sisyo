---
name: hindsight
description: >
  Add long-term memory to a project with the shared Hindsight server on the LAN
  Mac (vectorize-io/hindsight), or operate or redeploy that server. Use when a
  project, app, agent system or coding setup should remember facts, decisions or
  user preferences across sessions; when asked to "integrate Hindsight",
  "add memory", "retain/recall/reflect"; or when the Hindsight stack in
  ~/Workspace/LanServer/Hindsight needs a restart, login, upgrade or rebuild.
---

# Hindsight: long-term memory for any project

One Hindsight server runs on the always-on Mac and serves every project. A
**bank** holds one project's memories, and banks never see each other. Integrating a new
project means: pick a bank, decide what to retain, recall at the point of use.
Do not stand up a second server unless the project must run somewhere else.

Server details and the reasons behind its setup: `~/Workspace/LanServer/Hindsight/README.md`.
Paperclip's integration (capture plugin + per-run recall): the "Company memory
(Hindsight)" section of `~/Workspace/Hoang/paperclip/DEPLOY-DORAEMON.md`.

## The shared server

| | |
|---|---|
| API (and MCP) | `http://192.168.1.95:26352` from the LAN; `http://host.docker.internal:26352` from a container on the Mac |
| UI | `http://192.168.1.95:26353` (browse, edit, invalidate memories) |
| Auth | `Authorization: Bearer <HINDSIGHT_API_KEY>`; UI key `HINDSIGHT_UI_ACCESS_KEY` |
| Keys | in `~/Workspace/LanServer/Hindsight/.env` (mode 600) |
| LLM | Claude Sonnet 5.5 on the Claude **subscription** (`claude-code`), ChatGPT subscription (`openai-codex`) as fallback |
| Embeddings / rerank | Gemini `gemini-embedding-2` (768 d) / TypeSafe Jev, with `rrf` as fallback |

**Handling the key:** copy it into the new project's own secret store (its
`.env`, a Paperclip secret, and so on) without printing it:

```sh
grep '^HINDSIGHT_API_KEY=' ~/Workspace/LanServer/Hindsight/.env | cut -d= -f2- | tr -d '\n' | pbcopy
```

## Hard rules

- **The LLM stays on subscriptions.** Never give Hindsight or a project's memory
  path a pay-per-token LLM key (ANTHROPIC_API_KEY, OPENAI_API_KEY, Gemini as LLM).
  The operator set this rule so the bill cannot grow. Gemini is for embeddings
  only, and Jev is for reranking only.
- **One bank per project, or per tenant inside a project.** Name it
  `<project>::<scope>`, for example `paperclip::<companyId>`, `fire::<userId>` or
  `coding-agent::<repo>`. Add each new bank to the registry in the server README.
  Never write one project's data into another's bank.
- **Keep the embedding model.** Changing it needs an empty database for every bank
  (see "Rebuild" below). Agree on it before anyone depends on the memories.
- **Memory is evidence, not orders.** When recall goes into a prompt, show dates,
  let the current request win, and invite corrections.
- **No secrets in memory.** Redact before retaining. The Paperclip plugin's
  `redactSecrets()` in
  `paperclip/packages/plugins/doraemon-hindsight-memory/src/items.ts` is a ready
  pattern list.

## Integrating a project

1. **Create the bank with missions.** They steer what extraction keeps; see
   `references/api.md`, section "Bank". Say whose words the items are, what to
   keep (preferences, decisions, rules, facts, lessons), what to skip
   (chit-chat, one-off scheduling, status noise), and that secrets are never
   stored.
2. **Choose what to retain: durable signal, not logs.** Paperclip retains only
   the human's own words (about 6 items a day) and not the agents' 70 comments a
   day. For each item:
   - `content`: the words to learn from, cleaned and redacted.
   - `context`: who is speaking and what they reply to. Keep it **under about 400
     characters**. It is prepended to every fact extracted from the item and sent
     to Jev with each rerank candidate, and Jev refuses requests over about
     16k tokens.
   - `timestamp`: when it was said, for temporal ranking.
   - `document_id`: a stable source id (`<project>:<kind>:<id>`). Re-sending
     replaces instead of duplicating. Keep your own content hash, so that
     unchanged rows never pay for another extraction.
   - `tags`: provenance (`source:…`, `project:…`). Recall does not filter on
     them unless asked.
   - Send with `async: true`. Facts appear after extraction, in 5–10 s each.
3. **Recall where the answer is used.**
   - Query from the task at hand, at most about 700 characters (Hindsight rejects
     queries over 500 tokens).
   - Use `budget: "mid"` and `max_tokens` around 800.
   - Allow about a 6 s timeout, and **fail open**: a missing bank (404) or an
     error means no memory, never a failed request. Recall uses no LLM and takes
     about 1 s (Gemini embed plus Jev).
   - Put the result into the per-request prompt, not a cached system prompt:
     changing that prompt breaks prompt caching and session resume.
4. **Optionally add a mental model** for a stable summary, for example "how the
   user wants work done". It is created once, refreshes itself after new
   memories (at most every 30 min) and reads with a plain GET, with no LLM.
   While the first refresh runs, its content is `Generating content...`: treat
   that as empty.
5. **Use reflect only for deliberate questions** ("why did we drop X?"). It runs
   an LLM loop and takes up to minutes.
6. **Verify.** Retain one representative item synchronously into
   `zz-test-<project>` and read the extracted facts. Recall a query in the
   project's language (Vietnamese works), then delete the test bank.

Client code for TypeScript and Python, and the exact endpoints, are in
`references/api.md`.

## Coding agents (Claude Code, Codex)

Use MCP: `claude mcp add --transport http hindsight http://192.168.1.95:26352/mcp/<bank>/ --header "Authorization: Bearer <key>"`,
with one bank per repo (`coding-agent::<repo>`).

**Do not install Hindsight hooks globally** (`~/.claude/settings.json`) on the Mac
or in WSL. Paperclip agents on those machines share `~/.claude`, so they would
get the hooks too: a second injection of memory, and agent transcripts retained
into the bank. Use MCP, or project-level hooks (`.claude/settings.json` in the
repo).

## Operating the server

All in `~/Workspace/LanServer/Hindsight`:

| Task | Do |
|---|---|
| Restart or look | `docker compose up -d`, `docker compose logs -f hindsight`, `curl -s http://127.0.0.1:26352/health` |
| Claude login expired (a year) | `./login-claude.sh` (or `--paste` with a `claude setup-token` token; the script strips the indentation and wrapping) |
| ChatGPT fallback login invalid | `./login-codex.sh`. It uses its own `codex-home/`; never `~/.codex`, where rotating refresh tokens would log the codex agents out |
| New Claude model or CLI | `docker compose build --no-cache hindsight && docker compose up -d`, then set `HINDSIGHT_LLM_MODEL` in `.env`. Look up model ids in the CLI binary: `docker exec hindsight sh -c 'grep -a -oE "claude-[a-z]+-[0-9-]+" /opt/claude/claude \| sort -u'` |
| Backup | `docker exec hindsight-db pg_dump -U hindsight hindsight \| gzip > backups/hindsight-$(date +%Y%m%d%H%M).sql.gz` |
| Upgrade Hindsight | bump `HINDSIGHT_VERSION` in `docker-compose.yml`, then `docker compose up -d --build`; migrations run on start |
| Rebuild (embedding change) | back up, `docker compose down`, `docker volume rm hindsight_db_data`, `docker compose up -d`. Paperclip's plugin resends its history by itself when its bank is missing; other projects must re-send theirs |

Health signals:
- the startup log shows `LLM: claude-code / claude-sonnet-5-5`,
  `Claude Code connection verified`, `Codex LLM verified` and
  `google provider initialized ... dim: 768`;
- recall takes about 1 s;
- the API process uses about 360 MB of RAM.

## Deploying a separate instance

Only when a project must run away from this Mac. Copy the directory (compose
file, `Dockerfile`, `login-*.sh`, README); do not copy `.env`, `codex-home/` or
`backups/`. Then:

1. **New secrets.** Create a new `.env` with fresh `HINDSIGHT_DB_PASSWORD`,
   `HINDSIGHT_API_KEY` and `HINDSIGHT_UI_ACCESS_KEY` (`openssl rand -hex 24`),
   plus the Gemini and Jev keys.
2. **A free subnet.** Pin `networks.default` to a free 10.x subnet. On this Mac,
   an automatic pick lands on 192.168.0.0/20 and cuts containers off from the LAN.
3. **Build for the host's own architecture.** The Dockerfile copies the native
   Claude CLI binary for that platform.
4. **Log in** with `login-claude.sh`, then `login-codex.sh`.
5. **Verify** as in "Integrating a project", step 6.

## Traps already paid for

- **Reranker.** A local cross-encoder reranker on the Mac's CPU took 36–97 s per
  recall. Jev over the API, with `RECALL_MAX_CANDIDATES_PER_SOURCE=15`, takes
  about 0.3 s. The recall budget does not bound the candidate pool; the
  per-source cap does.
- **torch.** On arm64, the PyPI torch wheel pulls 3.3 GB of CUDA. Local models
  are gone now; if they ever come back, install torch from the CPU index.
- **Codex models.** `gpt-5.4-mini` is refused on ChatGPT accounts; `gpt-6-luna`
  works.
- **Reflect timeout.** It defaults to 30 s per LLM call, which is too short;
  `HINDSIGHT_API_REFLECT_LLM_TIMEOUT=120`.
- **`HINDSIGHT_API_LLM_STRATEGY`.** It must be JSON (`{"mode": "failover"}`); a
  bare word crashes startup.
- **Bank reads.** There is no GET for a single bank (405); list banks instead.
- **Deleting memories.** No endpoint hard-deletes one memory. Invalidate it, in
  the UI or with `PATCH` `state: invalidated`, or delete its document.
- **Plugin workers (Paperclip).** Background calls must run outside host
  invocations and name the company. The host expands array SQL parameters, so
  pass lists as JSON. Details are in DEPLOY-DORAEMON.md.
