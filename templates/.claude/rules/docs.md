# Doc Management Rule

3-level routing: MAP.md → _summary.md → detail files.

When changing code that affects project structure or behavior:
1. Read docs/MAP.md to find relevant folder
2. Read _summary.md of that folder (if exists)
3. Update detail file (or create if new)
4. Update _summary.md table
5. Update MAP.md summary line

When a feature is completed or added:
- Log it in docs/99_progress/features.md (date, name, status, link to spec)

Before ending session or when context gets large:
- Write docs/99_progress/handoff.md

At session start:
- Read docs/MAP.md then docs/99_progress/handoff.md
