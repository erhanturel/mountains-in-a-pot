# Mountains in a Pot

> A disc of bare rock.
> Hang a cloud, and the water
> finds its own level.

A single-file hex sandbox. **Radius 8 to 64** — 217, 331, 469, 631, 1801,
3997, 7057 or 12,481 hexes — chosen from the URL (`?r=48`) and fixed for the life of the page. The
size buttons **ask with a second click, not a dialog**: `window.confirm` is
suppressed in some embedded browsers, returning false without ever showing
anything, so the button simply looked dead.
`T`, the cell stack and every instanced mesh are sized from it, so a size
change starts a *new* world with a reload. That is why save came first.

**Undo depth is a memory budget, not a count.** A snapshot is the cell stack
plus twelve numbers a hex: 0.13 MB at radius 12, **3.4 MB at radius 64**,
where sixty of them would be 206 MB. Sixty small boards or fourteen enormous
ones — about 45 MB either way.

Costs at radius 64, measured: 12,481 hexes, **77 fps**, **4.4 ms a tick**,
32 ms a rebuild. A step at 100× is 100 ticks plus one rebuild, so it was a
second and a half a frame before the tick was optimised and is now about a
third of that. See *Where the time goes*.

**A save is a file, not a browser slot** — the whole cell stack, every
per-column number, the radius, the name and the knob settings. A board you can
hand to someone else is worth more than one only you can reopen. Loading a
board of a different radius parks it in `sessionStorage` and reloads, picking
it up on the way back in.

`flow` and `out[]` are saved although they are derived and the next tick would
rebuild them — without them a board opens with no rivers drawn, which looks
like the load failed.

Numbers are rounded to six decimals on the way out, so **the first round trip
loses up to 0.0004 units** — six millionths of a water tile — and every
round trip after that is exact. It is the one place conservation is not
perfect.
 Four powers — **Uplift**
and **Subduct**, which are blind and act on whatever is on top, and **Place**
and **Erase**, which the palette aims — each with a **brush** of 1, 7, 19 or 37 hexes and a **depth** of 1,
2, 3, 6 or 12 slabs. Six slabs is one elevation step. Everything else is water
working out where to go.

**Place and Uplift are not the same power.** Place lays down whatever the
palette says; Uplift extends whatever the column already has on top, so
raising bedrock gives bedrock and raising rock gives rock. `raise()` and
`lower()` both work in slabs and both return how many they managed, so a click
that could do nothing at all is not counted as an action and does not tick.
`legal()` is gone: it asked whether a whole elevation would fit and could not
answer for a partial one.

The brush lives in the CORE, not in the UI, because a click has to stay ONE
TICK however many hexes it moves; calling `use()` per hex would run the
weather 37 times for one press. The hover preview draws one hexagon per hex
the brush covers rather than one scaled outline, because the union of hexes
within a radius is not a scaled hexagon — it is turned thirty degrees and its
edges are stepped — and a preview that draws a shape the click will not make
is a preview that lies.

Measurements recorded below were taken on the radius-6 board unless they say
otherwise; the water rules do not depend on board size, but hex counts do.

**This is a design bench, not a game.** No goal, no score, no failure state.
It exists to find out which mechanics are worth keeping. Do not add a goal
unless asked.

**It is water, the ground the water moves, and now life on that ground.**
Moisture, heat, relief, basalt, lava and the endless-source liquids are still
out; that was a deliberate strip, not an oversight — see *What was taken out*
below before putting any of it back. Life came back first, on the water's
own terms — see *Life* below.

---

## Running it

```
run.bat                         # serves and opens a tab
```

or by hand:

```
python -m http.server 8777
```

then `http://localhost:8777/index.html`. **`index.html` opens as the game**
(player mode: a dock of big buttons, one hint, the bench hidden behind the
corner button); `?bench=1` opens straight into the bench. There is a launch config at
`.claude/launch.json` under the name `pot`, and `?r=8|10|12|14` picks the
board size.

**`pot.html` is the one-file build**: `node build.js` folds three.core,
three.module and OrbitControls into the page, each in its own function
scope, and the result opens from a double click and can be sent over a
chat. Rebuild it after every change to `index.html`; it is committed so a
tester never needs the repo.

**`index.html` itself cannot be opened as a file.** It loads three.js as an ES module,
module scripts are subject to CORS, and a `file://` page has an opaque origin
— so the import is refused and the viewport comes up blank with nothing but a
CORS error behind it. three.js r185 ships ESM only, so there is no classic
script to drop in instead. It wants a server, and that is not going to change
without a build step.

**`confirm`, `alert` and `prompt` are unreliable in embedded browsers** —
`confirm` returns false without ever showing anything, which once made the
size buttons look dead. Ask in the page instead.

The simulation can be pulled out of the HTML and run headless in Node:

```js
const core = fs.readFileSync('index.html','utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];
const M = new Function(core + 'return {T,at,settle,tick,use,escapes,LAYER,FILM,' +
                              'RAINFALL,CELL,ZN,CLOUD_Z,CLOUD};')();
```

So a test always exercises the code that actually ships. **Never copy the sim
into a test file** — that is how the rules and the tests drift apart.

`window.POT` exposes the same handles in the browser, which is how the
renderer gets driven by hand — and how a board is built and screenshotted
headlessly with Playwright (Chromium with `--use-angle=swiftshader`).

---

## The five rules

This is the whole simulation. If a change cannot be stated as one of these,
it is a new rule and wants deciding rather than drifting into.

```
1  a rain tile drops 70 units on the column below it, every tick, and they
   STACK -- n of them drop n times the rain
2  one elevation step is 420 units; one water tile is 70 of them
3  a tile's HEIGHT is its stone plus the water standing on it
4  a tile with water pours into whichever neighbours stand lower, until
   it and all of them are at ONE HEIGHT
5  off the board is lower than anything, and that share is gone
```

**A tick is one STEP, not a solve.** Water moves one hex per tick and no
further, so a basin far from the rain fills slowly as the water walks to it.
An earlier build solved instead — escape levels, basins filled to a level in
a single pass, a film of water held against gravity — and all of that is
gone.

Rule 2 is a **display quantum only**. A tile draws `floor(water/70)` water
tiles stacked on it, so anything under 70 units is held but not drawn, and a
tile can carry 100 units and show one. Water itself is a real number; nothing
routes on the quantum.

**420 is the lowest common multiple of 2 through 7**, and a tile shares what
it sheds between itself and up to six lower neighbours — so every *first*
split lands on a whole number whatever the neighbour count. It stops being
exact at the second division, so water is still a float. 420 only makes the
readings you actually look at legible: where 72 units read 1.714, 420 reads
10.

### The two things rule 4 does not say, and has to

**How much it sheds.** Read as *hand over the whole contents*, a brimming
basin empties in a single tick: at the rim all six neighbours become lower at
once, all 490 units leave, 82 to each, and the lake vanishes and begins again
forever. Read as *hand over the whole difference* it overshoots by exactly
double, so a pair of tiles swap heights and swap them back — boards were
still sloshing 44 units a hex two thousand ticks after the rain stopped.

**The level is found, not computed from a formula.** Walk the lower
neighbours from the lowest upward, each joining the pour as the surface drops
past it:

```
what the tile gives up  =  what the neighbours below L take in

      H - L             =   sum over aj < L of (L - aj)
```

With the first `m+1` neighbours taking part that is `L = (H + Sm) / (m + 2)`,
and the walk stops at the first `m` where `L` actually lands between that
neighbour and the next. Everyone finishes at the same height, so nothing can
overshoot anything.

**It cannot give more than it has.** If the level would take it below its own
stone it empties instead, and the receivers level among themselves with what
there was.

**A void neighbour is bottomless**, so under levelling it takes the lot and
none comes back. That is rule 5.

An earlier version levelled with only the HIGHEST lower neighbour and then
split that amount equally between all of them. That is the same answer
whenever the lower neighbours are all at one height, and wrong whenever they
are not — a tile with three neighbours at its own stone height and two a full
two elevations down stopped shedding the moment it matched the near ones, so
a block of water sat on it handing out equal dribbles instead of pouring over
the drop. Measured on that board: 430 of its 490 units stayed put and every
neighbour got 10. Levelling with all of them sends all 490 into the two deep
ones, 245 each, and the near three correctly get nothing — there is not
enough water to fill the holes up to their level.

### The whole board is read from one snapshot

Every tile decides from the state at the start of the tick, and the writes
land afterwards, so no tile can see another tile's move inside the same tick.
Taken in place, the answer would depend on the order the tiles were visited
and a symmetric board would shed lopsidedly — the same bias that once made a
symmetric peak grow its apron always to the east.

Checked: on a flat board the distinct depths per ring come out 1, 1, 2, 2, 3,
3, 4, which is exactly the number of symmetry orbits in each hex ring. Not
approximately symmetric — symmetric.

---

## Where the time goes

Profiled at radius 64 on a busy board, `settle()` was **84% of the tick** —
and not for the reason anyone would guess. It read the same hex's surface
height about **twenty times**: six in the neighbour scan, a dozen more inside
the `low.sort()` comparator, six again building `hs`. And `h` is not a field
but an `Object.defineProperty` accessor over the cell stack, defined per
object, so none of those calls inline.

