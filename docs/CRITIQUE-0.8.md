# Pre-release critique (v0.8.1, 2026-11-09)

How this was made: six play-testers drove the real game, plus my own screen-by-screen pass and a code read.
- **Novice:** Learner mode, mouse, 1080p, 21 in-game months.
- **Veteran:** Operator mode, 3440x1440 for 22 months, then 2560x1080, 5120x1440, 4K, 1366x768 and 1280x720, and every setting.
- **Phone:** the Pixel 9a, touch only, about 26 months, every screen.
- **Steam Deck:** 1280x800, handheld layout, a virtual Xbox controller only.
- **Monkey test (Haiku):** about 280 random presses at 1600x900.
- **Code review:** read-only, of input, settings, session flow, tutorial, economy and accessibility.

Raw reports and about 500 screenshots are in `~/.claude/jobs/1029f783/tmp/qa/` (`b/report.md`, `phone/report.md`, `code-review.md`, and `*/shots/`).

**Stability is good.** About 900 actions in total produced no crash, no freeze and no script error. The only log noise is a `grab_focus` warning from `ui/story.gd:25`.

## Verdict
The content is the best part. The hardware catalogue, the event writing, "requirements vs your cluster", Easy Path, Datacenter 101 and the Codex entries teach better than most sims, and the stability is good. It is not ready to release:
- It throws away the player's game on every visit to the title.
- Controller players cannot press a button.
- Android Back kills the game.
- Small screens cut off the main menu.
- Modals, toasts and tooltips stack on top of one another everywhere.

None of these are deep. They are a week of focused fixes, listed in order at the end.

---

## 1. Release blockers

| # | Problem | Where | Evidence |
|---|---|---|---|
| B1 | **The title screen overwrites the player's autosave.** `_title()` runs a 22-month demo game (`main.gd:379`, `_demo_hall` `:394`). The engine autosaves every month (`src/engine/actions/session.ts:50`), so the "auto" slot becomes the demo. "Save & quit", Ctrl+Q and quitting all write only to "auto". CONTINUE then shows "Oct 2022 · $40.08M · 28 racks" on every install. | main.gd, session.ts | Reproduced by me and by the veteran: after 22 months, Save & quit, CONTINUE loaded the demo. |
| B2 | **The controller A button does nothing.** The project has no `[input]` section, and Godot 4's default `ui_accept` does not include joypad A. I confirmed this with a probe: button 0 arrives and `is_action("ui_accept")` is false. No focused button can be pressed, so a pad-only player cannot leave the title. | project.godot | Steam Deck tester (7 mouse fallbacks), plus my probe. |
| B3 | **Android Back quits the process from any state.** It is not handled at all, and the run is lost (made worse by B1). | main.gd `_notification` | Phone tester. |
| B4 | **Pad focus is trapped on the site picker and the Load dialog.** Neither is in `modal()`, so `Pad.ensure_focus` pulls focus back to the first chip every 250 ms (`pad.gd:95-124`, `main.gd:548`, `:1028`). Start game cannot be reached. | pad.gd, main.gd | Confirmed by the Steam Deck tester. |
| B5 | **The title menu overflows at 1280x720, 1280x800 and 1366x768.** Settings and Quit are off-screen with no scroll. Steam Deck and most laptops are affected. | main.gd title (desktop column has no ScrollContainer) | Me, veteran, Steam Deck. |
| B6 | **Hotkeys fire behind modals** (`main.gd:759-772`). Space advances months past chapter cards and keynotes. The novice skipped two months unread and lost every contract plus a customer. | main.gd `_unhandled_key_input` | Novice, monkey, code review. |
| B7 | **Esc on the title or site picker quits the game** with no confirmation, even with Settings or the Load dialog open (`main.gd:763-764`). Ctrl+Q also quits with no prompt. In game, Esc never closes Settings or keynotes; it stacks the pause menu on top, and that stale stack survives back to the title. | main.gd | All desktop testers. |

