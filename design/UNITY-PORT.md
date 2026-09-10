# Porting the simulation to Unity

*Written 10 Sep 2026, from the `steps` branch. For the developer who opens the
Unity project, and for the coding agent working alongside them — read all of
it before writing the first line, because most of what follows is about
implementations that **look right and are wrong**.*

---

## 1 · What you are porting, and what you are not

```
  the CORE (the simulation)      671 lines of code, 1638 with its comments
  the renderer and the UI       3375 lines — none of it ports
```

Six hundred and seventy-one lines is a week. **The code is the cheap part.**

What is expensive, and what this document exists to hand over, is everything
that is *not* in the code: which numbers were measured and would break the
game if changed, which obvious implementations are subtly wrong, and how to
know your rewrite is correct rather than merely plausible.

**Do not port the code. Port the behaviour, and verify it against the
fixtures.** A rewrite in idiomatic C# — structs, `NativeArray`, Burst — will
be faster and cleaner than a mechanical transliteration of JavaScript. That is
fine and expected. What is not negotiable is that it reproduces
`design/unity/fixtures.json`.

---

## 2 · The contract: `design/unity/fixtures.json`

This is the most important file in the handover. 16 fixtures, 36 checkpoints.

Each fixture is:

```jsonc
{
  "name": "cliff-shed",
  "why":  "…what this proves and which wrong implementation it catches…",
  "radius": 6,
  "ops": [ /* declarative board setup — no JavaScript to port */ ],
  "steps": [ { "ticks": 1, "hash": "672538ed", "readings": { … } } ]
}
```

**Your port is correct when it reproduces every hash.** Nothing else counts
as done.

### The op set you must implement to replay a setup

| op | meaning |
|---|---|
| `knob` | set a named tunable (`WEATHER`, `THRESH`, `CAP`, `DRIFT`, `LIFE_EVERY`, …) |
| `ticks0` | set the tick counter, to start at a chosen point in the Year |
| `flat` | every column: lay the strata full depth, cut it back to elevation `h`, zero every per-hex value |
| `genPot` | run the terrain generator with a seed |
| `setTop` | cut or extend one column to elevation `h` |
| `raise` / `lower` | add or remove `n` **slabs** on one column |
| `pool` / `sed` / `snow` | set a per-hex amount, given in **courses** |
| `life` | place a life kind on one hex |
| `cloud` | add `n` cloud tiles over one hex |

### The hash

FNV-1a over, for every hex in index order: `TOP`, the material of the top
cell, then `pool, sed, sand, snow, wear, grit, life` and the six `out[]`
values — **each rounded to six decimals first**.

The rounding is deliberate. It is the same rounding the save format already
uses, so two IEEE-754 `double` implementations that agree to a part in a
million agree on the hash. Anything that diverges *earlier* than six decimals
is a real difference and should fail.

`readings` alongside each hash — total water, snow, slag, sand, ground, alive,
wet hexes, cloud tiles, max pool, and the climate values — exist so that a
failure tells you **where** to look instead of only that something differs.

### Keep the oracle runnable

Do not delete the JavaScript. `index.html` between `/*==CORE-START==*/` and
`/*==CORE-END==*/` is the reference implementation, it runs headless in Node,
and when the two disagree you settle it by running both:

```bash
node test/fixtures.js            # print the hashes
node test/fixtures.js --write    # regenerate design/unity/fixtures.json
```

Every other file in `test/` is a measurement that produced a number quoted in
this document. They are worth reading when a rule surprises you.

---

## 3 · Units, and the one thing everybody gets wrong first

**Internally, an elevation is `1.0` and everything is a `double` in
elevations.**

```
  LAYER    = 1/6 elevation     one drawn course of water, soil or snow
  SLAB     = 6                 slabs to an elevation, in the cell stack
  RAINFALL = LAYER             what one cloud tile drops in one tick
```

The design notes and `CLAUDE.md` talk about **420 units to an elevation and 70
to a course**. That is a *display* scale — multiply by 420 — chosen because
420 is the lowest common multiple of 2 through 7, so a tile sharing what it
sheds between itself and up to six lower neighbours always divides evenly on
the first split. **Nothing routes on it.** If you store units instead of
elevations you will not reproduce a single hash.

---

## 4 · The rules

Nine of them, and the whole simulation is here. If a change cannot be stated
as one of these, it is a new rule and wants deciding rather than drifting
into.

