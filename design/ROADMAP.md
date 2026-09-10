# The build list

Written 8 Sep 2026, from the founder's thirteen-point feedback on the first
full run plus the Mold World formulations. This is the tracked list: work
goes top to bottom, each item is committed on its own, and nothing is marked
done without a number beside it.

`[ ]` not started · `[~]` in progress · `[x]` done, with what was measured

---

## The rule this list is written under

> **Derive, don't add.**
> A biome, a desert, a floodplain is not a new system. It is a *read* of the
> numbers the board already keeps — the same way a Wonder is.

Seasons, biomes, deserts and wind are the feature list of every terrain
simulator ever shipped. Built as four separate systems they make a worse
WorldBox, which has ten years of content. Built as **consequences of the
water**, they are something nobody has: WorldBox paints its biomes, we can
*earn* ours.

## Mold World is a generator; we are a live simulation

The formulations are a one-shot pipeline: tectonics → terrain → climate →
erosion → hydrology → soil → biomes, each stage run once, relaxing to a
steady state. Its own section 7 says it plainly — no time, no events, no
feedback from terrain back to climate.

We are the opposite: a tick loop, per hex, pure, deterministic, with the
board a function of two stored numbers a hex. So **nothing is copied, every
formula is adapted**, and three of them adapt almost unchanged because they
are already local:

| Mold World | Ours | Why it ports |
|---|---|---|
| 4.3 orographic rainfall | wind + drifting clouds | already a one-step upwind read |
| 5.6 soil and fertility | alluvium → fertile ground | already per cell, from sediment |
| 6 Whittaker biomes | biome as a pure read | already an argmax over three axes |
| 2.8 hardness | rock types, differential erosion | already a per-cell multiplier |

What is **not** ported: tectonics (we have a player instead of plates),
Köppen (needs latitude and an ocean; a pot has neither), the marine ladder
(no sea), Priority-Flood (settle() already finds lakes by settling).

---

## A · Stop the pain

The current build actively annoys. None of this is a new system.

- [x] **A1 · Separate the timescales.** Measured before: bowl 0.71 Season,
  life 0.51, a slab of rock 0.83 — a spread of **1.64×**, one timescale for
  the whole game. After: **0.18 / 0.50 / 2.92**, spread **16.47×**. Water
  43s → **14s** at 1×; life unchanged *in Seasons* so the Bloom targets stay
  valid; soil is now a Year-scale process, which makes Moss the early game
  and Grass what waiting buys. Season 120 → 480 ticks, BASE_RATE 2 → 6,
  LIFE_EVERY 10 → 40, player weathering 0.7 → 0.05. A Year is 5.3 min at 1×,
  a run about 43.
- [x] **A2 · Speeds 1/2/4/8**, labelled with the number. Verified in the
  browser at 5.97 ticks/s against an expected 6.
- [x] **A3 · The Whim is a token, not an interrupt.** Measured on the exact
  case that broke — a settled basin with a green rim, giving Lake + Ring of
  Life + Grove in one breath: **0 modals** (was 3, back to back) and **3
  tokens banked**, reading *"The first Lake · +2 waiting"*. Spending one
  opens the wheel and leaves 2; the next is held for a full Season (not ready
  at 470 ticks, ready at 490). Also held over any screen, while aiming, during
  a strike, and in the last tick before a Harvest.
- [x] **A4 · Camera.** WASD/arrows pan, Q/E rotate, Space pause, a rotation
  lock in the corner. Keyed off `e.code`, the physical key, so WASD stays a
  shape on the keyboard — verified that code `KeyW` carrying key `"z"`
  (AZERTY) still reads as forward. Panning and rotation run off the wall
  clock in `frame()`, not per frame. Measured: W for 1 s moves 13.63 world
  units, Q for 1 s turns the camera about its target, locked Q turns
  **0.00°**, Space takes the world from 4 ticks per 0.7 s to **0**. The
  drainage lens moved from **D to V**, since WASD needed D.