## 2. Overlays, toasts and tooltips
This was the most-reported class of problem; every tester hit it.
- **Ghost rack tooltip.** After you hover a rack, the tooltip follows the mouse over drawers, the dock, Settings and the pause menu. It covers text, is drawn above modal dimmers, and clips off-screen. Fix: hide it whenever the pointer is over any Control, and on any modal (`main.gd` `_on_rack_hover` / `_process_tip`).
- **Toast stacks.** 4-5 toasts cover drawer headers, tabs and the "Needs you now" card, and they overprint each other. Critical events, such as a fire destroying your only rack, were the 5th toast and auto-hid. Cap toasts at 2-3, keep them clear of drawer headers, and make critical ones persistent.
- **The "MISSION COMPLETE" banner** draws over keynote and chapter titles and drawer titles. Queue it until no modal is open.
- **The tutorial card** sits over the top-left of every drawer: the Customers title, the Supply and Facility tab strips, the Codex search box and the Operations header. It also sits over the first rack it asks you to look at. It is not in pad focus order, so a pad player can never dismiss it.
- **The Build placement panel** (bottom-left, Facility) is a ~750x320 dark box holding one dropdown and a button. It covers the hall you are supposed to click.
- **Keynote modals** stretch to ~85% width on ultrawide with an empty body.
- **Pause menu:** 10 buttons with no panel or gaps. "PAUSED" touches Resume. It overflows 800-900 px tall screens (Save & quit is cut off) and overlaps the dock.
- **Taps go through full-screen pages** into the hidden 3D hall (phone: a scroll on Cluster opened a rack pop-up).

## 3. Input parity

### Mouse and keyboard
- Keyboard-only play is impossible. Tab, arrow and Enter navigation only exist after a pad was touched (`kit.gd:96`, `pad.gd:43`), and no key presses Easy Path.
- F1 does nothing on the title. `0` (Codex) is undocumented. `9` does nothing. T and L showed no visible change on small halls.
- Typing in any LineEdit also moves the camera (`hall_view.gd:676-681`). Hall names in Build are affected.
- The planner's accelerator slider only applies on `drag_ended`. A drag that releases over "Open Build" jumped to Facility (monkey test).

### Controller (Steam Deck)
These are in addition to B2 and B4. What works: D-pad navigation, LB/RB drawers, Y next month, START menu, sticks, triggers, L3 and R3.
- **Unfocusable controls:** `Kit.check` and `Kit.option` are never pad-focusable (`kit.gd:362`, `:371`). That includes cluster assignment on Customers, the last step of the core loop. The Supply quantity slider and the DIY/OEM/turnkey cards are skipped. The Design Lab boards are mouse and touch only (`tray_board.gd:320`, `rack_board.gd:73`).
- **Focus behaviour:**
  - Settings freezes focus after the UI-size slider moves.
  - The keynote pins focus to its first button.
  - A drawer switch often leaves focus on MENU instead of inside the drawer.
  - B is swallowed while the tutorial or a chapter card is open (`_back` has no story or coach branch). It works fine in drawers otherwise.
- **Visuals:**
  - The focus ring comes in four styles: yellow, a thin white ring on dropdowns, a bare knob on sliders, and green-on-green on selected buttons.
  - Hint-bar glyphs (Ⓐ Ⓑ) render as tiny "@". The font lacks them, so use drawn button icons.
  - The hint bar overlaps the title's LOAD GAME button and the dock.
  - The pan stick is too fast: 0.8 s throws the hall off-screen.
- **UI size:** the first step of the UI-size slider drops below the handheld Auto scale, so everything becomes tiny on a 7-inch screen.

### Touch (phone)
These are in addition to B3.
- **Design Lab tray bench:** tapping a socket shows no part picker or sizing advisor, so you can't design a tray.
- **Default drawer width:** 30% is too narrow. Energy, Clients, Home and Cluster clip at the right edge. It is fine once dragged wider, so either default to about 40% or wrap harder.
- **Camera:** there is no touch route to thermal, top view or labels. Pinch and orbit exist but nothing tells you so.
- **Tutorial and Controls copy:** they still say "right-drag", "wheel", V and Space. The tutorial also says CUSTOMERS and FACILITY while the phone dock says CLIENTS and BUILD. It says "switch to Learner mode for $80M", but `setMode` doesn't change cash and the mode button is hidden on phone and handheld (`coach.gd:20-31`).
- **Drags that start on a button still press it sometimes** (it selected a rack finish while scrolling the site picker).
- **Signing:** contract signing gives no feedback. The list reflows so the next offer's Sign button lands under your finger. Desktop has the same reflow: the novice bought a second, unintended $1.4M Easy Path project.
- **Number fields** open a full QWERTY keyboard that covers the field. Use steppers or the numeric keyboard.
- **Loading a save** replays old keynote and chapter cards before the real pending decision.
- **Site picker:** the footer buttons sit behind the gesture bar.
- **Desktop-only items on Android:** Quit, Window mode, V-Sync and the Vulkan warning should be hidden there.