```
  20 x gnd() per hex               11.89 ms      <- 80% of settle
   1 x gnd() per hex                0.62 ms
  20 x t.h  (accessor)              8.88 ms
  20 x t.sed (plain property)       3.92 ms
  n x ([] push + sort6)             2.41 ms
  T.map(t=>t.pool)                  0.23 ms
  new Array(n).fill(0)              0.01 ms
```

Two changes, both exactly behaviour-preserving:

- **every surface height read once** into a `Float64Array` at the top of
  settle. The ground cannot change inside settle, so this is the same numbers
  by construction;
- **the neighbour scan and the sort are one pass** over fixed six-slot
  scratch arrays. Six slots at most, so each lower neighbour is dropped into
  place as it is found. Insertion sort is stable, as V8's sort was on an array
  that small, so ties still keep ring order. This also removes the `[]` and
  the `.map()` per WET hex — about nine thousand small allocations a tick at
  radius 64.

```
              settle     carry   weather      tick
  radius 64
  before       20.28      0.86      0.36     21.06
  after         3.02      0.67      0.31      4.36     4.8x
  radius 24
  before        1.68      0.07      0.07      1.83
  after         0.35      0.06      0.06      0.50     3.7x
```

Verified rather than assumed: 40 boards × 200 clicks × 120 ticks at radii 8,
12 and 24, diffing `h`, `pool`, `flow`, `sed`, `sand`, `wear`, `grit` and
`out[6]` to twelve decimals against the previous commit. Identical on every
board, every field.

**The whole-board allocations are not worth touching** — `T.map(t=>t.pool)`
and `new Array(n).fill(0)` together cost 0.24 ms of a 14.8 ms settle, which
is the opposite of what the obvious guess says. Noted here so nobody spends
an afternoon on them.

Still on the table, unmeasured: `rebuild()` at 32 ms calls
`computeBoundingSphere()` on four instanced meshes, each walking every
instance, although the board's extent is known analytically and fixed. It
only fires once a step, so it is a tenth of what a 100× step now costs — real
but no longer the thing in the way.

---

## Layout

```
index.html            everything — sim, renderer, UI
  /*==CORE-START==*/  the simulation. Pure, no DOM, no three.js.
  /*==CORE-END==*/
                      below this line: the three.js renderer and the UI
vendor/               three.js r185.1, ESM only (no UMD build exists)
test/rules.test.js    STALE — written against the sim as it was several
                      rewrites ago and does not run. Tests are the user's.
```

Keep the CORE block free of anything that touches the DOM or three.js. That
separation is what makes headless testing possible.

---

## The one property that matters

**The board is a pure function of two stored values per hex.**

```
STORED   h      ground height, whole steps        (in the cell stack)
         pool   how much water stands on it

DERIVED  out[6] how much water left through each of the six edges
         flow   their sum: how much CROSSED it this tick
```

**`flow` is throughput, and it is a different number from `pool`.** The tile
under a rain cloud holds nothing and passes 70 units a tick; a full lake holds
five thousand and passes none. `pool` calls both of them wet. Nothing reads
`flow` yet — it is kept because it is the expensive half of erosion (erosion
is throughput times drop, so moving water cuts and standing water does not),
because a river is a tile with throughput rather than a wet one or a sloped
one, and because it is what would let moving water be drawn at all.

It is kept as **six per-edge amounts rather than one scalar**, because
summarising at capture time is the mistake that would need undoing. The
throughput is their sum. Their *vector* sum, over the throughput, gives
**focus** — 1.0 when every drop went the same way, 0.0 when it went out evenly
and the vectors cancelled. That is the thing throughput alone cannot say: a
rain tile on a plain carries 73 units a tick and one in a trench carries 70,
and they read `0.00 spreading` against `1.00 one way`. **A river is ground
where the water all goes one way** — not wet ground, and not sloped ground.

Keeping the six also preserves a **fork**, which a vector sum destroys: water
splitting to two opposite sides cancels to focus 0.00 and reads exactly like a
sheet, but the edges show `35 0 0 35 0 0`.

It is derived, never stored: recomputed from the same state every tick, and
zero on a board at rest. **A smoothed or running value would be stored state**
— keep it instantaneous and let the renderer do any smoothing.

Nothing else is remembered. Solve the same ground twice and you get the same
world. Two corollaries worth keeping:

- **The board is still when idle.** Take the clouds away and nothing moves.
  Measured: 0 of 300 boards drift.
- **Water is conserved exactly.** It is created only by clouds and lost only
  over the edge. Measured: 0 ticks in 300 boards × 85 created any.

`h` is not a plain field — it is an accessor over the **cell stack**, a
`Uint8Array` of 469 × 192 cells with a `TOP` cache. A cell is one of:

```
BEDROCK  the floor. Nothing in the simulation may weather or move it; only
         the player can. Every board starts as a slab of it.
ROCK     ordinary stone. Weathers into slag.
CLOUD    a rain tile, which lives in the same stack
```

**SLAG is not a cell.** It is loose material and it will move, so it is an
*amount* per column like water — `t.sed` — drawn in the same 70-unit courses.
Cells are for structure, amounts are for what flows. `gnd(i)` is `h + sed`,
and everything that used to compare `h` compares that.

## Weathering

Rock breaks down into slag where it is exposed. **It moves nothing** — the
column is exactly as tall afterwards, the top of it has simply stopped being
hard and started being loose. Only transport changes the shape of the land.
That keeps two rates from being conflated and means weathering alone can never
quietly eat your terrain.

**Bedrock never weathers.** That is the whole of what makes it bedrock, and
why a board floored with it cannot wear away to nothing.

**Self-limiting in slag depth** — `rate = WEATHER / (1 + sed/SHIELD)`. A
blanket of rubble shields the rock beneath it, so a peak with nothing to carry
its debris away acquires a coat and then stops. *Weathering alone cannot lower
a mountain; you have to route water over it.* That is real, and it is what
makes the two rates interact rather than run independently.

A slab cannot half-convert and there is no randomness here, so `wear`
accumulates against the top one and the cell flips when it fills.

Measured on six slabs of rock over bedrock at 0.7 units/tick: the first slab
converts at tick 100, and the shielding stretches the next three to roughly
250, 450 and 700. After 200,000 ticks all six are slag, the ground height has
not moved by a unit, and it has stopped because the top is bedrock.

## Transport

**Slag rides the water's own routing.** `out[6]` already says how much water
left through each edge, so slag goes the same way in the same proportions — no
second routing, no suspended load to store, and slag can only move where water
actually moved.

The force on an edge is **stream power**: how much went through it times how
far it dropped, both in slabs, so one slab of water down a one-slab step is
exactly 1. Below `THRESH` nothing shifts.

**That threshold is why deposition needs no rule of its own.** Where the water
slows or the ground flattens the power falls under the bar and the slag stays.
The drop is capped at one elevation — a waterfall does not carry sediment in
proportion to the whole height of its cliff, and without the cap the void off
the board is infinitely far down and would take an infinite amount.

Measured, and three of these were predictions made before the code ran:

- **Conservation is exact.** 4000 ticks on a rough board: 40,740 units of rock
  lost, 38,389 still lying on it, 2,351 gone over the edge. Never negative.
- **Basins silt up.** A two-elevation pit at the foot of a cone: slag goes
  0 → 842 units while the water in it falls 951 → 118. Flow inside a lake is
  nil, so anything carried in is trapped the moment it arrives. It plugs.
- **Fans, not floodplains.** A ramp down to a plain: nothing on the steep
  upper slope, a peak of 232 units two hexes past the break of slope, tailing
  to nothing before the plain proper. Water levels rather than channelises, so
  the per-edge force collapses as it spreads.
- **Transport unlocks weathering.** Same board, 8000 ticks: 40,880 units of
  rock lost with transport on against 25,480 with it off — **1.60×**. The
  shield is lifted as fast as it forms, so bare rock keeps being re-exposed.
  The two rates genuinely interact rather than running side by side.

## Sand

**Sand is made by travelling, not by weathering.** A share of the slag that
*moves* is ground down on arrival — attrition. It needs no new driver, since
how much moved is already known, and it gives **downstream fining** for
nothing: coarse slag near where it broke off, fine sand further out.

Sand is terminal. It grinds into nothing and only goes on moving, and it is
freer than slag: the same law with the threshold divided by `MOB` and the
carrying multiplied by it, so one knob says how much livelier it is rather
than two saying it over again.

Both are read from **one** snapshot of the ground and written afterwards, so
moving the slag cannot change what the sand thinks the ground is.

Measured on a ramp down to a plain, 10,000 ticks:

```
   q   ground   slag   sand
  -4    368.3  158.0    0.3
  -2    283.3  282.8    0.5
   0    213.9  213.7    0.1
   2     99.0   77.1   21.9
   4     27.4    0.0   27.4      sand only, no slag at all

centre of mass:  slag q = -1.37    sand q = +3.01
```

Sand ends up **four and a half hexes further downstream** than slag, and the
last hex that has anything on it has only sand. Conservation is exact across
all three: 58,660 units of rock lost = 51,181 slag + 240 sand + 7,239 over the
edge.