- [x] **A5 · The waterfall is drawn.** A curtain hung from the tile's water
  surface down to the neighbour's, past the shared edge so it clears the
  cliff face, flattened across the flow and turned to face it. Measured on a
  four-elevation cliff fed by a trench: the drop reads 2.83 elevations and
  the instance comes out **0.93 world units tall**, projecting to **68.7 px**
  against a hex's 49.2. **A fall got its own flow bar** (`RIVER_MIN/3`): the
  lip was splitting 0.077 and 0.065 across two edges against a river bar of
  0.0833, so on the exact board a player points at, nothing qualified as a
  river and nothing was drawn. Splitting two ways is what a lip does — a fall
  is a *drop* feature, not a river feature.

## B · The derived world

After this block the game stops resembling anything on the market.

- [x] **B1 · Rock types and hardness.** Five weatherable rocks with Mold
  World's erodibility law: granite 0.20× through shale 1.50×, **7.49×** end to
  end. Proved it changes the *shape* and not just the rate — two halves of one
  slab under one cloud, identical to **0.002 elevations** with contrast off
  and **6.8 elevations** apart with it on. The column is layered (rock /
  limestone / shale / granite / bedrock) and the bedrock floor halved from 13
  elevations to 7, so a dig has somewhere to go. Caught two bugs doing it: a
  `MAXRUN` comment that stopped being true, and a bounds guard that ran after
  the write and only broke the inner loop, so the board rendered black.
- [x] **B2 · Fertility, and what the erosion is for.** `fertility =
  min(1, soil/4 courses) × F(rock beneath)`; a living hex is worth
  `×(1 + 0.5·fertility)`, so basalt ground pays **1.450** against granite's
  **1.150**. Mold World 5.6 with its `soil` line, its `wet` factor and its
  global normalisations all removed — we simulate soil rather than estimating
  it, rule 6 already guarantees wetness, and a live sim may not read a global
  max. **The sand fraction was tried as an alluvium marker and dropped**:
  measured at 0.00–0.24% of loose ground over four scenarios, far too faint
  to carry a mechanic. Soil is tinted by fertility so a fan reads as soil.
- [x] **B3 · Biome as a pure read.** Mold World 6's Whittaker argmax, ported
  almost unchanged. Eleven biomes over elevation, temperature (altitude alone
  — C1 in miniature) and moisture (water in reach over the hex and its six
  neighbours). **The forest is a condition, not a timer**: measured on one hex
  with time frozen, bare rock → scree → forest → grassland → alpine meadow by
  changing only the ground; and directly for purity — set the conditions gives
  Forest, 5000 ticks of drift gives Scree, restoring the conditions gives
  Forest again.
- [x] **B4 · Biome colour.** A two-stop ramp per living biome with the per-hex
  hash still picking a point along it, so no two hexes of a forest are the
  same green. The pointer names the biome; the bench readout shows the three
  axes it was decided from. Bare-ground biomes are named but not painted —
  the ground already shows its rock and soil, and snow arrives in C4.

## C · Climate — one system, not four

- [x] **C1 · Temperature.** `t = base − elevation×lapse + the Season's swing`,
  and **two of them on purpose**: `tempAt` is the Year's mean and the biome
  reads it, `tempNow` carries the swing and snow and the palette read that.
  Measured on a still board, **0 biome changes across two full Years** — the
  map keeps its identity and the Year gets a rhythm. Relief is worth 11.7 °C
  on a radius-12 pot and the Season 10.0. Shown in two places: the pot's
  range beside the clock, the hex's own reading under the pointer. Also made
  `genPot` reset TICKS, or a run opened its first Spring at whatever phase
  the generator stopped on.
- [ ] ~~C1 · Temperature.~~ No latitude in a pot, so it is elevation and
  season: `t = base - elevation*lapse + seasonSwing`. This is what puts snow
  on a peak and nowhere else.