```
1  a rain tile drops RAINFALL on the column below it, every tick, and they
   STACK — n tiles drop n times the rain
2  one elevation is 6 courses; one drawn water tile is one course
3  a tile's HEIGHT is its stone plus what is lying on it plus its water
4  a tile with water pours into whichever neighbours stand lower, until it
   and all of them are at ONE HEIGHT
5  off the board is lower than anything, and that share is gone

6  a hex is HABITABLE when it has a course of loose ground to root in, is
   not drowned, and has water in reach — a shore or a bank
7  life spreads one hex per life-step, to any habitable hex beside a living
   one; a hex that stops being habitable dies that step
8  life binds the ground it stands on: a living hex sheds no soil and
   weathers no rock

9  water arriving where it is below freezing is held as SNOW. Snow does not
   flow. When the hex rises above freezing it melts back into pool.
```

### The two things rule 4 does not say, and has to

**How much it sheds.** Read as *hand over the whole contents*, a brimming
basin empties in a single tick and the lake vanishes and begins again for
ever. Read as *hand over the whole difference*, it overshoots by exactly
double and a pair of tiles swap heights and swap them back for ever — boards
were still sloshing two thousand ticks after the rain stopped.

**The level is found, not computed.** Walk the lower neighbours from the
lowest upward, each joining the pour as the surface drops past it:

```
   what the tile gives up   =   what the neighbours below L take in
          H − L             =   Σ over aj < L of (L − aj)
```

With the first `m+1` neighbours taking part that is `L = (H + Sm) / (m + 2)`,
and the walk stops at the first `m` where `L` actually lands between that
neighbour and the next. Everyone finishes at the same height, so nothing can
overshoot anything. **It cannot give more than it has**: if the level would
take it below its own stone it empties instead, and the receivers level among
themselves with what there was. A void neighbour is bottomless, and takes the
lot.

### The tick order — get this wrong and every hash after the first fails

```
1  rain      per hex: cloud tiles × RAINFALL × RAIN_MULT × seasonRain()
              → snow if tempNow(i) < FREEZE, else pool
2  melt      per hex: if tempNow(i) ≥ FREEZE, move min(snow, MELT) to pool
3  settle()  rule 4, over the whole board
4  weather() rock → loose material, in place
5  carry()   loose material rides the water's own out[] routing
6  TICKS++
7  life      every LIFE_EVERY ticks: wake(), grow(), travel()
8  blow()    the wind moves the clouds
```

Melt runs **before** settle so meltwater flows on the tick it appears.
`carry()` runs **after** `weather()` so what just broke loose can move; and
`grit` is therefore always last tick's, which is intentional.

`blow()` runs **last**. It used to run first, and the golden fixtures caught
it on their first run: a cloud placed on a tick where `TICKS % DRIFT == 0` was
carried off before it had rained once, and because climbing spends cloud tiles
(§6, C3) a one-tile cloud placed beside rising ground died on the spot.

---

## 5 · The whole board is read from one snapshot

Every tile decides from the state at the **start** of the tick and the writes
land afterwards, so no tile can see another tile's move inside the same tick.

This is not a performance detail, it is the reason the board is symmetric.
Taken in place, the answer depends on the order tiles are visited, and a
symmetric board sheds lopsidedly — the bug that once made a symmetric peak
grow its apron always to the east.

**Checked, and the `flat-symmetry` fixture checks it for you:** on a flat
board with one rain tile, the distinct depths per ring come out
`1, 1, 2, 2, 3, 3, 4` — exactly the number of symmetry orbits in each hex
ring. Not approximately symmetric. Symmetric.

The same applies to `blow()`: every cloud's destination is read before any of
them is written. The map `i → nb[d]` is injective, so no two stacks can land
on one hex.

Two properties fall out and both are worth keeping as tests:

- **The board is still when idle.** Take the clouds away and nothing moves.
- **Water is conserved exactly.** Created only by clouds, lost only over the
  edge. Measured: 0 ticks in 300 boards × 85 created any.

---

## 6 · Constants that are load-bearing, and knobs that are taste

### Load-bearing — these were measured, and changing one changes the game

