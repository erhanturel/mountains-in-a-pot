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
plus twelve numbers a hex: **5.6 MB at radius 64**, where sixty of them would
be 338 MB. Sixty small boards or eight enormous ones — about 45 MB either way.

**Ground runs −24 to +24 elevations and the sky sits at 36.** Those twelve
elevations between them are empty by construction — 73 cells a column that
can only ever be air — and they are paid for in memory and in rebuild's
per-column walk. Deliberate: it is the room the atmosphere tiers would need
if *the fever dream* is ever built. Measured at radius 64, same board and
same window:

```
  ZN         192  ->   378
  CELL     2.29 MB -> 4.50 MB
  snapshot 3.43 MB -> 5.64 MB      so undo depth 13 -> 8
  rebuild   21.5 ms -> 24.5 ms
  tick       4.30 ms -> 4.39 ms
```

The tick is untouched because `settle()` never walks a column; only
`rebuild()` and `setTop()` do.

**A save written before the world got taller cannot be loaded.** The file
carries the radius but not the depth of the stack, so it decodes to a shorter
cell array. It is detected and says so, rather than the old 'wrong board
size', which sent people back to the size buttons.

**The colour ramp lost half its resolution** and this is the real cost of the
change, not the memory. `terrain()` spreads one two-colour ramp across
`-H_MAX..H_MAX`, so an elevation step went from about 1.5% of the ramp to
about 0.75%. Contour banding is `h % 2` and still reads a single step exactly
as before, so relief is fine — but *absolute* height by colour is now
guesswork, and banding is doing all the work. Left alone deliberately until
it visibly bothers somebody.

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

**Right now it is water and nothing else.** Soil, life, moisture, heat,
relief, basalt, lava and the endless-source liquids have all been taken out
so the water can be judged on its own. That was a deliberate strip, not an
oversight — see *What was taken out* below before putting any of it back.

---

## THREE LINES, DELIBERATELY — do not merge them

Decided 10 September 2026. Three living projects, two of them branches here
and one of them a separate repository. **None is behind the others. Do not
merge them.**

```
main / climate     THIS REPO.  The physics bench, in three.js.  No goal, no
                   score.  Water, erosion, and an open climate model with
                   EVAPORATION (rule 6)
steps              THIS REPO.  A sim-board roguelike, in three.js.  Years,
                   Omens, a Spring shop with Boons and seed cards, mana,
                   Gaia's Whim, a run seed.  Its climate is a CLOSED system
unity              A SEPARATE REPOSITORY, and a separate chat session.  The
                   shipping build.  Split off because git stores every
                   version of a binary whole and Unity churns binaries
                   constantly -- and history bloat is the one mistake on
                   this project that cannot be undone
```

**This session is the three.js line.** Unity work happens in its own repo and
its own session; come back here for anything in this file.

Both forked from `f6eda45`, so **both already have the settle optimisation**.

The split in one line, in the founder's words: **she is working on the
diegetic approach and this line is working on the simulation approach.** Art,
biomes, Years and the shop belong to `steps`; rules, measurement and the
physics belong here. That is also the rule for where new work should land.

### The disagreement, and it is a real one

The two lines answered the same question opposite ways, both on purpose and
both in writing.

This branch built **evaporation**: water leaves by two sinks now, over the
edge and into the air, and CLAUDE.md retired the old invariant to say so.
`steps` deliberately refused it and built a seasonal *rain rate* instead —
symmetric about 1, so a Year's total is unchanged and a dry summer is paid
for by a wet winter:

> Real evaporation would break it and take the test that proves the board is
> a closed system with it. Rain that varies with the Season keeps it whole:
> nothing new is created or destroyed, it arrives at a different RATE.

Neither is wrong. They are different games.

### The landmine, if anyone tries anyway

A merge of `steps` into `main` throws only **seven conflicts** in
`index.html` — four evaporation, three the bounding sphere — which makes it
look easy. It is not. **The taller world auto-merges with no conflict marker
at all**, and silently produces:

```
const H_MAX=24;                          <- from main
const TEMP_SEA=14, LAPSE=3.4, SWING=5;   <- from steps, calibrated for 12

freezing sits at 14 / 3.4 = 4.1 elev
  steps' world, max 12 elev  ->  snow line a third of the way up
  merged world, max 24 elev  ->  snow line an EIGHTH of the way up
```

Seven eighths of every mountain permanently white, and every snow and melt
measurement on `steps` invalidated. `SNOW_FULL`, `TEMP_SEA`, `SWING` and
`DROUGHT` are all calibrated against a 12-elev world.

