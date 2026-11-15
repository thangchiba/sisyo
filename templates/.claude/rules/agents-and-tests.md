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

## Deploys
- A deploy to dev or staging does not run the whole test gate: build, deploy, smoke check. A broken build still stops it.
- A deploy that reaches production runs the whole gate on the exact commit released, and deploys nothing if it fails. Where a push to `main` deploys production, that push is a production deploy.
- The PR's CI run, where a project has one, is the one whole run for a change before production.
- If a project's CI does not work this way yet, propose the change (a workflow change usually goes through the project's review rule); do not change it on your own.

## Why
Batches took hours: the whole gate ran in each agent, again in each integration pass, on the PR, on the push to `main` and in the dev deploy, the last ones at once on one shared runner host.