## Life

Back, and stated as three rules so it can be argued with like the water:

```
6  a hex is HABITABLE when it has a course of loose ground to root in, is
   not drowned, and has water in reach -- a shore or a bank
7  life spreads one hex a tick, to any habitable hex beside a living one;
   a hex that stops being habitable dies that tick
8  life binds the ground it stands on: a living hex sheds no soil and
   weathers no rock
```

In the board's own numbers: `soil = sed + sand >= LAYER` (one course, the
quantum that decides whether it is drawn), `drowned = pool >= LAYER`, a
*shore* is a drowned neighbour, a *bank* is a river edge (`out[k] >=
RIVER_MIN`) on the hex or a neighbour. `RIVER_MIN` moved into the CORE for
this; it was the renderer's stub threshold and is now a rule.

**Life asks for water you can see.** Water on flat ground is a film,
everywhere and invisible, so "any water near" would make the whole board damp
the moment a cloud was hung. Asking for a drawn water tile or a river stub is
what puts green along shores and banks and nowhere else, and it falls out of
the display quantum rather than needing the two-hex moisture aura that used to
do this and had to be tuned.

**Life is stored, like `pool`, not derived.** It walks one hex a tick the way
water does, and a patch cut in two leaves two patches that each remember
themselves. **Seed** is on the palette: Place roots one hex if it is habitable
and is not an action otherwise; Erase clears it. Nothing germinates on its
own — where you sow is the decision. The readout says why a seed would not
take: `drowned`, `bare`, `dry`.

`grow()` is `habit()` run over the board and has to agree with it on every
hex; a test checks that (0 disagreements over 595,800 hex-ticks). It is
written longhand because the obvious version cost **4.5 ms a tick at radius
64** against 4.4 for the whole of the water — it asked every hex's six
neighbours for their six edges. Reading the two per-hex facts once and only
looking at hexes alive or beside something alive brought it to 2.7 ms with
nothing alive, and it scales with the frontier, not the board.

Measured:

- **With no seed sown the board is unchanged**: 40 boards × 200 clicks × 120
  ticks at radii 8 and 12, identical to the previous commit to twelve
  decimals on every field.
- **A settled lake, a course of soil on its rim, one seed**: alive per tick
  3, 5, 7, 9, 11, 12 — the whole 12-hex shore, one hex a tick each way. 600
  ticks on, 0 state changes. Rain back on, the lake stands proud of its rim
  and the shore still holds: 0 state changes in 300 ticks, rim pool 0.
- **Cut the lake an outlet** and the one rim hex that became channel drowns
  and dies; the other 11 stay, because the bowl is still a lake while it
  drains.
- **Roots hold slag**: one slab of ground with three courses of slag under a
  cloud, pouring 70 units a tick through one edge. Bare: 0 left after 200
  ticks. Green: 169 of 210 stay.
- **Roots stop weathering**: six slabs of rock at ten times the default rate,
  600 ticks. Bare: the rock is gone to bedrock. Green: still 1.000.
- **Symmetric**: six seeds on the six corners of a rim green 12, 12, 12 —
  multiples of six every tick.
- 0 of 300 ticks created water with life on.

**Bloom** is the count of living hexes, shown at the bottom right of the
board — the seed of the score; see *Harvest* and *The run*.

**Life keeps its own clock.** Water and soil move every tick; life steps
every `LIFE_EVERY` (10). Once the world ran on its own a seed that walked a
hex a tick covered a shore in a breath; at one step in ten the same 12-hex
rim greens over 56 ticks instead of 5 — about half a Season. `TICKS` is
saved with the board so a loaded game keeps its phase.

## Harvest: Bloom and the Wonders

The score reads the world and nothing else. **Bloom = living hexes × (1 +
the sum of the Wonders standing)**, where a Wonder is a *shape* the water
has made, detected from what the board already stores or derives: Lake,
Great Lake, River, Waterfall, Fork, Delta, Island, Ring of Life, Grove,
Terrace, Highland Meadow, Watershed. Life is the count; the world is the
multiplier; keeping them apart is what stops "cover everything in moss"
being the best play. Every detector is a pure read and runs only at
Harvest or on request — 14 ms at radius 64.

**Rivers pulse.** In a channel one hex wide the snapshot has alternate
tiles pouring on alternate ticks — 65, 13, 65, 13 along a trench — so a
river chain that demanded every tile clear `RIVER_MIN` every tick never
found one. The walk follows the strongest outflow and lets one quiet tile
sit between two loud ones. The drawn stubs pulse the same way; smoothing
that is the renderer's business, not the rule's.

At the turn of every Year the clock stops and the **Harvest** screen reads
the pot out line by line, lights the Wonders standing in the **Codex**
(everything ever found in this browser, in `localStorage`), and waits for
a click. The bench has a *harvest* button to read the arithmetic at any
moment. Measured: the seeded bowl scores Lake + Ring of Life + Grove,
12 × 2.75 = 33.

## The run: mana, the bar, Spring, and Gaia's Whim

The first playable, built as one block because none of its parts is fun
alone. **Eight Years in one pot.** Each Year grants **10 mana**; Dig and
Raise cost 2, Rain 3, Sow 1, and clicking Rain on a cloud takes it away
for nothing. At the turn of the Year the Harvest is read against the
Year's **target** — 8, 15, 25, 40, 60, 90, 130, 180 — and a miss ends the
run on the **Behold** screen, gently. Clearing it earns **Dew** (2 plus
surplus over five, cap 10, plus interest), and **Spring** offers three
**Boons** and two **seed cards** from the run seed; reroll costs 2, five
Boons at most. The first six Boons are Monsoon, Wellspring, Long Summer,
Deep Roots, Basalt Heart and Lake Heart; each reaches the simulation only
through a lever it already has (`RAIN_MULT`, `FLOOD_TOL`, `BONUS`).

**Life has three kinds**, each one clause on rule 6: Grass is the rule as
stated; **Moss** roots on bare rock with no soil and is worth half; **Reed**
stands one water tile deep. `life` holds the kind, so patches stay what
they are and spread as what they are (GGGGmGmmmmmm on a half-soiled rim).
The deck starts Grass, Grass, Moss; the hand is the deck each Year; sowing
spends a card. Bloom counts *worth*, not hexes.

**Gaia's Whim** is earned, never scheduled: the first Lake, the first
River and the first Ring of Life each turn the wheel once. The wheel picks
a force from the run seed — Meteor (aimed: a crater two steps deep with a
ring of slag), Megatime (a hundred ticks in a breath), Monsoon (twice the
rain for a Season) — and the player aims it. It never scores. The Harvest
has the floor at the turn of the Year, so the wheel waits.

The run seed is `?seed=`; it fixes the shop and the wheel, nothing else.
Checked in the browser: dig + rain 10 → 5 mana, sow → 4, a fifth click
refused; the Whim fired on the first Lake and gave Monsoon; Year 1 cleared
with 5 Dew, Monsoon bought, Year 2 opened with 10 mana and a fresh hand;
an idle pot rests at Year 1 with Bloom 0.

## Mana is a rate, not a lump

A debt A1 ran up. Spreading the timescales made a Year **1920 ticks instead
of 480** — four times longer, 5.3 minutes instead of 4 — while the allowance
stayed at ten, granted on the first tick. So the Year opened, you spent it in
half a minute, and then watched for five minutes with nothing to do. The
playtest put it plainly: *manamız hemen bitiyor.*

The allowance still arrives whole at the turn of the Year, and it now also
**refills at one every quarter Season** — four a Season, sixteen a Year —
capped at the allowance. Spend it in a burst and it comes back; hold it and
nothing is wasted. You are never stuck longer than 120 ticks, 20 seconds at
1×, and the panel says how long: *+1 in 97 ticks*.

Measured over one Year: **5 actions before, 13 after.**

This is the honest fix rather than raising the number. The problem was never
how many actions a Year holds — it was that they were all offered at once and
then never again. The refill is counted from a stamp rather than by a
countdown, so it stays right across a Megatime jump.

## A disabled button has to say why

The playtest reported that the Whim *"does not open on the first click"*. It
was not a click that missed: the token was on its Season cooldown and said
**"the world is still settling"**, which is a mood, not a reason. A disabled
control that will not say why reads as broken.

Every reason it can be holding now gets its own sentence, checked in order:

```
  nothing earned yet          no token banked
  the Year is turning         the Harvest has the floor
  in a moment                 a screen is open, or a force is being aimed
  ready in 480 ticks          the Season cooldown, counted down live
```

Verified in all five states, including the one tick either side of the
cooldown.

## The waterfall, finally drawn

River stubs are drawn **flat, at the height of the water already showing on
their own tile**, and never sloped — a deliberate old decision, because
sloping them looked wrong. The consequence nobody had noticed: water arriving
at a cliff simply *stopped*, and the playtest asked, reasonably, where the
waterfall pours from. The answer was nowhere. It was never drawn.

The data was always there — `out[k]` says how much left by edge `k`, and the
neighbour's own drawn surface says how far it fell. What was missing was the
drop between the two.

