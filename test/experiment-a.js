/* EXPERIMENT A -- physical ecosystem combinations.
   The gate the brief sets BEFORE any human testing:

     - two materially different successful solutions
     - one understandable failure
     - a repeatable reset

   Demonstrated here, not asserted. Every number below is produced by the
   CORE that ships in index.html.

   THE BOARD, as specified: one high inlet, a branching drainage area, two
   downstream objective patches, one upstream patch of established grass.
   Soil is supplied so that waiting for weathering cannot mask the decision.

   THE OBJECTIVE: six living cells in each downstream patch while keeping at
   least four of the upstream grass. Counted over a sustained window, not on
   one instantaneous snapshot, because river flow pulses. */
const fs = require('fs');
const core = fs.readFileSync('index.html', 'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];

const PULSE = 260, SETTLE = 500, WINDOW = 20;   /* the sustained endpoint */
const NEED_DOWN = 6, NEED_UP = 4;

/* ---- the map ---------------------------------------------------------- */
const INLET   = [-7, 1];
/* THE PATCHES SIT OFF THE DEFAULT CHANNELS, and that is the whole design.
   Measured on the bare board: a full pulse leaves ground that would take
   grass at r about -8 in the north and r about -1 in the south. Neither
   objective patch is in that set, so the water has to be BROUGHT to them.

   And nothing germinates on its own. Two seeds a round against twelve cells
   to fill means life must SPREAD, which needs an unbroken damp corridor from
   where it was sown -- so routing the water IS the build, rather than a
   preamble to it. */
/* a closed pond below the inlet: this is what makes the upstream meadow
   "established", and what the player can drain away to feed downstream */
const POND   = [[-5, 1], [-5, 0], [-4, 1], [-5, 2], [-6, 1], [-4, 0]];
/* the branching area the player routes out of */
const MIDDLE = [[-2, 1], [-1, 1], [-2, 2], [-1, 0], [0, 0], [0, 1], [-1, 2]];
const PATCH_N = [[4, -4], [3, -4], [5, -4], [4, -3], [3, -3], [5, -5]];
const PATCH_S = [[3, 3], [2, 3], [4, 3], [3, 2], [2, 4], [4, 2]];
/* the upstream meadow is placed where the priming water actually settles,
   found once and then fixed. A first version guessed six coordinates and
   only two of them were habitable, so the objective was unreachable and
   every reading came back 0 -- the map's fault, not the traits'. */
let UPSTREAM = [];

function board() {
  global.POT_R = 9;
  const M = new Function(core + 'return {T,at,tick,use,LAYER,SLAB,CLOUD,ROCK,AIR,CELL,ZN,TOP,' +
    'retop,raise,lower,gnd,soil,alive,habitable,habit,drowned,within,SEED,MOSS,REED,' +
    'seedReset,travel,holdsBack,' +
    'set WEATHER(v){WEATHER=v}, set EXP_A(v){EXP_A=v}, set TR_REED(v){TR_REED=v},' +
    'set TR_TRAVEL(v){TR_TRAVEL=v}, get TRAVELLED(){return TRAVELLED},' +
    'set TRAVELLED(v){TRAVELLED=v}, LIFE_EVERY:LIFE_EVERY};')();
  M.WEATHER = 0;                       /* soil is supplied; weathering is not the test */
  M.EXP_A = true;
  const id = ([q, r]) => M.at(q, r);

  /* A SYSTEM OF CLOSED BASINS WITH SILLS BETWEEN THEM, and this is the sixth
     shape of this map. The five before it were slopes, and a slope cannot
     hold this experiment: water that reaches the rim leaves, so nothing
     persists, the "established" meadow dies of `dry` within forty ticks, and
     the objective patches are never watered at all. Measured each time, and
     each time it was the map and not the traits.

     What works is a PLATEAU cut into basins. The pond below the inlet fills
     and stays. Everything else is dry until the player cuts a sill. Routing
     is then genuinely the build, and the upstream meadow is genuinely at
     risk, because cutting the pond's own sill is one of the ways to feed the
     patches. */
  for (let i = 0; i < M.T.length; i++) {
    M.raise(i, 8 * M.SLAB, M.ROCK);
    M.T[i].sed = 3 * M.LAYER;
  }
  const carve = (cells, deep) => { for (const a of cells) {
    const i = id(a); if (i < 0) continue;
    for (let k = 0; k < deep; k++) { const z = M.TOP[i]; if (z < 0) break;
      M.CELL[i * M.ZN + z] = M.AIR; M.retop(i); }
    M.T[i].sed = 3 * M.LAYER; } };
  /* THE BASINS DESCEND, and the first version of this had them the wrong way
     round: the pond was carved deepest, so it sat BELOW the patches, took
     the whole pulse and kept it. Water runs downhill, so a chain of basins
     meant to pass water on has to step down. Measured before the fix -- pond
     floor 6.47, patches 6.83 -- and nothing could ever leave the pond. */
  carve(POND, 4);                      /* highest: closed, holds its lake */
  carve(MIDDLE, 9);                    /* lower: the branching area */
  carve(PATCH_N, 15); carve(PATCH_S, 15);   /* lowest: where it can end up */
  M.raise(id(INLET), 4 * M.SLAB, M.ROCK);   /* the inlet stands above it all */

  /* prime, so the pond has its lake and the meadow is genuinely established */
  for (let k = 0; k < 4; k++) M.use(id(INLET), {k:'place'}, 0, 1, M.CLOUD);
  for (let n = 0; n < 140; n++) M.tick();
  for (let z = 0; z < M.ZN; z++) for (let j = 0; j < M.T.length; j++)
    if (M.CELL[j * M.ZN + z] === M.CLOUD) { M.CELL[j * M.ZN + z] = M.AIR; M.retop(j); }
  for (let n = 0; n < 60; n++) M.tick();
  if (!UPSTREAM.length) {
    /* the meadow is the pond's own shore: whatever takes grass beside it */
    const rim = [];
    for (let i = 0; i < M.T.length; i++)
      if (M.habitable(i, M.SEED)) rim.push([M.T[i].q, M.T[i].r]);
    UPSTREAM = rim.slice(0, 6);
  }
  for (const a of UPSTREAM) { const i = id(a); if (i >= 0) M.T[i].life = M.SEED; }
  for (let n = 0; n < 60; n++) M.tick();
  return M;
}

const dig = (M, q, r, n) => { const i = M.at(q, r); if (i < 0) return 0;
  for (let k = 0; k < n; k++) { const z = M.TOP[i]; if (z < 0) break;
    M.CELL[i * M.ZN + z] = M.AIR; M.retop(i); } return 1; };
const rise = (M, q, r, n) => { const i = M.at(q, r); if (i < 0) return 0;
  M.raise(i, n, M.ROCK); return 1; };
const sow = (M, q, r, kind) => { const i = M.at(q, r);
  if (i < 0) return 0; M.T[i].life = kind; return 1; };

function pulse(M) {
  M.seedReset();
  const i = M.at(INLET[0], INLET[1]);
  for (let k = 0; k < 4; k++) M.use(i, {k:'place'}, 0, 1, M.CLOUD);
  /* count over the LAST 20 ticks of the pulse plus the settle, and take the
     lowest reading -- a cell only counts if it holds through the window */
  let mins = null;
  for (let n = 0; n < PULSE; n++) {
    M.tick();
    if (n >= PULSE - WINDOW) mins = keep(M, mins);
  }
  for (let z = 0; z < M.ZN; z++) for (let j = 0; j < M.T.length; j++)
    if (M.CELL[j * M.ZN + z] === M.CLOUD) { M.CELL[j * M.ZN + z] = M.AIR; M.retop(j); }
  for (let n = 0; n < SETTLE; n++) { M.tick(); mins = keep(M, mins); }
  return mins;
}
const countIn = (M, list) => list.reduce((a, [q, r]) => {
  const i = M.at(q, r); return a + (i >= 0 && M.T[i].life ? 1 : 0); }, 0);
function keep(M, mins) {
  const v = { n: countIn(M, PATCH_N), s: countIn(M, PATCH_S), up: countIn(M, UPSTREAM) };
  if (!mins) return v;
  return { n: Math.min(mins.n, v.n), s: Math.min(mins.s, v.s), up: Math.min(mins.up, v.up) };
}
const met = r => r.n >= NEED_DOWN && r.s >= NEED_DOWN && r.up >= NEED_UP;

/* the audit the brief asks for: material may not appear from nowhere */
const material = M => M.T.reduce((a, t) => a + t.sed + t.sand, 0);

/* ---------------------------------------------------------------------- */
function run(name, traits, plan) {
  const M = board();
  M.TR_REED = !!traits.reed; M.TR_TRAVEL = !!traits.travel;
  const before = material(M);
  plan(M);
  const r = pulse(M);
  const after = material(M);
  const made = (after - before) / M.LAYER;
  console.log('  ' + name.padEnd(30) +
    String(r.n).padStart(5) + String(r.s).padStart(5) + String(r.up).padStart(6) +
    (met(r) ? '   MET  ' : '   no   ') +
    String(M.TRAVELLED).padStart(5) +
    (made > 0.01 ? '  MATERIAL CREATED ' + made.toFixed(2) : '  ' + made.toFixed(2)));
  return { r, met: met(r), made };
}

console.log('EXPERIMENT A -- one high inlet, two downstream patches, one upstream meadow');
console.log('Objective: ' + NEED_DOWN + ' living cells in each downstream patch,');
console.log('           ' + NEED_UP + ' of the upstream grass still standing,');
console.log('           held through the last ' + WINDOW + ' ticks of the pulse and the settle.\n');
console.log('  plan                          north south upper  result  seeds   material');

/* ---- the failure, first, because it should be understandable ----------- */
run('do nothing', {}, () => {});

/* ---- SOLUTION ONE: cut the sill, spend the reservoir ------------------- */
/* Open the pond into the middle and cut two leads out of it. The pond's own
   stored water does most of the work, which is why this plan puts the
   upstream meadow at risk: the lake it lives beside is the fuel. Six edits. */
function sill(M) {
  dig(M, -3, 1, 7);                       /* the pond's sill */
  dig(M, 1, -1, 13); dig(M, 2, -2, 13);   /* the north lead */
  dig(M, 1, 1, 13);  dig(M, 1, 2, 13);    /* the south lead */
  dig(M, 2, 2, 13);
  sow(M, 1, -1, M.SEED); sow(M, 1, 1, M.SEED);
}
/* ---- SOLUTION TWO: bypass, and keep the reservoir ---------------------- */
/* Leave the pond closed and take the pulse AROUND it, straight from the
   inlet into the middle. The meadow is never threatened, but the only water
   downstream is what falls during the pulse. Six edits. */
function bypass(M) {
  dig(M, -6, 2, 9); dig(M, -5, 3, 9); dig(M, -4, 3, 9);   /* around the pond */
  dig(M, -3, 3, 9); dig(M, -2, 2, 9);                     /* into the middle */
  dig(M, 1, 1, 13);                                       /* one lead south */
  sow(M, -2, 2, M.SEED); sow(M, 1, 1, M.SEED);
}

console.log('');
run('cut the sill, no traits',    {},                  sill);
run('cut the sill + travelling',  {travel:1},          sill);
run('cut the sill + reed trap',   {reed:1},            sill);
run('cut the sill + both',        {reed:1,travel:1},   sill);
run('bypass, no traits',          {},                  bypass);
run('bypass + travelling',        {travel:1},          bypass);
run('bypass + reed trap',         {reed:1},            bypass);
run('bypass + both',              {reed:1,travel:1},   bypass);

/* ---- the reset ---------------------------------------------------------- */
console.log('\nREPEATABLE RESET -- the same plan three times from a fresh board:');
for (let k = 0; k < 3; k++) run('  cut the sill + travelling', {travel:1}, sill);
