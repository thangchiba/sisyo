# Agents, Tests and Deploys Rule

The owner's rules (2026-11-16) for every project. A project's `SISYO.md` may be stricter, never looser.

## Models
- Default: Opus (Opus 5.5 as of 2026-11) at effort `xhigh`, for the main session and for every agent it starts (`model: "opus"`, `effort: "xhigh"`).
- A model above Opus (Fable) only when the owner names it for a task, typically one about money or something important. Never switch on your own judgement.
- Small or single-area work is done in the main session. Agents are for work that splits into independent parts running in parallel.

## Writing code
1. Before writing code, read the related parts: the code that calls it and that it calls, the existing tests, the project's skills and docs for the area.
2. Write the test cases first, then the code.
3. Working alone: run the tests related to the change once, at the end (the tests of the packages changed, the browser or e2e checks of the pages changed). Not the whole suite.
4. Agents in parallel: each writes its tests and runs none. When all are done, one pass runs the tests of the combined work once, on the zone the batch touched (lint, typecheck, the touched packages' tests, the changed pages' checks), and fixes what fails.
5. Nobody runs the project's whole test gate locally "to be sure".

## Sessions and agents
- Do the work in the main session and manage it yourself. Start an agent only for a large part that is independent and truly runs in parallel, never for a short step (a lookup, a build or deploy with the project's existing scripts) that the main session would then sit waiting on.
- At most 4 agents run at the same time in one session. More parallel work waits for a free place or goes to another session.
- Keep each batch small: if its changes would make the test pass select most of the project's test groups, split the batch, so each pass runs only the groups that batch touched.
- A session is not the project's memory; the docs and git are. When a session has run long (about a day of work, a transcript over about 5 MB, tool calls that take minutes to answer, or a frozen tab), write the handoff, end the session, and continue in a new one that starts from the handoff.

## Deploys
- A deploy to dev or staging does not run the whole test gate: build, deploy, smoke check. A broken build still stops it.
- A deploy that reaches production runs the whole gate on the exact commit released, and deploys nothing if it fails. Where a push to `main` deploys production, that push is a production deploy.
- The PR's CI run, where a project has one, is the one whole run for a change before production.
- If a project's CI does not work this way yet, propose the change (a workflow change usually goes through the project's review rule); do not change it on your own.

## Why
Batches took hours: the whole gate ran in each agent, again in each integration pass, on the PR, on the push to `main` and in the dev deploy, the last ones at once on one shared runner host.

A long session slowed to a crawl (2026-11-16): one session carried its lead and up to ten agents for a day. Simple file reads and edits took one to three minutes each, while other sessions on the same PC took seconds. The lead waited 2 h 40 min on an agent writing a deploy runbook, and one batch of 811 changed files made the test pass select every group (3 h 30 min).
