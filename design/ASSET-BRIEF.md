# Low-poly assets for the pot — what to model against

*Written 10 Sep 2026. Every number here comes from the code, not from taste.
Getting the scale or the format wrong is the only way to waste modelling
time on this project, so it is all up front.*

---

## The scale

The board is hexagonal prisms, `CylinderGeometry(1, 1, 1, 6)` — **radius 1**.

```
  a hex, corner to corner     2.00 units
  a hex, flat to flat         1.73 units
  one elevation step          0.34 units      (RISE)
```

So a hex top is about **1.7 units wide** and a single step of ground is
**0.34 tall**. Model in these units directly — no import scaling, no "1 unit =
1 metre" convention. If it helps: a tree that reads as a tree on this board is
roughly **0.6 to 1.0 tall**, which is two or three elevation steps.

**Pivot at the base, +Y up.** Props are placed by translating to the top
surface of a hex, so the origin must sit where the model meets the ground. No
baked rotation — the game turns them.

---

## The format

**GLB** (binary glTF), one file per prop, or one file with each prop as a
named node. Not FBX, not .blend.

The reason is the delivery format, not preference. `pot.html` is a **single
file you can double-click or send over a chat** — three.js is already folded
into it. Assets have to travel the same way, so they are converted once at
build time into plain vertex arrays embedded in the page. GLB is the format
that conversion reads cleanly.

**Budget, because it is embedded:**

| | |
|---|---|
| triangles per prop | **≤ 300**, and fewer is better |
| props in a set | 8–12 to start |
| total, all props | **≤ 400 KB** before compression |

The board can be 217 hexes or **12,481**. A prop type is drawn as one
`InstancedMesh` — one draw call however many copies — so the count is not the
problem. The triangle budget is: 4,000 instances × 300 triangles is 1.2M, and
that is the ceiling to stay under.

---

## No textures. Vertex colours or nothing.

The whole look is **one palette, one light, one camera and one post pass**.
Every colour on the board comes from `PAL` and nothing is coloured from
anywhere else.

Props are tinted **per instance** by the game — a forest hex is already given
its own green from a two-stop ramp plus a per-hex hash, so no two hexes of a
forest are the same shade, and the season pushes all of them toward gold in
autumn. That only works if the model arrives untinted or vertex-coloured in
greys, so the tint multiplies cleanly.

A texture would break the palette, add an image to embed, and lose the
seasonal colour. **Flat faces, hard edges, no smoothing groups** suits the
diorama look and the existing hemisphere-plus-sun lighting.

---

## What the simulation already knows, and so what is worth modelling

The board reads eleven biomes plus bare rock and open water, all derived from
elevation, temperature and moisture. Props should attach to these, because
they already exist and already change as the world changes.

**Living ground** — these carry plants:

| biome | what it is | what it wants |
|---|---|---|
| Wetland | shallow standing water, no soil needed | reeds, rushes |
| Cloud forest | hot, wet, deep soil | dense broadleaf, hanging forms |
| Forest | temperate, deep soil | broadleaf tree, 2–3 variants |
| Boreal forest | cold, some soil | conifer, 2 variants |
| Alpine meadow | high, cool, thin soil | flowering tufts, low |
| Tundra | cold, dry, thin | lichen mats, one stunted shrub |
| Grassland | temperate, dry-ish, thin soil | grass tufts, 2–3 heights |

**Bare ground** — no plants, but they are most of a young pot and currently
have nothing on them at all:

| biome | what it wants |
|---|---|
| Silt flat | cracked mud, driftwood |
| Desert | a few stones, dry scrub skeleton |
| Scree | loose boulders, 3 sizes |
| Snowfield | drift shapes (snow is already drawn as white ground) |

**If only one set is possible first:** grass tuft, conifer, broadleaf, boulder,
reed. Those five cover the biomes a player actually meets in the first Year.

---

## Three rules the placement will follow

Worth knowing because they shape what a good prop is.

1. **Placement is derived, never stored.** Which prop stands on a hex, where
   inside the hex, and at what rotation all come from the hex's own coordinates
   through a hash — the same one that already varies the colour. So the same
   board always looks the same, nothing is remembered, and a hex that stops
   being forest loses its trees the moment it does.

2. **Props sit on the drawn surface**, which is the stone plus whatever loose
   soil, sand or snow is lying on it. That height moves as the world erodes,
   so a prop must look right sitting flat on a level top.

3. **Several per hex.** A forest hex will carry three or four trees at
   different scales and rotations rather than one big one. Model one tree, not
   a clump — the clumping is the game's job.

---

## What to send

```
  assets/
    grass-tuft.glb        conifer-a.glb      boulder-small.glb
    grass-tall.glb        conifer-b.glb      boulder-large.glb
    reed.glb              broadleaf-a.glb    scree-cluster.glb
    ...
```

One prop per file, named for what it is. A single GLB with named nodes is
equally fine.

Send the source files too if they are small — the conversion is one-way and
it is useful to be able to re-bake.
