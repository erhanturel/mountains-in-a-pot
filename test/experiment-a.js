/* EXPERIMENT A -- physical ecosystem combinations.

   Rebuilt on two measurements rather than on eight guesses.

   MEASUREMENT ONE (test/life-clock.js). Life steps once every 40 ticks, one
   hex at a time, and rule 6 wants a SHORE -- water beside a cell, not on it.
   Running water gives any cell four to twelve ticks in that band as the surge
   passes. So an objective that needs life to spread across a rain pulse
   cannot work: it needs 200 unbroken ticks and gets eight.

   MEASUREMENT TWO. The rim of a FILLED CLOSED BASIN is habitable and stays
   habitable: planted 12 of 12, still 12 alive at tick 1200, at every basin
   depth from 6 slabs to 36. Standing water makes a permanent shore; running
   water does not.

   So the objective is built on rims. The player fills basins; their shores
   are the targets; life is placed and has to SURVIVE, which is what the
   traits are actually about. The pulse is finite and there are three basins,
   so it cannot fill them all -- that is the decision.

   THE GATE this file has to clear before any human sees it: two materially
   different successful solutions, one understandable failure, a repeatable
   reset. */
const fs = require('fs');
const core = fs.readFileSync('index.html', 'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];

const PULSE = 300, SETTLE = 600, WINDOW = 40;
const NEED_DOWN = 6, NEED_UP = 4;

const INLET = [-7, 1];
const POND  = [[-5, 1], [-5, 0], [-4, 1]];
const MID   = [[-2, 1], [-1, 1], [-1, 0], [-2, 2]];
const BAS_N = [[3, -4], [4, -4], [3, -3]];
const BAS_S = [[2, 3], [3, 3], [2, 4]];

function ringOf(M, cells) {
  const inside = new Set(cells.map(([q, r]) => M.at(q, r)));
  const out = [];
  for (const i of inside)
    for (const j of M.T[i].nb)
      if (j >= 0 && !inside.has(j) && out.indexOf(j) < 0) out.push(j);
  return out;
}

function board() {
  global.POT_R = 9;
  const M = new Function(core + 'return {T,at,tick,use,LAYER,SLAB,CLOUD,ROCK,AIR,CELL,ZN,TOP,' +
    'retop,raise,gnd,soil,alive,habitable,habit,drowned,within,SEED,MOSS,REED,' +
    'seedReset,travel,holdsBack,SOWN,sowDormant,' +
    'set WEATHER(v){WEATHER=v}, set EXP_A(v){EXP_A=v}, set TR_REED(v){TR_REED=v},' +
    'set TR_TRAVEL(v){TR_TRAVEL=v}, set UP_FLOOD(v){UP_FLOOD=v},' +
    'get TRAVELLED(){return TRAVELLED}, set TRAVELLED(v){TRAVELLED=v},' +
    'get QUICK_FLOOD(){return QUICK_FLOOD}, set QUICK_FLOOD(v){QUICK_FLOOD=v},' +
    'LIFE_EVERY:LIFE_EVERY};')();
  M.WEATHER = 0;
  M.EXP_A = true;
  const id = ([q, r]) => M.at(q, r);
  const cut = (i, n) => { for (let k = 0; k < n; k++) {
    const z = M.TOP[i]; if (z < 0) break; M.CELL[i * M.ZN + z] = M.AIR; M.retop(i); } };

  for (let i = 0; i < M.T.length; i++) { M.raise(i, 8 * M.SLAB, M.ROCK); M.T[i].sed = 3 * M.LAYER; }
  /* the basins DESCEND, or nothing can pass from one to the next */
  for (const a of POND)  cut(id(a), 5);
  for (const a of MID)   cut(id(a), 10);
  for (const a of BAS_N) cut(id(a), 16);
  for (const a of BAS_S) cut(id(a), 16);
  M.raise(id(INLET), 4 * M.SLAB, M.ROCK);

  M.rimUp = ringOf(M, POND);
  M.rimN  = ringOf(M, BAS_N);
  M.rimS  = ringOf(M, BAS_S);

  for (let k = 0; k < 4; k++) M.use(id(INLET), {k:'place'}, 0, 1, M.CLOUD);
  for (let n = 0; n < 160; n++) M.tick();
  for (let z = 0; z < M.ZN; z++) for (let j = 0; j < M.T.length; j++)
    if (M.CELL[j * M.ZN + z] === M.CLOUD) { M.CELL[j * M.ZN + z] = M.AIR; M.retop(j); }
  for (let n = 0; n < 60; n++) M.tick();
  for (const j of M.rimUp) if (M.habitable(j, M.SEED)) M.T[j].life = M.SEED;
  for (let n = 0; n < 80; n++) M.tick();
  return M;
}

const dig = (M, q, r, n) => { const i = M.at(q, r); if (i < 0) return 0;
  for (let k = 0; k < n; k++) { const z = M.TOP[i]; if (z < 0) break;
    M.CELL[i * M.ZN + z] = M.AIR; M.retop(i); } return 1; };
/* sow one seed onto a rim during PREPARE, while it is still dry. The seed
   lies dormant and takes when the basin fills, which is what makes planting
   before the rain a bet rather than an impossibility. */
const sowRim = (M, rim) => {
  for (const j of rim) if (!M.T[j].life && !M.SOWN[j]) { M.sowDormant(j, M.SEED); return 1; }
  return 0;
};

function pulse(M) {
  M.seedReset();
  const i = M.at(INLET[0], INLET[1]);
  for (let k = 0; k < 4; k++) M.use(i, {k:'place'}, 0, 1, M.CLOUD);
  for (let n = 0; n < PULSE; n++) M.tick();
  for (let z = 0; z < M.ZN; z++) for (let j = 0; j < M.T.length; j++)
    if (M.CELL[j * M.ZN + z] === M.CLOUD) { M.CELL[j * M.ZN + z] = M.AIR; M.retop(j); }
  let mins = null;
  for (let n = 0; n < SETTLE; n++) { M.tick(); if (n >= SETTLE - WINDOW) mins = keep(M, mins); }
  return mins;
}
const live = (M, rim) => rim.filter(j => M.T[j].life).length;
function keep(M, mins) {
  const v = { n: live(M, M.rimN), s: live(M, M.rimS), up: live(M, M.rimUp) };
  if (!mins) return v;
  return { n: Math.min(mins.n, v.n), s: Math.min(mins.s, v.s), up: Math.min(mins.up, v.up) };
}
const met = r => r.n >= NEED_DOWN && r.s >= NEED_DOWN && r.up >= NEED_UP;
const material = M => M.T.reduce((a, t) => a + t.sed + t.sand, 0);

function run(name, traits, plan) {
  const M = board();
  M.TR_REED = !!traits.reed; M.TR_TRAVEL = !!traits.travel; M.UP_FLOOD = !!traits.quick;
  const before = material(M);
  const seeds = plan(M) || 0;
  const r = pulse(M);
  const made = (material(M) - before) / M.LAYER;
  console.log('  ' + name.padEnd(26) +
    String(r.n).padStart(5) + String(r.s).padStart(5) + String(r.up).padStart(6) +
    (met(r) ? '   MET ' : '   no  ') +
    String(seeds).padStart(5) + String(M.TRAVELLED).padStart(6) + String(M.QUICK_FLOOD).padStart(6) +
    (made > 0.01 ? '   CREATED ' + made.toFixed(1) : '   ' + made.toFixed(1)));
  return met(r);
}

console.log('EXPERIMENT A -- one finite pulse, three basins, one objective\n');
console.log('  ' + NEED_DOWN + ' living on each downstream basin rim, ' + NEED_UP + ' on the upstream one,');
console.log('  held through the last ' + WINDOW + ' ticks of the settle. 2 seeds a round.\n');
console.log('  plan                      north south upper  result seeds travel quick   material');

run('do nothing', {}, () => 0);

/* SOLUTION ONE -- split the pulse. Cut the pond's sill and two leads, so the
   pulse divides and fills both downstream basins at once. The pond gives up
   its own water, so the upstream meadow is what is at risk. */
function split(M) {
  dig(M, -3, 1, 8);
  dig(M, 0, 0, 14); dig(M, 1, -1, 14); dig(M, 2, -2, 14);
  /* (0,1)->(1,2) is NOT an axial neighbour; the chain has to go through
     (0,2). The first version of this lead was simply disconnected. */
  dig(M, 0, 1, 14); dig(M, 0, 2, 14); dig(M, 1, 2, 14); dig(M, 2, 2, 14);
  return sowRim(M, M.rimN) + sowRim(M, M.rimS);
}
/* SOLUTION TWO -- the chain. The same water, one channel instead of two: put
   everything into the north basin and cut a saddle so that once it brims, the
   overflow runs the length of the pot and fills the south. Parallel against
   series, which is a real strategic difference and not a mirrored route --
   series only works if the pulse has enough left over after the first basin
   is full, and it puts the south's fate on the north's spare. */
function chain(M) {
  dig(M, -3, 1, 8);                                          /* the pond's sill */
  dig(M, 0, 0, 14); dig(M, 1, -1, 14); dig(M, 2, -2, 14);    /* into the north */
  /* the saddle, north basin to south basin, cut just above the north floor so
     it takes the overflow and not the fill */
  dig(M, 3, -2, 13); dig(M, 3, -1, 13); dig(M, 3, 0, 13);
  dig(M, 3, 1, 13);  dig(M, 3, 2, 13);
  return sowRim(M, M.rimN) + sowRim(M, M.rimS);
}

console.log('');
run('split, no traits',   {},          split);
run('split + travelling', {travel:1},  split);
run('split + reed trap',  {reed:1},    split);
run('split + quickening', {quick:1},   split);
run('chain, no traits',   {},          chain);
run('chain + travelling', {travel:1},  chain);
run('chain + reed trap',  {reed:1},    chain);
run('chain + quickening', {quick:1},   chain);

console.log('\nREPEATABLE RESET -- the same plan three times from a fresh board:');
for (let k = 0; k < 3; k++) run('  split + quickening', {quick:1}, split);
