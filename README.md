# sisyo

Smart documentation system for vibe coding with Claude Code.
Docs auto-update as you build. Token-efficient MAP.md routing pattern.

## Install

```bash
npx sisyo
```

Run it in your project root.

## What it creates

```
your-project/
  CLAUDE.md                            # Project rules (auto-loaded)
  .claude/
    rules/docs.md                      # Doc rules (auto-loaded, 10 lines)
    skills/vibe-docs/SKILL.md          # Brain (loaded on trigger)
  docs/
    MAP.md                             # Routing table
    99_progress/todo.md                # Task backlog
    99_progress/handoff.md             # Session recovery
```

## How it works

**Problem:** Loading all docs into context = 20K+ tokens = runs out fast.

**Solution:** `MAP.md` is a routing table with 1-line summary per doc (~500 tokens).
Claude reads MAP.md first, then loads only the specific file it needs.

```
CLAUDE.md (auto-load)
    |
    v
docs/MAP.md (routing table, ~30 lines)
    |
    +--> 03_database/schema.md   (only if working on DB)
    +--> 04_api/auth.md           (only if working on API)
    +--> 99_progress/todo.md      (only if checking tasks)
```

### Auto-triggers

The vibe-docs skill triggers automatically when you:
- Design database tables -> creates/updates `03_database/schema.md`
- Add API endpoints -> creates/updates `04_api/[module].md`
- Plan features -> creates `01_requirements/[name].md`
- Make architecture decisions -> updates `02_architecture/decisions.md`
- Complete any task -> updates `99_progress/todo.md`
- End a session -> writes `99_progress/handoff.md`

Every doc change also updates its summary line in MAP.md.

### Session recovery

After `/clear` or starting fresh:
```
Read handoff and continue
```
Claude reads MAP.md + handoff.md + todo.md (~3K tokens) and picks up where you left off.

## Doc folders

| Folder | Purpose |
|---|---|
| `00_schedule/` | Roadmap, milestones, sprint plans |
| `01_requirements/` | Feature specs, user stories |
| `02_architecture/` | System design, tech decisions (ADR) |
| `03_database/` | Schema, ERD, migration log |
| `04_api/` | API endpoint specs by module |
| `05_frontend/` | Pages, components, routing |
| `06_infra/` | Deploy, Docker, CI/CD, env vars |
| `99_progress/` | TODO, changelog, session handoff |

Folders are created on-demand. No empty placeholders.

## After install

1. Edit `CLAUDE.md` - replace `[Project Name]` with yours
2. Open Claude Code and start building
3. Docs update automatically as you work

## Author

HoangThang - [hoang.jp](https://hoang.jp)

## License

MIT