**A fall gets its own flow bar, `RIVER_MIN/3`, because a fall is a drop
feature and not a river feature.** Measured on a four-elevation cliff with a
trench feeding its lip: the lip was sending water over a **2.83-elevation
drop** through two edges at **0.077 and 0.065**, against a river bar of
**0.0833** — so neither edge was a river and nothing was drawn, on exactly
the board a player would point at. Splitting two ways is what a lip *does*;
the per-edge river bar is right for calling something a river and wrong for
asking whether water is falling.

Drawn as a **flattened prism turned to face the flow** — wide across the
water's path, thin along it — rather than a quad, because a quad goes
edge-on and this camera orbits. It hangs at 0.58 out from the hex centre
rather than at the edge midpoint of 0.433: put on the edge it is swallowed by
the source hex's own column face and only its top speck shows, and hanging
just clear in the air over the drop is what a waterfall does anyway.

Verified: the instance comes out **0.93 world units tall** for a measured
1.02-unit drop, and projects to **68.7 screen pixels** against a hex's 49.2 —
so it reads at the scale the board is actually played at.

## The Whim is banked, not fired at you

Opening the wheel the moment a Wonder appeared was the mistake. With twelve
milestones on a half-second check, three Wonders forming in the same breath —
which is exactly what happens when a lake finally settles and its rim is
already green — opened **three modals back to back**, and you could not act on
the first before the second arrived. The playtest hated it enough to consider
cutting the wheel.

Cutting it would have been the wrong fix. **The wheel was never the problem;
being interrupted by a gift was.** A Wonder now lights a token, the token
waits, and you turn the wheel when you want it. Three things fall out at once:

- the interruption goes;
- extras **queue** instead of colliding;
- a force can be **saved for the moment it is worth most**, which makes it a
  better prize than a modal ever was.

On top of that, **one a Season**, so a run cannot be handed twelve forces in
the first Year just because the board got busy.

Measured on the exact case that used to break — a filled basin with a soiled
green rim, giving Lake, Ring of Life and Grove together:

```
  wonders standing        {lake:1, ring:1, grove:1}
  modals opened            0        (was 3, back to back)
  tokens banked            3
  the token reads          "Gaia's Whim - The first Lake - +2 waiting"

  click it                 wheel opens, 2 left
  immediately after        not ready, "the world is still settling"
  470 ticks later          not ready
  490 ticks later          ready, "The first Ring of Life - +1 waiting"
```

It sits on the left under the panel, where it is visible without covering the
board and without being under a click. `tokenReady()` also holds it back over
any screen, while a force is being aimed, during a strike, and in the last
tick before a Harvest — the Harvest keeps the floor it always had.

## The timescales, spread apart

The pacing complaint — *"either it crawls or a Season ends while I look
away"* — was not the speed buttons. Measured headless out of the CORE that
ships, on the build before this one:

```
  process                      ticks   in Seasons
  a bowl fills                    85       0.71
  life covers a lake rim          61       0.51
  one slab of rock weathers      100       0.83
  ONE SEASON                     120       1.00
                                          ------
  slowest / fastest                        1.64x
```

**There was only one timescale in the game.** Everything happened within a
factor of 1.64, and all of it took about a Season — so every speed setting
made *everything* fast or *everything* slow. At 1× you waited a minute for a
puddle; at 10× the Season was over before you looked up.

Good pacing is **nested** scales: something moves every few seconds,
something turns every minute, something changes over the whole run. Then
whichever speed you pick, something is moving and something is holding still.

So the Season is four times longer in ticks, the clock runs three times
faster in real time, life steps a quarter as often, and weathering is
fourteen times slower. **Water is untouched** — it was already the fast thing
and it was already right.

```
                          before            after
                     ticks  Seasons   ticks  Seasons   sec at 1x
  a bowl fills          85    0.71       85    0.18       14
  life covers a rim     61    0.51      241    0.50       40
  one slab weathers    100    0.83     1400    2.92      233
  ONE SEASON           120    1.00      480    1.00       80
                            ------           -------
  spread                     1.64x           16.47x
```

**Life is unchanged in Seasons** — 0.51 before, 0.50 after — so Bloom per
Year does not move and the target curve stays valid. That was the point of
tuning in Seasons rather than in ticks.

**Weathering is the one that really slows.** Soil is now something the land
does over a Year rather than over a Season, which is what makes **Moss the
early game and Grass the reward for lasting**: moss needs no soil and takes
from the first tick, grass needs a course and now waits about three Seasons
for it.

A Year is 1920 ticks, 5.3 minutes at 1×; eight Years is about 43 minutes.

The speeds are **1, 2, 4, 8**. They were 1, 3, 10, 30 — three-fold jumps,
which is why there was never a setting between *too slow* and *the Season
just ended* — and they are labelled with the number now instead of one, two
or three play glyphs.

## Three things the first full run put on trial

The run was liked and the diagnosis was that it is **front-loaded**. Two of
the three changes below are experiments with a switch on them, not decisions,
because the things they touch were locked by assumption rather than by
measurement. Both switches stay until a run has been played each way.

### Mana can be switched off

The claim being tested: **mana solves a problem this simulation does not
have.** The world already limits you by how fast it answers — a lake takes a
Season to fill however many times you click. A budget on top of that is a
second, artificial scarcity, and it is the artificial one that makes you sit
on your hands.

The arithmetic: ten mana a Year against costs of 1 to 3 allows **five or six
actions across 480 ticks**, which at 1× is one decision every forty seconds.
The rest of the Year is watching at 10×, so *the world running on its own* —
the best thing here — becomes a loading screen.

`?mana=free` starts a run without it and a corner button switches it mid-run,
so both can be felt in one sitting. **The seed deck is left alone on
purpose**: three sows a Year is a different mechanic, and moving two limits at
once would muddy the answer.

The question to answer is narrow: *with it off, are you still thinking?* If
yes, the real constraint was time and the budget was in the way. If you start
clicking at random, mana was right and it comes back.

### Drainage is a lens the player holds

It was a toggle in the View panel, and the View panel is hidden in play. So
the one thing that answers **"where will the water go" before a drop has
fallen** was computed by the engine every time it was asked and never shown
to the player. Measured earlier against where the water actually went: seeded
from the clouds it scores **0.76** by rank correlation. That is not a debug
view, it is the read the whole game is about.

It sits **beside** the tools rather than among them — same row, round instead
of square, no cost badge — because it is not a tool: it costs nothing, acts
on nothing, takes no tick. It is there rather than with the bench buttons in
the corner because it is pressed while you are deciding where to dig, and
that is where the eye already is. `D` toggles it. The bench toggle and the
lens drive each other, so they cannot disagree about one `DRAIN` flag.

### The Omen is the spine, and the bar is a measure

Eight Years with a rising number and nothing else to aim at gave the run
difficulty and no direction. **The Omen is what a Year is for**; the target is
now a measure rather than a gate. Missing it costs that Year's dew and
nothing else, the run is always eight Years, and it ends on Behold with the
world you made.

- The Harvest leads with the Omen, above the reading rather than below the
  target, and the target is a soft footnote: *Target 25 — short by 25*.
- Behold opens with **Omens met: 2 of 3**, then the Bloom curve.
- **Year 1 has no Omen.** It is the Year the four verbs unlock one at a time,
  and a goal screen on top of the tutorial is noise.

`?bar=hard` puts the old fail state back, so the two can be compared rather
than argued about. Checked both ways: missing the target with the soft bar
gives *The pot goes on. No dew this Year.* and a Spring button; with
`?bar=hard` the same board gives *The pot rests.* and Behold.

### A trap that cost a debugging cycle

Three guards read `typeof RUN !== 'undefined'`. **`typeof` on a `const` in its
temporal dead zone does not return `'undefined'` — it throws.** They worked
only because the module always finished evaluating before the first interval
fired. The moment anything below threw during evaluation, the 100 ms interval
spewed the same `ReferenceError` ten times a second and buried the real
error. A hoisted `var` sentinel cannot dead-zone, and that is what they use
now.

This is the second time the same shape has bitten: `window.POT` is built
before the POST block, so `TILT` and `renderer` had to be exported as getters
for exactly the same reason.

## Omens: the Year asks for one thing

The other half of the front-loading. Eight Years with a rising bar and
nothing else to aim at gave the run *difficulty* and no *direction*: the
playtest said no quest ever arrives. The Codex now says what a Wonder is; the
Omen says which one Gaia wants **this Year**.

It is a **pure read of the same Harvest the score comes from** — no new state
in the world, no new detector, nothing random after the run seed. Four
shapes, all answered by `harvest()` as it stands:

```
  stands   one named Wonder is standing          h.wonders[k]
  many     n of one that can repeat              h.wonders[k] >= n
  living   n living hexes                        h.alive >= n
  variety  n different Wonders at once           keys(h.wonders).length >= n
```

**Three are offered and one is chosen**, because a goal you picked is a plan
and a goal handed to you is a chore. The choice is the mechanic, not the
reward. There is a *None this Year* out, so it never becomes a tax.

**The pool grows with the Year**, which is where the variety actually comes
from: early Omens ask for the easy Wonders and a handful of green, late ones
ask for Deltas and Watersheds. Measured on seed 42:

```
  Year   pool   offered
   1       8    The Lake stands (+4) · The Grove stands (+3) · 2 Wonders at once (+7)
   3      14    2 Forks at once (+5) · The Terrace stands (+4) · The Grove stands (+3)
   6      18    40 living hexes (+7) · The Ring of Life stands (+6) · 3 Waterfalls (+9)
   8      18    The River stands (+4) · 3 Waterfalls (+9) · 3 Deltas at once (+12)
```

The reward is dew, scaled off the Wonder's own `BONUS`, so the hard shapes
pay more without a second difficulty table to keep in step.

**It sits on the screen all Year**, in the panel under the mana, because a
goal you cannot see is not a goal. It is read at the Harvest, shown as its
own row, and cleared. Checked both ways: with no life on the board the row
reads `Omen · The Grove stands. —` and the dew does not move; with seven
living hexes joined it reads `+3 dew` and dew goes 0 → 3.

It **pays whether or not the target was cleared** — it is a thing you aimed
at and made, and the bar is a separate question.

The Year now opens Harvest → Spring → Omen → play, rather than Harvest →
Spring → play.

## Tilt-shift, and this time you can see it

A playtester asked for tilt-shift on a build that already had one. They were
right to: it was a 5x5 kernel with a radius of at most **1.8 pixels**, ramping
in only past `|uv.y - focus| > 0.15` and reaching full strength at the very
top edge of the screen. It cost a pass and did almost nothing.

**The fix is not a bigger single kernel.** Blur is separable, so N + N taps
buy what N x N would: at a radius that reads, one pass wants 9x9 = 81 texture
fetches a pixel and two passes want 18. So the scene now goes

```
  scene  ->  rtA  --horizontal-->  rtB  --vertical + grade-->  screen
```

Nine taps each way, `exp(-k*k/8)` weights — wide enough that the outermost tap
still carries weight, so there is no ring. The grade, the vignette and the
tone mapping stay in the last pass, where they have to be.

**The mask is a band in SCREEN space, not in depth**, and that is the right
model here rather than a shortcut: the board is a flat hexagon seen at a
slant, so screen height and distance are very nearly the same thing. A screen
band needs no depth buffer and no second render of the scene.

Measured on a board with a lake, two ridges and a crater, by the mean
absolute horizontal gradient of the final framebuffer over a band — detail
survives blur as gradient, so a blurred band scores lower than the same band
sharp:

```
                       bottom band   focus band
  off                      1.647        1.201
  the shader as it was     1.384        1.201
  now, default (7 px)      1.156        1.189
  strong (12 px)           0.965        1.182

  detail lost at the bottom of the frame
    as it was   16.0%
    default     29.8%      <- nearly double
    strong      41.4%

  detail lost inside the focus band
    as it was    0.0%      default 1.0%      strong 1.6%
```

So the near skirt of the pot loses a third of its detail while the middle of
the board loses one percent. That is what a tilt-shift is for.

**On a slider, not a constant**, the same reasoning as `WEATHER`: there is no
calibration for it and the only way to find one is to look at a board at
several settings. `tilt-shift` runs 0 to 16 px (0 is off) and `focus band` moves
the sharp strip up and down the frame, both in View beside the Diorama toggle.
`POT.setTilt(k,v)` is the console handle.

## The play screen says what is going on

Four things a playtester could not find out by looking, and the fix for each.
None of them is a rule; all of them were the screen failing to say something
the board already knew.

### Sow only unlocked for Grass, so Moss was unreachable

The worst of them, and a real bug rather than a presentation gap. The unlock
ladder asked `habitable(i)` with no kind, which is **Grass**, and Grass wants
a course of soil. A pot dug by hand has bare rock walls and no slag at all,
so on the boards people actually build the tool did not appear until
weathering had ground out a course — and the Moss in the *starting deck*
would have taken on that shore from the first tick.

Measured on a hand-dug hollow with water in it, weathering at the player
default of 0.7 units a tick:

```
  sow unlocks, asking about Grass only     tick 100      (0.8 of a Season)
  sow unlocks, asking about the hand        tick 1
```

A hundred ticks is exactly one course at 70 units and 0.7 a tick. The
playtest reported this as "I can never sow Moss anywhere"; the truth was that
the game never offered the tool. It now asks about **every seed in the hand**,
and the hint names the one that would take: *Sow Moss where it will take.*

### The pointer said one word, and it was the wrong one

The tip showed a single word — `habitable`, `drowned`, `bare`, `dry` — and
that word is the answer **for the seed you are holding**. On a bare rock
shore, holding Grass, it said `bare`, which is true and useless: it says
nothing about the Moss card in the hand.

It now names the ground and, when the ground refuses the seed held, names the
seed that would take:

```
  rock
  bare — Moss takes here
```

`surfaceOf()` reads the top of the stack the way the renderer does — standing
water first, then sand, then slag, then the top cell — so it answers *what am
I looking at* as well as *will this grow*.

### The panel did not show what you hold

It was a row of 15px dots and a seed number. A playtester could not tell how
much mana was left, and **could not see the Boons or the running force at
all** — a Whim was granted, the screen closed, and nothing anywhere said it
was in effect. The panel now carries the count as a number, the Boons held,
any force still running with the ticks left on it, and the seed cards left
this Year. The dock already greyed out what you cannot afford; the panel now
says so too.

### Where a Whim's force went

`RUN.until` is redrawn as the world turns, so a running Monsoon or Ages of
Frost counts down in the panel instead of being invisible for a Season.

## The Whim, opened up

The first playable had **three** milestones and **three** forces, and all
three milestones were *firsts* — the first Lake, the first River, the first
Ring of Life. Firsts all happen early. The playtest said the wheel came too
seldom, and the count says why: **at most three wheels in eight Years, and
typically all of them before Year 3.** After that the run had nothing new in
it at all; the only thing that changed in Years 5 to 8 was the target going
60, 90, 130, 180. Difficulty without novelty.

Measured, 200 seeds, a player buying one Boon a Year:

```
  Spring after Year   1     2     3     4     5     6     7
  Boons offered     3.00  3.00  3.00  3.00  2.00  1.00  1.00
```

So the shop dried up as well. The run was **front-loaded**: four verbs all
unlocked in Year 1, three wheels in Year 1–2, a Boon pool exhausted by Year 5,
three seed kinds offered two at a time forever.

**Every Wonder now turns the wheel the first time it stands in this run.**
Twelve of them instead of three firsts. It needs no new state — `RUN.whims`
was already keyed by name — and it spreads *itself* over the run, because the
easy Wonders (Lake, River) come early and the hard ones (Delta, Watershed,
Terrace, Highland Meadow) come late. Still earned, still never scheduled:
nothing here is on a calendar.

### Eight forces, in three shapes

Three was too few to be a wheel — the same handful all run. Nothing added
reaches the simulation except through a lever it already has.

```
  SPELLS   a Season long, and exactly reversible
    Monsoon         twice the rain                RAIN_MULT *2
    Ages of Frost   rock breaks down 4x as fast   WEATHER   *4
    Quickening      life steps every tick         LIFE_EVERY 10 -> 1

  AIMED    the player picks the hex; ONE tick however many hexes moved
    Meteor      crater 2 steps deep over r2, slag ring at r3   lower/sed
    Upheaval    the ground swells 2 steps at r0-1, 1 at r2     raise
    Landslide   6, 4, 2 courses of slag at r0, r1, r2          sed
    Cloudburst  12 courses of water over r2, at once           pool

  INSTANT
    Megatime    a hundred ticks in a breath
```

Measured on a flat pot (`h` was 1 everywhere):

```
  Upheaval   h by distance 0,1,2,3:  3  3  2  1     exactly 2 steps, then 1
  Landslide  sed in courses:         6  4  2  0     exactly as stated
  Cloudburst pool, after one tick:  10.29 6.29 2.00 4.00   spread by settle
```

**A spell fired while it is already running extends it rather than stacking
it**, which is what keeps the multiplicative `off()` exact. Checked: monsoon,
frost and quicken all on together give rain 2, weather 2.8, life 1, all three
expiring at the same tick; firing monsoon again leaves rain at 2, not 4; and
turning all three off returns rain 1, weather 0.7, life 10 — identical to the
values before, to twelve decimals.

The deadline lives in `RUN.until` as **data, not a stored closure**, so a
saved board could carry a force that is still running.

**The wheel offers three of the eight, drawn from the run seed.** All eight
was a wall of text and made every wheel look the same; three reads at a
glance, and the shortlist is itself part of what a Whim is.

**The lumpy-looking wheel was not a bug**, and this is worth writing down
because an afternoon was nearly spent on it. On seed 7 three consecutive
wheels offered the same trio and Monsoon was picked five times in twelve,
which looks exactly like `mulberry` correlating on nearby seeds. Over 400
seeds: repeated shortlists **8.8%** against **9.7% expected by chance** for
three-of-eight over twelve draws, and the picks give chi-square **7.3** on 7
degrees of freedom, where 14.1 is p .05. Burning eight outputs at
construction moved neither number. `mulberry` was left alone.

## The strike: a meteor you can see land