**Nothing flags it at merge time** — but it would not stay hidden, and that is
to `steps`' credit rather than luck. `design/unity/fixtures.json` pins
`ZN: 192`, `Z0: -78` and `CLOUD_Z: 180` in its `constants` block, so
`node test/fixtures.js` fails loudly the moment anyone runs it. The danger is
the window between the merge and that run, not the merge being undetectable.

### The seam to Unity

`design/unity/fixtures.json` on `steps` is the contract: 16 fixtures, 36
checkpoints, FNV-1a hashes. The port is correct when it reproduces every
hash, and **the JavaScript CORE stays the oracle forever** -- when the two
disagree you settle it by running both. See `design/UNITY-PORT.md`.

Across two repositories the risk is no longer a bad merge, it is **drift**:
the Unity side verifying against a fixture set the JavaScript has since moved
past. The fixtures already pin `LAYER`, `SLAB`, `ZN`, `Z0`, `CLOUD_Z`, the
materials and `DIRS`, which catches a changed world. **What they do not
record is which CORE generated them.** Stamping the commit SHA in at write
time is one line in `test/fixtures.js` and makes a stale set announce itself
instead of quietly passing.

### Porting between the two branches here

By hand, one thing at a time, and record it here.

```
PORTED          nothing yet
CLEAN TO PORT   5e71fe0  the static bounding sphere.  Pure renderer perf,
                no design implication.  Conflicts in 3 small hunks because
                rebuild() diverged, so it wants a hand not a cherry-pick
NEEDS A DECISION FIRST
                1b0f506  the taller world.  Breaks steps' lapse calibration
                666da31  evaporation.  Contradicts steps' closed system
```

### Housekeeping

`origin/claude/mountains-pot-design-jbdw7t` is **fully contained in `steps`**
and can be deleted.

`polyperfect/` is a Unity asset pack — 473 MB over 25,668 files — and is
gitignored on this branch. **`steps` needs the same line**, or a `git add -A`
there puts half a gigabyte of third-party assets into the history.

---

## Words, and what they mean here

Fixed deliberately, because several of these were being used two ways.

```
unit       the atom of height and of volume.  420 units = 1 elev
slab       1/6 of an elev = 70 units.  The cell stack's quantum, and the
           quantum a water tile is drawn at
block      one elev = 6 slabs = 420 units
tile       either, when it does not matter which
elev       one elevation step = 420 units = 6 slabs
floor      one elev, used when talking about a LEVEL rather than a height
cell       a hex on the board, in 2D (q,r).  A column
hexcell    a cell at an elev -- 3D
board      the whole hex grid
nb         neighbours.  "nb at rd 2" is the ring two out, not the ring next door
rd         radius
baseline   the absolute bottom of the board, elev -25
ground     the top of the SOLID -- rock, slag or sand.  gnd() in the code
surface    ground plus the water standing on it.  What rule 3 calls height
```

**Two collisions to know about.** `cell(i,z)` in the code is the **3D**
accessor and `CELL` the 3D array, which under these names should be
`hexcell` -- left alone deliberately, because renaming it touches the whole
stack for no behavioural gain. And `gnd()` is *ground* in the sense above,
never the 0 elev datum.

**A slab is 1/6 of an elev, not 1/12.** The 12 that keeps appearing is a
different number: `CLOUD_MAX = 12` is the cloud stack ceiling in slabs, which
is 2 elevs of sky.

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
`.claude/launch.json` under the name `pot`, and `?r=8|10|12|14|24|36|48|64` picks the
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
renderer gets driven by hand.

---

## The six rules

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
6  every wet tile loses the same flat amount each tick, clamped at zero
```

**A tick is one STEP, not a solve.** Water moves one hex per tick and no
further, so a basin far from the rain fills slowly as the water walks to it.
An earlier build solved instead — escape levels, basins filled to a level in
a single pass, a film of water held against gravity — and all of that is
gone.

Rule 6 came last and is the only one that is not about where water goes. It
is written up in full under *Evaporation, and temperature*.

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

### The bounding spheres are not the next win

Worth writing down because the guess was wrong twice. `rebuild()` calls
`computeBoundingSphere()` seven times — on six instanced meshes, each walking
every instance — and it looked like the obvious next target. Measured at
radius 64 on a busy board:

```
  mesh        instances   sphere
  ground         18106     1.38 ms
  water          12481     0.78
  cloud          12481     0.60
  slag           12481     2.90
  sand           12481     1.00
  rivers          7888     0.64
                          -----
                           7.30 ms   of a 61.5 ms rebuild
