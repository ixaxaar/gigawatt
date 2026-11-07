# Status after v0.5.0

Every item below was worked in the order the list suggests. "Done" means shipped with a test or a measurement; "Partial" says what is missing.

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Hardware pays for itself | Done | Inference is priced off GPU-hour economics (bounded by real API prices); payback bands pinned in `src/economy.balance.test.ts`: 10-32 months in 2023-25, 30-48 later. A competent scripted operator ends at $100M-$600M from $50M, not the $300M median the list hoped for. |
| 2 | Doing nothing is safe | Done | Investor board: yearly revenue reviews from year two, three strikes and you are fired (Learner exempt). Idle play is fired by month 60 and scores under a quarter of the operator. |
| 3 | Spot is a zero-skill strategy | Done | Spot saturates (finite depth) and discounts older generations; spot-only play does not beat doing nothing. |
| 4 | Revenue cliff with no warning | Partial | Fixed the cause (Easy Path never ordered missing plant), added a one-time build extension, a "revenue ends within 3 months" warning and a board-strike warning. Not built: emergency refinancing, renewal offers before expiry. |
| 5 | Inference uses a sliver of the cluster | Partial | Prices and sizes recalibrated; idle GPUs surface in the Needs card and a `fleet` query. Per-cluster load % is not yet drawn on the Supercomputer screen. |
| 6 | Staffing has no teeth | Partial | Understaffing now costs availability on every contract and shows in the Needs card. No dedicated "50% short earns 15% less" test yet. |
| 7 | Alternate scenarios | Done | Lean start works for competent play ($7M to over $100M). Gold rush gets a demand surge; scripted players still gain little there. |
| 8 | Easy Path stalls silently | Done | It orders missing power and cooling itself, alerts within a month with the blocker named, gives up after 10 months instead of 16. |
| 9 | Prices go the wrong way | Done | The top-of-generation anchor no longer climbs through 2027; spot prices fall with each generation (tested). |
| 10 | Ratings and scoring | Done | Bands moved to 60M / 100M / 250M / 600M; fired and bankrupt runs are penalised in the score. |
| 11 | HUD clutter | Done | Four controls: mode, speed, Next month, Menu. Everything else is in the menu. |
| 12 | Overview wall of text | Done | "Needs you now" card first, collapsible sections with counts. |
| 13 | Hall view | Partial | Short labels, idle/spot/burn-in/down states, amber plate on idle racks. Camera auto-framing not done. |
| 14 | Contract cards hide the money | Done | Monthly revenue, total and profit after power lead each card, offers sorted by profit, tested against what the engine bills. |
| 15 | Dead air in the first two years | Done | Median 10 months to $250k/month for a competent operator (tested). |
| 16 | Too much catalog too early | Done | The dock unlocks progressively in Learner and Operator modes. |
| 17 | No story | Done | Named board, eight chapter cards, 14 two-way decisions, three rivals with voices, 19 customers with voices, incident lessons moved to a Codex handbook. |
| 18 | Anticlimactic ending | Done | Six endings; end screen with charts, best deal, worst incident, rival comparison and a copyable summary. |
| 19 | Unlistened music | Partial | Higher bitrate, tail fades, loudness measured (`tools/audio/LISTENING.md`). A human listening pass and layered adaptive stems are not done. |
| 20 | Confused sound identity | Done | Chiptune dropped, six tracks, copy corrected. |
| 21 | Fixed hum | Done | Hum level and brightness follow the hall, liquid cooling adds pumps, power-down dips it (tested). |
| 22 | Playtest report misreports GPUs | Done | Installed vs clustered GPUs and utilisation columns. |
| 23 | Personas cover half the game | Done | New planner (power contracts, frameworks, lifecycle) and builder personas; every persona plays every scenario; anomaly rules for cliffs, idle capacity and understaffing. |

The original critique follows unchanged.

---

# GIGAWATT critique and fix list (v0.4.0)

Harsh review, written to be handed to an implementer. Every item has: **problem**, **evidence**, **fix**, **done when**.
Evidence comes from `PLAYTEST=1 ./node_modules/.bin/vitest run src/playtest` (re-run 2026-11-07 on v0.4.0, numbers unchanged from `docs/playtest/report.md`), the screenshots in `docs/screenshots/`, and the source.

## Ground rules for the implementer