`meteor()` changed the board in one frame, which is correct and invisible.
The first playtest reported it "pek belli olmuyor" — you aimed, you clicked,
and the crater was simply *there*. The rule is untouched: the same two
elevations down over radius 2, the same ring of slag at radius 3. Everything
added is presentation, it hangs off `frame()` rather than off ticks, and it
touches no stored state, so the board is still a pure function of the
snapshot.

The sequence, measured by stepping `fx()` against a fake clock at 60 fps:

```
  t      bolide y   flash   shake   ring r   ring a
  0.07     18.83                                      falling, from over
  0.47     13.93                                      the sun's shoulder
  0.90      0.34                                      IMPACT: h 1 -> -1
  0.92        --     0.95    0.00     0.71    0.826
  0.95        --     0.85    0.83     0.93    0.778
  1.02        --     0.66    0.31     1.36    0.686
  1.27        --     0.00    0.01     2.99    0.394
  1.85        --                      6.80    0.026
  2.05        --                       off              ring done
  3.10      everything reset: striking false, scene at the origin
```

Peaks: flash 0.95, camera shake 0.94 world units, ring radius 8.1 — which
runs out past the rubble at radius 3 (about 5.2 units), so you see how far
it reached. The world is held still for the fall and put back the way it was
found, so pausing before a strike survives it.

**It is timed off the wall clock, not off accumulated frame deltas.** The
delta has to be clamped or one long frame teleports the bolide, and a clamped
delta makes the fall take *longer the slower the machine is* — at 10 fps the
first version took 6 s instead of 3.1. One `t0` for the whole sequence also
means a tab hidden through the strike comes back to a finished crater rather
than a bolide parked in the sky, because the impact fires on the first frame
past `FALL` however late that frame is. Verified: hidden through the whole
sequence, the crater is `h = -1` on return and nothing is left running.

**The flash is a DOM layer, not a shader uniform**, so it reads the same
whether the post pass is on or off, and it blooms from where the hex projects
on screen rather than from the middle. The shake moves `scene.position`
rather than the camera, because `controls.update()` owns the camera and would
fight it.

The caption sits at 74px, clear of the hint pill at 22px; at 52px the two
collided and "METEOR" read as a smudge under the hint.

## Player mode: powers are earned

The first playtest stalled at the first click — "what do we do now?" — and
the answer was that the side panel is a developer bench and none of it
belongs in front of a player. The page now opens as a game: a fresh pot
of one step of **rock** over the bedrock (bedrock never weathers, so a pot
of pure bedrock could never grow soil), weathering at 0.7 units a tick (ten
times the bench default), one big button, one line of text.

**Nothing unlocks on a timer.** Each tool appears when the world reaches
the state it is for, the way Gaia's Whim will fire on a milestone: dig from
the start; rain at the first hollow; the speed buttons at the first water
tile; sow at the first habitable hex; raise at the first living hex. One
hint at a time, and it goes when the world has answered it. A one-word tip
beside the pointer says why a seed would or would not take. Strings are English only.

Measured headless: a dug, rained-on hollow has a habitable shore at tick
98 (0.8 Seasons) at 0.7 units/tick; 199 at 0.35; 49 at 1.4. The chain
dig → rain → wait → sow → raise checked on the served page and on
`pot.html` from `file://`, no errors.

## Time: the world breathes

The simulation never stops. `BASE_RATE` is two ticks a second at 1×, the
speeds are 1, 3, 10 and 30, and pause is a courtesy nothing forces you to
press. Actions cost nothing in time. A **Season** is 120 ticks, four to a
**Year**, shown in a clock over the board; the number is calibrated so one
cloud fills a seven-hex bowl two steps deep in about a Season. The tick
loop runs on a 100 ms beat with a fractional accumulator and rebuilds once
a beat, not once a tick.

This replaced a world that stood still while you thought and moved one
tick per click. Right for a bench, wrong for a game: the thing worth
watching is the world answering you, and a world that only moves when
poked is a board, not a place. Checked headless: 5 ticks in 2.6 s at 1×,
40 more in 2.1 s at 10×, none while paused.

Harvest, mana and the bar are not here yet — see `design/mechanics.xlsx`,
which is the step-by-step plan and the record of what each step measured.

## Abrasion — tools and cover

Weathering on its own is **water-blind**. Water's only role was to carry slag
off, which lifted the shield, and that indirect effect was the whole of the
incision contrast: a cone under rain wore down as a dome with faint grooves,
the wettest hexes losing only **1.22×** what the driest did.

Abrasion is grit dragged across bare rock grinding it. That is how a river
actually cuts — one carrying nothing barely incises at all.

```js
wear += (WEATHER + ABRADE * grit) / (1 + sed/SHIELD)
```

**The same shield divides both terms, and that is not tidiness.** A thick bed
of rubble means the grains bounce on rubble rather than stone, so sediment is
the *tool* and also the *cover*, and incision peaks at middling supply rather
than climbing for ever. Both halves of a real model out of one number we
already had.

`grit` is last tick's, since `carry()` runs after `weather()`. A tick of lag
at these timescales is nothing.

Measured on a rock cone, 16,000 ticks, ring at radius 5:

```
  ABRADE            wet     dry   incision
  off  (0)         1120     917     1.22×
  default (0.07)   1449    1015     1.43×
  strong  (0.25)   2079     770     2.70×
  maximum (0.50)   2240     728     3.08×
```

The **dry** column falls as abrasion rises. Channels cut faster, make more
slag, and it settles on the ridges and shields them — the coupling running in
both directions at once. Conservation is untouched: at `ABRADE` 0.30 over
6,000 ticks, 63,560 units of rock lost against 60,273 still on the board plus
3,287 over the edge.

`WEATHER` is a slider, not a constant, because there is no calibration for it
yet and the only way to find one is to watch a board at several settings. It
runs 0 to 0.7 units/tick, default 0.07 — one slab per thousand ticks, which
at 1× is a minute and a half and at 100× is about a second.

`BASALT` went with the lava that made it, several rewrites ago. A **run** is
an unbroken stretch of *one* material, so a rock slab lying on bedrock draws
as two prisms and the join is visible. Clouds live in that same stack, which is why a cloud is a thing
in the world you can see rather than a flag. Their band starts at elevation
**17**, well clear of the highest ground a player can build (12), and runs to
the top of the stack — so twelve is the tallest a cloud can get, which is
exactly the largest intensity. **A rain tile is a material, not a power**: Place lays them down and they
stack, Erase takes them away. **Subduct never touches the sky** — it means one
thing, lower the ground, and you can dig under a cloud freely.

Erase is the mirror of Place and reads the same palette: it removes up to *n*
slabs of *that material* from the top and stops the moment the top is
something else. Erase rock and the bedrock beneath is safe; erase cloud and
the ground is untouched. That is what separates it from Subduct, which is
blind.

Two arrangements were tried and discarded before this. A Cloud *power* that
set the stack to the chosen height and cleared it when already there — a
toggle whose meaning depended on what was already on the hex, so clicking
three-then-three gave three, not six. And Subduct removing clouds first, which
made stacking work but meant you could not dig under a cloud at all.

The drainage overlay seeds from the count, not from the presence, so a triple
cloud weighs three times as much.

**A cell is a slab of 70 units** — a sixth of an elevation step, the same
quantum a water tile is drawn at. It used to be a whole elevation, which was
fine while only the player moved ground; erosion moves it by fractions and a
staircase of 420-unit steps cannot express that. Everything stays *integral*
this way: no float ground, no continuous height to keep in step with a render
cache. The stack is the representation, a material sits in a cell rather than
being a number smeared over a column, and overhangs and caves stay reachable.

Two traps in that change, both of which fail silently: `TOP` must be `Int16`,
because 192 does not fit in a signed byte; and `MAXRUN` must be sized for a
few caves per column rather than `ceil(ZN/2)`, which would now be 45,024
instances and 6 MB of edge buffer for a board where every column is one run.

**`solid(i,z)` is not `cell(i,z)`.** A rain tile lives in the same stack and
is not air, so any loop walking a column for ground has to say which it means.
The renderer did not, and drew a grey prism inside every cloud.

---

## How settle works

The whole of it:

```js
for each tile with water:
    if any neighbour is the void: it all goes over the side
    lower = neighbours whose stone+water is below mine
    if none: it keeps what it has
    else:   find the one height L that it and all of them come to rest at,
            capped at its own stone, and give each of them (L - theirs)
```

There is nothing else. No escape levels, no basins found in advance, no
retention rule. A basin holds water because its floor has nothing lower
beside it; a lake finds one level because every tile in it keeps levelling
with its neighbours until none is lower.

**Motion decays, it does not stop dead.** Levelling is asymptotic, so after
the rain stops the board keeps making smaller and smaller adjustments rather
than freezing. Measured over 200 boards, the biggest change any hex makes in
one tick falls from 124 units after 10 ticks to **0.000000004 units after
2000**. Levelling with every lower neighbour at once settles far faster than
levelling with the highest of them did: that was still moving 0.019 units a
tick at the same point. The old
solving build stopped exactly; this one settles.

---

## Bugs worth remembering

Each of these was a rule stated one way and implemented another. They are
here because the same mistake is easy to make again. The first two are from
the current build; the rest are from the solving build that preceded it and
are kept because the reasoning still applies.