| | value | why it is this |
|---|---|---|
| `LAYER` | `1/6` | the drawn quantum. Rule 6, the biome and the soil ramp all read it |
| `SLAB` | `6` | slabs to an elevation. Erosion moves ground by fractions; a staircase of whole elevations cannot express that |
| `ZN`, `Z0` | `192`, `−78` | cell-stack depth and floor. **`TOP` must be `Int16`** — 192 does not fit in a signed byte |
| `SEASON_LEN` | `480` ticks | a Year is 4 Seasons = 1920 ticks; a run is 8 Years ≈ 30 min at 8.5 ticks/s |
| `LIFE_EVERY` | `40` | life keeps its own clock. Tuned in *Seasons*, not ticks: life covers a rim in 0.50 of a Season |
| `TEMP_SEA` | `14` | base °C. At 18 nothing on a natural pot ever froze |
| `LAPSE` | `3.4` | °C an elevation. At 1.6 the freezing line sat above the board |
| `SWING` | `5` | the Season, ±°C. Relief is worth ~11.7° on a radius-12 pot, so the mountain decides and the Season modulates |
| `FREEZE` | `0` | °C, read from `tempNow` |
| `MELT` | `RAINFALL` | snow melts about as fast as it falls, so a winter's fall is a spring's flood. At `RAINFALL/40` a Season cleared 12 courses against a pack of 3000 and the Season was scenery |
| `DRIFT` | `120` ticks | a cloud crosses one hex; ~16 hexes a Year |
| `YEAR_LEN` | `SEASON_LEN×4` | the wind holds for a **Year**. Turning each Season made clouds *orbit* instead of traverse, and no rain shadow could exist |
| `SHED` | `1.5` | cloud tiles spent per elevation climbed. 12 tiles is the cap, so a full cloud crosses 8 elevations and a small one crosses none |
| `DROUGHT` | `0.7` | summer 0.30×, winter 1.70×, symmetric so the Year *redistributes* water rather than removing it |
| `SHIELD` | `140/420` | slag depth at which weathering halves |
| `DROPCAP` | `1` elevation | a waterfall does not carry sediment in proportion to the whole height of its cliff, and the void off the board is infinitely far down |
| `STRATA` | see below | bedrock −6, granite −3, shale −1, limestone 1, rock above |
| `DIRS` | `[[1,0],[1,−1],[0,−1],[−1,0],[−1,1],[0,1]]` | **the order is part of the data.** It indexes `out[6]` *and* it is the wind's direction. Reorder it and everything still runs while the wind blows the wrong way |

### Knobs — sliders, safe to expose

