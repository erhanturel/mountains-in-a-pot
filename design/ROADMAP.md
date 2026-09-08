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

- [ ] **A1 · Separate the timescales.** Everything now happens within a
  factor of two: a bowl fills in 120 ticks, a rim greens in 56, a slab
  weathers in 100, and a Season is 120. So every speed makes *everything*
  fast or *everything* slow. Target: water in seconds, life in a Season,
  erosion and soil in Years.
- [ ] **A2 · Speeds 1/2/4/8**, not 1/3/10/30. Three-fold jumps are why there
  is no setting between "too slow" and "a Season just ended".
- [ ] **A3 · The Whim becomes a token, not an interrupt.** Twelve milestones
  on a 500 ms check means three Wonders forming together fire three modals
  back to back. A glowing token that waits until you press it fixes the
  interruption, queues the extras, and lets a force be saved for the right
  moment — which makes it a better prize than a modal ever was. At most one
  a Season.
- [ ] **A4 · Camera.** WASD pan, Q/E rotate, Space pause, rotation lock.
- [ ] **A5 · Draw the waterfall.** River stubs are drawn flat at water height
  and never sloped, so water reaching a cliff simply vanishes. The data is
  already there — `out[6]` says which edge it left by.

## B · The derived world

After this block the game stops resembling anything on the market.

- [ ] **B1 · Rock types and hardness.** Mold World 2.8. Not cosmetic:
  `E = max(1 - contrast*(2*hardness - 1), 0.05)` as a multiplier on
  weathering, so a hard band makes a river bend around it and a soft one
  makes a canyon step. Differential erosion is where landscape character
  comes from. Also halves the bedrock floor: layered ground makes digging
  an act of discovery.
- [ ] **B2 · Soil and fertility from alluvium.** Mold World 5.6, adapted:
  `soil = warmth * wet * flat * rate + alluvium * rate`,
  `fertility = soil * F(rock) * (0.4 + 0.6*wet) + 0.3*alluvium`.
  Closes the loop the engine already half-runs: mountain erodes → water
  carries → deposits on the flat → that ground is *fertile* → forest grows
  there. Erosion becomes visible because its output finally means something.
- [ ] **B3 · Biome as a pure read.** Mold World 6's Whittaker argmax:
  `pref(v,lo,hi,fall) = max(0, 1 - max(lo-v, v-hi, 0)/fall)`, score is the
  product over three axes, highest wins. Our axes: elevation, temperature,
  local moisture. No new state, runs like `wonders()`.
- [ ] **B4 · Biome colour in the renderer**, and the biome named in the
  pointer readout beside the surface material.

## C · Climate — one system, not four

- [ ] **C1 · Temperature.** No latitude in a pot, so it is elevation and
  season: `t = base - elevation*lapse + seasonSwing`. This is what puts snow
  on a peak and nowhere else.
- [ ] **C2 · Wind and drifting clouds.** Six directions. Clouds are no longer
  parked where you placed them; they move. This alone makes the board stop
  being solved once and for all.
- [ ] **C3 · Orographic rainfall.** Mold World 4.3, almost unchanged:
  `lift = max(0, z - zUpwind)`, `rain = q*(base + gain*lift)`,
  `q -= rain`. A cloud gives up its water climbing the windward slope and
  arrives at the lee with less to give. **The rain shadow is where the
  desert comes from** — not a desert feature, a consequence of where you put
  the mountain.
- [ ] **C4 · Snow and the spring melt.** Above the freezing line water is
  held as snow and does not flow; in spring it releases. One number a hex,
  no flow, no order dependence — the same shape as `pool`. Gives the Year a
  rhythm instead of four identical quarters.
- [ ] **C5 · Seasonal colour and effect.** The palette shifts, and the
  season drives rainfall and evaporation through levers that already exist.

## D · Where a pot comes from

- [ ] **D1 · Terrain generator that uses our own erosion engine.** Noise, then
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

1. **How long should a run be?** Eight Years is 32 minutes at 1× today.
   Separating the timescales lengthens it. 45 minutes, 90, or "it does not
   end, I save and come back"? This decides how many Years there are.
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
