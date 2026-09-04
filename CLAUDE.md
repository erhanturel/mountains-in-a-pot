# Mountains in a Pot

> A pot of bare rock.
> Lift the stone and the sea comes,
> soil, then something green.

A single-file hex-grid sandbox. You have four powers and a small island. You do
not place forests, lakes or soil — you shape the ground, and everything else is
worked out from that shape.

**This is a design bench, not a game yet.** There is no goal, no score, no
turns, no failure state. It exists to find out which mechanics are worth
keeping. Do not add a goal unless asked.

---

## Running it

```
open index.html          # no build, no dependencies, no server needed
node test/rules.test.js  # the rule suite — must be green before any commit
```

The test harness reads the live simulation out of the HTML file:

```js
const core = fs.readFileSync('index.html','utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];
const M = new Function(core + 'return {T,at,flood,use,...};')();
```

So the tests always exercise the code that actually ships. **Never copy the sim
into the test file** — that is how the rules and the tests drift apart. If you
need a new export, add it to the `return {...}` list in the test.

---

## Layout

```
index.html            everything — sim, rendering, UI, in one file
  /*==CORE-START==*/  the simulation. Pure, no DOM, no rendering.
  /*==CORE-END==*/
                      below this line: canvas rendering and UI only
test/rules.test.js    the rule suite
CLAUDE.md             this file
```

Keep the CORE block free of anything that touches the DOM or the canvas. That
separation is what makes the suite possible.

---

## The one property that matters

**The board is a pure function of three stored values per hex.**

```
STORED    h     ground height, integer
          vol   is this ground volcanic rock
          src   what liquid stands here (NONE / WATER / LAVA) — a seed, not a state
          seed  is life rooted here
```

Everything else — `liq`, `ls`, `moist`, `temp`, `rel`, `soil`, `life` — is
**rebuilt from scratch by `flood()` on every single click.** Nothing
accumulates. Nothing has a history. Solve the same ground twice and you get
the same world, verified in the suite to six decimal places after 800 random
clicks.

This property was not free. It was arrived at after several builds that kept
incremental state and drifted, churned when idle, and grew bugs faster than
they could be fixed. **If a change requires storing a derived value, or makes
the result depend on the order things happened in, stop and reconsider.** It is
almost always a sign the rule is wrong rather than the code.

Two corollaries the suite enforces:

- **The board is still when idle.** Re-running `flood()` changes nothing.
- **Previews cannot lie.** `basinAt()` and `patchAt()` tell you exactly what a
  click will do, because the click runs the same function.

---

## The rules, in full

### Geometry
Pointy-top axial hexes, radius 6 (127 hexes). `DIRS` is in ring order
(E NE NW W SW SE). Off the rim is the **wall of the pot**: bare rock at
`WALL = 5`, all the way round, and nothing the player has can touch it. It
gives no moisture and quenches nothing. It holds liquid in, it stops soil
washing out, and it sheds soil down onto the hexes it touches.

The floor starts at 0 and the wall stands at 5, so **the whole pot is one
basin.** Aim Deluge at undug ground and it fills to the brim, all 127 hexes —
the preview rings the entire board first, so it is not a lie, but it is one
click. Only ground raised level with the wall lets a liquid spill over and be
lost. There was a sea here until it was taken out; see *What the sea took with
it* below for what that changed.

### Powers
| Power | Effect |
|---|---|
| **Uplift** | `h += 1` on one hex |
| **Subduct** | `h -= 1` on one hex |
| **Deluge** | fills the basin under the clicked hex with water |
| **Lava** | fills that same basin with lava |
| **Seed** | greens the whole connected habitable patch |

### Basins, and why they nest
A hex is a **basin** if a liquid put on it could not get away. `fillFrom(seeds)`
pours in and lets the level rise until it meets a rim, returning the submerged
set and the surface level.

It rises to the **first rim it meets, not the ultimate way out over the wall.**
That makes basins nest, and it is the mechanic that lets the player choose
scale by aiming:

```
a -1 plateau with one -2 hex in the middle
  deluge the -2 hex  ->  1 hex of water,  surface -1
  deluge a  -1 hex   -> 10 hexes of water, surface  0
```

The fill level is taken from the **highest** seed, not the lowest. Adjacent wet
hexes are one pool and the water must stand above all of them.

### Liquids
Both are **endless sources**: once a hex holds a liquid it becomes a source, so
digging beside a lake lets it flow in without draining the lake. A source on
ground that can no longer hold anything is forgotten.

**Two sources in the same pool are one body even when they do not touch.**
`flood()` groups sources by adjacency, but `fillFrom` submerges whatever is in
the basin — so a source sitting inside a pool filled from elsewhere formed its
own second body over the same hexes. Both wrote their own level and the last
one won, leaving a hex holding water at a level its own neighbours did not
share. The groups are now merged whenever their fills overlap, and re-filled,
until none do.

This one is worth remembering for *how it hid*, not for what it was. The bad
state healed on the very next click — once the pool had written `src` across
all its cells the two groups touched and merged — so it was reachable
constantly and observable almost never: **11 boards in 40** hit it at some
point during play, but only **1 board in 200** was still holding it at the end
of a run, and that single board was the entire visible symptom. Checking an
invariant at the end of a run is not the same as checking it during one. There
is a test for each.

**Careful: lifting a filled pit back to floor level floods the pot.** The
source is not removed, it is moved onto the floor — and the floor's basin is
the whole pot. Subduct-then-Uplift, the natural undo, drowns the board. Under
the old sea this same gesture just dried the hex out. There is a test for it.

**Lava that touches water sets into volcanic rock**, level with the brim. That
is the only way basalt is made and the only thing that removes lava. Because
two adjacent basins always merge into one, lava can only ever meet water
inside its own basin — so with the sea gone there is exactly **one** route
left: rain into a lava pool. Lava standing against the wall never sets.

### The two auras
```
moist = how many neighbours are water
temp  = how many neighbours are lava
```

Moisture now comes **only from water the player has put on the board**, and it
reaches **two hexes**: 2 points for water alongside, 1 for water a hex further
off, so it runs 0..24. The wall is rock and gives nothing, so a fresh pot reads
zero moisture everywhere and nothing is habitable until a hollow is dug.

Widening it from one hex to two made life far commoner — boards with anything
alive went **61/200 to 147/200**, mean living hexes **0.5 to 9.6**. That is the
moisture change, not the river change.
Plain counts, never stored, never accumulate. Neither can turn into the liquid
it came from. This was a hard-won simplification — an earlier model had
moisture as an accumulating quantity with thresholds and it was unplayable
arithmetic.

### Soil — derived, never placed
For each hex, `d` is the drop to each lower neighbour and `D` their sum. `D`
measures exposure, so a plateau's middle does not weather and only its edges do.

```
weathering  D x (1 + moist) x (vol ? 2 : 1) x RATE     0 where life has rooted
transport   hand the load to each lower neighbour in proportion to its own d
retention   keep received/(1+D) — flat keeps everything, steep keeps none
            freshly weathered rock always moves on, which keeps summits bare
```

The wall weathers by the same formula: each face standing above a hex hands
that hex `drop × RATE`, and keeps none of it. **This is the starting
condition** — a fresh pot is not bare, it has soil at its skirts (3.5 on an
edge hex, 5 in the six corners) and nothing anywhere else. `BED = WALL`, so
the wall also stands above every rim hex, which means **nothing washes out of
the pot**.

Consequences worth knowing: the floor still makes no soil of its own, so
relief is the only soil factory inland; lake shores weather fastest, which
gives Deluge a second purpose; basalt weathers twice as fast, which gives Lava
one.

`RATE = 0.35` is the single abundance knob. `SOIL_MAX = 5`.

