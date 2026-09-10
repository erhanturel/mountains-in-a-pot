# Setting the Unity project up, step by step

*So that the project can be cloned from GitHub and opened by anyone, on the
first try. Written 10 Sep 2026.*

The repo is already prepared: `.gitignore` and `.gitattributes` are in place
on the `unity` branch and they close the two ways a Unity repo usually goes
wrong. Everything below is what a person does at the keyboard.

---

## 0 · The pipeline: HDRP, chosen and why

**HDRP.** The reason is volumetric fog, lighting and post-processing — which
is exactly what HDRP is for and what URP makes you fight for. It is the right
call for that.

One cost is being accepted knowingly, so it is written down here rather than
discovered in three months: **HDRP cannot build to WebGL.** The browser build
is how `pot.html` is sent over a chat today, and "a stranger understands it
from a short clip and wants to try the demo" was the first of the three proofs
before production. That door closes. A demo will have to be a download, or a
video.

Take **WebGL Build Support** at install anyway. It costs nothing on disk, and
if the pipeline is ever revisited you will not have to reinstall the editor.

---

## 1 · Unity Hub and the editor

1. Install **Unity Hub**.
2. In Hub → *Installs* → *Install Editor*, take the current **Unity 6 LTS**.
   Do not pick a Tech Stream release for a project two people will share for
   months.
3. Modules to tick during install:
   - **Windows Build Support (IL2CPP)** — both of you are on Windows
   - **WebGL Build Support** — take it even if HDRP wins the argument; it
     costs nothing on disk and you will want the option back
   - Documentation, if you like reading offline
4. Also install **Visual Studio** or **Rider** for C#. Hub offers VS during
   editor install.

---

## 2 · Create the project inside the repo

The Unity project lives at `unity/` in this repo, beside the JavaScript build
and the porting documents.

1. Hub → *Projects* → *New project*
2. Template: **3D (HDRP)** — or **Universal 3D** if §0 changed your mind
3. **Project name:** `unity`
4. **Location:** the repo root, `C:\MyRepos\mountains-in-a-pot`

