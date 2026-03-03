---
name: vibe-docs
description: "Auto-manage project documentation during vibe coding. Triggers on feature changes, DB schema, API endpoints, frontend pages, infra, testing, security, integrations, or any task completion. Also triggers on: project status, what is next, update docs, create a plan, log this. Core principle: read docs/MAP.md first, never load all docs at once."
---

# Vibe Docs

Keep project docs in sync with code -- automatically, without wasting tokens.

## Golden Rule: MAP.md First

`docs/MAP.md` is the routing table -- a 1-line summary of every doc in the project.
ALWAYS read MAP.md before loading any other doc file.
Only load the specific doc you actually need for the current task.

Why: 30 docs as MAP.md lines = ~500 tokens. Loading all 30 files = ~20K tokens.

## Folder Structure

```
docs/
  MAP.md                # ROUTING TABLE -- read FIRST, always
  00_schedule/          # Roadmap, milestones, sprint plans
  01_requirements/      # Feature specs, user stories
  02_architecture/      # System design, tech stack, decisions
  03_database/          # Schema, ERD, migration log
  04_api/               # Endpoint specs grouped by module
  05_frontend/          # Pages, components, routing map
  06_infra/             # Deploy, Docker, CI/CD, env vars
  07_testing/           # Test plans, test cases, edge cases
  08_security/          # Auth flows, permissions, API keys
  09_integrations/      # Third-party services config & usage
  99_progress/          # TODO, changelog, session handoff
```

Folders are created on-demand. Never create empty folders or placeholder files.

## MAP.md Format

Every doc = exactly 1 line with keyword-rich summary + date:

```
# Project Map
> Updated: YYYY-MM-DD | Docs: N

## 00_schedule
- 00_schedule/roadmap.md -- MVP phase 1 by April, phase 2 by June (2025-03-03)

## 01_requirements
- 01_requirements/auth.md -- Email login, JWT tokens, password reset flow (2025-03-03)
- 01_requirements/posts.md -- Blog CRUD: create, edit, publish, draft (2025-03-02)

## 03_database
- 03_database/schema.md -- Tables: users, posts, comments, categories (2025-03-03)
```

Rules for MAP.md entries:
- Max ~15 words per summary -- include key nouns for scanning
- Always end with (YYYY-MM-DD) update date
- Group by folder number, skip empty sections
- Update total doc count in header

## Auto-trigger Matrix

| Action completed               | Create/update                   | Doc contains                                          | + MAP.md |
|--------------------------------|---------------------------------|-------------------------------------------------------|:--------:|
| Set timeline/milestone         | 00_schedule/roadmap.md          | Phases, milestones, deadlines, sprint goals            | yes      |
| Discussed/planned a feature    | 01_requirements/[name].md       | User stories, acceptance criteria, scope, constraints  | yes      |
| Made tech/architecture choice  | 02_architecture/decisions.md    | ADR format: context, options considered, decision, why | yes      |
| Designed DB tables/columns     | 03_database/schema.md           | Table definitions, relationships, indexes, migrations  | yes      |
| Added/changed API endpoints    | 04_api/[module].md              | Method, path, request/response, auth, status codes     | yes      |
| Built frontend pages/routes    | 05_frontend/pages.md            | Routes, components, state management, UI behavior      | yes      |
| Changed deploy/infra/env       | 06_infra/[topic].md             | Docker, CI/CD, env vars, cloud services config         | yes      |
| Wrote/planned tests            | 07_testing/[module].md          | Test cases, edge cases, coverage notes, test commands  | yes      |
| Set up auth/permissions/keys   | 08_security/[topic].md          | Auth flow, roles, permissions, API keys, secrets mgmt  | yes      |
| Integrated third-party service | 09_integrations/[service].md    | Service config, API keys, SDK usage, webhooks, limits  | yes      |
| Completed any task             | 99_progress/todo.md             | Task status: doing, next, done with dates              | yes      |
| Ending session or /clear       | 99_progress/handoff.md          | Session summary, current state, next steps, decisions  | yes      |

IMPORTANT: Every doc create or update must also update its line in MAP.md.

## Doc Format Standard

Every doc starts with:
```
# [Title]
> Updated: YYYY-MM-DD | Status: draft/active/done
```

Formatting rules:
- Tables over prose for structured data
- Mermaid for all diagrams
- Code blocks for configs, schemas, commands
- Keep each file under 200 lines -- split if longer
- Use relative links between docs

## Context Recovery Protocol

After /clear or starting new session -- 4 steps, ~2-3K tokens total:
1. Read docs/MAP.md -- understand full project scope
2. Read docs/99_progress/handoff.md -- what happened last session
3. Read docs/99_progress/todo.md -- what to do next
4. Load ONLY the docs relevant to the current task (find via MAP.md)

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