**Soil is carried as a real number** and only clamped for display. It used to be
integer, which meant handing out a remainder, and the remainder always went the
same way round the ring — a symmetric peak grew a lopsided apron, always east.
Determinism is the point; a fixed direction winning is not. If you touch the
transport, keep the symmetry test green.

### Life
```
habitable = no liquid AND soil >= 1 AND moist >= 1 AND temp == 0
```
A seed greens the whole connected habitable patch at once, and every living hex
becomes a seed, so a patch remembers itself and can be cut in two rather than
dying wholesale.

**Life binds the ground it stands on**: a living hex weathers nothing and keeps
everything it is handed. This produces vegetated terracing — a living hex holds
soil at a steepness bare rock could not — and it means **a green belt starves
the ground below it**, which is intended but surprising.

Because soil and life each depend on the other, **`lives()` ends by calling
`soils()` itself.** Solving them one pass each left the board one click stale
wherever a patch had just greened or just died — the wrong soil showing at the
exact moment you pressed Seed. Whatever changes life owns the soil that changes
with it; do not push that ordering back out into `flood()`. Measured: boards
that drifted when left alone went from 61/1000 to 6/1000. Iterating the pair to
a fixed point instead was measured and bought nothing over the single re-solve.

---

## Rendering notes

Vertical extrusion, drawn north-to-south so nearer ground overlaps. Two things
here have bitten before:

- **Walls are per-edge and run between actual surfaces**, never down to the
  datum. A hex draws only its two south-facing flanks and only where it stands
  higher; the north wall of a pit is the south wall of the hex behind it. Level
  ground shows no seam at any depth.
- **Hit-testing is a hand-written point-in-hex test.** `isPointInPath` reads its
  point in untransformed canvas pixels and silently breaks on retina displays.
  Verify any picking change at both `deviceScaleFactor: 1` and `2`.
- **Overlays draw in their own pass after the hex loop.** Drawn inside it, the
  southern part of any multi-hex highlight gets painted over.
- **The wall and the board draw in ONE north-to-south pass** (`SCENE`, sorted
  by `y`). The sea used to be a whole separate loop painted first, which was
  fine when it was flat — but a wall standing at 5 has to occlude the board in
  front of it. Split back into two passes, the near rim disappears behind the
  floor. Wall hexes are not in `T`, so they are not clickable; verified that
  picking the centre of all 127 board hexes still returns each hex, and that a
  point over the wall returns −1, at both `deviceScaleFactor: 1` and `2`.

---

## Working practice

This has worked well and is worth keeping:

1. **Discuss rules before implementing them.** Most of the good mechanics here
   came out of arguing about a rule for a few messages first. Several bad ones
   were caught the same way.
2. **Write the test that would have caught it.** Nearly every bug found so far
   was found by a test probing behaviour, not by reading code. The single most
   valuable check has been: *sculpt the board, stop touching it, and see whether
   anything moves.*
3. **Report what was actually measured**, with the numbers, not a claim that it
   works.
4. **Verify in the browser at both pixel ratios** for anything touching input.

### Things not to do

- **Do not add mechanics that were not asked for.** This has been the single
  most common failure. If a rule seems to want a companion rule, say so and let
  the decision be made rather than building both.
- **Do not add randomness.** The board must stay a pure function — previews
  depend on it, and planning is the game. Where results look mechanical, the
  fix is a better rule, not dice.
- **Do not reintroduce turns** without a deliberate decision. Everything
  resolves instantly on a click; several rules quietly depend on that.
- **Do not let the player do arithmetic.** Counts are read, not managed.

---

### Rivers — on the seams, not through the middles

A river is a movement *between* places, so it does not belong on a hex. It
runs on a **vertex lattice**: every hex corner is a node (294 of them), every
hex edge an arc (420), and a node's height is the average of the three hexes
meeting there — the pot wall standing in for any that are off the board.