```

**Twelve percent.** The other 54 ms is the per-instance matrix and colour
writing that rebuild exists to do, and that is where to look if rebuild ever
has to get faster.

The spheres could still go: the board's extent is known analytically and never
changes — a fixed hex radius in x and z, elevation clamped to ±12, clouds up
to the top of the stack — so `mesh.boundingSphere` could be set once at startup
and never recomputed. The only thing given up is frustum culling when the
camera is zoomed right in, which at six meshes saves six draw calls, which is
nothing. Cheap and safe, just small.

**Do not simply delete the calls.** They are there because an `InstancedMesh`
measures itself once, lazily, and caches the result: both liquid meshes were
first measured while every instance was still parked out of sight, cached a
zero-radius sphere, and were culled from then on — placed correctly, updated
correctly, and never drawn. A static sphere is fine; no sphere is not.

(The 32 ms recorded for `rebuild()` above was a quieter board than the 61.5 ms
one measured here, which carries slag and sand as well.)

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
- **Nothing creates water.** It comes only from clouds and leaves by two
  sinks — over the edge, and into the air. Measured: 0 ticks in 800 gained
  more than the rain that fell. It is no longer *conserved*, which it was
  before evaporation; the half worth testing is that nothing makes it.

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

## Evaporation, and temperature

Every wet column loses the same flat amount of water each tick, clamped at
zero. That is the whole rule.

**Temperature is the name of the dial, not a second quantity.** One number
with two names: unless temperature does something evaporation does not, a
second knob is only arithmetic handed to the player. The slider steps in
twentieths of a unit because the interesting range is all below one a tick.

**Flat per column, not per unit of water.** Evaporation is a surface process
and every wet column has the same surface — one hex — so a puddle and a lake
lose exactly the same amount. Puddles vanish and lakes shrug, and that falls
out of the rule rather than being a rule:

```
  400 ticks at 0.20 units/tick
     puddle    70 units  ->  0      (gone by tick 350)
     lake    5000 units  ->  4920
```

**It runs last in the tick** — rain, settle, weather, carry, evaporate — so
water gets to move before it dries and a channel is not drained out from
under the erosion that reads it.

**What it is for.** Without it the board only ever gets wetter until the water
finds a rim, so a lake has a level but no *size*. With it, rain in equals
evaporation plus outflow, and the wetted area settles at about `rain/EVAP`
hexes whatever the terrain. One cloud on a flat radius-24 board:

```
  rate    predicted   measured   water on board
   0.1          700        619            2862
   0.2          350        349            1508
   0.5          140        127             682
   1.0           70         55             390
```

The prediction holds while water can walk faster than it dries and
**undershoots as the rate climbs** — at 1.0 the rain is drying before it gets
anywhere. That is the board being ARID, and it is the first thing here that
makes *where* a cloud goes matter over distance.

**A sealed tarn can now go away**, which nothing could do before. A pit ringed
by a four-elevation wall, filled, then the rain taken off:

```
  ticks after rain off      500    2000    5000   20000
  rate 0.0                 1550    1550    1550    1550     forever
  rate 0.2                 1453    1153     553       0     dry by ~7,750
```

**Known and expected:** at a high rate a rim column dries faster than water
walks to it, so a distant basin never fills at all. That is correct, it is
the interesting part, and it will read as broken the first time it is seen.

**Deliberately not done:** temperature driving weathering (freeze-thaw is real
and is a second mechanic), and the vapour going anywhere (that is the cycle,
and it stays in *the fever dream*).

## The cycle — EXPERIMENTAL, on the `climate` branch

What evaporates becomes **vapour** standing on the column: a third amount
alongside water and slag, carried rather than routed, invisible until it
falls. Three rules, and between them they are the whole of orographic
rainfall:

```
1  EVAPORATION   every wet column hands EVAP units of water to its vapour
2  ADVECTION     the wind carries GUST of every column's vapour to the
                 neighbours it blows towards; vapour reaching an edge leaves
3  LIFT          what has to CLIMB, sheds: ORO of a load per elevation of
                 ascent falls as rain on arrival
4  CONDENSATION  a column holds vapour in proportion to how far it is BELOW
                 THE DEW LINE; anything over that falls
```

**Lift is not optional, and that was measured rather than assumed.** The
first build had capacity only — rule 4 without rule 3 — and it rained on the
**summit and nowhere else**: 100% of the rain on one crest hex, 0% on either
flank, no shadow at all. Below the dew line there is always spare capacity
and above it everything falls at once, so it is a step function rather than
a gradient. Adding the upslope term costs nothing, because advection already
walks those edges.

With both, on a symmetric ridge six elevations high over six hexes a side,
a sea to the west and the wind blowing east:

```
     q   ground   vapour     rain    share
    -6     0.00       38        0    0.00%     the foot: air still loaded
    -5     1.00       27    10718    0.82%  #######
    -4     2.00       20     7569    0.58%  #####
    -3     3.00       15     5529    0.42%  ####
    -2     4.00        0    13313    1.02%  #########
    -1     5.00        0     1709    0.13%  #
     0     6.00        0      443    0.03%     the crest: nothing left
     1     5.00        0      317    0.02%
     3     3.00        0        0    0.00%     the lee: bone dry