- [x] **C2 · Wind and drifting clouds.** A cloud crosses one hex every 120
  ticks — 14 s at 1×, sixteen hexes a Year — and the wind holds for a **Year**
  (it turned each Season until C3 measured that clouds then *orbited* rather
  than traversed). Moved from a snapshot, and `i → nb[d]` is injective so two
  stacks can never collide. What it does: **rain is something to catch.** A
  closed basin in the path holds **20.6 / 47.3 / 128.6** courses at 1, 2 and 4
  elevations deep, two Years after the cloud has gone; flat ground keeps
  nothing. So digging is the verb that decides the run.
- [x] **C3 · Orographic rainfall.** Mold World 4.3 with `q` adapted rather
  than added: a cloud's **stack is its charge**, so climbing spends tiles —
  `floor(lift × 1.5)` — and no third number is stored on a hex. Measured
  windward/lee on a ridge: **1.0× (no ridge, the control), 1.2×, 1.8×, 2.5×,
  total at 4 elevations**, where the cloud dies on the climb. Twelve tiles is
  the cap, so a full cloud crosses eight elevations and a small one crosses
  nothing.

### The founder's note, 10 Sep — the Seasons have to MEAN something

> "bulutlar taşınıyor ok ama kış gelince kar yağışı, yazın kuraklık vb —
> dört mevsimi görsel olarak doğru verebilmeliyiz"

C1 gave the Year a temperature and C2 gave it a wind, and neither yet
*changes what the water does*. A Season you can only read off a clock is a
label. All four have to be legible from the board alone, and each has to do
something the others do not:

```
  Winter   water arrives as SNOW above the freezing line and stops moving
  Spring   the snow releases -- a surge the player can aim by where the
           freezing line fell, which is where they built the height
  Summer   DROUGHT: less water enters, the lakes draw down, shores retreat
           and the life on them is tested
  Autumn   the last growth, and the colour that says so
```

**One warning to settle before building the drought, because the two
versions are not equivalent.** CLAUDE.md states and measures an invariant:
*water is created only by clouds and lost only over the edge* — 0 ticks in
300 boards × 85 created any. Evaporation would break it, and the board would
stop being a closed system we can check.

- **Cheap and safe:** drought is `RAIN_MULT` falling in Summer. Clouds give
  less; conservation is untouched; it uses a lever that already exists and
  that the Boons already move.
- **Honest and expensive:** real evaporation, `pool` shrinking with
  `tempNow`. It gives drawdown on a pot with no rain at all, which the cheap
  version cannot — a lake that shrinks while you watch. It costs the
  conservation guarantee and the test that proves it.

Recommend starting with the cheap one and measuring whether the drawdown
reads at all; only pay for the second if it does not.

- [ ] **C4 · Snow and the spring melt.** Above the freezing line water is
  held as snow and does not flow; in spring it releases. One number a hex,
  no flow, no order dependence — the same shape as `pool`. `tempNow` from C1
  is already the driver, so this needs no new climate. **Snow is also the
  first thing on this board that is white**, so it is the strongest visual
  the Season has.
- [ ] **C5 · Seasonal colour and effect.** The palette shifts with
  `seasonSwing()`, and the Season drives rainfall through levers that
  already exist. The biome must NOT move with it — that is C1's split and
  the reason it exists.

## D · Where a pot comes from

**D came before C, and the measurement is why.** On the flat disc every run
opened on, as a player meets it: relief 0.00 elevations, 1 of 5 rocks
exposed, 1 of 11 biomes present, temperature range 0.0 C. So the whole of
block B was invisible on the board people play, and C would have multiplied
by zero -- `lift = max(0, z - zUpwind)` is 0 on a plain and so is
`lapse x elevation`. Building climate first would have been machinery with
no terrain to act on.