That average is the entire point. Two hexes at the same height have no drop
between them, so on the hex graph the seam they share can never carry
anything. But the two ends of that seam average in different third hexes, so
they sit at different heights and water runs **along** it. Measured on a peak
of 1 over six 0s, the seam direction is lower than the neighbour direction at
every radius, and the gap widens going out. In play, ~50-70 seams between
equal-height hexes carry rivers on a sculpted board. There is a test for it,
and it is the one that justifies the whole second graph.

Heights are carried in **thirds, as integers**, so equal heights compare
exactly and no float ever decides where a river goes.

**Where the water comes from.** `rain = RAIN x (moisture - MOIST_MIN) x height`,
every term read off the hex itself. Damp enough and high enough, and it rains.
**A pot with no water has no moisture and so no rivers**, which now falls out
rather than being a rule.

This replaced a global cycle — total standing water anywhere on the board set
the rain everywhere — which worked but was unreadable: pouring a lake in one
corner changed rivers in the other and nothing you could look at explained why.

The honest cost is that rain is now very sensitive to WHERE the water is.
Measured on one board, three placements: a lake far from the ridge gives high
ground moisture 0 and **no rain at all**; a lake dug at the ridge's foot works
but floods 115 of 127 hexes, because the whole pot is one basin; a hollow cut
INTO the high ground — a tarn — gives 2 water hexes, 17 river arcs and a dry
pot. The tarn is the pattern that works, and it is a narrow path.

**Which way it goes.** All of it to the **steepest descent**, split equally
when several tie. Not shared out in proportion like soil — that braids every
river into a delta and nothing clears the threshold. And emphatically not
broken by ring order: that is exactly how a symmetric peak grew a lopsided
apron, always east. A tie is a real saddle and a real saddle really does fork.
The symmetry test checks every flow value appears a multiple of six times.

**Pits.** Averaging three hexes invents hollows that are not in the ground,
and left alone they swallowed **86% of the rain**. They are filled by a
priority flood seeded from the lowest node on the board. It must be seeded
from the outlet rather than fixed pit by pit: the pot is sealed, so its lowest
ground has no way out at all, and raising every sink to its lowest neighbour
walked the whole floor upwards until it merged into the nearest lake — a river
arriving at a lake was declared to have reached the bottom of the world, and
died there.

**Lakes pass water on.** A lake is already brim-full by construction —
`fillFrom` stops at the first rim it meets — so it is a flat region that
spills at its lowest way out, and rivers run through it and come out the other
side. No volume is tracked anywhere. This needed no change to `fillFrom`: the
region grouping finds the spill on its own.

**Still acyclic.** Sources → lakes → rain → rivers, one way. Rivers pass
through lakes and never create them, so there is no feedback to solve. If
rivers are ever allowed to fill a basin, that stops being true.

`RAIN = 0.2` and `MOIST_MIN = 2` are the abundance knobs, calibrated like
`RATE` against a board somebody would actually build rather than against
extremes. `RIVER_MIN = 1`, `FALL_MIN = 3`. Because two nodes on a seam share two of
their three hexes, a seam's drop in thirds is exactly the height difference
between the hexes capping its ends, so `FALL_MIN = 3` means a three-step
cliff. It marks about a tenth of river arcs in play.

**The consequence to know: rivers stop at flat ground.** The pot floor is
dead level, so a river running off sculpted relief onto it simply ends — there
is no channel, and on flat ground water spreads rather than gathering. To get
a river all the way to a lake you have to carve it a bed. That is honest
hydrology and probably good play, but it surprises.

## What the sea took with it

The sea was removed deliberately — it was carrying too many special cases
(`seaReach`, a sea overlay pass, sea-as-moisture, quenching at the coast).
Taking it out deleted all of them, and cost these, measured over 300 boards of
400 mixed clicks each:

| | with the sea | with the wall |
|---|---|---|
| boards with anything alive | 276/300 | **106/300** |
| average living hexes | 3.7 | **0.6** |
| median largest connected patch | 2 | **0** |

