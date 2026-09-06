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
1  a cloud drops 12 units of water on the column below it, every tick
2  one elevation step is 72 units; one drawn water layer is 12 of them
3  a column holds 12 units before it sheds any
4  it sheds only to ground at its own height or lower
5  what reaches the edge of the board falls off
```

Rule 3 is **the film**, and it is what makes moving water visible at all.
Without it an impermeable board with open edges holds nothing: every drop
runs straight off the side and the ground it crossed shows no sign of it.

Rule 2 is a **display quantum only**. Water is carried as a real number and
nothing in the sim routes on the quantum — it decides how tall to draw a box
and nothing else. Integers would have to divide exactly on every split and
they do not: rim counts are not always six. Rounding is where conservation
dies, so the rounding lives in the renderer alone.

Below one layer, water is **held but not drawn**. That remainder is the whole
point: ground blooms into a visible layer several ticks after it first got
wet, and no sixth of a layer is ever drawn floating with nothing under it.

`LAYER = FILM = RAINFALL = 1/6`. All three being equal is why a column under a
cloud shows its layer on tick one and a one-hex basin fills in exactly six.

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

Two kinds of place hold water, and **keeping them apart is the whole design.**

A **hollow** is a connected run of columns standing below their own escape
level — a real depression. Its water finds one level, so a hollow reads as one
body however uneven its floor.

**Everywhere else** a column simply holds its film and hands the rest on.

`escapes()` is a priority flood inward from the board edge: `esc[i]` is the
lowest level at which column `i` can still reach open air. A column is in a
hollow when `esc[i] > h[i]`.

Water on the move **walks out from where it entered**, takes the lowest ground
it has reached first, shares equally between ties, and can only step onto
ground no higher than the surface it is leaving. That is rules 3 and 4.
Whatever is still moving when everything reachable is full has run to the
edge, and is gone: rule 5.

A tick **solves, it does not step.** Water never crawls a cell per tick the
way Minecraft's does — that is order-dependent and can never find a level.
The gradual spread you watch comes from columns filling up, not from water
moving slowly.

---

## Bugs worth remembering

These cost the most, and each one was a rule stated one way and implemented
another. They are here because the same mistake is easy to make again.

**Standing water grouped by escape level.** On a flat board every column
escapes at the same height, so the whole board was one body with one level.
Dig a basin, hang a cloud, and before it filled dig a hex five away: the lake
lost half its depth and the new pit came up holding water, across ground that
had never been wet. Hollows fixed it. *A shared escape level is not a shared
body.*

**The film added on top of standing water.** Dig a hole, fill it, dig the hex
next door — the two came out at different surfaces (−0.2500 and −0.3611),
because the older hole had a full film and the fresh one only a part film, and
the difference stuck out above the waterline. The film is the **bottom** of a
column's water, not a lid on it.

**The film owned by the region rather than the column.** One tick of rain was
divided between all 127 columns at once; the far rim six rings away held
exactly the same 0.001312 as the hex under the cloud. A column shed water at a
five-hundredth of a layer deep.

**The film re-derived each tick.** Once the first ring became a source in its
own right it shared equally with the centre, and the centre — already full —
gave film away and got *shallower*. What a column holds, it keeps: the film
comes off the top before anything is allowed to move.

**The film spread by distance, ignoring height.** A cloud on a plateau one
step above the west half of the board wet 50 hexes of high ground in 40 ticks
and sent not one drop down the step.

**A region spilling by its single lowest exit.** Right for a lake, which
spills at one saddle; wrong for a sheet on a plateau, which leaves everywhere
its rim is lower. A plateau touching both the board edge and a step down sent
every drop over the side, because the void is lower than anything.

**Steepest-descent routing deleted water on flat ground.** On a plain nothing
is downhill, so the routing found no outlet and the water was quietly
discarded. This is why transport is a walk over reachable ground rather than a
per-column gradient.

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

Working and measured: clouds, the film, hollows, the walk, cascade between
hollows, spilling off the board edge, the quantized draw, and the time
control.

```
a one-hex basin gains one layer a tick    1 2 3 4 5 6 7 7
digging beside a full lake                both surfaces -0.2917, lost 0.000000000
digging five hexes away                   the lake keeps its water, the pit stays dry
flat board, one cloud                     front 1 -> 19 -> 37 -> 91 -> 127 columns
                                          nothing lost until tick 127, then it
                                          sheds exactly the rain
water down a one-step drop                by tick 20, plateau still mostly dry
300 boards x 85 ticks                     0 ticks created water
                                          0/300 boards move once the rain stops
                                          0 of 32,358 wet hexes reachable only by climbing
flat board after 40 ticks                 every ring holds exactly one depth
```

### Known, and not bugs

- **A pond at its brim stands up to one layer above adjacent ground** that has
  not got its full film yet. Never more. That is the head it needs to get over
  the lip.
- **A cloud on a mountain peak puts a layer on the summit.** The film applies
  to every column, so a peak holds one layer and sheds the rest. Rule 3
  applied to a peak.
- **Flat ground can never show more than one layer.** The film caps at one and
  standing water only exists in a hollow.
- **A region waits until it is entirely filmed before it spills.** Water
  reaching a step ought to start falling as soon as the front arrives, not
  when the whole plateau is wet. Spilling is accounted per region, not at the
  front. Known, not fixed, not urgent.

### Open questions

- Does the water read right in play, or only in the numbers?
- Should the film be uniform, or should steep ground hold less than flat?
  Raised once and deliberately rejected as an extra mechanic; the question is
  still open if the summit puddle turns out to bother anyone.
- What comes back first when the water is settled — soil, or something else?
