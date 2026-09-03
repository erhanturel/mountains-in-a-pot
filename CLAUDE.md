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
(E NE NW W SW SE). Off the rim is **sea at level 0** — it takes anything that
runs into it, fills anything below it, and radiates like any other water.

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

It rises to the **first rim it meets, not the ultimate way out to the sea.**
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

The sea reaches inland **only along ground strictly below sea level.** A plain
sitting exactly at 0 is not a channel — without this, every pit dug anywhere
filled itself with no rain.

**Lava that touches water sets into volcanic rock**, level with the brim. That
is the only way basalt is made and the only thing that removes lava. Because
two adjacent basins always merge into one, lava can only ever meet water
*inside its own basin* or *at the sea*, which leaves exactly two deliberate
routes: rain into a lava pool, or pour lava into the sea.

### The two auras
```
moist = how many neighbours are water   (each sea-facing side counts)
temp  = how many neighbours are lava
```
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

Consequences worth knowing: **a flat island has no soil at all**, so relief is
the only soil factory; sea cliffs and lake shores weather fastest, which gives
Deluge a second purpose; basalt weathers twice as fast, which gives Lava one.

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

## Where it stands

Working and tested: uplift, subduct, deluge, lava, seed; nesting basins; the
sea; volcanic rock; both auras; derived soil; one life. An attributes panel at
the top left of the board reads out the hex under the cursor.

### Parked, deliberately

- **Landform classification** — reading Flat / Slope / Cliff / Ridge / Valley /
  Saddle / Peak / Summit / Basin / Crater off the heights by counting runs of
  higher and lower neighbours around the ring. It was built once and works (one
  click on a flat re-shapes 7 hexes; ~1.9 on a sculpted board; 16% of clicks
  inert) but it is a second system on top of this one.
- **Sea level as a power** — `SEA` is already a constant everywhere it matters,
  so moving it is close to free and would re-frame the whole board at once.
  This is the most promising unbuilt idea.
- **Erosion as a power** — deliberately rejected. Relief already does erosion's
  job; a power would be Subduct in a costume.
- **Grades of life** (moss / grass / forest) — the obvious next step and the
  obvious trap. One life until there is a reason for more.
- **Time** — an earlier build had life spreading a hex a round. Instant spread
  was chosen for consistency; timed spread may come back later.

### Open questions

- Is soil abundance right? `RATE` is the knob and it has not been playtested
  hard.
- Does the green-belt-starves-downstream consequence read as a bug in play?
- Does the board want to be bigger than radius 6?
