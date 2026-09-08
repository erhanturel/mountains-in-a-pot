# Air

**Status: designed, measured, NOT BUILT.** Nothing in `index.html` implements
this. The branch `climate` has the *predecessor* — vapour as a single number
per cell with no altitude — which is a different and much smaller model. Read
that first (CLAUDE.md, *The cycle*), because most of what is wrong with it is
the reason this document exists.

This is a hand-down. It exists so that whoever picks it up — including a later
session of this same conversation — does not have to re-derive the decisions
or re-run the measurements.

Vocabulary is fixed in CLAUDE.md, *Words, and what they mean here*. In
particular **ground** is the top of the solid and **surface** is ground plus
the water on it; a **slab** is 1/6 of an elev; a **cell** is a column and a
**hexcell** is a cell at an elev.

---

## The question this answers

The `climate` build has vapour as one number per cell. It works — it produces
a genuine rain shadow, 98.2% windward against 1.8% lee — but three things
about it are dishonest, and they are all the same dishonesty:

- **The dew line is a knob, not a consequence.** `DEW` is a global number in
  elevs, set by a slider, flat across the board. Nothing looks up a
  temperature at an altitude, because there are no altitudes.
- **The picture and the model disagree.** The cloud deck is *drawn* at `DEW`,
  which asserts the vapour is up there. The model has no altitude for it. The
  drawing is a fiction laid over a column total.
- **Lift is a dot product and a knob** (`ORO`), rather than the terrain
  physically being in the way.

Air tiles fix all three by giving the air a height.

---

## The model

```
STATE   air[cell][z]     moisture in the air tile at elev z
                         one flat Float32Array, cells x levels
                         an air tile is an empty hexcell above the surface

        temp(z) = TEMP0 - LAPSE * z          global; one number per elev
        cap(z)  = max(0, temp(z)) * HOLD     capacity falls with altitude
```

**The lapse rate is the primitive and the dew line is derived.** The dew line
is simply where `temp(z)` reaches zero, `z = TEMP0 / LAPSE`. Two knobs (`DEW`,
`HOLD`) collapse into two better ones (`TEMP0`, `LAPSE`), and warming the
world raises the clouds, which is right.

```
1 EVAPORATION   a wet cell hands EVAP * (1 - v/cap) units into the LOWEST air
                tile above its SURFACE, where v is that tile's moisture

2 ADVECTION     wind moves GUST of each air tile's moisture to the nb cell's
                air tile AT THE SAME ELEV -- and if that hexcell is SOLID, the
                moisture cannot go there and is FORCED UP instead

3 CONDENSATION  moisture over cap(z) becomes cloud, held in that air tile

4 RAIN          cloud in an air tile rains onto the cell below once it passes
                a threshold

5 EDGE          air leaving the board is gone; air arriving at the upwind edge
                carries a fixed incoming moisture
```

**Rule 2 is the reason to do this at all.** Orographic lift stops being a knob
and becomes the mountain being in the way — which is what a mountain actually
does to air. `ORO` disappears.

**Rule 1's saturation term is what stops a big sea making a big cloud.** Air
crossing a wide sea picks up moisture the whole way, so by the downwind edge
it is nearly saturated and takes on almost nothing more. That is fetch, and it
is why large water bodies do not make proportionally large clouds. A small
pond in dry air is unaffected. The term needs `cap` and the standing moisture
to be **the same order of magnitude** — in the `climate` build capacity is
~560 units against 30–70 of vapour, so the term would be decorative.
Calibrate before believing it.

**Rule 4's threshold makes cloud a thing that builds and bursts** rather than
a transient. Chosen over "condensation rains immediately" deliberately.

---

## Costs, measured

Not estimated. The real data shape was built — a flat `Float64Array` of cells
× levels plus a precomputed neighbour table — and given the work advection
does, six neighbour writes per tile per level:

```
 radius  cells  levels   air tiles   air pass   tick now     MB
     12    469      14        6566    0.19 ms    0.11 ms    0.1
     24   1801      14       25214    0.37 ms    0.29 ms    0.4
     64  12481       8       99848    1.11 ms    2.05 ms    1.5
     64  12481      14      174734    1.91 ms    1.65 ms    2.7
     64  12481      30      374430    3.64 ms    1.86 ms    5.7
```

**One advection pass over 175,000 air tiles costs about what the whole current
tick costs.** The full model wants perhaps four passes, so figure **~2.5× the
tick** at radius 64 with 14 levels. That is affordable.

**Levels is the performance knob and it is linear.** How many are needed is a
meteorology question with a clean answer: cloud base sits around 500–2000 m
over land, and essentially all precipitation is generated in the lowest
3–5 km. The tropopause at 8–15 km only matters for thunderstorms. **You need
roughly 2–3× your terrain, not the atmosphere.** With ground to 24 elev and
the dew line near 8, a ceiling around 14–16 covers everything that rains.

**The condition on all of the above:** air must be a FLAT TYPED ARRAY with a
precomputed neighbour table, never objects with accessors. This is not a style
preference. `settle()` was 84% of the tick in this codebase purely because `h`
is an `Object.defineProperty` getter that was called twenty times a hex —
twenty passes cost 11.9 ms where one costs 0.62. Build air the way `T` is
built and it will be slow; build it the way `CELL` is built and it is cheap.

**Undo:** air in the snapshot adds ~1.4 MB at 14 levels, or 0.7 MB as
`Float32`. Radius-64 undo depth goes from 8 to about 6.

---

## Landmines

**Buoyant convection is order-dependent by construction.** "An air tile moves
up if the one above is clearing space" means whoever moves first decides who
*can* move. That is exactly the class of bug this project threw away an entire
build over. It needs a DECLARED resolution order — top-down, so the top tile
vacates and then the one below may rise — and that choice has to be written
down, because bottom-up gives a different board. **Deferred out of step 1**;
let lift come only from terrain being in the way (rule 2).

**Incoming air needs a moisture value.** Rule 5's boundary condition is not
free: dry incoming air is what makes a coast rain. One more global knob, and a
load-bearing one.

**Rain everywhere plus accumulation killed rivers here twice.** The cycle is
meant to stay a *second, weaker* source with a placed cloud dominant. Whether
it does has never been played.

---

## Open questions

- **Rule 4's threshold**: a fixed amount, or proportional to `cap(z)`?
- **Rule 5's incoming moisture**: what value, and does it vary with elev?
- Does air need to exist beside a cliff for advection to stay symmetric, or is
  "forced up" enough?
- Does `HOLD` survive at all, once `cap` comes from temperature?

## Deferred, deliberately

- **Buoyant convection** — see Landmines.
- **Sand carried by air** — aeolian transport and abrasion. Cheap to add once
  air exists (air carries far less than water), but it is a second carried
  quantity and it multiplies the state.
- **Weathering from airborne sand** — a lookup per column, once sand is in the
  air.
- **Seasons, and day/night.** Cost is nil, since temperature is already a
  global scalar. The price is a property: the board stops being a pure
  function of its state unless the phase is part of the state and gets saved.
  Note the project already refused to tie the SUN to ticks, because a stored
  board would then render differently depending on how long it had run;
  seasons are the stronger version, where a stored board would *evolve*
  differently. The period must also be thousands of ticks, or 100× turns it
  into a strobe.