`WEATHER` (0…0.7/420, player default 0.10/420), `ABRADE` (0.07),
`THRESH` (0.2), `CAP` (0.05), `ATTR` (0.05), `MOB` (3), `CONTRAST` (1),
`RAIN_MULT` (1 — **the Boons' lever, do not let anything else touch it**),
`FLOOD_TOL` (0).

### The strata, and the erodibility law

```
  elevation      material      E = max(1 − CONTRAST(2·hardness − 1), 0.05)
   1 and up      rock          0.90×
  −1 … 1         limestone     1.10×
  −3 … −1        shale         1.50×
  −6 … −3        granite       0.20×
  below −6       bedrock       never — it is absent from the hardness table
```

`E` multiplies the weathering rate. **Bedrock's absence from the table is the
implementation**: not in it means `E = 0` means it never weathers, which is
the whole of what makes it bedrock, and it stays one test rather than a
special case. Verified: 50,000 ticks at the maximum rate leaves `h` unmoved.

Granite at 0.20× takes ~7,000 ticks a slab against a 15,360-tick run, so
granite at the surface makes no soil for the rest of the game. That is the
punishment for over-watering and it is what `health` scores.

---

## 7 · The traps

Every one of these is a rule stated one way and implemented another. **They
are here because each is easy to write again, and none of them is visible by
reading the code.**

### Water

- **Handing over the whole contents.** Rule 4 read literally. A brimming basin
  empties in one tick and nothing can ever come to rest.
- **Handing over the whole difference.** The obvious correction, and it
  overshoots by exactly double, for ever.
- **Levelling with only the highest lower neighbour**, then splitting that
  amount equally. Identical whenever the lower neighbours are all at one
  height, wrong whenever they are not. Measured on the failing board: 430 of
  490 units stayed put and every neighbour got 10, where the correct answer
  sends all 490 into the two deep neighbours and gives the near three nothing.
  The `cliff-shed` fixture is exactly this case.
- **Updating in place instead of from a snapshot.** Everything works and the
  board is quietly asymmetric. `flat-symmetry` catches it.
- **Steepest-descent routing** — deletes water on flat ground, where nothing
  is downhill, and draws stripes along the six axes. `settle` levels with
  *all* lower neighbours; the drainage overlay must too.

### Structure

- **`solid(i,z)` is not `cell(i,z)`.** A cloud lives in the same stack and is
  not air. Any loop walking a column for ground must say which it means. The
  renderer did not, and drew a grey prism inside every cloud.
- **`MAXRUN` must be sized from the strata**, not from a guess. One instance
  per unbroken run of one material: a layered column is one run per stratum,
  so the flat opening board alone wants five. The old figure assumed two, and
  the board rendered **black** — because the bounds guard also sat *after* the
  write and only broke the inner loop.
- **`TOP` must be `Int16`.** 192 does not fit in a signed byte, and it fails
  silently.
- **Loose material can never be buried under solid.** Slag and sand are
  *amounts* and always ride on top of the stack. This is a real limit, it is
  deliberate, and it is the most interesting unbuilt thing here — see
  *Parked: burying* in `CLAUDE.md` before changing it.

### Climate

- **The seasonal swing must peak in the MIDDLE of a Season, not on its edge.**
  `sin(π·s/2)` puts +1 at the instant Summer begins and sends it downhill from
  there, so the label says Summer while the world is already cooling. It
  stayed invisible until the drought made midspring and midsummer read the
  same rain rate. Correct: `sin(π·(s − 0.5)/2)`.
- **Two temperatures, and do not collapse them.** `tempAt` is the Year's mean
  and the **biome** reads it; `tempNow` carries the swing and **snow and the
  palette** read that. Feed a swinging temperature into the biome and a hex
  changes what it *is* four times a Year, on a clock — a forest in November is
  a forest that has gone gold, not a different biome.
- **`genPot` must set `TICKS` to zero when it finishes.** Cutting the valleys
  burns ~2,400 ticks, and `TICKS` drives both life's phase and the Season. Left
  running, a pot opens its first Spring at whatever phase the generator
  stopped on.
- **Snow is not ground.** `gnd` is what water routes on. A snowpack in it dams
  the board every winter and undams it by moving the ground itself.
- **Only *arriving* water freezes.** A lake below zero keeps flowing. Freezing
  standing water stops every river each winter, which is a far larger change
  than rule 9 is.

### The generator

- **Height is hashed from a hex's own axial coordinates, never drawn from a
  PRNG stream.** A stream makes the board a function of the iteration order,
  which is the class of bug this project has been burnt by twice. Verified:
  the same seed generated three times gives byte-identical boards.
- **Relief comes from the noise; the valleys come from the erosion engine.**
  Heavy weathering during the cut puts the soil on the *ridges* — measured
  2.08 courses on ridges against 0.39 in valleys, exactly backwards, because
  weathering makes soil where it stands and the shield stops it before the
  water can take it away. Light erosion inverts it: ridge 0.01, valley 1.93.

### Performance, and one that will bite in C# too

`h` is not a field — it is an accessor over the cell stack. Profiled at radius
64, `settle()` was **84% of the tick**, and not for the reason anyone guesses:
it read the same hex's surface height about **twenty times** per hex, and none
of those calls inlined.

```
              settle    carry   weather     tick
  before       20.28     0.86      0.36    21.06
  after         3.02     0.67      0.31     4.36     4.8×
```

The fix was to read every surface height **once** into a flat array at the top
of settle — the ground cannot change inside settle, so it is the same numbers
by construction — and to fold the neighbour scan and the sort into one pass
over fixed six-slot scratch arrays.

**In C# this trap is a property.** Do not expose `h` as a property that walks
`TOP` and `CELL`. Read it once into a `NativeArray<double>` per tick.

And the counter-intuitive half, so nobody spends an afternoon on it: the
whole-board allocations were **0.24 ms of a 14.8 ms settle**. They are not the
problem.

---

## 8 · Data layout for Unity

The JavaScript is objects with accessors because that is what was quick. **Do
not reproduce that.** The layout the simulation actually wants is:

```csharp
// the cell stack — the structure of the world
NativeArray<byte>  cell;   // hexCount * ZN, material id per cell
NativeArray<short> top;    // hexCount, index of the topmost solid cell

// per-hex amounts — struct of arrays, so Burst can vectorise
NativeArray<double> pool, flow, sed, sand, wear, grit, snow;
NativeArray<double> outEdge;      // hexCount * 6, in DIRS order
NativeArray<byte>   life;
NativeArray<int>    nb;           // hexCount * 6, −1 for the void
```

Notes that matter:

- **`double`, not `float`.** Levelling is asymptotic and error accumulates;
  `float` will not reproduce the fixtures and the board will not go quiet.
- **Neighbours precomputed and flat.** `nb[i*6 + d]`, `−1` for off-board. The
  void is not a hex; it is an index of −1, and rule 5 is "the neighbour is
  −1".
- **Two buffers for anything a tick writes**, or you have silently reintroduced
  the in-place update. Read from the front buffer, write to the back, swap.
- **Hex coordinates are axial `(q, r)`** with `x = √3·(q + r/2)`, `y = 1.5·r`.
  The board is every `(q, r)` with `max(|q|, |r|, |q+r|) ≤ R`.
- Hexes are stored in a single flat array; **index order is part of the
  hash**, so build the board in the same nested loop: `for q in −R…R`, then
  `for r in max(−R, −q−R) … min(R, −q+R)`.

Burst/Jobs is a good fit: `settle`, `weather` and `carry` are all
per-hex-reads-neighbours passes over flat arrays. `settle` at radius 64 is
3 ms single-threaded in JavaScript; it should be well under a millisecond
jobified.

---

## 9 · What is decided, and what is not

Ported behaviour is settled. These are **open design questions** — do not
quietly resolve them in code.

- **`health` counts exposed granite, not lost mass.** So a player who restores
  a granite region with soil and life is not rewarded for it. What the pot's
  health is *meant* to reward has not been decided, and one experiment
  (`test/hold-or-release.js`) is blocked on it.
- **Should a cloud rain on seven hexes instead of one?** Stacked clouds drop
  everything on a single column. Spreading it over the hex below and its six
  neighbours would change rule 1, so it wants deciding. Any test of it must
  hold the *total* rain constant or it is testing two things at once.
- **`slag` may want to be called `regolith`.** Not actioned. Player-facing
  language probably wants "loose stone" with "regolith" in the detail panel.
- **The Bloom targets (8, 20, 35, 50, 65, 80, 95, 110) are provisional** and
  calibrated by a script, not a person. They want a human run.
- **The Lab (`?lab=1`) and the `EXP_A` rule variants are experiments**, off by
  default, and were never finished. `test/experiment-a.js` records what they
  proved and what they did not. Do not port them without deciding whether the
  experiment continues.

---

## 10 · Where everything is

```
index.html                         the whole game
  /*==CORE-START==*/ … CORE-END    the 671 lines that port
  below CORE-END                   three.js renderer + DOM UI — does not port
CLAUDE.md                          the design record: every rule, every
                                   measurement, and every bug worth remembering
design/ROADMAP.md                  blocks A–E, what is done and what it measured
design/UNITY-PORT.md               this file
design/unity/fixtures.json         the contract
test/fixtures.js                   generates it; run with --write
test/*.js                          20 measurements, each producing a number
                                   quoted in CLAUDE.md or the roadmap
```

**Read `CLAUDE.md` in full once.** It is long because it is the record of what
was tried and what it cost, and roughly half of it is reasoning that would
otherwise have to be rediscovered.

---

## 11 · A suggested order

1. Hexes, the cell stack, `TOP`, neighbours. Get `flat` and `setTop` working
   and reproduce a fixture's **setup** — before any tick runs.
2. `settle()` alone. `basin-one-hex`, `cliff-shed`, `flat-symmetry`,
   `conservation-void` — all four hold `DRIFT` at 0, so the sky stands still
   and you are testing rule 4 by itself.
3. `weather()` and `carry()`. `bedrock-never`, `shield-self-limits`,
   `transport-conserves`.
4. Life. `life-binds`, `life-clock`.
5. Climate: temperature, the season phase, wind, orographic shedding, snow.
   `season-phase`, `wind-drift-and-shed`, `snow-and-melt`.
6. The generator. `genpot-42`, `genpot-7`, `genpot-1337`.
7. `long-mixed-run` last. If everything else passes and this one does not,
   the fault is in **how the parts are ordered inside a tick** — §4.

Only then start on the renderer. Every visual decision in the current build is
recorded in `CLAUDE.md` under *Rendering notes*, including several that were
tried and abandoned, and the tilt-shift measurement that says how much blur
actually reads.