## 4. Form factors
- **1920 to 4K:** mostly sound. **3440 and 5120 wide:** the UI keeps a fixed pixel size, leaving dead areas between HUD clusters. Drawer width also jumps between tabs (Procure vs Warehouse).
- **1366x768 and 1280x720:**
  - B5 above.
  - The Codex parts list renders blank.
  - Supercomputer and Design Lab are clipped.
  - Auto layout picks "handheld" at 1366x768, and forcing Desktop clips MENU.
  - The Settings dialog overflows (Close is off-screen) at UI 200%, text boost 130%, or Phone layout on 768p.
- **Text size boost 130% at 1600x900:** the top bar pushes NEXT MONTH and MENU off-screen.
- **Operations at 1600x900:** the cards run past the panel's right border, and the burn-in and maintenance rows need horizontal scroll ("3 mo — exhaustiv").

## 5. Learnability
**What works:**
- The "Why:" line on each tutorial step.
- The "Needs you now" card.
- "CAN SERVE NOW" / "NEED MORE" verdicts.
- Datacenter 101 with COVERED / COMING UP / NOT YET chips. The novice called it excellent.
- Codex "What it is / Why you care / When you need it" + "Take me there".
- The decision cards' plain ± outcomes.
- Discovering that one rack can serve several contracts was the novice's best moment.

**What doesn't:**
- **Three competing guides:** the tutorial card, the "Needs you now" card and a 27-item mission list. After 30 months of autoplay the list still reads "0 OF 27 DONE".
- **Jargon in Learner mode with no hover help:** TTFT, TP1, tok/s, Mtok, SLA, "ramp window", "deploy window", L11/L12, RoCE, bisection, PUE. Deadlines read "by month 25" instead of a date. Add a glossary tooltip on every term; Learner mode should explain on hover or tap.
- **Contradictory verdicts:** an offer header says "NEED MORE / DIFFERENT HARDWARE … a hard limit fails" while its table is all green and offers EASY PATH.
- **Easy Path economics are hidden.** It buys a whole $812k rack for a $16.6k/mo, 7-month contract (a 52-month payback) with no warning.
- **Failure isn't explained:**
  - After a fire destroyed the only rack, "Needs you now" said "100% of your revenue ends within 3 months", not "your hall is down, rebuild ETA, do this".
  - Nothing ever warned about fire risk or insurance beforehand.
  - "Easy path is stuck … waiting" gives no reason.
- **Silent purchases:** orders and Easy Path purchases have no confirmation or "what happens next" line; cash just drops. Borrowing $20M over the credit limit fails silently.
- **"Choose your site" is purely cosmetic**, yet it is framed as the first decision.
- **"How to play"** is really the mission tree, not instructions.
- **Numbers that don't make sense:**
  - "Runway: 1717 months" and "2748 months".
  - Net/Mo (−$40.0k) disagrees with "Cash after" (−$16.0k) with no explanation.
  - "8 / 1 operators, Fully staffed".
- **Flavour text mentions things the game doesn't have** (containers, cold aisles, tanks). The Apr 2021 keynote says "Orders open Apr 2023" for a chip that "ships 2024".

## 6. Gameplay and economy
- **Pacing:**
  - Months 1-5 are dead time while hardware ships (6-month lead times), padded with chapter and keynote modals.
  - After that, Operator has little pressure. Cash sat at $50-62M all game, and mission rewards of $250k-1M are noise at that scale.
  - At 3x speed, a customer default and a fiber cut passed without pausing. Auto-pause on serious events would help.
- **Easy Path is the whole game for a casual player.** One click orders, builds, clusters and assigns. The veteran never needed to place a rack, power or cooling by hand. It is great for onboarding, but Operator and Tycoon need a reason to do it yourself: Easy Path markup, slower delivery, or worse fabric choices.
- **Gold-rush balance.** In a fresh `PLAYTEST=1` run, the idle persona is now fired (good). It still ends with a higher net worth than the scripted operator ($249M vs $239M), so building barely pays in that scenario. The committed `docs/playtest/report.md` is stale; it still says idle "finished / Solid operator". Revenue cliffs and idle fleets remain open in that report.
- **No history:** there is no revenue or P&L chart during play.
- **No confirmation on destructive buttons:** "Let go 1" fires instantly, "Sell all" and "Unclusters" also.

## 7. Style
**Strengths:**
- The neon-on-navy look is coherent.
- Colour-coded dock tabs match their drawer borders.
- Green, blue and red button hierarchy.
- A strong display face for numbers.
- The writing is the best asset: witty and specific, and it teaches consequences.

