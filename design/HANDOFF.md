# Handoff — where the project stands (8 Sep 2026, end of day)

Read CLAUDE.md first: it is the design record. `design/ROADMAP.md` is the
tracked build list. This file is only the "what to do next" note.

## Who
Two-person cozy indie studio (Erhan builds the engine; the founder tests and
decides). Claude is the proactive game designer and second pair of hands:
decide, build, measure, report with numbers; discuss rules before coding;
one step at a time; English only in the game; Turkish in chat is fine.

## Direction
Sim-board roguelike. Shape the ground (Dig, Raise, Rain, Sow), the world
grows itself; eight Years in one pot; **the Omen is the spine and the target
is a measure**; Spring shop with Boons and seed cards; Gaia's Whim earned from
Wonders. No randomness after the run begins except the run seed.

**The razor, and it now has a name:** *derive, don't add*. A biome, a desert,
a floodplain is a **read** of numbers the board already keeps, the way a
Wonder is. Seasons + biomes + deserts + wind built as four systems make a
worse WorldBox; built as consequences of the water they are something nobody
has. See the top of ROADMAP.md.

## Branch
`steps` — everything. Clean and pushed as of this note.

## Where the list stands
Block **A is complete** (A1–A5): timescales spread apart, speeds 1/2/4/8, the
Whim banked as a token, the camera on the keyboard, the waterfall drawn.
Then two fixes from the second playtest: **mana refills through the Year**,
and **the token says why it is waiting**.

Next up is block **B — the derived world** (rock hardness and differential
erosion, alluvium → fertility, biome as a pure read). But see the blockers.

## Blocked on the founder — answer these before building B

1. **THE RAIN RULE — this one blocks a visible bug.** Water towers were
   reported. Diagnosed and measured: 12 stacked clouds × Monsoon puts **4
   elevations of rain a tick on one hex**, and it has to stand 0.85
   elevations (5 drawn layers) proud of its neighbours to push that out
   through six edges. The tower is the simulation being honest about an
   absurd input, not a rendering fault (`fallCount` was 0 through it).
   **Proposed rule change, not yet built:** a cloud's rain falls on the hex
   below *and its six neighbours*. A cloud is an area, not a needle. Kills
   the tower at source, keeps stacking strong but wide, one clause on rule 1,
   and it is diegetic. Alternatives: cap the stack (12 is a lot), or cut
   Monsoon's multiplier. **Do not build without a decision.**

2. **How long should a run be?** Still unanswered, and it gates B and C
   because it sets how slow erosion and biome change are allowed to be.
   45 min (as now, 8 Years) / 90 min (12–16 Years, the land really changes) /
   endless save-and-return. The founder was asked to play a run and notice
   whether Year 8 feels like "I wish it went on" or "about right".

3. **Forest must not be a timer.** "Grass and moss merge into forest" has to
   fall out of the *condition* (deep soil + water + dense life), never a
   counter — stored order-dependent state is what burnt this project twice.

## Still open from the last round
- The bigger reframe: **clouds you cannot place**, only a wind direction you
  choose, so shaping the land is the only way to move water and every Wonder
  becomes a puzzle. C2/C3 build the machinery either way; whether placement
  goes away is decided after it is felt.
- **Naming:** the loose weathered material is `slag` everywhere; the founder
  suggested *regolith*, which is the geologically right word. A rename
  touches `SLAG`, `MATS`, `sed`, the tip, the docs and the sheet. Ask first.
- The Boon pool is still 6 against 7 Springs. **Frozen on purpose** until the
  shop's shape is decided — if it should sell interventions on the board
  rather than stat lines, five more stat lines is wasted work.

## Flags for playtesting
`?mana=free` (or the corner button) · `?bar=hard` restores the old fail state
· `?seed=N` · `?r=8..64` · `?bench=1`. Keys: WASD/arrows pan, Q/E rotate,
Space pause, **V** the drainage lens.

## How to test locally
`git fetch origin && git checkout steps && git pull`, then `run.bat` or
double-click `pot.html`.

## Working rules that held
Every claim with a number; headless tests read the CORE out of index.html
(`test/measure-timescales.js` is the pattern — never copy the sim); the
browser pane plus `window.POT` for anything needing three.js; one commit a
step; rebuild `pot.html` after every change.

**Three traps that have now each cost real time:**
- A visual effect timed off *accumulated clamped frame deltas* runs slower on
  a slow machine. Time it off the wall clock.
- `typeof X` on a `const` in its temporal dead zone **throws**; it does not
  return `'undefined'`. Guards like that turn any load error into ten
  ReferenceErrors a second that bury the real one. Use a hoisted `var`.
- `window.POT` is built before the POST block, so anything declared below it
  must be exported as a **getter**.
