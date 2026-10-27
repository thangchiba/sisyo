# Gamification

The game layer as reusable UX patterns, the honesty rules that keep it from turning into a dark pattern, and the data
contract the UI expects from a backend. The UI only **displays** game state; every number is decided by the server.
The components that draw these patterns are described in `COMPONENTS.md`.

## 1. The loop

```
action (answer, finish, save, claim)
  → server grants XP, returns a Reward
    → burst flies from the control to the HUD        (the moment)
      → HUD numbers update, path / quest advance     (the state)
        → next step is highlighted                   (the pull)
```

Each element answers one question for the user:

| Element | Question | Where |
|---|---|---|
| XP + level | "Am I getting anywhere overall?" | HUD: level hexagon + XP bar |
| Daily goal | "Have I done enough today?" | HUD ring; centre dial of the bottom bar |
| Streak | "Am I consistent?" | HUD pill |
| Daily path | "What do I do next?" | Home hero card |
| Quests | "What else could I do today?" | Home side column |
| Achievements | "What have I collected over months?" | Home / profile grid |

If a product cannot answer one of these questions honestly (for example there is no meaningful daily unit), leave that
element out. A streak in an app people use twice a month is noise.

## 2. XP

- XP is granted for **completed, meaningful actions**, by the server, in small integers (LenS: 5 for a
  correct answer, 1 for a wrong one, 2 per answered question up to 10 for finishing a session, 30 for the daily
  chest, 10-20 for a quest).
- **Every repeatable source has a bound**: a per-session maximum and a number of paid repetitions per local day
  (LenS pays 5 session-completion bonuses a day; later sessions still work but earn 0). Without bounds a loop
  of tiny sessions farms XP, levels and count-based achievements, and the numbers stop meaning anything.
- **Every grant is idempotent.** A grant has a `(source, source_id)` key that is unique per user (examples:
  `quiz_complete` + session id; `quest` + `<local date>:<quest id>`; `chest` + local date; `word_added` + the
  normalised word). Repeating the request returns a Reward with `xp_earned: 0, duplicate: true` and the current
  totals. The UI can therefore retry and double-tap safely, and must treat `duplicate` as "nothing to celebrate".
- Wrong or failed attempts may earn a token amount (1 XP) so that effort is acknowledged, but never as much as
  success.

## 3. Levels

- Thresholds are cumulative XP: `0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 17000, 25000`, then a fixed
  step (10 000) per level, so levels never end and the bar never sticks at a cap.
- The API sends `level`, `total_xp`, `level_floor`, `next_level_xp`. The XP bar gets
  `current = max(0, total_xp - level_floor)` and `span = max(1, next_level_xp - level_floor)` and shows
  `current / span`. **Do not** compute `total_xp / next_level_xp`: thresholds are cumulative, so that bar starts each
  level half full and is wrong.
- The client never holds the level table (only a dev gallery may, to simulate). One source of truth avoids a HUD that
  disagrees with the server after a rule change.
- A level-up is the top of the intensity ladder (§8): a modal, once, with what was unlocked if anything.

## 4. Streak

Three states, decided by the server from the user's **local** day:

| State | Meaning | HUD | Copy |
|---|---|---|---|
| `done` | Active today | Ember ring + glow, flame glows | "You were active today. See you tomorrow!" |
| `at_risk` | Last active yesterday, nothing yet today | Amber ring, flame floats 3 times | "Earn any XP today to keep your streak alive." |
| `zero` | Lapsed or never started | Grey, flame mono | "Earn any XP today to start a new streak." |

- The first XP of a local day extends the streak (`Reward.streak_extended`).
- **Read-decay**: a lapsed streak reads as `0 / zero` immediately, before the next activity; the stored counter is
  only reset on the next grant. The user never sees a streak that is already lost.
- The "local day" comes from a time zone stored in the user's settings (UTC when unset), not from the request's
  clock. A user who travels west must not lose a day: a last-active day in the future counts as today.
- `at_risk` is information, not alarm: amber, a short finite animation, no countdown timer, no push of guilt.
  A lapsed streak is shown plainly; the longest streak stays visible ("best 21") so past effort is not erased.

## 5. Daily goal

- Ratio = `min(1, today.xp / today.goal)`; a goal of 0 counts as reached (ratio 1). The goal is a **user setting**.
- Shown as a 34 px ring in the HUD with the percentage inside; at 100 % the ring's own check pops in.
- The same ring is the centre "dial" of the mobile bottom bar (LAYOUT-NAV.md): the thing the user came to do is the
  biggest, most central control, and it shows how much of today is done.
- Reaching the goal (`Reward.goal_reached_now`) is a medium moment: toast-level, not a modal.

## 6. Daily path and chest

A short fixed sequence of today's activities (LenS: Review → Quiz → Read → Speak) ending in a chest.

- Each step has a goal measured from today's counts; the server returns per step
  `{ id, label, state: done | in_progress | current | todo, progress 0..1, to }`.
