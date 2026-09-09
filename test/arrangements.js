/* TWO GENUINELY DIFFERENT SUCCESSFUL ARRANGEMENTS.

   The brief asks for two, so that the upgrades can be shown to support more
   than one plan. Both are played headless against the same pot, the same
   three rounds and the same objective -- living shores in three separated
   parts -- and they differ in what they build and which upgrades they lean on.

     THE BOWLS    dig a bowl in each third, plant its floor, flood it, then
                  cut a shallow outlet so it drains to a lake and leaves a
                  fertile ring.  Root Network + Fertile Flood.

     THE STAIR    raise a spine and cut a stepped channel down each side, so
                  every step ends in a pool under a fall.
                  Cascade + Root Network.

   If both reach the objective and neither is a rearrangement of the other,
   the upgrades are carrying more than one idea. */
const fs = require('fs');
const core = fs.readFileSync('index.html', 'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];

const RAIN = 300, SETTLE = 900;

function pot() {
  global.POT_R = 12;
  const M = new Function(core + 'return {T,at,tick,use,LAYER,SLAB,CLOUD,ROCK,AIR,CELL,ZN,TOP,' +
    'retop,raise,gnd,soil,alive,habitable,drowned,within,SEED,MOSS,REED,' +
    'set WEATHER(v){WEATHER=v}, set UP_ROOTS(v){UP_ROOTS=v}, set UP_FLOOD(v){UP_FLOOD=v},' +
    'set UP_CASCADE(v){UP_CASCADE=v}, get QUICK_FLOOD(){return QUICK_FLOOD},' +
    'get QUICK_CASCADE(){return QUICK_CASCADE}};')();
  M.WEATHER = 0.10 / 420;
  for (let i = 0; i < M.T.length; i++) M.raise(i, M.SLAB, M.ROCK);
  return M;
}
const dig = (M, i, n) => { for (let k = 0; k < n; k++) {
  const t = M.TOP[i]; if (t < 0) break; M.CELL[i * M.ZN + t] = M.AIR; M.retop(i); } };
const sector = (M, i) => {
  const t = M.T[i], a = Math.atan2(t.y, t.x) + Math.PI;
  return Math.min(2, Math.floor(a / (Math.PI * 2) * 3));
};
function shores(M) {
  const n = [0, 0, 0];
  for (let i = 0; i < M.T.length; i++) {
    if (!M.T[i].life) continue;
    for (const j of M.T[i].nb) if (j >= 0 && M.drowned(j)) { n[sector(M, i)]++; break; }
  }
  return n;
}
function rain(M) {
  for (let r = -5; r <= 5; r++) { const i = M.at(-7, r); if (i >= 0) M.use(i, {k:'place'}, 0, 3, M.CLOUD); }
  for (let n = 0; n < RAIN; n++) M.tick();
  for (let i = 0; i < M.T.length; i++) for (let z = 0; z < M.ZN; z++)
    if (M.CELL[i * M.ZN + z] === M.CLOUD) { M.CELL[i * M.ZN + z] = M.AIR; M.retop(i); }
  for (let n = 0; n < SETTLE; n++) M.tick();
}
/* sow whatever will take, everywhere -- the player would be choosier, but
   this is about whether the SHAPE supports life, not about their aim */
function sowAll(M) {
  let n = 0;
  for (let i = 0; i < M.T.length; i++) {
    if (M.T[i].life) continue;
    for (const k of [M.SEED, M.MOSS, M.REED])
      if (M.habitable(i, k)) { M.T[i].life = k; n++; break; }
  }
  return n;
}
const CENTRES = [[-6, 3], [5, -6], [2, 4]];      /* one in each third */

/* ---------------- arrangement one: three bowls ------------------------- */
function bowls() {
  const M = pot();
  M.UP_ROOTS = true; M.UP_FLOOD = true;
  /* round 1: dig a bowl in each third and let the rain find them */
  for (const [q, r] of CENTRES) {
    const c = M.at(q, r); if (c < 0) continue;
    for (let ring = 3; ring >= 0; ring--) for (const j of M.within(c, ring)) dig(M, j, 3);
  }
  /* a shallow trench so the water reaches all three */
  for (let q = -7; q <= 6; q++) { const i = M.at(q, 0); if (i >= 0) dig(M, i, 4); }
  rain(M);
  const r1 = { sow: sowAll(M), shores: shores(M) };
  /* round 2: rain again, then cut each bowl a shallow outlet so it drains */
  rain(M);
  for (const [q, r] of CENTRES) {
    const c = M.at(q, r); if (c < 0) continue;
    for (const j of M.within(c, 4)) if (M.within(c, 3).indexOf(j) < 0) dig(M, j, 2);
  }
  const r2 = { sow: sowAll(M), shores: shores(M) };
  /* round 3 */
  rain(M);
  const r3 = { sow: sowAll(M), shores: shores(M) };
  for (let n = 0; n < 400; n++) M.tick();
  return { r1, r2, r3, final: shores(M), alive: M.alive(),
           flood: M.QUICK_FLOOD, cascade: M.QUICK_CASCADE };
}

/* ---------------- arrangement two: a stepped stair --------------------- */
function stair() {
  const M = pot();
  M.UP_ROOTS = true; M.UP_CASCADE = true;
  /* A STAIRCASE WITH REAL RISERS. A fall needs a two-elevation drop -- the
     same bar the Waterfall Wonder uses -- which is twelve slabs, not three.
     A gentle stair is a ramp as far as Cascade is concerned, and the first
     version of this test built one and got nothing. */
  for (let i = 0; i < M.T.length; i++) {
    const t = M.T[i], d = Math.abs(t.r);
    const step = Math.max(0, 4 - Math.floor(d / 2));
    if (step > 0) M.raise(i, step * 2 * M.SLAB, M.ROCK);
  }
  /* pools at the foot of each step, one in each third */
  for (const [q, r] of CENTRES) {
    const c = M.at(q, r); if (c < 0) continue;
    for (const j of M.within(c, 2)) dig(M, j, 6);
  }
  rain(M);
  const r1 = { sow: sowAll(M), shores: shores(M) };
  rain(M);
  const r2 = { sow: sowAll(M), shores: shores(M) };
  rain(M);
  const r3 = { sow: sowAll(M), shores: shores(M) };
  for (let n = 0; n < 400; n++) M.tick();
  return { r1, r2, r3, final: shores(M), alive: M.alive(),
           flood: M.QUICK_FLOOD, cascade: M.QUICK_CASCADE };
}

function show(name, res) {
  console.log('\n' + name);
  for (const k of ['r1', 'r2', 'r3'])
    console.log('  after round ' + k[1] + '   sowed ' + String(res[k].sow).padStart(3) +
      '   shores ' + res[k].shores.join(' · '));
  const won = res.final.every(v => v >= 5);
  console.log('  final        ' + res.final.join(' · ') + '   ' + res.alive + ' alive   ' +
    (won ? 'OBJECTIVE MET' : 'not met'));
  console.log('  the chain    Fertile Flood took ' + res.flood +
    ' hexes, Cascade rooted ' + res.cascade);
}

console.log('TWO ARRANGEMENTS, one pot, three rain rounds, the same objective:');
console.log('living shores of 5 in each of three separated parts.');
show('THE BOWLS   (Root Network + Fertile Flood)', bowls());
show('THE STAIR   (Root Network + Cascade)', stair());
