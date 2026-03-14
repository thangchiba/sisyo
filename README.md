# sisyo

Smart documentation system for vibe coding with Claude Code.
Docs auto-update as you build. Token-efficient 3-level routing pattern.

## Install

```bash
npx sisyo
```

Run it in your project root.

## What it creates

```
your-project/
  SISYO.md                             # Project rules (imported by CLAUDE.md)
  CLAUDE.md                            # Auto-created or updated with @SISYO.md
  .claude/
    rules/docs.md                      # Doc rules (auto-loaded)
    skills/vibe-docs/SKILL.md          # Brain (loaded on trigger)
  docs/
    MAP.md                             # Level 1: routing table
    99_progress/todo.md                # Task backlog
    99_progress/handoff.md             # Session recovery
    99_progress/features.md            # Feature log
```

`SISYO.md` holds the project config. `CLAUDE.md` is untouched if it already exists — sisyo just appends `@SISYO.md` to it.

## How it works

**Problem:** Loading all docs into context = 20K+ tokens = runs out fast.

**Solution:** 3-level routing -- load only what you need, when you need it.

```
Level 1: MAP.md              (~500 tokens)  Read ALWAYS
    |
Level 2: folder/_summary.md  (~200 tokens)  Compact table of all items
    |
Level 3: folder/[detail].md                 Full detail, ONLY when needed
```

Most tasks only need Level 1 + Level 2. Detail files load only when actively modifying.

### Example flow

```
MAP.md
  "03_database -- 4 tables: users, posts, comments, categories"
    |
    v
03_database/_summary.md
  | Table    | Description              | Key relations |
  | users    | Accounts, auth, profile  | --            |
  | posts    | Blog posts, draft/publish| -> users      |
    |
    v  (only if modifying users table)
03_database/users.md
  Full column definitions, indexes, constraints
```

### Auto-triggers

The vibe-docs skill triggers automatically when you:
- Complete a feature -> logs to `99_progress/features.md`
- Design database tables -> updates `03_database/_summary.md` + detail file
- Add API endpoints -> updates `04_api/_summary.md` + detail file
- Plan features -> updates `01_requirements/_summary.md` + detail file
- Make architecture decisions -> updates `02_architecture/decisions.md`
- Set up auth/security -> creates `08_security/[topic].md`
- Integrate third-party service -> creates `09_integrations/[service].md`
- Complete any task -> updates `99_progress/todo.md`
- End a session -> writes `99_progress/handoff.md`

Every change updates bottom-up: detail → `_summary.md` → MAP.md

### Session recovery

After `/clear` or starting fresh:
```
Read handoff and continue
```
Claude reads MAP.md + handoff.md + todo.md (~3K tokens) and picks up where you left off.

## Update

```bash
npx sisyo --update
```

Updates system files (`SISYO.md`, `.claude/rules/docs.md`, `vibe-docs/SKILL.md`) without touching your docs.

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
| `07_testing/` | Test plans, test cases, edge cases |
| `08_security/` | Auth flows, permissions, API keys |
| `09_integrations/` | Third-party services config & usage |
| `99_progress/` | Feature log, TODO, session handoff |

Each folder with multiple items has a `_summary.md` (compact table) + detail files.
Folders are created on-demand. No empty placeholders.

## Skills

Optional best-practice guides that Claude loads on demand:

| Skill | Triggers on |
|---|---|
| `vibe-docs` | Doc updates, feature changes, session end |
| `fastapi-best-practices` | FastAPI backends, REST APIs, Python web services |
| `react-page-oriented` | React/Next.js pages, component structure |

## After install

1. Edit `SISYO.md` — replace `[Project Name]` with yours
2. Open Claude Code and start building
3. Docs update automatically as you work

## Author

HoangThang - [hoang.jp](https://hoang.jp)

## License

MIT
