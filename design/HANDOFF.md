# Handoff — where the project stands (8 Sep 2026)

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
an **Omen** chosen each Year; Gaia's Whim (a wheel earned on Wonders, never
in the core loop, never scores). No randomness after the run begins except
the run seed. Cozy mode is a mode, not the spine. Steam-first, ~$13, own
shader/palette/diorama. The razor: if it could be done by placing objects on
a fixed map, back up.

## Branches
- `main`      the bench as it was (water + erosion + life).
- `steps`     THE WORKING BRANCH. Everything below lives here.
- `claude/mountains-pot-design-jbdw7t`  the first session's branch; superseded.

## Files
- `index.html`  the whole game (CORE block is the pure sim; below it the
  renderer, the bench UI, then PLAYER MODE and THE RUN).
- `pot.html`    single-file build: `node build.js`. Sendable, double-click.
  **Rebuild after every change to index.html.**
- `design/mechanics.xlsx`  the step sheet: one row per mechanic, status,
  how we test, result. Yellow cells = the founder's Decision (keep/tune/cut).
  Sheets: Steps, Numbers, Wonders, Seeds, Boons, Wheel, **Omens**, Playtest log.
  The Steps data block ends at row 29 and the summary COUNTIFs read
  `$F$2:$F$29` — widen them if you add rows.
- `design/game-design-v0.1.pdf` (29 p) and `core-loop-2p.pdf` (2 p): older,
  and v0.1's "Moons" was replaced by the breathing world.

## Done on `steps` (all measured, see CLAUDE.md)
1 life · 2 life clock · 3 the world breathes · 4 palette, diorama orbit,
rain shafts, post pass · 4b player panel with earned tools · 5 Harvest, 12
Wonders, Codex · 6 mana · 7 targets, Behold · 8 seed cards · 9 Spring, Dew,
six Boons · 11 Gaia's Whim.

**This session (12–19), answering the first full-run playtest:**
12 the meteor is visible — a bolide, a flash, a shake, a ring, timed off the
wall clock · 13 every Wonder turns the wheel (3 wheels → up to 12) ·
14 eight forces in three shapes, all through levers the sim already had ·
15 **the sow-unlock bug**: sow only unlocked for Grass, so Moss was
unreachable on any hand-dug pot (tick 100 → tick 1) · 16 the tip names the
ground and the seed that would take; the panel shows mana as a number, the
Boons, running forces and the deck · 17 the Codex carries a recipe for each
of the twelve and opens during play · 18 tilt-shift in two passes, on a
slider · 19 **Omens**: three offered at the turn of the Year, one chosen,
read from the same Harvest, paid in dew.

## Playtest record
- 1st (bench UI): "what do we do now?" → player panel.
- 2nd (panel + Harvest, no stakes): "bored" → the first playable.
- 3rd (first full run): core loop liked; **the run is front-loaded** — the
  wheel came too seldom, no quest ever arrived, nothing new turned up in the
  later Years, and the meteor landed invisibly. Measured: 3 wheels all before
  Year 3; Boon offers 3/3/3/3/2/1/1; 4 verbs all unlocked in Year 1.
  Steps 12–19 are the answer.
- 4th: **PENDING.** The founder plays a run on the new build. The question is
  narrow: *do the later Years now have something in them?*

## Next, in order (after the 4th playtest)
- Tune from the run: target curve, mana, Omen dew, tilt-shift strength
  (`POT.setTilt('blur', n)`, View has the slider).
- **Open naming question:** the loose weathered material is called `slag`
  throughout the code and CLAUDE.md. The founder suggested *regolith*, which
  is the geologically right word (slag is metallurgy waste). A rename touches
  `SLAG`, `MATS`, `sed`, the tip, the docs and the sheet. Ask before doing it.
- Content the frame is now ready for: Willow, Pine, Lotus; the remaining
  Boons (Beaver, Silt, Terraces, Migrating Birds, Gaia's Patience; Old Growth
  last, needs age state) — the Boon pool is still only 6 against 7 Springs.
- Then seeded starting pots; cozy mode + Codex notebook; Behold photo mode;
  vertical slice → demo → Next Fest.

## How to test locally
`git fetch origin && git checkout steps && git pull`, then `run.bat` or
double-click `pot.html`. `?bench=1` opens the developer bench, `?seed=N`
fixes the run, `?r=8..64` the radius.

## Working rules that held
Every claim with a number; headless tests read the CORE out of index.html
(never copy the sim); the browser pane + `window.POT` for anything that needs
three.js; commit per step; push to `steps`; rebuild `pot.html`.

**Two traps this session, both worth remembering:**
- A visual effect timed off *accumulated clamped frame deltas* runs slower on
  a slow machine. Time it off the wall clock.
- `window.POT` is built before the POST block, so anything declared down
  there (`TILT`, `renderer`) must be exported as a **getter** or it is read in
  its temporal dead zone and the whole module throws.
