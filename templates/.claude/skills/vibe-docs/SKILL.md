---
name: vibe-docs
description: "Auto-manage project documentation during vibe coding. Triggers on feature changes, DB schema, API endpoints, frontend pages, infra, testing, security, integrations, or any task completion. Also triggers on: project status, what is next, update docs, create a plan, log this. Core principle: read docs/MAP.md first, never load all docs at once."
---

# Vibe Docs

Keep project docs in sync with code -- automatically, without wasting tokens.

## Golden Rule: 3-Level Routing

Never load all docs at once. Use 3 levels to find what you need:

```
Level 1: MAP.md           (~500 tokens)  -- 1-line per folder, read ALWAYS
Level 2: folder/_summary.md (~200 tokens) -- compact table of all items in folder
Level 3: folder/[detail].md              -- full detail, load ONLY when needed
```

Most tasks only need Level 1 + Level 2. Load Level 3 only when actively modifying that specific item.

## Folder Structure

```
docs/
  MAP.md                    # Level 1: routing table -- read FIRST, always
  00_schedule/              # Roadmap, milestones, sprint plans
  01_requirements/          # Feature specs, user stories
    _summary.md             #   List of all features (compact table)
    auth.md                 #   Detail: auth feature spec
    posts.md                #   Detail: posts feature spec
  02_architecture/          # System design, tech stack, decisions
  03_database/              # Schema, ERD, migration log
    _summary.md             #   List of all tables + 1-line description
    users.md                #   Detail: users table columns, indexes, relations
    posts.md                #   Detail: posts table columns, indexes, relations
  04_api/                   # Endpoint specs grouped by module
    _summary.md             #   All endpoints in compact table (method, path, description)
    auth.md                 #   Detail: auth endpoints (grouped, not 1 per endpoint)
    posts.md                #   Detail: posts endpoints (grouped)
  05_frontend/              # Pages, components, routing map
  06_infra/                 # Deploy, Docker, CI/CD, env vars
  07_testing/               # Test plans, test cases, edge cases
  08_security/              # Auth flows, permissions, API keys
  09_integrations/          # Third-party services config & usage
  99_progress/              # TODO, changelog, session handoff
```

Folders and files are created on-demand. Never create empty folders or placeholder files.

## _summary.md Pattern

Every folder with multiple items MUST have a `_summary.md`. This is a compact table that lets the agent understand the folder WITHOUT loading detail files.

### Example: 03_database/_summary.md
```
# Database Tables
> Updated: 2025-03-03 | Tables: 4

| Table | Description | Key relations |
|-------|-------------|---------------|
| users | User accounts, auth, profile | -- |
| posts | Blog posts with draft/publish | -> users |
| comments | Post comments, nested | -> users, posts |
| categories | Post categories, hierarchical | -- |

Detail: `03_database/[table].md`
```

### Example: 04_api/_summary.md
```
# API Endpoints
> Updated: 2025-03-03 | Endpoints: 12

| Method | Path | Description | Auth |
|--------|------|-------------|:----:|
| POST | /auth/login | Email + password login | no |
| POST | /auth/register | Create new account | no |
| GET | /posts | List posts, paginated | no |
| POST | /posts | Create new post | yes |
| PUT | /posts/:id | Update post | yes |
| DELETE | /posts/:id | Delete post | yes |
| GET | /users/me | Get current user profile | yes |

Detail: `04_api/[module].md`
```

### Example: 05_frontend/_summary.md
```
# Frontend Pages
> Updated: 2025-03-03 | Pages: 6

| Route | Page | Components | Description |
|-------|------|------------|-------------|
| / | Home | PostList, Hero | Landing + recent posts |
| /login | Login | LoginForm | Auth page |
| /posts/:id | PostDetail | Post, Comments | Single post view |
| /dashboard | Dashboard | Stats, PostTable | User dashboard (auth) |

Detail: `05_frontend/[page-group].md`
```

Rules for _summary.md:
- One compact table, all items visible at a glance
- Max 1 line per item -- no detail here
- Group related items in the SAME row when possible
- Always link to detail files at the bottom
- Keep under 50 lines total

## MAP.md Format

MAP.md is Level 1 -- one line per doc/folder with keyword-rich summary:

```
# Project Map
> Updated: YYYY-MM-DD | Docs: N

## 00_schedule
- 00_schedule/roadmap.md -- MVP phase 1 by April, phase 2 by June (2025-03-03)

## 01_requirements
- 01_requirements/_summary.md -- 3 features: auth, posts, comments (2025-03-03)

## 03_database
- 03_database/_summary.md -- 4 tables: users, posts, comments, categories (2025-03-03)

## 04_api
- 04_api/_summary.md -- 12 endpoints: auth(2), posts(5), users(3), comments(2) (2025-03-03)
```

