# Every formula, stage by stage

This page is the full mathematical specification of Mold World: every equation the
generator actually evaluates, in pipeline order, with the symbol names, the settings
that feed them, and the shipped defaults.

It covers the three families of behaviour the simulator models:

* **Geography** (tectonics, crust, lithology, terrain shape)
* **Climate** (temperature, wind, rainfall, Köppen zones, ground moisture)
* **Natural processes** (erosion, weathering, flow routing, rivers, lakes, soil, biomes)

If you want the *why* behind a stage, read its own page in "The generator, stage by
stage". This page is the *what*, written out.

---

## 0. Conventions

**The grid.** Every field is a flat `float[]` of length `n = width x height`, indexed
`i = y*width + x`. `x` runs west to east, `y` runs south to north, so `y = 0` is the
southern edge. One cell represents `kmPerCell` kilometres of real ground (default 10),
which is the only place real-world scale enters: the simulation itself is unitless.

**Named layers.** Stages never pass values to each other directly. Each writes named
layers into a shared `World` store (`elevation`, `precip`, `hardness`, and so on) and
later stages read them by name. The full list lives in `WorldLayers.cs`.

**Normalized latitude.** Many stages need latitude. It is derived from the row index:

```
ny  = 2y/(h-1) - 1        in [-1, 1],  0 at the equator
lat = |ny|                 0 at the equator, 1 at the poles
```

The world is a rectangular slab of one hemisphere pair, not a sphere: there is no
wraparound and no spherical convergence at the poles.

**Min-max normalization.** Where a stage says "normalized", the whole field is rescaled
by its own observed extremes, `(v - min) / (max - min)`, with the denominator floored at
`1e-6`. This is why an absolute value in a normalized layer (temperature, elevation
base) is only meaningful relative to the rest of that world.

**`saturate(x)`** clamps to `[0,1]`. **`smoothstep(a,b,x)`** is the Hermite ramp
`t*t*(3-2t)` on `t = saturate((x-a)/(b-a))`. **`lerp(a,b,t)`** is `a + (b-a)t`.

**Determinism.** Every stage is a pure function of settings plus seed. A text seed is
folded into an int with FNV-1a:

```
H = 2166136261
for each char c:  H = (H XOR c) * 16777619
```

Each noise field then draws its offsets from `seed XOR salt`, where the salt is a
per-field constant (elevation `0x0`, moisture `0x68BC21EB`, wind `0x2545F491`,
tectonics `0x5BD1E995`, rock variation `0xA1B2C3D4`). That is what keeps moisture from
being a copy of elevation at the same seed.

---

## 1. The noise primitive

Everything that needs a random-but-coherent field goes through one function: seeded
fractal Brownian motion over 2D simplex noise.

**Domain warp** (optional, applied before the octaves), with `fw = scale / warpScale`
and `a`, `b` seeded offsets:

```
p0 = (x, y) / scale
pw = p0 + warpStrength * ( snoise(p0*fw + a), snoise(p0*fw + b) )
```

**Octave sum:**

```
v = SUM over o in [0, octaves):
        snoise( pw * lacunarity^o + offset ) * persistence^o
```

**Normalize, then redistribute:**

```
out = normalize(v) ^ redistribution
```

Redistribution of 1 is identity. Above 1 it lowers the midlands and sharpens peaks,
below 1 it inflates them.

| Knob | Meaning | Default |
|---|---|---|
| `scale` | base feature size, in cells | 50 |
| `octaves` | layers summed | 4 |
| `persistence` | amplitude factor per octave | 0.5 |
| `lacunarity` | frequency factor per octave | 2.0 |
| `warpStrength` / `warpScale` | domain warp | off / 50 |
| `redistribution` | `pow` exponent on the profile | 1.0 |

---

## 2. Geography: tectonics

Tectonics runs first and produces the crust everything else sits on. It is a *kinematic*
model: plates are placed, given rigid motion, and their boundaries classified by
relative velocity. There is no time integration of plate positions.

### 2.1 Plate placement

For `N = majorPlates` level-1 plates, a reference radius comes from the map area:

```
rRef = 0.5 * sqrt(width * height / N)
```

Seeds are placed by rejection sampling with a minimum separation of `0.8 * rRef`, up to
32 attempts each, so majors come out comparably massive instead of random slivers. Each
seed draws:

* a **type**: oceanic with probability `oceanicFraction`, else continental
* a **translation** `V = (cos t, sin t) * driftSpeed` for a uniform random angle `t`
* a **spin** `w = U(-1,1) * spinAmount * driftSpeed / rRef`

### 2.2 Cell assignment

Two modes produce the same outputs (`plateId`, `plateType`) with different edge
character.

**Voronoi (blocky).** The sample point is warped, then assigned to the nearest seed:

```
px = x + snoise((x,y)*fw + a) * plateWarp
py = y + snoise((x,y)*fw + b) * plateWarp
id = argmin over p of  |(px,py) - seed_p|^2
```

**Organic flood-fill (default).** A weighted Dijkstra expansion over the 8-neighbour
cell graph. Each plate gets a growth weight, and each edge traversal a jittered cost:

```
W_p       = 0.7 + 0.6 * (snoise(0.02 * seed_p + b) * 0.5 + 0.5)     in [0.7, 1.3]
jitterAmp = clamp(0.067 * plateWarp, 0.4, 4)
cost      = step * (1 + jitterAmp * jitter_i) / W_p
            where step = 1 (orthogonal) or sqrt(2) (diagonal)
```

Cheap-to-expand plates grow larger, and the per-cell jitter curls the seams into lobes
and bays instead of straight Voronoi bisectors.

### 2.3 Hierarchy: fracturing or agglomeration

**Top-down (fracture passes).** Level-1 margins that are convergent or ocean/continent
contacts are marked active; a BFS gives distance-to-active-margin. On pass `k` the spawn
band shrinks as `band = max(fractureBand * 0.6^(k-1), 1)` and about `1.2N` children are
seeded inside it with acceptance probability `1 - d/band`. A child inherits its parent's
velocity, spin and root, and flips continental to oceanic (an island arc) with
probability `arcChance`.

**Bottom-up (agglomerate).** The first `aggloTargets` placed plates are macro nuclei;
every other plate joins its nearest nucleus and rides that macro's rigid motion. This
gives emergent macro size variety plus many internal province sutures.

Either way, **motion is always evaluated at the root**, so a fractured margin keeps its
major-on-major character:

```
v(p, x, y) = V_root + w_root * ( -(y - Cy_root), (x - Cx_root) )
```

where `C_root` is the area centroid of the root plate's whole territory, fragments
included.

### 2.4 Boundary classification

For a boundary cell on plate `a` with nearest other plate `b`:

*Same root?* Then it is a fossil contact, never active. It is a **suture** if the two
blocks differ in type (an accreted terrane), otherwise an inactive **fault**.

*Different roots?* Take the relative velocity and the seed-to-seed unit normal:

```
u  = v(a) - v(b)
n  = normalize(seed_b - seed_a)
nc = dot(u, n)                      convergence rate (positive = closing)
t  = |u - nc*n|                     tangential (shear) magnitude
```

| Condition | Class |
|---|---|
| `abs(nc) >= t` and `nc > 0`, both roots continental | **Orogeny** (stores `nc` for height scaling) |
| `abs(nc) >= t` and `nc > 0`, ocean involved | **Subduction** |
| `abs(nc) >= t` and `nc <= 0` | **Divergent** (rift) |
| `abs(nc) < t` | **Transform** |

**Which side subducts.** The denser plate goes down; continents never do:

```
density(p) = 0                                              if continental
           = saturate(0.85 - 0.15*(level_p - 1)
                           + 0.12 * frac(0.618034 * p))      if oceanic
```

Old majors are dense, young fracture fragments buoyant, and the golden-ratio term breaks
same-level ties deterministically. The denser side gets a **trench** seed, the other an
**arc** seed.

### 2.5 Cratons

Old stable interiors far from active belts become rigid shields (continental only):

```
age    = 1.0 if level 1, else 0.25
stable = saturate( (dBelt - 1.5*bw) / (3*bw) )        dBelt = min(dOrogeny, dArc)
craton = cratonization * age * stable                 bw = max(beltWidth, 0.5)
```

### 2.6 Crustal thickness (the isostatic base)

Distances to each seam class come from multi-source BFS. Then:

```
crust = saturate( base + oro + arc - trench - rift + 0.1*craton )

base   = continentalBase on continental crust, oceanicBase on oceanic crust
oro    = mountainHeight * Phi(dOrogeny)
arc    = arcHeight   * exp(-dArc    / bw)      only if the plate is an overrider
trench = trenchDepth * exp(-dTrench / bw)      only if the plate is a subductor
rift   = riftDepth   * exp(-dDiv    / bw)
```

