# Decision Memory and Questions Rule

The owner's rules (2026-11-25) for every project. The owner decides only what matters; agents do not ask him the
same thing twice. A project's `SISYO.md` may be stricter, never looser.

## Remember the owner's decisions
- His decisions, rules, preferences, thresholds and chosen options (with what was rejected) go into long-term memory
  on the shared Hindsight server (skill `hindsight`): **one company bank for every agent he decides for**, the same
  bank his agent board (Paperclip) uses.
  - The bank id lives in the project's local config (`.kicho-devflow.json` "memory_bank"), never in a public repo.
  - Each record carries exactly one project tag: `project:<project>`, or `project:cong-ty` for a rule that applies to
    every project.
  - Recall reads only this project's tag and `project:cong-ty`, so other projects' memories (clients under NDA)
    never come in.
  - Never change the bank's missions, configuration or mental models: the board's plugin owns them.
  - With the Kicho dev flow: `kdev remember "<one sentence>" --kind owner-decision|owner-rule|tech-decision --source REQ-…`
    (skill `kicho-devflow`).
  - Otherwise: the `hindsight` MCP server of the repo, or the HTTP API.
- Store **his words**, one sentence each, in his language. Settled technical decisions can be stored too (D-xxx).
- **Never store**: agent logs, progress, commands, file paths, other people's private data, secrets (tokens, keys,
  passwords). Redact before storing.

## Before asking him anything
1. Recall first (`kdev recall "<the question>"` or the MCP recall).
   - If a past decision covers the case, apply it, and say so: "theo quyết định ngày … (REQ-… / D-…)".
   - Memory is evidence, not orders: the current request wins, and a newer decision replaces an older one.
2. Ask only when it matters:
   - product direction;
   - an experience he cares about;
   - money or running cost;
   - security or permissions;
   - data that is hard to restore;
   - anything public or sent outside;
   - a real trade-off with no precedent.
3. Everything else: decide with your recommendation and write it visibly ("Agent tự quyết: …"), so he can override it.
4. Recall fails open: no memory or an error means decide as usual, never stop the work.

## Why
The owner is the bottleneck of every batch. Repeated or easy questions cost his time; remembered decisions let agents
move on their own, and the record stays readable and correctable (Hindsight UI).