Life went from usually-present to usually-absent, because the sea was the
board's only free moisture. That is the honest price of the change, not a bug.
If life should be commoner the knob is the habitability rule or `RATE`, not
putting the sea back.

Two other things went with it: **pouring lava into the sea to make new land**
(one of the two routes to basalt), and any reason for a `SEA` constant, so the
parked *sea level as a power* idea no longer has a free ride.

## Where it stands

Working and tested: uplift, subduct, deluge, lava, seed; nesting basins; the
pot wall and its skirts; volcanic rock; both auras; derived soil; one life;
rivers and waterfalls on the vertex lattice. An attributes panel at the top
left of the board reads out the hex under the cursor.

**The suite is green.** `node test/rules.test.js` runs 119 checks in ~12s, all
passing, including 200 boards that must settle and 40 boards checked after
every single click. Arc flows are part of the stillness snapshot, so a river
that drifted would be caught the same way soil was.

Known and expected, not a bug: a hex standing at ground level directly behind
a tall mountain cannot be picked **at its centre**, because the mountain is
drawn over it. Measured 124/127 centres on a board with a ridge of 7, and all
three misses were ground-level hexes stolen by taller ground to the south.
Their visible parts pick correctly. This is inherent to a vertical extrusion
and predates rivers.

### Parked, deliberately

- **Landform classification** — reading Flat / Slope / Cliff / Ridge / Valley /
  Saddle / Peak / Summit / Basin / Crater off the heights by counting runs of
  higher and lower neighbours around the ring. It was built once and works (one
  click on a flat re-shapes 7 hexes; ~1.9 on a sculpted board; 16% of clicks
  inert) but it is a second system on top of this one.
- **Wall height as a power** — `WALL` is a constant everywhere it matters, so
  moving it is close to free and would re-frame the whole board at once. This
  is the inheritor of the old *sea level as a power* idea and still the most
  promising unbuilt one. Note it now cuts both ways: lowering the wall drains
  the pot, raising it drowns more of the floor.
- **Erosion as a power** — deliberately rejected. Relief already does erosion's
  job; a power would be Subduct in a costume.
- **Grades of life** (moss / grass / forest) — the obvious next step and the
  obvious trap. One life until there is a reason for more.
- **Time** — an earlier build had life spreading a hex a round. Instant spread
  was chosen for consistency; timed spread may come back later.

### Open questions

- Is soil abundance right? `RATE` is the knob and it has not been playtested
  hard. The wall now feeds the skirts through the same knob: `WALL × RATE` is
  1.75 per wall face, so an edge hex starts at 3.5 and a corner maxes at 5.
  That may be too generous for a starting condition.
- **Is one click drowning the pot acceptable?** Deluge on undug ground fills
  all 127 hexes; the preview warns, but there is no undo and recovery is 635
  clicks. Chosen deliberately, not yet played.
- **Is life too rare now?** 106/300 boards have anything alive, against 276/300
  with the sea. A tall peak (9) plus a dug-and-filled hollow is currently the
  minimum recipe for a connected patch of two.
- **Should rivers carry moisture?** Deliberately parked, and the obvious answer
  to the question above — inland rivers would give the interior a reason to be
  habitable. It is the difference between rivers as a read-out of the terrain
  and rivers as a mechanic, so it wants deciding rather than drifting into.
- **Does a river ending on the flat plain read as broken in play?** It is
  correct, but it is the thing most likely to look like a bug.
- **Is `RIVER_MIN` the wrong shape?** It is an ABSOLUTE number calibrated on
  relief of 5-7, so anything built small and low falls entirely below it. Hills
  of 1 around a lake make a biggest seam flow of 0.33 against a threshold of 1 —
  a trickle, correctly, but not what a player expects. A threshold set as a
  SHARE of the board's total rain would read the same at any scale; that case is
  17% of its board's rain, which is unambiguously its main stream.
- Does the green-belt-starves-downstream consequence read as a bug in play?
- Does the board want to be bigger than radius 6?
