# Mountains in a Pot

> A disc of bare rock.
> Hang a cloud, and the water
> finds its own level.

A single-file hex sandbox. **Radius 12, 469 hexes.** Four powers — raise a
column, lower a column, hang a rain tile over one, and lay down a chosen
material — each with a **brush** of 1, 7, 19 or 37 hexes and a **depth** of 1,
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

## Running it

```
python -m http.server 8777      # three.js is vendored; ESM needs a server
```

Then open `http://localhost:8777/index.html`. There is a launch config at
`.claude/launch.json` under the name `pot`.

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

## The five rules

This is the whole simulation. If a change cannot be stated as one of these,
it is a new rule and wants deciding rather than drifting into.

```
1  a rain tile drops 70 units on the column below it, every tick
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
ROCK     ordinary stone. Weathers, and what it weathers into moves.
CLOUD    a rain tile, which lives in the same stack
```

`BASALT` went with the lava that made it, several rewrites ago. A **run** is
an unbroken stretch of *one* material, so a rock slab lying on bedrock draws
as two prisms and the join is visible. Clouds live in that same stack, which is why a cloud is a thing
in the world you can see rather than a flag.

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

`RATES = [1,2,5,10,100]` drives both *Pass time*, which ticks without acting,
and *Play*, which does the same on a 10ms interval until you stop it — every
power click is already a tick, so watching a basin fill needed something to do
that was not also changing the ground. Play is one toggle rather than two
buttons; it relabels itself Stop. Sculpting while it runs is fine.

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

### Open questions

- Is one hex per tick the right speed, or does a distant basin take too long
  to fill?
- Does water being invisible on flat ground read as broken?
- Does the lake standing a tile proud of its rim while raining read as wrong?
- What comes back first when the water is settled?