Gating arc and trench by plate role is what stops them cancelling each other out across
a boundary.

**The orogeny profile `Phi`.** Thin mode is a symmetric exponential lens; broad mode
(the default) is a convergence-scaled plateau with a foreland decay:

```
Phi_thin(d)  = exp(-d / bw)

Phi_broad(d) = (0.4 + 0.6*c) * profile
    c        = saturate( nc / (2 * driftSpeed) )        collision speed, 0..1
    plateauW = bw * oroPlateau
    profile  = 1                                        if d <= plateauW
             = exp(-(d - plateauW) / bw)                otherwise
```

So a fast head-on collision builds a full-height Tibet, a glancing one a low range.

**Flexure.** The crust is then blurred `crustSmoothing` times with a 5-point box, which
softens boundary cliffs into gradual margins.

### 2.7 Uplift field

The field erosion reads if you enable coupled uplift:

```
uplift = upliftPeak * saturate( Phi(dOrogeny) + exp(-dArc / bw) )
upliftPeak = 0.024 * mountainHeight
```

### 2.8 Lithology and hardness

Rock type from geological setting, where `dConv = min(dOrogeny, dArc)`, `nv` is a
3-octave noise field at `rockVariationScale`, and `belt = 1.5 * bw`:

| Condition | Rock |
|---|---|
| oceanic crust | Basalt |
| `dConv < belt` or `crust > 0.75` or `craton > 0.5` | Granite |
| `crust > 0.5` | Limestone if `nv < 0.5`, else Sandstone |
| otherwise | Shale if `nv < 0.5`, else Sandstone |

```
hardness = saturate( H(rock) + 0.08*(nv - 0.5) + 0.15*craton )

H:  granite 0.90   basalt 0.70   sandstone 0.55
    limestone 0.45   shale 0.25   unset 0.50
```

**Fossil-seam softening.** Old suture and fault lines are mechanically weak, so within
`seamWidth` cells of one:

```
hardness *= lerp(0.4, 1.0, dSeam / seamWidth)
```

Combined with differential erosion, that is what carves ancient collision scars into
lineament valleys.

---

## 3. Terrain shape

**Base heightfield.** Section 1's noise into `elevationBase`.

**Tectonic blend** (when `useTectonicBase`): the crust is the shape, the noise is
surface detail.

```
base = clamp01( crust + (noise - 0.5) * tectonicDetail )
```

**Island falloff.** A radial mask, a pure function of position:

```
d    = length( 2x/(w-1) - 1, 2y/(h-1) - 1 )
mask = smoothstep(falloffStart, falloffEnd, d)

elevation = saturate( base - mask * falloffStrength )
```

Edge midpoints sit at radius 1 and corners at about 1.414, so `end` near 1 gives a
roughly circular coastline.

**Resampling.** If `sampling > 1`, the world is coarsened by that factor *here*, after
the shape is final and before erosion. Everything downstream (erosion, climate, rivers,
biomes) then runs at the coarse size, so the simulation is never finer than the surface
you actually see.

---

## 4. Climate

Climate runs on the pre-erosion tectonic relief, because rainfall has to exist before
erosion can be rainfall-weighted.

### 4.1 Temperature (normalized)

```
raw = (1 - |ny|)                                        latitude gradient
    - elevation * lapseRate                             altitude
    + snoise( (x,y)/jitterScale + offset ) * jitterStrength    weather noise

temperature = normalize(raw)                            to [0,1]
```

This is the cheap relative field. Real degrees Celsius come from Köppen (section 4.4).

Defaults: `lapseRate 0.6`, `jitterStrength 0.1`, `jitterScale 30`.

### 4.2 Wind

A latitude-banded vector field, not a fluid simulation. With
`p = (x,y) / turbulenceScale`:

```
windU = -cos(2*PI*|ny|) * strength            + snoise(p + oU) * turbulence
windV = -sign(ny) * equatorwardBias * strength + snoise(p + oV) * turbulence
```

The cosine profile reproduces the real zonal pattern: easterlies at the equator and the
poles, westerlies at mid-latitudes. The `V` term is a constant drift toward the equator.
There is no Coriolis term and no pressure field.

Defaults: `strength 1`, `equatorwardBias 0.2`, `turbulence 0.2`, `turbulenceScale 40`.

