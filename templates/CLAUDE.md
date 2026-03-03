# [Project Name]

## Stack
<!-- Replace with your actual tech stack -->
- Frontend: [e.g. React, Vue, Next.js]
- Backend: [e.g. Node.js, Python, Go]
- Database: [e.g. PostgreSQL, MongoDB]

## Structure
<!-- Replace with your actual project folders -->
- `src/` -- Source code
- `docs/` -- Project docs (auto-managed by vibe-docs skill)

## Commands
<!-- Replace with your actual commands -->
- `npm run dev` -- Start dev server
- `npm test` -- Run tests

## Code Rules
<!-- Add your team's coding conventions -->
- [e.g. Use TypeScript strict mode]
- [e.g. Write tests for new features]

## Docs System
3-level routing: `MAP.md` → `_summary.md` → detail files.

Session start -- read in order:
1. `docs/MAP.md` -- full project scope (~500 tokens)
2. `docs/99_progress/handoff.md` -- last session context
3. `docs/99_progress/todo.md` -- active tasks
4. Read `_summary.md` of relevant folder -- scope at a glance
5. Load ONLY the detail docs needed for current task

During work -- vibe-docs skill auto-updates docs on code changes.
Every change updates bottom-up: detail → `_summary.md` → MAP.md.

Before `/clear` -- always write `docs/99_progress/handoff.md` first.