**Weaknesses:**
- **ALL-CAPS and chip overload:** every section header is an uppercase chip inside a bordered card inside a bordered drawer (three frames deep, e.g. Codex categories, offer cards).
- **Too many colours:** the dock is a rainbow of eight neon outlines.
- **Small type:** body text at 11-14 px DIM grey is hard to read at 1080p, and Design Lab board labels are ≤8 px.
- **Inconsistent controls:**
  - The native OS dropdown (rack design) and the near-invisible checkboxes (Energy spot list) don't match the theme.
  - The active Codex tab is washed-out grey, unlike the other tabs.
  - The disabled "Auto-design for TRAINING" keeps its green style.
- **Empty or broken canvases:**
  - The Supercomputer topology area is a 1000x800 void with one "LEAF 1" box when nothing is selected. Show an example or instructions there.
  - The Supply platform strip cuts its last card mid-word ("AMD Instir… PRE-ORDE").
  - The procurement 3D preview leaves a large empty spec card.
- **3D hall:**
  - The default camera is off-centre and partly behind the drawer.
  - Six large unlabeled boxes outside the hall boundary.
  - A pink translucent zone with no legend.
  - Cable trays read as diagonal yellow sticks.
  - Rack labels overlap ("Cluster 5 · 3 racks").
  - Add a legend and frame the camera on the hall.
- **Light themes (Paper, Sand, Mist):** white text on light backgrounds, and accent contrast of 3.7-4.2:1. Switching back to Midnight leaves the top-bar date dark-on-dark until restart.
- **Layout shift:** panels move 2 px per action, offers reorder under the cursor, and drawers change width.
- **Typo:** "100%% bought at the spot utility rate" (Energy).

## 8. Settings and accessibility
- **What works:** every option tested applies live and persists: layout, theme, window mode, V-Sync, preset, volume, music, the accessibility toggles and UI size.
- **Broken or misleading:**
  - `high_contrast` does nothing.
  - UI size 75% is not persisted (`main.gd:904-907` vs `settings.gd:144`).
  - "Text size boost" scales the whole UI.
  - Mute is not persisted.
- **Missing:** key rebinding, invert camera, confirm-on-quit, autosave interval and backups, reset to defaults, and reduced motion.
- **Controls list gaps:** it omits arrow-key pan, middle-drag pan, `0`, L3/R3 and every touch gesture.
- **Colour-only status:** red and green status, with luminance contrast of 1.1-1.2:1 in the light themes. The colour-blind option only covers clusters.
- **Saves:** there is a single rolling autosave with no backup, no delete UI, and no save-version bump for the 0.7 and 0.8 fields.

---

## Fix order (suggested)
1. **Data safety.** Run the title demo with saving disabled (or in a throwaway slot), autosave on quit and focus loss into a slot the demo can't touch, keep 2-3 rotating autosaves, and add a regression test (B1).
2. **Input map.** Add A → `ui_accept` and B → `ui_cancel` to project.godot. Put the site picker, Load and Save dialogs, keynote and coach in `modal()`. Make `Kit.check`, `Kit.option`, sliders and the planner cards focusable. Handle Android Back as close modal → close drawer → pause menu, never quit (B2-B4).
3. **One modal discipline.** Hotkeys, Space and Next Month are ignored while a modal is open. Esc closes the topmost overlay and never quits from the title without a confirm. Toasts and banners queue behind modals. The rack tooltip hides over UI (B6, B7, §2).
4. **Short screens.** Make the title column, pause menu, Settings and site picker scroll or fit at 720 px. Fix the blank Codex at 720p and the Auto layout pick at 768p (B5, §4).
5. **Placement and tutorial panels.** Move the tutorial card off drawer headers and make it pad-focusable. Shrink the Build placement panel. Replace the native dropdown and fix the checkbox style (§2, §7).
6. **Touch copy and controls.** Make tutorial and Controls text depend on the input device, add on-screen thermal, top and labels buttons, and widen the default phone drawer (§3).
7. **Learner glossary and explanations.** Explain jargon on hover or tap, use real dates, show an Easy Path cost-vs-contract line, add a "Hall down" state in "Needs you now", and add order confirmations (§5).
8. **Polish.** Fix the "100%%" typo, give the pause menu a panel, fix the Codex tab colour, glyph icons and light themes, and add confirms on Let go, Sell all and Unclusters. Regenerate `docs/playtest/report.md` and look at gold-rush payback (§6, §7).