### 4.3 Orographic rainfall (rain shadow)

Semi-Lagrangian moisture advection. Humidity starts at 1 over ocean and at
`humidityFloor` over land, then `iterations` passes each backtrack one wind step and
rain out the lift.

For a land cell, with `wHat` the unit wind vector and `s = windStep`:

```
xUp   = (x, y) - s * wHat
qIn   = bilinear(humidity, xUp)              incoming moisture
zUp   = bilinear(elevation, xUp)
lift  = max(0, z - zUp)                      orographic uplift along the path

rain  = min( qIn, qIn * (baseRain + gain * lift) )
q_new = max( qIn - rain, humidityFloor )
```

Ocean cells are pinned to `q = 1` (an infinite source), and calm cells keep their
humidity. After the passes, the same expression is evaluated once more as the output:

```
precip = qIn * (baseRain + gain * lift)      0 over ocean
```

That is the entire rain-shadow mechanism: a parcel gives up moisture climbing the
windward slope and arrives at the lee with less to give.

Defaults: `precipBase 0.02`, `gain 3`, `windStep 2`, `iterations 48`,
`humidityFloor 0`.

### 4.4 Köppen-Geiger zones

Köppen needs real units, so it derives its own seasonal climate rather than reading the
normalized temperature layer.

**Continentality** is normalized distance to ocean, from a 4-neighbour multi-source BFS
seeded at every sea cell:

```
k = saturate( dSea / continentalityScaleCells )     0 at the coast, 1 fully interior
```

**Mean annual temperature:**

```
warmth   = cos( lat * PI/2 )                        1 at the equator, 0 at the poles
aboveSea = saturate( (z - seaLevel) / (1 - seaLevel) )

tMean = lerp(poleC, equatorC, warmth) - aboveSea * lapseC
```

**Seasonal range** grows toward the poles and inland:

```
range = ( 3 + (seasonalRangePole - 3) * lat ) * ( 0.4 + 0.6 * k )

tWarm = tMean + range/2
tCold = tMean - range/2
```

