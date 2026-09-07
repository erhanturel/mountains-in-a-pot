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

then `http://localhost:8777/index.html`. There is a launch config at
`.claude/launch.json` under the name `pot`, and `?r=8|10|12|14` picks the
board size.

**The page cannot be opened as a file.** It loads three.js as an ES module,
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
board. It is the seed of the score and nothing more yet.

**Life keeps its own clock.** Water and soil move every tick; life steps
every `LIFE_EVERY` (10). Once the world ran on its own a seed that walked a
hex a tick covered a shore in a breath; at one step in ten the same 12-hex
rim greens over 56 ticks instead of 5 — about half a Season. `TICKS` is
saved with the board so a loaded game keeps its phase.

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

**Time is three separate things**, in a bar floating over the top right of the
board: a **speed**, a **tick** button, and **play/pause**. The speed means the
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