- Work top to bottom; P0 first. One commit per item (or tight group), message names the item number.
- The engine is deterministic. Golden tests (`src/__golden__`, `*.golden.test.ts`) WILL change with balance work: regenerate them deliberately, and say so in the commit.
- After every P0 change, re-run the playtest sweep and paste the new summary table into the commit message.
- Verify each step: `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/vitest run`, `PLAYTEST=1 ./node_modules/.bin/vitest run src/playtest`, `godot --headless --path godot` with `GW_SMOKE=1` (prints SMOKE OK), `godot --headless --path godot -s tests/audio_test.gd` (prints AUDIO OK).
- Lock the balance targets from P0 into `src/balance.test.ts` so they cannot silently regress.
- README and site: describe the current game only, no history phrasing. Add a CHANGELOG entry under `## [Unreleased]`.

---

## P0: the economy doesn't work as a game

The core promise is "build AI datacenters and get rich in the GPU boom". Right now a perfect operator barely doubles their money in eight years, doing nothing costs almost nothing, and the most aggressive player goes bankrupt.

### 1. Hardware doesn't pay for itself
- **Problem:** A well-run hall loses money. Buying GPUs is a bad investment in a game about the GPU gold rush.
- **Evidence:** `docs/screenshots/hall.png`, Dec 2024: 888 GPUs clustered, capex $64.9M, revenue $306.8k/mo, burn $308.7k/mo, **net -$1.20M/mo after depreciation**. Payback is roughly 17 years. The best scripted operator (seed 21) goes $50M → $117M over 96 months. Real GPU clouds paid back in about 2 years in 2023-24.
- **Fix:** Re-tune revenue against capex so a well-utilised current-gen cluster pays back in **18-30 months** during 2023-2025, and in 30-40 months off-boom (2021, 2027-28). Levers: `src/sim/market.ts` (`GPU_HOUR_ANCHOR`, `MTOK_DECAY`, `ERA_TOKENS_PER_SEC`, customer `tokenMult`/`priceMult`), contract sizes, depreciation schedule (`src/sim/lifecycle.ts`). Add a pure helper `paybackMonths(template, year)` and test it.
- **Done when:** operator persona median net worth is **≥ $300M** on classic seeds 21-23. A test asserts payback is within the bands above for the flagship template of each era.

### 2. Doing nothing is safe
- **Problem:** An idle player ends the game with almost all of their starting money. There is no pressure to act.
- **Evidence:** idle persona: $50M → **$47.3M** after 108 months, with zero actions.
- **Fix:** Add pressure that punishes hoarding. Recommended: an investor board (ties into item 17) that sets yearly milestones (MW online, revenue run-rate) and cuts the cash/credit line or replaces the CEO (game over) after two missed years. Alternatives: cash drag such as committed lease/land costs or a fund-return hurdle. Learner mode is exempt.
- **Done when:** idle persona finishes **≤ $25M** or is fired. The score is under 25% of the operator median.