The constants are 3 C of seasonal swing at the equator and 0.4 of coastal damping (a
coast still swings 40% of its latitude's range).

**Annual precipitation** in pseudo-millimetres, scaled by the wettest land cell:

```
P = precip / max(precip over land) * precipMaxMm
```

**The threshold cascade** (Peel et al. 2007), using the even-rainfall aridity threshold.
B overrides everything:

```
Pth = 20 * tMean + 140
```

| Test | Class |
|---|---|
| `P < 0.5*Pth`, `tMean >= 18` | **BWh** hot desert |
| `P < 0.5*Pth`, `tMean < 18` | **BWk** cold desert |
| `P < Pth`, `tMean >= 18` | **BSh** hot steppe |
| `P < Pth`, `tMean < 18` | **BSk** cold steppe |
| `tWarm < 0` | **EF** ice cap |
| `tWarm < 10` | **ET** tundra |
| `tCold >= 18` | **Af** tropical rainforest |
| `tCold >= 0`, `tWarm >= 22 / >= 16 / else` | **Cfa / Cfb / Cfc** |
| `tCold <= -38` | **Dfd** extreme subarctic |
| otherwise, `tWarm >= 22 / >= 16 / else` | **Dfa / Dfb / Dfc** |

Version 1 assumes evenly distributed rainfall, so the second letter is always `f`. There
are no `s`, `w` or `m` dry-season letters yet.

Defaults: `equatorC 27`, `poleC -25`, `lapseC 25`, `seasonalRangePole 45`,
`continentalityScaleCells 40`, `precipMaxMm 3000`.

### 4.5 Local ground moisture

This is the field biomes actually read: the *surface water available to plants*, not
atmospheric vapour. It runs after rivers and lakes exist, and flows one way (air to
ground, no feedback).

**Water proximity.** A two-pass chamfer distance transform (cost `1` orthogonal,
`1.41421356` diagonal) from every open-water cell, where open water is
`z <= seaLevel` **or** `lake > lakeMinDepth` **or** `discharge > riverThreshold`:

```
prox = max(0, 1 - dWater / waterRange)
```

**The three terms:**

```
atm   = atmosphericBase + (moisture - 0.5) * atmosphericVariation    global backdrop
cold  = 1 - coldDryness * (1 - temperature)                          warm 1, cold damped
water = waterBonus * prox * cold                                     the main term
rain  = precipInfluence * precip / max(precip over land)             direct rain
```

**The wetness scale:**

```
localMoisture = smoothstep( dryPoint, wetPoint, atm + water + rain )
```

The cold factor only damps on the cold side: frozen water evaporates less, which is what
makes tundra dry. Heat-driven aridity is expressed by the biome classifier's own
temperature axis, so the two are never double-counted.

Defaults: `atmosphericBase 0.3`, `atmosphericVariation 0.25`, `waterBonus 0.6`,
`waterRange 20`, `coldDryness 0.4`, `precipInfluence 0.15`, `dryPoint 0.2`,
`wetPoint 0.85`.

---

## 5. Natural processes: erosion and hydrology

### 5.1 Flow routing (the shared primitive)

Both erosion and the water model route flow the same way.

**Depression filling** uses Priority-Flood: seed every border cell, then repeatedly pop
the lowest and raise each unvisited neighbour to `max(z, popped + eps)` with
`eps = 1e-6`. That tiny increment gives filled flats a drainage direction. The priority
queue is a monotone bucket queue (Dial's algorithm) over 65536 buckets, which makes the
whole flood `O(n)` instead of `O(n log n)` and keeps it deterministic (FIFO within a
bucket).

The pop order has the property that **a receiver always appears before its donors**,
which every later sweep depends on.

**D8 receivers.** Steepest descent on the *filled* surface over the 8 neighbours:

```
recv(i) = argmax over k of  (zFill_i - zFill_k) / len_k       len in {1, sqrt(2)}
```

Border cells drain off-map (they are their own receiver).

**Accumulation.** Walk the pop order in reverse (upstream first) and push each cell's
value into its receiver:

```
A_i = W_i + SUM of A_j over all j with recv(j) = i
```

With `W = 1` everywhere, `A` is drainage area in cells. With `W = precip`, `A` is
**discharge**: real water flux.

**Lake depth** falls straight out of the fill:

```
lake = max(0, zFill - z)
```

### 5.2 Slope

Central finite differences on the live elevation grid, clamped at the borders:

```
dzdx  = (z[x+1] - z[x-1]) / dx          dx = 2 interior, 1 at an edge
dzdy  = (z[y+1] - z[y-1]) / dy
slope = sqrt(dzdx^2 + dzdy^2)
```

It reads the actual surface, not analytic noise derivatives, so it stays correct once
erosion mutates elevation.

### 5.3 Stream-power erosion

The headline process. Each of `iterations` ticks re-routes flow, then applies the
stream-power incision law `dz/dt = U - K * A^m * S`.

**Rainfall weighting.** The drainage seed blends between uniform rainfall and the
orographic field, kept at mean 1 so the dial changes *where* erosion bites, not how
hard:

```
W = 1 + precipWeight * (precip / mean(precip over land) - 1)
```

The floor is `1 - precipWeight`, so even a bone-dry interior never stops eroding.

**Differential erosion** from lithology:

```
E = max( 1 - hardnessContrast * (2*hardness - 1), 0.05 )
```

**Detachment-limited mode (default).** Solved implicitly per Braun and Willett (2013)
with `n = 1`, sweeping receiver-before-donor so each cell sees its receiver's
already-updated height:

```
f = K * E * A^m / L                       L = 1 or sqrt(2), the flow-path length
z = max( (z + U + f * z_recv) / (1 + f), seaLevel )
```

Implicit means unconditionally stable at large timesteps: `z` stays between `z_recv` and
its old value, so it can never overshoot, oscillate, or go negative.

**Transport-limited mode (`deposition`).** Sweep the other way, donor-before-receiver,
carrying a sediment load `q`:

```
capacity = K * E * A^m * slope

if q < capacity:                          under capacity, pick material up
    pickup = min( capacity - q, (z - z_recv) / 2 )
    z     -= pickup
    out    = q + pickup
else:                                     over capacity, drop material
    drop      = (q - capacity) * depositionRate
    z        += drop
    sediment += drop
    out       = q - drop

q[recv] += out
```

Deposited thickness accumulates into the `sediment` layer, which is what later builds
floodplains and deltas. The `(z - z_recv)/2` cap stops a cell cutting below its own
outlet.

**Hillslope diffusion.** Every tick also applies linear diffusion, the "erodes
everywhere" component, using an explicit 5-point Laplacian read from a snapshot:

```
z += D * ( z[x-1] + z[x+1] + z[y-1] + z[y+1] - 4z )        D clamped to <= 0.25
```

0.25 is the explicit stability limit. Together, stream power plus hillslope diffusion is
the standard fluvial-and-hillslope landscape evolution model. Set `K = 0` with diffusion
on and you get pure smoothing.

Ocean cells (`z <= seaLevel`) are held fixed as base level throughout, and land can never
sink below it.

Defaults: `iterations 40`, `k 0.05`, `m 0.5`, `uplift 0`, `hillslopeDiffusion 0.05`,
`hardnessContrast 0`, `precipWeight 0.5`.

### 5.4 Terrain indices

From drainage area `A` and slope `tanB` (floored at `1e-4` so flats do not blow up):

```
SPI = A * tanB              stream power, erosive intensity
TWI = ln( A / tanB )        topographic wetness
```

SPI is high in steep high-flow channels; TWI is high in flat high-accumulation valley
bottoms.

### 5.5 Rivers and lakes

The water model routes with `W = precip`, so:

* **discharge** = catchment precipitation, the real water flux
* a cell is a **river** where `discharge > riverThreshold` (default 8)
* **lake depth** = filled surface minus elevation, standing water where
  `> lakeMinDepth` (default 0.004)
* the D8 receiver index is persisted so the renderer can trace river lines

Water does not modify elevation. Rivers are read out of the terrain, not painted onto
it.

### 5.6 Soil and fertility

Weathering plus alluvium. Slope, precipitation and sediment are each normalized by their
own maximum, which keeps the model parameter-light.

```
wet  = precip / max(precip)
flat = 1 - saturate(slope / max(slope))
allu = sediment / max(sediment)

soil      = saturate( temperature * wet * flat * weatherRate + allu * alluviumRate )
fertility = saturate( soil * F(rock) * (0.4 + 0.6*wet) + 0.3*allu )

F:  basalt 0.90   shale 0.60   limestone 0.55
    sandstone 0.40   granite 0.30   unset 0.50
```

The first soil term is chemical weathering (warm, wet, flat ground), the second is
alluvial deposition. Volcanic soils are rich, granite is poor, and steep ground sheds
its soil. Ocean cells get the sentinel `-1` in both layers.

---

## 6. Biomes

Biomes are a Whittaker classification: elevation band overrides first, then an argmax
over three axes.

**Overrides, in order:**

1. `lake > lakeMinDepth` **and** `z + lake >= seaLevel` gives **Lake**. Checked first so
   a pocket ringed by a lake does not read as ocean.
2. `z < seaLevel` goes to the marine ladder (below)
3. `z < seaLevel + beachWidth` **and** `tempC > 0` gives **Beach**. A frozen shore falls
   through to the ice classifier instead of reading as warm sand.
4. `z > snowLevel` gives **Arctic**

**The marine ladder** works in depth fraction `depth01 = (seaLevel - z) / seaLevel`, so
it scales with sea level instead of being pinned to absolute heights:

| Depth | Biome |
|---|---|
| `> 0.80` | Trench |
| `> 0.45` | Ocean (abyssal) |
| `> shallowFrac` | Continental shelf |
| `> 0.35 * shallowFrac`, `tempC >= reefMinC` | Coral reef |
| `> 0.35 * shallowFrac`, `tempC <= kelpMaxC` | Kelp forest |
| otherwise | Shallows |

Reef and kelp are niches that override the ladder only where they are earned, and only
in the *outer* part of the shallow band, which keeps reefs a fringe rather than a
carpet.

**The Whittaker argmax.** Each biome declares a preferred band per axis. Each axis
contributes a preference that is 1 inside the band and falls linearly to 0 over the
`fall` distance outside it:

```
pref(v, lo, hi, fall) = max( 0, 1 - max(lo - v, v - hi, 0) / fall )

score = pref(aboveSea, ...) * pref(tempC, ...) * pref(localMoisture, ...)
```

The highest score wins, first declared wins an exact tie, and temperate grassland is the
fallback if nothing scores above zero.

The axes are: elevation above sea normalized to `[0,1]`; **temperature in real degrees
Celsius** (from Köppen's `tempMeanC` when available, otherwise the normalized layer
mapped across `[poleC, equatorC]`); and **local moisture** (falling back to atmospheric
moisture if that stage is off).

**The full band table** (each cell is `lo-hi, fall`):

| Biome | Elevation | Temperature C | Moisture |
|---|---|---|---|
| Tropical rainforest | 0.00-0.45, 0.25 | 22-35, 6 | 0.70-1.00, 0.25 |
| Tropical savanna | 0.00-0.55, 0.30 | 20-32, 8 | 0.30-0.60, 0.20 |
| Hot desert | 0.00-0.50, 0.40 | 22-38, 8 | 0.00-0.30, 0.20 |
| Mediterranean shrubland | 0.00-0.55, 0.30 | 12-22, 8 | 0.30-0.55, 0.20 |
| Shrubland | 0.00-0.55, 0.30 | 12-30, 10 | 0.18-0.40, 0.20 |
| Temperate rainforest | 0.00-0.55, 0.35 | 5-18, 10 | 0.75-1.00, 0.20 |
| Temperate forest | 0.00-0.55, 0.35 | 8-22, 10 | 0.45-0.75, 0.25 |
| Temperate grassland | 0.00-0.55, 0.40 | 3-25, 12 | 0.25-0.55, 0.20 |
| Boreal forest | 0.05-0.65, 0.30 | -12-8, 12 | 0.40-0.85, 0.30 |
| Wetland | 0.00-0.25, 0.20 | 5-30, 14 | 0.75-1.00, 0.20 |
| Alpine meadow | 0.40-0.85, 0.15 | -5-10, 8 | 0.50-0.85, 0.20 |
| Tundra | 0.05-0.70, 0.35 | -20 to -2, 10 | 0.10-0.65, 0.30 |
| Polar desert | 0.00-0.70, 0.35 | -30 to -8, 10 | 0.00-0.20, 0.20 |

Fertility is deliberately not an axis: it is derived downstream of the biome, so voting
on it here would be a circular loop.

---

## 7. What the model does not do

Being explicit about the edges of the simulation, because the gaps are as much a part of
the specification as the formulas.

**No discrete natural events.** There are no earthquakes, volcanic eruptions, flood
events, droughts, wildfires or storms. Every process here is steady-state: it produces
the *landscape those events would leave*, not the events themselves. Volcanism appears
only as arc uplift geometry and basalt lithology.

**No time.** Tectonics is kinematic, not integrated. Plates are placed with velocities
and their boundaries classified, but they never actually move. Erosion has ticks, but
they are relaxation iterations toward a steady state, not years.

**No seasons.** Köppen's warmest and coldest month are derived from a latitude and
continentality proxy, not simulated. Rainfall is annual and evenly distributed, which is
why every Köppen class carries an `f`.

**No spherical geometry.** The map is a flat slab. No wraparound, no convergence at the
poles, no Coriolis force. Wind is a prescribed latitude profile, not a fluid solve.

**No ocean model.** There are no currents, no thermohaline transport, no maritime
temperature moderation beyond the continentality term in Köppen's seasonal range.

**No feedback between climate and terrain.** The chain runs one way: tectonics to
terrain to climate to erosion to hydrology to soil to biomes. Erosion reads rainfall,
but the new terrain never feeds back into a second climate pass.

---

## 8. Stage order and what each writes

| # | Stage | Writes |
|---|---|---|
| 0 | Tectonics | `plateId`, `plateType`, `plateLevel`, `plateRoot`, `boundaryType`, `crustThickness`, `upliftField`, `rockType`, `hardness` |
| 1 | Elevation + falloff | `elevationBase`, `falloff`, `elevation` |
| 2 | Climate | `temperature`, `moisture`, `windU`, `windV` |
| 3 | Orographic | `precip` |
| 4 | Erosion | mutates `elevation`, writes `sediment` |
| 5 | Hydrology | `slope`, `flowAccum`, `spi`, `twi` |
| 6 | Water | `discharge`, `lake`, `flowReceiver` |
| 7 | Soil | `soil`, `fertility` |
| 8 | Local moisture | `localMoisture` |
| 9 | Köppen | `continentality`, `tempMeanC`, `tempWarmC`, `tempColdC`, `koppenClass` |
| 10 | Biomes | `biome` |

The order is not cosmetic. Climate runs before erosion so incision can be rainfall
driven; local moisture runs after water so rivers exist to carry humidity inland; and
biomes run after Köppen so the temperature axis has real degrees to read.

Per-stage wall-clock is available from `MoldWorldGenerator.LastTimings`.