```

**Windward 98.2%, lee 1.8%.** Rain peaks on the flank, not the top, which is
what real orography does — the vapour is spent by the time it finishes
climbing. The lee is dry because descending edges lift nothing *and* because
there is nothing left to lift.

**The cloud deck is drawn at the dew line, with a flat bottom.** That is not
a rendering convenience: one altitude at which air gives up its water is
exactly why real cumulus have flat bottoms, and drawing it any other way
would hide the mechanic. Where the ground stands above the dew line the deck
simply stops, which is the mountain poking through, for free. Thickness is
scaled against an ABSOLUTE amount, not against the column's capacity — scaled
against capacity every slab came out a hairline, because vapour runs tens of
units where capacity runs hundreds.

### What closing the cycle costs

**Evaporation is no longer a sink.** It used to destroy water; now it only
moves it to the sky, and the only way out is over the board edge. A sealed
tarn under a high rim went from *dries to nothing in 7,750 ticks* to
**permanent**:

```
  ticks after rain off      500    2000    5000   20000
  before the cycle         1453    1153     553       0
  with the cycle           1680    1680    1680    1680
```

Calm air over a sealed basin **saturates and evaporation stops**, which is
real — it is the wind that has to take the vapour away. But with the wind on
it still holds, because the rim is a four-elevation climb right beside the
water: `ORO × 4` exceeds 1, so everything that blows at it rains straight
back down and runs into the pit.

That is not a bug, it is what a closed cycle *means*, and it undoes the one
thing evaporation was introduced to fix. **It wants a decision, not a patch.**
Either the cycle stays closed and water leaves only over the rim, or some
fraction of vapour is lost to nothing — which is unphysical at this scale but
restores drying.

**The other thing to watch:** rain everywhere plus accumulation is exactly
what killed rivers here twice. The cycle is meant to stay a *second, weaker*
source with a placed cloud dominant. It has not been played enough to know
whether it does.

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

**The camera frames the sky, not just the ground.** `yHi` used to be
`H_MAX*RISE`, so the cloud band sat above the fitted extent and stayed on
screen only on the 1.05 margin. At elevation 17 over a limit of 12 that held;
at 36 over 24 it did not, and a placed cloud came out clipped against the top
edge. `yHi` now comes from the top of the *stack*, which keeps working if
either constant moves again.

It costs a wider frame, and how much depends on the board, because the
projection is dominated by the footprint rather than the height: about **4%
of zoom at radius 64** and about **18% at radius 12**. Clouds you cannot see
without orbiting are worse than a slightly smaller board.

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

### The fever dream

Recorded as a whole, because the pieces only make sense together and none of
them should be built one at a time on their own merits. Marked a fever dream
by the person who proposed it, and kept at that status:

- a much taller world — 64 units of height;
- **evaporation**, at a flat rate over the whole board;
- **layers of atmosphere**, so what evaporates rises and becomes cloud;
- **wind**, behaving differently at each tier, always running from bodies of
  water towards the tallest and nearest feature on the map.

What makes it coherent is that it closes the water cycle: today water is
created by clouds you place and destroyed over the rim, and it is a one-way
trip. The fever dream makes the board a loop, with the terrain choosing where
the rain falls rather than the player.

What makes it dangerous is that every one of the four is a stored,
accumulating, order-dependent quantity — which is the exact class of thing
this project has been burnt by more than any other, and the reason the
solving build was thrown away. Wind "towards the tallest and nearest feature"
is also a global search per tile per tick, and it is a *rule about the whole
board* rather than a rule about a hex and its six neighbours, which nothing
here currently is.

The one piece that is cheap and separable is **evaporation**: a flat rate is a
single subtraction per column, it needs no new state, and it would give the
board something it genuinely lacks — a reason for standing water to ever go
away. If any of this is ever built, that is the end to pull.

The tall sky the height change reserves (elevation 24 to 36 is empty by
construction) is where the atmosphere tiers would live. That is why the gap is
a reservation rather than waste.

### Parked: a floor selector, to clip the view

A control that clips the render at a chosen floor: at the top floor the board
draws as it does now, at floor *x* only elev *x* and below. Cheap -- the
renderer already walks columns run by run and would simply stop early -- and
it is the only way to see inside a thick board, which matters more as the
world gets taller and as air tiles fill the space above it.

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