- [x] **D1 · Terrain generator that uses our own erosion engine.** Relief from
  hashed value noise, valleys cut by the shipping engine. Measured: relief
  **7.33-10.17** elevations, **4 of 5** rocks exposed (the fifth is bedrock,
  which has no business at the surface), 3 of 11 biomes on a dry pot, dT
  **11.7-16.3 C**, and **241-439 courses** of soil laid down by real
  transport. Deterministic: the same seed generated three times gives
  byte-identical boards. Tuned against the obvious guess -- heavy weathering
  during the cut puts the soil on the RIDGES (2.08 courses against a valley's
  0.39, backwards), so the relief comes from the noise and the erosion is
  kept light: ridge **0.01**, valley **1.93**, 147 of 469 hexes carrying a
  course. The range is -7 to 7 and the post-erosion floor is -4.0, so every
  hex is still diggable. `?flat=1` keeps the old disc.
- [x] **D1b · The pot is a body, and the score says so.** D1 broke the Bloom
  formula and that had to be fixed before anything could ship. `worth x (1 +
  the Wonders)` was calibrated on hand-dug pots where a Lake was an
  achievement; on real terrain the water makes them itself -- fork x42 -- so
  the multiplier ran **x1.5 to x28.5 by seed** and seed 1337 opened at x7
  before the player moved. Bloom is now **`worth x the pot's health`**, where
  health is 1 minus the share of workable ground the PLAYER turned to
  granite, measured against that pot's own opening so every seed starts at
  1.00. Measured over a run: careful play **rises** 88 -> 118 at health 0.89,
  greedy play **falls** 93 -> 54 at health 0.57. Targets retuned to
  8/20/35/50/65/80/95/110 and marked provisional -- the old curve climbed to
  180 for a number that grew, and Bloom now plateaus.
- [x] **D1c · The Chronicle.** Erosion is the one thing that happens *to* the
  player and nothing said it was happening. A feed beside the board reads the
  pot every half Season against the last read -- granite showing, courses
  gone over the edge, soil settling, dieback. Pure UI; the CORE stores
  nothing for it. Three sweeps looked for a knob to make the loss bite harder
  and none keeps the decision: weathering 0.10 -> 0.35 lifts a careless run
  13.2% -> 19.9% but a careful one 0.25% -> 0.52%, so the contrast falls 53x
  -> 38x; transport moves it only to 17.5%; abrasion does not move it at all.
  The physics already gives the widest gap; only the seeing was missing.
- [ ] **D1-old · Terrain generator** (superseded, kept for the wording) Noise, then
  a few thousand ticks of rain and erosion, and the valleys are real because
  they were actually cut. Most games use noise plus painted biomes; this one
  can afford the truth, and the engine is already written.
- [ ] **D2 · Seeded pots and sizes.** Every run currently opens on an
  identical flat disc of rock, so the first two Years are the same moves
  every time. This is the answer to "why start a second pot".

## E · Polish, last on purpose

- [ ] **E1 · Grass that moves in the wind.** Vertex displacement. Cheap and
  worth a lot, but polishing while the systems underneath are still moving
  is doing the work twice.

---

## Open questions, still unanswered

1. ~~How long should a run be?~~ **ANSWERED: 30 minutes.** Set by the clock
   (`BASE_RATE` 6 → 8.5), not by the Season length — shortening the Season in
   ticks would move every process relative to it and invalidate the Bloom
   targets that A1 was careful to keep. Eight Years is 15,360 ticks; at 8.5 a
   second that is **30.1 minutes**. Verified: the Seasons column is unchanged
   to two decimals (0.18 / 0.50 / 2.92, spread 16.47×) and only wall time
   moved — a bowl fills in 10s instead of 14, a Season is 56s instead of 80.
2. **The bigger reframe, still on the table:** clouds you cannot place, only
   a wind direction you choose — so shaping the land is the *only* way to
   move water, and every Wonder becomes a puzzle instead of a placement.
   C2 and C3 build the machinery for it either way; whether placement goes
   away is a separate decision, taken after they are felt.
3. **Forest must not be a timer.** "Grass and moss merge into forest after a
   while" is stored, order-dependent state — the exact class of thing this
   project has been burnt by twice. It has to fall out of the *condition*
   (deep soil + water + dense life), not out of a counter. B3 does it that
   way.