**Handing over the whole contents.** Rule 4 read literally. A brimming basin
emptied itself in one tick, nothing could come to rest, and nothing was ever
drawn on flat ground because no tile could hold 70 units for a whole tick.

**Handing over the whole difference.** The obvious correction, and it
overshoots by double: a pair of tiles swap heights and swap back, forever.
Levelling has to count the receivers rising.

**Levelling with only the highest lower neighbour.** Right whenever the lower
neighbours are all at one height, wrong whenever they are not: a tile stopped
shedding the moment it matched its nearest neighbour, so water sat on a ledge
handing out equal dribbles instead of pouring over the drop beside it.

**Standing water grouped by escape level** *(solving build)*. On a flat board
every column escapes at the same height, so the whole board was one body with
one level. Dig a basin, rain into it, and before it filled dig a hex five
away: the lake lost half its depth and the new pit came up holding water,
across ground that had never been wet. *A shared escape level is not a shared
body.*

**Retention judged by the neighbour's bare ground** *(solving build)*. Dig a
hex, brim it, and the six hexes around it never got wet while the ring beyond
them filled — a target drawn on the board. They had the basin below them by
ground, but it was full and level with their floor.

**Retention judged against my own surface** *(solving build)*. The other way
round: a hex holding water beside a drier one at the same height sheds to it,
which cascades to the rim where the void is lower than everything. 300/300
boards flickered between two states forever.

**Steepest-descent routing deleted water on flat ground** *(solving build)*.
On a plain nothing is downhill, so the routing found no outlet and the water
was quietly discarded.

**An `InstancedMesh` measures its bounding sphere once, lazily, and caches
it.** Measured while every instance was hidden, it came out zero-radius and
the water was frustum-culled forever. `rebuild()` calls
`computeBoundingSphere()` on all of them.

**`drawMenu()` was unscoped.** `document.querySelectorAll('.pw')` also matched
the View panel's buttons, set `POWER = undefined` and crashed the render. It
is scoped to `#powers .pw`.

---

## Rendering notes

**The look is one palette, one light, one camera and one post pass** — the
Phase 0 beauty pass, all below the simulation. `PAL` holds every colour
(warm limestone rock, cool basalt floor, ochre rubble, teal water, moss
greens, a warm white cloud, a dusk background) and nothing is coloured from
anywhere else. The sun is warm and filmic tone mapping (ACES, exposure
1.32) lets it be bright without clipping. The orbit is a **diorama orbit**:
pitch held between 40° and 62° from the vertical, yaw and zoom free,
default elevation 35°. **Rain is drawn** as a slim translucent shaft from
the ground to the cloud, because a world that runs on its own cannot have a
cloud that visibly does nothing. **Wet ground** — water under the drawn
tile, the film the water mesh never shows — darkens and blues the rock top
by up to 45%, so a plain under rain no longer looks bone dry.

The post pass is one full-screen `ShaderMaterial`, no library: the scene
renders to a half-float MSAA target, then a 5×5 gaussian whose radius grows
away from a focus band (tilt-shift), a warm grade, and a vignette. Tone
mapping and the output colour space are applied in that pass, because
three.js skips both when drawing to a render target. Toggled from View as
*Diorama*. Bloom is left for the water shader.

**The look is one palette, one light, one camera and one post pass** — the
Phase 0 beauty pass, all below the simulation. `PAL` holds every colour
(warm limestone rock, cool basalt floor, ochre rubble, teal water, moss
greens, a warm white cloud, a dusk background) and nothing is coloured from
anywhere else. The sun is warm and filmic tone mapping (ACES, exposure
1.32) lets it be bright without clipping. The orbit is a **diorama orbit**:
pitch held between 40° and 62° from the vertical, yaw and zoom free,
default elevation 35°. **Rain is drawn** as a slim translucent shaft from
the ground to the cloud, because a world that runs on its own cannot have a
cloud that visibly does nothing. **Wet ground** — water under the drawn
tile, the film the water mesh never shows — darkens and blues the rock top
by up to 45%, so a plain under rain no longer looks bone dry.

The post pass is one full-screen `ShaderMaterial`, no library: the scene
renders to a half-float MSAA target, then a 5×5 gaussian whose radius grows
away from a focus band (tilt-shift), a warm grade, and a vignette. Tone
mapping and the output colour space are applied in that pass, because
three.js skips both when drawing to a render target. Toggled from View as
*Diorama*. Bloom is left for the water shader.

**Framing needs the aspect and the shape.** Both cameras used to size
themselves from the height alone — ortho took `top = SPAN` and let `right`
follow, perspective sat at a fixed distance — so any viewport *taller than it
is wide* cut the board off at the sides. That was true at every radius and
only became obvious at 64, where the board overflowed by **39%**.

Fitting a *ball* of radius `SPAN` stops the clipping and then wastes half the
screen, because the board is a flat hexagon seen at a slant. So the extent is
measured: the rim hexes at both ends of the height range, projected onto the
camera's own right and up axes. Perspective needs standing 18% further back
than that says, because the near edge is closer than the middle and projects
larger — without the allowance a radius-64 board came out 1% over the top.

The result is scale-free: radius 12 and radius 64 both frame to the same clip
extents, `0.95 × 0.71` orthographic and `0.81 × 0.81` perspective.

**The page fills the window and never scrolls.** It was capped at 1140px with
a fixed 660px board, which on a wide screen left most of the display empty
*and* pushed the erosion sliders below the fold — controls you could not see
on a monitor with room to spare. The board now takes whatever is left beside
the panel: 940×660 became **1488×863** on a 1900px screen.

Above 1500px the panel becomes **two columns**, balanced by the browser with
`break-inside: avoid` on each block. Multi-column rather than a grid, because
the blocks are different heights and their order does not matter. The panel
scrolls itself rather than taking the page with it.

One `InstancedMesh` of hexagonal prisms for the ground — one instance per
unbroken run of solid cells in a column, so a cave would draw correctly — plus
one per hex for water and one for clouds. `instHex` maps a ground instance
back to its hex for picking, which is a `Raycaster` hit rather than a
hand-written point-in-hex test.

Water draws in **whole layers only**: `floor(pool/LAYER) * LAYER`. The
readout, not the geometry, carries the exact number.

**The tops carry the relief, because the lighting cannot.** Every top face on
the board has the same normal, so a plateau at 8 and a floor at -3 catch
exactly the same light — all of it has to come from colour. A plain ramp
across the full range gave one elevation step 92/24 of 255, about one and a
half percent, and reading an exact step was guesswork. Two things fix it, both
inside `tint()`:

- **contour banding** — every other elevation a shade darker, the way a topo
  map does it, so a single step reads wherever it sits in the range instead
  of only near the extremes. Toggled from View, on by default;
- **occlusion from the shape, not from the lights** — how much higher ground
  stands around a hex, a neighbour three steps up counting full and one step
  up a third. Hollows and basin insides darken, ridges come forward, and it
  costs one pass over six neighbours.

The lights are a **HemisphereLight** plus a sun and a fill. Flat ambient gave
every shadowed flank the same muddy value; a hemisphere hands the six side
faces six different ones by which way they point, which is most of what makes
a hex prism read as a solid.

**The sun casts shadows, and it is the only cue that carries height across
distance.** Banding and occlusion both read a hex against its own six
neighbours; neither can say that a peak on one side of the board is taller
than a plateau on the other. Water *receives* shadows but does not cast — a
shadow map has no idea it is see-through, so a lake would lay a solid black
slab on its own bed.

**Drainage is a View overlay and a pure read of `h`** — no water, no ticks, no
state. A single sweep from the highest ground down, each tile handing its
running total to its lower neighbours in proportion to how far each drops.
That is flow accumulation, and it answers *where should I put a cloud* before
a drop has fallen, which watching the simulation cannot.

It **seeds from the clouds** when there are any and from one unit on every
tile when there are none — "where will this rain end up" against "where are
the valleys", and which you want is exactly whether you have placed a cloud
yet. That is not a nicety: measured against where the water actually went, by
rank correlation over the tiles not under standing water, seeding from the
clouds scores **0.76** and seeding uniformly while the rain fell only on the
summit scores **0.36**.

It splits between all lower neighbours rather than picking the steepest,
because steepest-descent routing on a grid draws parallel stripes along the
six axes, and because it is not what `settle` does.

**Rivers are drawn from `out[6]`, one stub per edge that carried water** — a
flat ribbon from the hex centre to that edge's midpoint, as wide as the flow
through it. Adjacent tiles meet at the shared midpoint, so a channel joins up
into a line without anything being inferred, a confluence draws itself, and a
fork draws two branches because the tile really did send water two ways.

**The threshold is per edge, not per tile**, and that is what stops the spider
web that killed the last two attempts. A sheet spreading over a plain carries
as much per tick as a river — 73 units against 70 — but leaves through all six
edges at a twelfth each, so no edge clears the bar. A river puts all 70
through one.

**Width tapers from nothing at the threshold**, so a marginal trickle is a
hairline rather than a chunky dash going nowhere. Width and never opacity:
fading them made the water look like it was floating in the air, the first
time this was tried. Drawn flat, at the height of whatever water already shows
on the tile, never sloped between heights — sloping looked wrong too.