- Done steps stay done. The **first** open step is `current` (or `in_progress` once it has partial progress); later
  open steps are `todo`, which the UI shows as **locked** with the hint "Finish <current> to unlock". The lock is a
  focus device: only one thing is asked at a time. (Whether locked steps are really unreachable is a product choice;
  in LenS the pages stay reachable from the navigation, the path only recommends an order.)
- The chest is `locked` until every step is done, then `ready`, then `claimed`; one per local day, a fixed amount
  shown in advance (`+30 XP`). Claiming is an explicit tap on a CTA that replaces "Continue": the user opens it.
- Hero card copy follows the state: "Start today's path" → "2 of 4 steps done · Next up: ..." → "Path complete!
  Open your chest to collect +30 XP" → "Every step is done. A new path unlocks tomorrow."
- After the claim the chest button disappears; if it was activated from the keyboard, move focus to the card heading
  (`tabIndex={-1}`) so focus does not fall to `<body>`.

## 7. Quests and achievements

**Quests** (daily, 3 per day): one constant ("Earn {daily goal} XP") plus two drawn from a pool by a hash of the
date, so they are the same for everyone that day and stable across servers, never two with the same metric.

- `{ id, title, icon, tone, progress, goal, reward_xp, state: active | complete | claimed }`; `progress` is capped at
  `goal`.
- A complete quest must be **claimed** by the user (gold Claim keycap). The claim is the reward moment; granting
  silently on completion wastes it.
