# Mountains in a Pot

> A disc of bare rock.
> Hang a cloud, and the water
> finds its own level.

A single-file hex sandbox. Three powers: raise a column, lower a column, hang
a cloud over one. Everything else is water working out where to go.

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
4  a tile with water hands its contents to whichever neighbours stand
   lower, split equally between them
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

**How much it sheds.** Read literally — *hand over the whole contents* — a
brimming basin empties in a single tick: at the rim all six neighbours become
lower at once, all 490 units leave, 82 to each, and the lake vanishes and
begins again forever. So a tile sheds only until it is **level** with the
highest of the neighbours it is shedding to.

**That level has to count the receivers coming up.** Handing over the whole
*difference* is nearly right and still wrong: it overshoots by exactly
double, so a pair of tiles swap heights and swap them back. Measured, boards
were still sloshing 44 units a hex two thousand ticks after the rain
stopped. Hand over `g` and the tile falls by `g` while each of the `N`
receivers rises by `g/N`, so level means

```
me - g = high + g/N        ->        g = N x (me - high) / (N + 1)
```

The split is still one Nth to each, exactly as the rule says. Only the total
changes.

A void neighbour is bottomless, so there is no levelling with it and the tile
empties into it. That is rule 5.

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
```

Nothing else is remembered. Solve the same ground twice and you get the same
world. Two corollaries worth keeping:

- **The board is still when idle.** Take the clouds away and nothing moves.
  Measured: 0 of 300 boards drift.
- **Water is conserved exactly.** It is created only by clouds and lost only
  over the edge. Measured: 0 ticks in 300 boards × 85 created any.

`h` is not a plain field — it is an accessor over the **cell stack**, a
`Uint8Array` of 127 × 32 cells (`AIR`, `ROCK`, `BASALT`, `CLOUD`) with a `TOP`
cache. Setting `h` rewrites the run of solid cells. Clouds live in that same
stack at `CLOUD_Z = 27`, which is height 14 — well clear of any ground, and
the reason a cloud is a thing in the world you can see rather than a flag.

---

## How settle works

The whole of it:

```js
for each tile with water:
    lower  = neighbours whose stone+water is below mine  (void counts)
    if none: it keeps what it has
    else:    hand N x (mine - highest of them) / (N+1), split N ways
```

There is nothing else. No escape levels, no basins found in advance, no
retention rule. A basin holds water because its floor has nothing lower
beside it; a lake finds one level because every tile in it keeps levelling
with its neighbours until none is lower.

**Motion decays, it does not stop dead.** Levelling is asymptotic, so after
the rain stops the board keeps making smaller and smaller adjustments rather
than freezing. Measured over 200 boards, the biggest change any hex makes in
one tick falls from 100 units after 10 ticks to **0.019 units after 2000** —
a four-thousandth of what it takes to change a single drawn layer. The old
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

`OrbitControls` for the camera, with an orthographic/perspective toggle.
`RATES = [1,2,5,10,100]` drives *Pass time*, which ticks without acting —
every power click is already a tick, so watching a basin fill needed something
to do that was not also changing the ground.

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
the whole board one basin: one pour drowned all 127 hexes, any hollow dug near
a hill flooded to the brim, and nothing could ever drain. Now the board is a
disc in open space and anything reaching an edge goes over it. That gives the
outlet back and deletes a whole class of problem at once.

**Rivers.** Two representations were built and both were abandoned. The root
cause was never the drawing: it was rain everywhere plus accumulation, which
on 127 cells gives a dendritic web no amount of threshold-tuning fixes. Water
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
that basin left raining           settles at 504 units, 84 above the rim --
                                  the head it needs to push 70 a tick out
                                  through six neighbours
                                  rain off: back to exactly 420, dead level
seven-hex bowl, uneven floor      -2 in the middle, -1 around: settles to one
                                  surface, exactly, every tile
200 boards, rain off              biggest change any hex makes in a tick
                                  falls 100 -> 6.4 -> 0.019 units by tick 2000
300 boards x 85 ticks             0 ticks created water
flat board, 40 ticks              distinct depths per ring 1 1 2 2 3 3 4,
                                  exactly the symmetry orbits of each ring
```

### Known, and not bugs

- **Water on flat ground is mostly invisible.** It spreads and levels, so it
  is nearly always under the 70 units a water tile needs. A rain tile on a
  flat board wets all 127 hexes and draws one or two. Water shows where it
  gathers — in a basin — which is where it should.
- **A lake stands about a water tile above its rim while it is raining.**
  That is the head it needs to push the inflow out. Stop the rain and it
  returns to exactly level.
- **The outermost ring drains.** The void is lower than anything, so a rim
  tile empties into it.
- **The board never freezes exactly.** Levelling is asymptotic. It goes quiet
  a very long way below anything the display can show.

### Open questions

- Is one hex per tick the right speed, or does a distant basin take too long
  to fill?
- Does water being invisible on flat ground read as broken?
- Does the lake standing a tile proud of its rim while raining read as wrong?
- What comes back first when the water is settled?