They are not painted state. Stop the rain and they vanish on their own,
because `out` goes to zero. Measured: 18 stubs while raining, 0 after.

**The sun is fixed, and moved only by hand.** Four presets in View, NW to SW.
Tying it to ticks was considered and rejected: the same stored board would
render differently depending on how long you had been running, so two
screenshots of one state could no longer be compared, and Play at a hundred
ticks a second would strobe. It is a viewing control — turn the light when a
piece of ground reads badly.

`OrbitControls` for the camera, with an orthographic/perspective toggle.
**Undo is snapshots, not replayed actions.** The whole board is ~117 KB and
sixty of them is 6.9 MB, which buys exactness with no bookkeeping. Taken on
discrete actions only — a power click, a press of Pass time, the *start* of a
Play run, which counts as one step however long it runs. Not per tick: Play at
10 ms would be a hundred snapshots a second. The snapshot is taken *before*
the click and kept only if the click did something, so a press that could
change nothing does not record a step.

It restores the **water** too, so undoing a dig also un-drains the lake it
made. That is the only coherent version; a partial undo would leave the board
in a state the simulation never produced. And it is **not** the stored state
that has burnt this project before — the UI keeps copies of past states, the
simulation derives nothing from history, and the board is still a pure
function of whichever snapshot is current.

**Time was three separate things** (a speed, a tick button, play/pause) before
the world ran on its own — see *Time: the world breathes*. What follows is
the older arrangement, kept for the reasoning: a **speed**, a **tick** button, and **play/pause**. The speed means the
same thing either way — how many ticks one step is worth — and Play takes a
step every **100 ms**. There is no Pause among the speeds: Play *is* the
pause, and two controls that stop the world is one too many.

The interval used to be 10 ms, so 1× was a hundred ticks a second and the
lowest weathering setting turned a mountain to rubble in a few seconds. Every
power click is already a tick, so this is only for watching without touching;
sculpting while it runs is fine.

The draw loop is `frame()`, deliberately **not** `tick()`. A tick is a step of
the world. The two were once the same name and it cost an afternoon.

---

## What was taken out

The board once had a sea, then a wall standing at 5 that replaced it, then
soil derived from relief, one grade of life, two auras (moisture and heat),
lava that set into basalt, and rivers — twice, once on a vertex lattice and
once on tiles. All of it is in the history and none of it is in the file.

Two removals are worth understanding rather than just knowing:

**The sea and then the wall.** The wall stood *above* the floor, which made
the whole board one basin: one pour drowned every hex on it, any hollow dug near
a hill flooded to the brim, and nothing could ever drain. Now the board is a
disc in open space and anything reaching an edge goes over it. That gives the
outlet back and deletes a whole class of problem at once.

**Rivers.** Two representations were built and both were abandoned. The root
cause was never the drawing: it was rain everywhere plus accumulation, which
on a board this size gives a dendritic web no threshold-tuning fixes. Water
now comes only from clouds you place, and that is the fix.

Vestigial and safe to delete when convenient: `RING2` / `nb2` (the radius-2
ring, which only moisture used) and the `vol` / `BASALT` accessor (nothing
sets or reads it now).

---

## Working practice

1. **Discuss rules before implementing them.** Most of the good mechanics here
   came out of arguing about a rule for a few messages first, and several bad
   ones were caught the same way.
2. **One step at a time.** Implementing everything at once turns a small
   correction into a large ball of yarn.
3. **Report what was measured**, with the numbers, not a claim that it works.
4. **The user tests.** Human play-testing has found more than the suite did.
   Do not go fixing or testing before it is asked for.
5. Keep answers short and clean.

### Things not to do

- **Do not add mechanics that were not asked for.** This has been the single
  most common failure. If a rule seems to want a companion rule, say so and
  let the decision be made rather than building both.
- **Do not add randomness.** The board must stay a pure function.
- **Do not store a derived value**, or make the result depend on the order
  things happened in. It is almost always a sign the rule is wrong rather than
  the code.

---

## Where it stands

```
one-hex basin at -1, rain on it   70 units a tick for six ticks, 420 at the
                                  rim, then it sheds the surplus outward
the 7th tick, exactly             70 units of rain shared seven ways: 10 to
                                  the basin and 10 to each of its six rims,
                                  all seven then at the same height
that basin left raining           settles at 469 units, 49 above the rim --
                                  the head it needs to push 70 a tick out
                                  through six neighbours
                                  rain off: back to exactly 420, dead level
seven-hex bowl, uneven floor      -2 in the middle, -1 around: settles to one
                                  surface, exactly, every tile
490 units on a tile, three         all 490 goes into the two deep ones, 245
neighbours level and two two       each; the level three get nothing, there
elevations down                    being too little to fill the holes to them
a six-step cliff on one side,      438 units down the cliff, 5.8 along each
five level neighbours              of the five flat sides
200 boards, rain off              biggest change any hex makes in a tick
                                  falls 124 -> 5.8 -> 0.000000004 by tick 2000
300 boards x 85 ticks             0 ticks created water
flat board, 40 ticks              distinct depths per ring 1 1 2 2 3 3 4,
                                  exactly the symmetry orbits of each ring
```

### Known, and not bugs

- **Water on flat ground is mostly invisible.** It spreads and levels, so it
  is nearly always under the 70 units a water tile needs. A rain tile on a
  flat board wets the whole board and draws one or two hexes of it. Water
  shows where it
  gathers — in a basin — which is where it should.
- **A lake stands about a water tile above its rim while it is raining.**
  That is the head it needs to push the inflow out. Stop the rain and it
  returns to exactly level.
- **The outermost ring drains.** The void is lower than anything, so a rim
  tile empties into it.
- **The board never freezes exactly.** Levelling is asymptotic. It goes quiet
  a very long way below anything the display can show.
- **Several tiles pouring into one overshoot it, for one tick.** They each
  level against it from the same snapshot, so none of them sees the other
  five doing it. Measured worst case: six tiles holding 210 units each,
  around a pit one step down, put it 840 units — two whole elevations —
  above them for a single frame before it pours back out. It is the price of
  the snapshot, and the snapshot is what keeps the board symmetric. Capping
  what a tile may RECEIVE would fix it and costs a second pass.

### Parked: two viewports side by side

The terrain in one and the **drainage overlay** in the other, sharing a
camera — so you see where the water *would* go next to where it actually
went, without toggling between them. For a design bench that is the pair of
pictures you most want at once, and wide screens have the room for it.

It is a second renderer and a camera sync rather than a CSS change, which is
why it is parked and not done.

### Parked: UI in three.js

Technically easy — an orthographic overlay scene and the raycaster already
used for hex picking. Argued against **for the panel**, because the panel is
almost entirely text and the DOM is enormously better at text: layout, font
fallback, kerning, subpixel AA, selection, clipboard, IME and browser zoom,
all free. In WebGL that means a font atlas or another dependency and a build
step, against the vendored no-build property. Two controls cannot move at all
— a text field would mean implementing a caret and IME, and **load** must be a
DOM file input because the browser will not open a file dialog for a canvas.

Where it *would* earn its keep is anything **attached to the world**: labels
over hexes, a flow-direction compass on a tile, height readouts pinned to a
ridge, an in-world legend for the drainage overlay. Spatially bound to what it
describes, rotating and scaling with the board, which a DOM overlay can only
fake. That version is additive rather than a rewrite — annotations in the
world, panel stays in the DOM.

### Parked: the panel looks different across browsers

Firefox against a Chromium-based pane, and three causes, none of them bugs:

- **The five sliders.** `<input type="range">` is drawn by each browser's own
  widget code and the geometry differs a lot. `accent-color` colours them but
  does not make them match. Fixable in about fifteen lines by styling
  `::-webkit-slider-thumb` and `::-moz-range-thumb` explicitly.
- **Text weight.** `-webkit-font-smoothing: antialiased` is WebKit/Blink only
  and Firefox ignores it.
- **The font itself.** The stack starts `ui-monospace`, which **Firefox has
  not implemented**, so it falls through past two macOS faces to Consolas
  while Chromium resolves it to the system monospace. At 8px with 1.6px
  letter-spacing the difference shows.

Pinning `Consolas` first would fix the third at the cost of looking worse on a
Mac. The sliders are the only part worth doing.

### Parked: burying

Slag is an *amount*, and amounts always ride on top of the stack — so placing
rock on a slag pile puts the rock underneath and lifts the slag. That is the
same rule water follows (place rock under a lake and the lake rises), and the
end state is right: taller column, loose material on top.

What it means is that **loose material can never be buried under solid**. A
landslide covering a valley floor, a flood laying silt over rubble which then
lithifies, a rock slab collapsing onto sand — none of those can be
represented. Doing it means slag becoming a *cell* rather than an amount, at
which point transport has to move whole 70-unit slabs or the two
representations have to coexist.

Parked deliberately, and worth its own careful pass rather than being drifted
into. It is the most interesting unbuilt thing here.

### Open questions

- Is one hex per tick the right speed, or does a distant basin take too long
  to fill?
- Does water being invisible on flat ground read as broken?
- Does the lake standing a tile proud of its rim while raining read as wrong?
- What comes back first when the water is settled?