### 3. Spot market is a zero-skill strategy
- **Problem:** Buying one rack template at a time and putting everything on spot nearly matches a contract operator.
- **Evidence:** spotter persona (`src/playtest/personas.ts:63`: buy 1 template when cash > $10M, set every rack to spot) ends at **$61-69M with 0 contracts**. Operator: $88-117M. Cautious (mostly spot): $49-75M.
- **Fix:** Spot pays a discount to contracts and its fill rate depends on market supply (rivals plus the player's spot share: price falls as your share rises). Spot should be filler for idle capacity, not a business plan.
- **Done when:** operator median is **≥ 2.5×** the spotter median. Spotter is still ≥ idle, so spot isn't useless.

### 4. Aggressive play is a death sentence, with a revenue cliff and no warning
- **Problem:** The tycoon persona goes bankrupt on 2 of 3 seeds, even while winning lots of contracts.
- **Evidence:** tycoon seed 22 finished 32 contracts and reached reputation 100, then revenue went from **$1.14M to $0.00** between months 47 and 53 with 792 GPUs online, and the company went bankrupt at month 56. Seed 21 went bankrupt at month 64. Seed 23 survived on $8.8M.
- **Fix:** Find out why revenue hit zero: all contracts expiring together, renewals not offered, or clusters unassigned after renewal. Write a failing test from seed 22 first. Then add: a renewal pipeline that offers renewals 2 months before expiry; a HUD warning when more than 50% of revenue expires within 3 months; refinancing or emergency credit that is expensive but survivable.
- **Done when:** tycoon median net worth is **≥ operator median** with a higher spread, and at most 1 of 3 seeds goes bankrupt. A regression test covers the seed-22 cliff.

### 5. Inference deals use a sliver of the cluster
- **Problem:** Inference offers are tiny compared with what the cluster can serve. The spare capacity earns nothing.
- **Evidence:** `docs/screenshots/customers.png`: Peregrine needs 14k tok/s and the cluster has 107k (13% used). VectorForge needs 30k against 694k (4% used).
- **Fix:** (a) Confirm and make obvious in the UI that several inference contracts can share one cluster up to its capacity (`src/engine/actions/contracts.ts:103-117` already checks shared capacity; the Customers screen doesn't show it). (b) Show **utilisation %** per cluster on the Supercomputer screen, the rack inspector and the Overview. (c) Scale inference demand so a typical offer fills 25-60% of a matching cluster.
- **Done when:** the Overview shows fleet utilisation. An operator persona that fills clusters with inference reaches ≥ 70% average utilisation in 2024-2026.

### 6. Staffing has no teeth
- **Problem:** Running far under the required staff has no visible effect.
- **Evidence:** operator seed 21 ran **56 racks with 2 staff** all game (`staffNeeded` in `src/sim/staffing.ts` says it needs at least 6). It still finished best.
- **Fix:** Make the shortfall hurt: failure rates and repair times should visibly worsen, and SLA misses should go up. Show a red HUD alert ("Understaffed: 2/6") with a one-click Hire.
- **Done when:** a test shows a 50% understaffed fleet earns at least 15% less over 12 months than a fully staffed one. The HUD alert appears in the smoke run when understaffed.

### 7. Two of the three alternate scenarios don't work
- **Problem:** Neither the lean nor the gold-rush scenario gives the player a meaningful game.
- **Evidence:**
  - **lean** ($8M): operator and cautious take **zero actions** and end at $5.3M. Either nothing is affordable or the first move is unclear.
  - **gold-rush-2025** ($250M): the tycoon does nothing and ends at $246M. The harness logs "sitting on >$80M for 18 months with nothing to spend it on".
- **Fix:**
  - Lean: guarantee an affordable starter deal (small inference contract plus a 1-rack template under ~$5M), and make the personas find it.
  - Gold rush: allocation caps should create meaningful ways to spend (pre-orders, new halls, PPAs), and the personas should exercise them.
- **Done when:** in both scenarios the operator persona signs contracts and ends **above its starting cash**.

### 8. Easy Path silently stalls for over a year
- **Problem:** The assisted build path can hang for many months, then quietly hands the work back to the player.
- **Evidence:** `docs/screenshots/hall.png`: "Gave up after 16 months stuck: the parts are in your warehouse; finish the build by hand."
- **Fix:** Detect a stall within 1 month. Name the exact blocker (missing part X, no floor space, no power headroom, cluster busy) and offer a one-click fix button.
- **Done when:** a test that forces each blocker type gets a specific message within one tick. No project can be stuck for more than 2 months without a player-facing alert.

### 9. Rental prices go the wrong way, which undercuts the realism pitch
- **Problem:** In-game GPU rental prices keep rising after 2024. Real-world prices fell.
- **Evidence:** `GPU_HOUR_ANCHOR` (`src/sim/market.ts:63`) climbs to **$5.6/hr in 2027**. Real H100 rental fell from ~$8 to ~$2 by 2025; new generations launch high and then decay.
- **Fix:** Price each generation separately: launch premium, then decay as the next generation ships. Older cards earn less. That rewards refresh timing, which makes the lifecycle table matter. Do this together with item 1.
- **Done when:** a test shows an A100's $/hr falls each year after H100 ships, and so on for each generation.

### 10. Recalibrate scoring and ratings after the rebalance
- Ratings (`src/sim/systems/endgame.ts:11`) and score weights were set for the current, broken economy. After items 1-4, set the bands from the new persona spread: idle → Struggling, spotter → Steady, operator → Solid/Hyperscale, best tycoon → Tycoon.
- **Done when:** each persona lands in its intended band on all three classic seeds.

---

## P1: playability and UX

### 11. HUD clutter, and a blank button
- **Problem:** The top-right of the HUD is crowded, and one button has no label.
- **Evidence:** both screenshots show an **empty, unlabelled button** left of "How to play". The top-right also has 4 speed buttons, NEXT MONTH, MENU and QUIT, which is 10 controls.
- **Fix:** Remove or label the empty button (find it in `godot/main.gd` HUD construction). Merge pause and the speeds into one cycle button (Space still advances a month). Move Sound and Save into MENU.
- **Done when:** the top bar has 6 or fewer controls and every button has a label or tooltip.

### 12. The Overview panel is a wall of equal-weight text
- **Problem:** The Overview gives every item the same weight, so nothing tells the player what to do next.
- **Evidence:** the Overview side panel stacks Next Month, Easy-Path, Missions 0/27, Customers and Log, all in small grey type.
- **Fix:** Put a single **"Needs you now"** card at the top: the one most important action, with a button. Collapse the other sections by default and show counts only. Show 3 missions at most, never "0/27".
- **Done when:** on a fresh game the first thing on the panel is one actionable card.

### 13. The hall view is hard to read
- **Problem:** The main 3D view doesn't tell the player much at a glance.
- **Evidence:** in `hall.png` the rack labels are vertical and truncated ("clustered, id..."), the black monoliths on the left wall read as empty boxes, idle and unassigned racks look the same as earning ones, and large areas of floor are empty.
- **Fix:**
  - Use horizontal labels in top view, with short codes (e.g. "A100×8 · Glyph").
  - Give idle racks a pulsing amber state and a money-losing tint.
  - Label the wall equipment on hover.
  - Frame the camera to the occupied area.
- **Done when:** you can tell from a screenshot which racks earn money and which are idle.

### 14. Contract cards hide the money
- **Problem:** The cards show the technical terms but not what the deal pays.
- **Evidence:** the cards show tok/s, $/Mtok, SLA and TTFT, but **no $/month, total value or margin after power**. The player can't compare offers.
- **Fix:** The first line of each card is "+$X/mo · $Y total · ~$Z/mo profit after power". Put the technical checks in a collapsible section. Sort offers by profit by default.
- **Done when:** every offer card shows monthly revenue and estimated profit, and the numbers match what the engine pays (add a test).

### 15. The first two years are dead air
- **Problem:** Early on there is nothing to do but click Next Month.
- **Evidence:** operator timeline, months 17-29: 48 GPUs, revenue $10-30k/mo, nothing to do. Timelines start sampling at month 17 because the first year and a half is mostly waiting on lead times.
- **Fix:** Pick one: start the campaign in mid-2022, compress 2020-22 into a 6-month prologue, or give early lead times a "rush" option at a premium. Target: **first meaningful revenue (≥ $250k/mo) within 15 minutes of real play**.
- **Done when:** the operator persona reaches $250k/mo revenue within the first 12 in-game months.

### 16. Too much catalog, too early
- **Problem:** The player meets the full catalog before they know what they need.
- **Evidence:** 690+ parts from 100+ vendors, 8 drawers and 27 missions are all reachable from minute one.
- **Fix:** Progressive disclosure. Start with Overview, Customers and Supply (templates only). Unlock Design Lab, Supercomputer hand-tuning and the parts bin through the Learning path or after the first contract. Tycoon mode unlocks everything.
- **Done when:** a fresh Learner/Operator game shows at most 4 drawers, and unlocks are announced with a card.

---

## P1: story

### 17. There is no story
- **Problem:** The game has no characters, no stakes and no arc. The "narrative" is a log.
- **Evidence:**
  - Narrative text is 3 dated era events (`src/sim/eraEvents.ts`) plus about 6 random incidents (`src/sim/events.ts`). Every one ends with "Lesson: …", which reads like a textbook.
  - Rivals appear as a single log template (`src/sim/systems/rivals.ts:22`).
  - There is no protagonist, no stakes beyond cash, and the ending is a one-line rating.
- **Fix:** A light but real narrative layer:
  - **Cast:** an investor board with 2-3 named members and distinct asks (growth, margin, safety), who are the source of the yearly milestones in item 2. Also 3 named rivals with personalities who appear in headlines. Recurring customers (renewals already exist; give them faces and one-line voices).
  - **Chapters:** a year card at each new year: 2020 a garage GPU shop, 2021 crypto hangover and cheap A100s, 2023 the ChatGPT gold rush, 2024 liquid cooling or die, 2025-26 gigawatt campuses and power scarcity, 2027-28 the bubble question.
  - **Choices:** 1-2 dilemma cards per year with trade-offs, e.g. take a sketchy customer's prepay, sign a 10-year nuclear PPA, sell to a rival.
  - Move the "Lesson:" text out of the log into the Codex, and keep log lines punchy.
- **Done when:** a full campaign shows at least 8 year/chapter cards and at least 8 dilemma cards, rivals react to the player at least once a year, and no log line contains "Lesson:".

### 18. The ending is an anticlimax
- **Problem:** Eight years of play end in a single rating line.
- **Evidence:** `finish()` in `src/sim/systems/endgame.ts` produces one rating line and one summary.
- **Fix:** Multiple endings (IPO, acquired by a hyperscaler, landlord to the labs, bankrupt, fired by the board). Add an end screen with a company timeline chart, your best deal, worst incident, how you compare with the rivals, and a share-able summary card.
- **Done when:** each ending is reachable in tests and the end screen renders in the smoke run.

---

## P2: music and sound

### 19. Nobody has listened to the music
- **Problem:** The music has never been played to a person. That is too risky to ship as-is.
- **Evidence:**
  - All 7 tracks are procedurally rendered by `tools/audio/chill.py` and have never had a listening pass.
  - Each is encoded at **64 kbps** Vorbis, which smears bass-heavy material.
  - Seven tracks rotating through a 10+ hour campaign means each one repeats roughly every hour.
- **Fix:**
  - Do a human listening pass with a per-track checklist (mix balance, harsh frequencies, loop seams, energy curve), and fix what fails.
  - Raise the encode to 112 kbps.
  - Make the music adaptive: render stems (drums / bass / pads / lead) and fade layers by game state (power load, cash trend, crisis), so the score follows the hall instead of a playlist.
- **Done when:** listening notes are committed in `tools/audio/LISTENING.md`, every track passes, and at least 2 tracks are stem-based adaptive.

### 20. The sound identity is confused, and the copy is stale
- **Problem:** The audio mixes styles, and the text describing it is wrong.
- **Evidence:**
  - `godot/game/audio.gd:3` still says "8-bit music catalog".
  - README says every cue is "8-bit", but the cues are banknote rustle, coins and fanfares.
  - One chiptune ("Neon Overclock") sits inside a lo-fi/dub catalog.
- **Fix:** Pick one sonic identity. Recommended: warm electronic / lo-fi, which fits the chill tracks. Either drop or re-skin Neon Overclock, and correct the copy in README, the site and code comments.
- **Done when:** `grep -ri "8-bit\|chiptune"` over README, site and godot returns nothing, or the catalog really is consistent with whatever the copy says.

### 21. The ambience is a fixed hum
- **Problem:** The background hum never changes with the size or state of the hall.
- **Evidence:** `_make_hum()` in `godot/game/audio.gd:176` is a 4 s noise plus 60/120 Hz loop at a constant -26 dB, whatever the hall size or load.
- **Fix:** Scale volume and fan-noise brightness with online racks and power draw. Add a chiller layer when DLC is online. Briefly duck the hum on a power-down event.
- **Done when:** the hum level differs measurably between an empty and a full hall (assert in `tests/audio_test.gd`).

---

## P2: tooling blind spots

### 22. The playtest report misreports GPUs
- **Problem:** The playtest report undercounts GPUs, which made the spot exploit look like idling.
- **Evidence:** the "GPUs" column counts only clustered accelerators, so spotter shows **0 GPUs with 8 racks**.
- **Fix:** In `src/playtest/run.ts`, report total installed accelerators and clustered accelerators separately, and add a utilisation % column.

### 23. The personas can't exercise half the game
- **Problem:** The scripted players cover only part of what a real player would try.
- **Evidence:** item 7. No persona uses PPAs, pre-orders, the lifecycle sell-off, renewals or loans deliberately.
- **Fix:** Add a "planner" persona that does all of these, and make each persona play every scenario. Add anomaly rules: revenue drops > 80% within 6 months, idle racks > 30% for 6 months, understaffed for 12 months.
- **Done when:** the sweep covers persona × scenario, and the new anomaly rules fire on the current build (proving they work) and pass after the P0 fixes.

---

## Suggested order

1 → 5 → 4 → 3 → 2 → 6 → 9 → 7 → 8 → 10 (economy; re-run the sweep after each), then 22-23 (better instruments), then 14 → 12 → 11 → 13 → 15 → 16 (UX), then 17-18 (story), then 19-21 (audio).