- Claim errors: 404 (not one of today's quests: the day rolled over) and 409 (not complete) mean the client's view is
  stale. Do not show an error toast for these; refetch and show the server's view.
- Optimistic step: mark the quest `claimed` in the cache as soon as the claim succeeds; the refetch confirms it.

**Achievements** (long-term): a fixed catalog `{ key, name, description, tier, icon }` plus per user
`{ earned_at, progress 0..1 }`.

- Tiers map to effort: first steps bronze; hundreds / a week silver; many hundreds / a month gold; extremes rare.
- Progress for "reach level N" is measured in XP, so the ring moves with every grant.
- Newly earned ones arrive in `Reward.new_achievements` and are toasted; the grid shows a NEW ribbon once.
- Locked achievements show their name and goal. Use `secret` sparingly, for surprises, not to hide requirements.

## 8. Reward moments: the intensity ladder

| Level | Trigger | What plays | Blocks input? |
|---|---|---|---|
| 0 | Any XP < 50 | Burst dots + `+N XP` chip flies to the XP bar, bar pulses; screen-reader announcement only | No |
| 1 | XP >= 50, achievement, goal reached | The same + a toast (2.5 s) | No |
| 2 | Quest complete (waiting for claim) | Card turns gold, Claim button pulses, sheen loops | No |
| 3 | Chest ready | Node pops in with a gold burst; hero CTA becomes "Open chest" | No |
| 4 | Level up | Modal after the chip lands: rays, badge opens, Continue | Yes, dismissible at once (Esc, scrim, Continue) |

Rules:

- **Match intensity to rarity.** If every answer opened a modal, the level-up would mean nothing and the user would
  be interrupted hundreds of times a day.
- **Merge.** Gains within 400 ms become one burst with the sum. Several grants from one action must not stack three
  animations.
- **The reward lands on the HUD.** The chip flies to the XP bar and the bar updates when it arrives: the user sees
  where the number went. Updating the HUD first and animating afterwards breaks the cause-and-effect.
- **Start from where the user acted.** Pass the pressed control as the anchor, or better its centre point, measured
  **at press time**: the reward arrives after the request, when the control may have re-rendered or gone (a Claim
  button becomes "Claimed").
- **Never block for more than 700 ms**, never require watching. Level 4 is the only modal and closes on the first key.
- Reduced motion: the chip fades in place, numbers change instantly, colour and text feedback stay.

## 9. Honesty rules

1. **No fake scarcity.** No invented countdowns, no "only 2 left", no rewards that expire to create pressure. The
   only real deadline is the end of the local day, and it is stated plainly.
2. **No loss framing beyond the facts.** "Earn any XP today to keep your streak" is a fact. "You are about to lose
   everything" is not acceptable copy.
3. **Rewards are shown before they are earned** (`+30 XP` on the chest, `+20 XP` on the quest) and paid exactly.
   No random amounts presented as fixed, no bait.
4. **The server is the only authority.** The client never adds XP locally except as a short optimistic patch that
   a refetch then replaces. A client-side counter that drifts from the server is a bug the user will notice.
5. **Idempotent grants** (§2), so a retry or a double tap can never pay twice or show a second celebration.
6. **Farming is closed** by per-session and per-day bounds, not by hiding the activity. A capped action still works,
   it just earns nothing more today, and the UI can say so.
7. **Nothing is gated behind the game.** Locks in the path order the day; they do not withhold features the user
   has. XP buys no advantage that can also be bought with money.
8. **Opt-out friendly.** The HUD is compact; celebrations are skippable; reduced motion is respected. A user who
   ignores the game still gets a usable product.

## 10. Data contract

### HUD read model: `GET /gamification/hud`

One request returns everything the shell and the home page show.

| Field | Type | Meaning |
|---|---|---|
| `level` | integer | Current level |
| `total_xp` | integer | Lifetime XP |
| `level_floor` | integer | Cumulative XP where this level started |
| `next_level_xp` | integer | Cumulative XP where the next level starts |
| `streak.current` | integer | Days in the streak (0 when lapsed: read-decay, §4) |
| `streak.longest` | integer | Best streak ever |
| `streak.state` | `done` \| `at_risk` \| `zero` | §4 |
| `today.date` | `YYYY-MM-DD` | The user's local day |
| `today.xp` | integer | XP earned today |
| `today.goal` | integer | The user's daily goal |
| `today.<counts>` | integers | Product-specific counts of today (LenS: quizzes, readings, speaking seconds, dictations, words reviewed, words added) |
| `path[]` | list | Today's steps, in order |
| `path[].id` | string | Stable step id |
| `path[].label` | string | Short label under the node |
| `path[].state` | `done` \| `in_progress` \| `current` \| `todo` | `todo` is drawn as locked |
| `path[].progress` | 0..1 | Ring around an in-progress node |
| `path[].to` | string | Route of the step |
| `quests[]` | list | Today's quests |
| `quests[].id`, `.title` | string | |
| `quests[].icon`, `.tone` | string | Names from the icon registry and the tone list |
| `quests[].progress`, `.goal` | integer | `progress` is capped at `goal` |
| `quests[].reward_xp` | integer | Shown before it is earned |
| `quests[].state` | `active` \| `complete` \| `claimed` | |
| `chest.state` | `locked` \| `ready` \| `claimed` | |
| `chest.xp` | integer | The chest's fixed reward |

- One read model, not five endpoints: the top bar, its panel, the bottom bar's dial and the home page share one
  cached query (stale time about 30 s) and can never disagree.
- `icon` and `tone` come from the server as names. Map unknown names to a fallback on the client; a server deploy
  must not be able to crash the page.
- The server computes "today" and every state. The client does no date arithmetic.
- Mapping to the components: the API's `at_risk` is the pill's `at-risk`; a path step's `todo` is the node's
  `locked`, `in_progress` is `in-progress`; the chest becomes the last node of the path with state `chest` (the node
  shows "ready" when every earlier step is done).

### Reward: returned by every response that grants XP

| Field | Type | Meaning |
|---|---|---|
| `xp_earned` | integer | The delta; 0 for a repeat |
| `total_xp`, `level`, `level_floor`, `next_level_xp` | integers | The **new totals**, same meaning as in the HUD |
| `leveled_up` | boolean | This grant crossed a level threshold |
| `streak` | integer | The streak after this grant |
| `streak_extended` | boolean | First activity of the local day |
| `new_achievements[]` | `{ key, name, description, tier, icon }` | Earned by this grant |
| `daily_xp`, `daily_goal` | integers | Today's XP after this grant, and the goal |
| `goal_reached_now` | boolean | This grant crossed the daily goal |
| `duplicate` | boolean | This grant was already paid (§2) |

A Reward carries the new totals, not only the delta, so the client can patch the HUD without arithmetic.

Other endpoints in LenS: `POST /gamification/quests/{id}/claim` and `POST /gamification/chest/claim` (both return a
Reward; the chest answers 409 until every step is done), `GET /gamification/achievements/catalog` (each catalog item
plus `earned_at` and `progress` 0..1), `GET /gamification/activity?days=N` (per-day rows for a heatmap, 1 to 120
days; days without activity have no row).

### Client wiring

One function, "play a reward", is called from the success handler of every mutation that can grant XP, with the
Reward and the anchor captured at press time:

1. The reward is missing or `duplicate`: invalidate the game queries and stop. Nothing to celebrate.
2. If `xp_earned > 0`, or it levelled up, or it brought achievements: call the reward system
   (`rewardXp({ xp: xp_earned, anchor, levelUp: leveled_up ? { level } : undefined, achievements })`,
   COMPONENTS.md).
3. After **1100 ms** when XP was earned (the 400 ms merge window + the 700 ms flight; otherwise at once): write the
   new totals into the cached HUD and invalidate every game query. The bar fills at the moment the chip visibly
   arrives; the refetch then replaces the optimistic values.
4. The optimistic patch copies `level`, `total_xp`, `level_floor`, `next_level_xp`; sets the streak to
   `{ current: reward.streak, longest: max(old longest, reward.streak), state: 'done' }`; sets `today.xp` and
   `today.goal` from `daily_xp` / `daily_goal`. It **never moves totals backwards**: when
   `reward.total_xp < hud.total_xp` the HUD is kept as it is, because two rewards can land out of order.
5. All game queries share a key prefix, so one invalidation refreshes the HUD, path, quests, chest and badges.
6. A write that earns XP **without** returning a Reward (a side effect of another API) emits a small "HUD is stale"
   signal that the shell subscribes to and answers with the same invalidation. Prefer returning a Reward.
