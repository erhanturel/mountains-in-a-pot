# Handoff — where the project stands (7 Sep 2026)

Read CLAUDE.md first: it is the design record. This file is only the
"what to do next" note for a fresh session.

## Who
Two-person cozy indie studio (Erhan builds the engine; the founder tests and
decides). Claude is the proactive game designer and second pair of hands:
decide, build, measure, report with numbers; discuss rules before coding;
one step at a time; English only in the game; Turkish in chat is fine.

## Direction, locked
Sim-board roguelike. Shape the ground (Dig, Raise, Rain, Sow), the world
grows itself; eight Years in one pot; mana budget; Bloom = worth of living
hexes x (1 + Wonders); rising target; Spring shop with Boons and seed cards;
Gaia's Whim (a wheel earned on milestones, never in the core loop, never
scores). No randomness after the run begins except the run seed. Cozy mode
is a mode, not the spine. Steam-first, ~$13, own shader/palette/diorama.
The razor: if it could be done by placing objects on a fixed map, back up.

## Branches
- `main`      the bench as it was (water + erosion + life).
- `steps`     THE WORKING BRANCH. Everything below lives here.
- `claude/mountains-pot-design-jbdw7t`  the first session's branch (life);
  superseded by `steps`.

## Files
- `index.html`  the whole game (CORE block is the pure sim; below it the
  renderer, the bench UI, then PLAYER MODE and THE RUN).
- `pot.html`    single-file build: `node build.js`. Sendable, double-click.
  Rebuild after every change to index.html.
- `design/mechanics.xlsx`  the step sheet: one row per mechanic, status,
  how we test, result. Yellow cells = the founder's Decision (keep/tune/cut).
  Regenerate with the script in the session scratchpad or edit by hand.
- `design/game-design-v0.1.pdf` (29 p) and `core-loop-2p.pdf` (2 p): the
  design doc. Note: v0.1 said "Moons"; that was replaced by the breathing
  world (see CLAUDE.md, *Time: the world breathes*).
- `design/*.png`  screenshots of each screen.

## Done on `steps` (all measured, see CLAUDE.md)
1 life · 2 life clock (1 in 10 ticks) · 3 the world breathes (2 ticks/s,
speeds, pause, Seasons) · 4 palette, diorama orbit, rain shafts, post pass ·
4b player panel with earned tools and one hint line · 5 Harvest, 12 Wonders,
Codex · 6 mana · 7 targets, Behold · 8 seed cards Grass/Moss/Reed ·
9 Spring, Dew, six Boons · 11 Gaia's Whim (Meteor, Megatime, Monsoon).

## Playtest record
- First test (bench UI): "what do we do now?" -> player panel built.
- Second test (panel + Harvest, no stakes): "nothing to do, bored" ->
  the first playable block was built in one go.
- Third test: PENDING. The founder plays one full run and answers one
  question: do you want to play a second run?

## Next, in order (only after the founder's verdict on the run)
- If yes: tune targets/mana from the run; Willow, Pine, Lotus; remaining
  Boons (Beaver, Silt, Terraces, Migrating Birds, Gaia's Patience; Old
  Growth last, needs age state); seeded starting pots; cozy mode + Codex
  notebook; Behold photo mode; then vertical slice -> demo -> Next Fest.
- If no: talk about where the boredom is (verb density vs stakes) before
  building anything. Options on the table: smaller pot / faster Seasons /
  more per action, or reposition as a beautiful toy (Tiny Glade lane).

## How to test locally
`git fetch origin && git checkout steps && git pull`, then `run.bat` or
double-click `pot.html`. `?bench=1` opens the developer bench, `?seed=N`
fixes the run, `?r=8..64` the radius.

## Working rules that held
Every claim with a number; headless tests read the CORE out of index.html
(never copy the sim); Playwright + swiftshader screenshots for the look;
commit per step; push to `steps`; rebuild pot.html.