Rules for MAP.md entries:
- Max ~15 words per summary -- include key nouns and counts
- Always end with (YYYY-MM-DD) update date
- For folders with _summary.md, list the summary file (not every detail file)
- Group by folder number, skip empty sections
- Update total doc count in header

## Auto-trigger Matrix

| Action completed               | Update                          | Doc contains                                          | + MAP.md |
|--------------------------------|---------------------------------|-------------------------------------------------------|:--------:|
| Set timeline/milestone         | 00_schedule/roadmap.md          | Phases, milestones, deadlines, sprint goals            | yes      |
| Discussed/planned a feature    | 01_requirements/_summary.md + [name].md | _summary: feature list table. Detail: user stories, acceptance criteria, scope | yes |
| Made tech/architecture choice  | 02_architecture/decisions.md    | ADR format: context, options considered, decision, why | yes      |
| Designed DB tables/columns     | 03_database/_summary.md + [table].md | _summary: all tables + description. Detail: columns, types, indexes, relations | yes |
| Added/changed API endpoints    | 04_api/_summary.md + [module].md | _summary: all endpoints compact table. Detail: request/response, examples | yes |
| Built frontend pages/routes    | 05_frontend/_summary.md + [group].md | _summary: all routes + components. Detail: state, behavior, wireframe | yes |
| Changed deploy/infra/env       | 06_infra/[topic].md             | Docker, CI/CD, env vars, cloud services config         | yes      |
| Wrote/planned tests            | 07_testing/[module].md          | Test cases, edge cases, coverage notes, test commands  | yes      |
| Set up auth/permissions/keys   | 08_security/[topic].md          | Auth flow, roles, permissions, API keys, secrets mgmt  | yes      |
| Integrated third-party service | 09_integrations/[service].md    | Service config, API keys, SDK usage, webhooks, limits  | yes      |
| Completed any task             | 99_progress/todo.md             | Task status: doing, next, done with dates              | yes      |
| Ending session or /clear       | 99_progress/handoff.md          | Session summary, current state, next steps, decisions  | yes      |

IMPORTANT: Every doc create or update must also update _summary.md (if exists) AND MAP.md.

## Agent Reading Strategy

When working on a task:
1. Read MAP.md -- find relevant folder
2. Read _summary.md of that folder -- understand scope at a glance
3. ONLY if you need to modify or deeply understand a specific item → load its detail file
4. After changes → update detail file → update _summary.md → update MAP.md (bottom-up)

Do NOT load detail files just to "check" -- the summary table has enough info for most decisions.

## Doc Format Standard

Every doc starts with:
```
# [Title]
> Updated: YYYY-MM-DD | Status: draft/active/done
```

Formatting rules:
- Tables over prose for structured data
- Group related items in the same table (e.g. all auth endpoints in one table, not separate sections)
- Mermaid for diagrams
- Code blocks for configs, schemas, commands
- Keep each file under 200 lines -- split if longer
- Use relative links between docs

## Context Recovery Protocol

After /clear or starting new session -- 4 steps, ~2-3K tokens total:
1. Read docs/MAP.md -- understand full project scope
2. Read docs/99_progress/handoff.md -- what happened last session
3. Read docs/99_progress/todo.md -- what to do next
4. Read _summary.md of the relevant folder -- understand scope
5. Load ONLY the detail docs needed for current task

## Task Tracking

99_progress/todo.md format:
```
# TODO
> Updated: YYYY-MM-DD

## Doing
- [ ] Task description -- see 01_requirements/feature.md

## Next
- [ ] Task description

## Done
- [x] [2025-03-03] Task description
```

When user asks "what is next" -- read this file.
When task is done -- move to Done section with date.

## Session Handoff

Write 99_progress/handoff.md before /clear or end of session:
```
# Handoff
> Updated: YYYY-MM-DD HH:MM

## Done this session
- Completed X (files: path/a.ts, path/b.py)

## State
- Working: [what functions correctly]
- Broken: [known issues]
- In progress: [incomplete work]

## Next
1. Highest priority task
2. Second priority

## Decisions
- Chose X over Y: reason
```

## Project Init Protocol

When docs/ directory does not exist yet:
1. Create docs/MAP.md with section headers (no entries)
2. Create docs/99_progress/todo.md with initial tasks from conversation
3. Create docs/99_progress/handoff.md with initial state
4. Everything else is created on-demand when content exists