Hub creates `C:\MyRepos\mountains-in-a-pot\unity\`. Let it finish importing —
the first HDRP import is slow, several minutes is normal.

> If Hub refuses because the folder exists, create the project anywhere and
> move the `Assets`, `Packages` and `ProjectSettings` folders into `unity/`
> afterwards. Those three are the project; everything else regenerates.

---

## 3 · Two editor settings, before the first commit

Both are the default in modern Unity, but check them — a repo committed with
the wrong one is a repo nobody can merge.

**Edit → Project Settings → Editor**

- **Asset Serialization → Mode: `Force Text`**
  Scenes and prefabs become YAML instead of binary. Without it two people
  cannot both touch a scene, ever.
- **Version Control → Mode: `Visible Meta Files`**
  Every asset gets a `.meta` carrying its GUID. **These must be committed.**
  Without them every reference in the project breaks on a fresh clone — the
  single most common "it works on my machine" in Unity.

---

## 4 · Git LFS, once per machine

Binary art does not diff and does not compress. A repo that stores every
version of every mesh inline gets slow and never gets fast again.

```bash
git lfs install
```

`.gitattributes` already routes `.fbx .glb .gltf .blend .obj .png .psd .tga
.exr .wav .ogg .ttf` to LFS. Run the command once on each machine **before**
the first art commit — files added before LFS is installed are stored inline
and have to be rewritten out of history later.

Check it took:

```bash
git lfs track
```

---

## 5 · The first commit

```bash
cd C:\MyRepos\mountains-in-a-pot
git checkout steps
git status
```

You should see `unity/Assets/`, `unity/Packages/` and
`unity/ProjectSettings/` — and **not** `unity/Library/`. If `Library/` shows
up, stop: the `.gitignore` is not being applied and committing it will make
the repo unusable.

```bash
git add unity/
git commit -m "The Unity project, HDRP, empty"
git push origin steps
```

Expect a few hundred files. `ProjectSettings/` is small and text;
`Packages/manifest.json` and `packages-lock.json` pin every package version,
which is what makes the clone reproducible.

---

## 6 · Prove a clone works — this is the actual test

Do not skip this. It is the only thing that proves someone else can open the
project.

```bash
cd C:\MyRepos
git clone https://github.com/erhanturel/mountains-in-a-pot.git pot-clone-test
cd pot-clone-test
git checkout steps
```

Open `pot-clone-test/unity` in Unity Hub → *Open* → *Add project from disk*.

It should import and open with **no missing scripts, no pink materials and no
broken references**. Pink means the pipeline asset did not come across; broken
references almost always mean missing `.meta` files.

When it opens cleanly, delete the clone.

---

## 7 · If HDRP: the first hour of settings

HDRP's defaults are built for photorealism and will fight a flat diorama.
Four things to change early, before any art is judged.

1. **HDRP Asset** (`Assets/Settings/…HDRPAsset`) — turn off what the look does
   not use: ray tracing, volumetric clouds, subsurface scattering, screen-space
   reflections. Every one of them costs frame time for nothing here.
2. **Volume profile** — the default has aggressive exposure, bloom and
   tonemapping. The JavaScript build uses ACES tonemapping at exposure 1.32,
   a warm grade and a vignette; start from *fixed* exposure rather than
   automatic, or the whole board will breathe brightness as the camera moves.
3. **Lighting** — the current look is one hemisphere light plus a sun and a
   fill, and shadows from the sun only. In HDRP that is a Directional Light
   plus a flat ambient from the sky settings. Resist adding more.
4. **Physically Based Sky / fog** — off to begin with. The pot sits in a dark
   void, not in an atmosphere.

Everything the current look does and why is written down in `CLAUDE.md` under
*Rendering notes*, including the tilt-shift measurement that says how much
blur actually reads.

---

## 8 · What to put in the project first

Before any gameplay code:

1. **`design/unity/fixtures.json`** → copy to
   `unity/Assets/StreamingAssets/fixtures.json`.
   It is the contract the simulation must satisfy — 16 fixtures, 36
   checkpoints. Put it in before the first line of simulation code, so
   "correct" has a definition from the start.
2. **A test assembly.** *Window → General → Test Runner → Create EditMode Test
   Assembly*. The first test loads the fixtures and fails. That is the correct
   first state.
3. **Read `design/UNITY-PORT.md`.** It is the traps, the constants that are
   load-bearing, the tick order and the data layout. §11 of it is a suggested
   build order that matches the fixtures, layer by layer.

Do not port the renderer first. The simulation is 671 lines and has an oracle;
the renderer is 3,375 lines and has none.

---

## 9 · Branches — there are only two, and one of them is temporary

Two people do not need three branches, and the Unity project is not a feature.
It is where the project goes from here, so it lives on the branch that already
has everything else.

```
  steps   this line: the climate, the generator, the handover, the fixtures,
          and now unity/ as well.  Work here.
  main    the partner's line, being reorganised right now.
```

**Everything goes on `steps` until `main` is ready to receive it.** Then
`steps` merges into `main` once, and after that there is one branch and
everybody works on it.

That merge is already decided and waiting on the partner finishing:

- the world stays at **12 elevations** — every climate constant is calibrated
  to that ceiling, and doubling it silently invalidates all of them
- the **seasonal rain** stays and evaporation does not, because it keeps the
  measured conservation guarantee
- the partner's **static bounding sphere** work is taken (7.3 ms of a 61.5 ms
  rebuild), with its extent rebuilt around `H_MAX = 12`

Until then: `git checkout steps`, and clone with
`git clone <url> && cd mountains-in-a-pot && git checkout steps`.

---

## 10 · A checklist you can run down

```
[ ] Unity 6 LTS installed, HDRP template, WebGL Build Support ticked anyway
[ ] project created at repo/unity/
[ ] Asset Serialization = Force Text
[ ] Version Control = Visible Meta Files
[ ] git lfs install   (each machine, before any art)
[ ] git status shows Assets/Packages/ProjectSettings and NOT Library/
[ ] first commit pushed to origin/unity
[ ] fresh clone opens with no pink materials and no missing scripts
[ ] fixtures.json in Assets/StreamingAssets/
[ ] a failing EditMode test that reads it
```

When every line is ticked, the port can start — and §11 of
`design/UNITY-PORT.md` says in what order.
