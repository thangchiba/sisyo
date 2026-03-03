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
`docs/MAP.md` is the routing table -- 1-line summary of every doc.

Session start -- read in order:
1. `docs/MAP.md` -- full project scope in ~30 lines
2. `docs/99_progress/handoff.md` -- last session context
3. `docs/99_progress/todo.md` -- active tasks
4. Load ONLY the specific docs needed for current task

During work -- vibe-docs skill auto-updates docs on code changes.
Every doc change MUST also update its summary line in MAP.md.

Before `/clear` -- always write `docs/99_progress/handoff.md` first.
