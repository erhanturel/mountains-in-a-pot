/* THE FEASIBILITY QUESTION, asked before anything is built on top of it.

   The prepare-then-release design needs one rain pulse to produce a
   transformation a person can watch and follow. If the water takes five
   minutes to work through, or if almost nothing visibly changes, the combo
   pleasure cannot land however good the upgrades are.

   So: prepare a valley the way a player would, release a fixed pulse, and
   measure how long it takes and how much of the board actually changes. */
const fs = require('fs');
const core = fs.readFileSync('index.html', 'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];

const RATE = 8.5;                              /* ticks a second at 1x */

const world = R => { global.POT_R = R; return new Function(core +
  'return {T,at,tick,use,LAYER,SLAB,CLOUD,SHALE,ROCK,AIR,CELL,ZN,TOP,retop,raise,' +
  'gnd,soil,fertility,biome,BIOME_NAME,habitable,SEED,MOSS,alive,worth,drowned,' +
  'clouds,within,wetAt,' +
  'set WEATHER(v){WEATHER=v}, get TICKS(){return TICKS}};')(); };

/* a valley a player might prepare: a ridge in the west, a channel down the
   middle, two basins along it, bare rock everywhere */
function prepare(M) {
  M.WEATHER = 0.10 / 420;
  const dig = (i, n) => { for (let k = 0; k < n; k++) {
    const t = M.TOP[i]; if (t < 0) break; M.CELL[i * M.ZN + t] = M.AIR; M.retop(i); } };
  for (let i = 0; i < M.T.length; i++) {
    const up = Math.max(0, -M.T[i].q);
    if (up) M.raise(i, up * 3, M.SHALE);
  }
  for (let q = -6; q <= 8; q++) { const i = M.at(q, 0); if (i >= 0) dig(i, 4); }
  for (const [q, r] of [[-2, 0], [4, 0]])
    for (const j of M.within(M.at(q, r), 1)) dig(j, 8);
  return M;
}

/* a pulse: clouds for PULSE ticks, then they go, then let it settle */
function pulse(M, ticks, stacks, wide) {
  /* wide: rain along a front rather than from one point. A pulse meant to
     FLOOD a valley cannot come out of a single hex -- it runs down one
     channel and touches nineteen hexes. */
  const heads = wide ? [] : [M.at(-7, 0)];
  if (wide) for (let r = -wide; r <= wide; r++)
    for (const q of [-7, -5]) { const j = M.at(q, r); if (j >= 0) heads.push(j); }
  for (const h of heads) for (let k = 0; k < stacks; k++) M.use(h, {k:'place'}, 0, 1, M.CLOUD);
  for (let n = 0; n < ticks; n++) M.tick();
  for (let i = 0; i < M.T.length; i++)
    for (let z = 0; z < M.ZN; z++)
      if (M.CELL[i * M.ZN + z] === M.CLOUD) { M.CELL[i * M.ZN + z] = M.AIR; M.retop(i); }
}

const snap = M => M.T.map((t, i) => ({
  soil: M.soil(i), wet: M.drowned(i) ? 1 : 0, life: t.life, b: M.biome(i) }));

function report(label, ticks, stacks, settle, wide) {
  const M = prepare(world(10));
  /* plant what a player would have planted before releasing */
  for (let n = 0; n < 60; n++) M.tick();
  for (let i = 0; i < M.T.length; i++)
    if (M.habitable(i, M.MOSS)) M.T[i].life = M.MOSS;
  const before = snap(M);

  pulse(M, ticks, stacks, wide);
  /* how long until the board goes quiet after the rain stops? */
  let quiet = 0, prev = M.T.map(t => t.pool);
  for (let n = 0; n < settle; n++) {
    M.tick();
    let biggest = 0;
    for (let i = 0; i < M.T.length; i++) {
      const d = Math.abs(M.T[i].pool - prev[i]); if (d > biggest) biggest = d;
      prev[i] = M.T[i].pool;
    }
    if (biggest < M.LAYER / 20) { quiet = n; break; }
    quiet = n;
  }
  const after = snap(M);

  let soilUp = 0, wetted = 0, lifeUp = 0, biomeChanged = 0, maxSoil = 0;
  for (let i = 0; i < before.length; i++) {
    if (after[i].soil - before[i].soil > M.LAYER * 0.5) soilUp++;
    if (after[i].wet > before[i].wet) wetted++;
    if (after[i].life !== before[i].life) lifeUp++;
    if (after[i].b !== before[i].b) biomeChanged++;
    const d = (after[i].soil - before[i].soil) / M.LAYER;
    if (d > maxSoil) maxSoil = d;
  }
  const total = ticks + quiet;
  console.log('  ' + label.padEnd(22) +
    String(ticks).padStart(6) + String(quiet).padStart(8) +
    (total / RATE).toFixed(0).padStart(7) + 's' +
    (total / RATE / 8).toFixed(0).padStart(7) + 's' +
    String(wetted).padStart(9) + String(soilUp).padStart(8) +
    String(biomeChanged).padStart(9) + maxSoil.toFixed(1).padStart(9));
}

console.log('ONE RAIN PULSE ON A PREPARED VALLEY');
console.log('Can a person watch this happen, and see that it happened?\n');
console.log('  pulse                  rain   settle   at 1x   at 8x    hexes    hexes   biomes   deepest');
console.log('                        ticks    ticks                    wetted   gained    moved      gain');
report('one point, 12',      600, 12, 3000, 0);
report('front of 5, 6',      600,  6, 3000, 2);
report('front of 9, 6',      600,  6, 3000, 4);
report('front of 13, 6',     600,  6, 3000, 6);
report('front of 13, 12',    600, 12, 3000, 6);
report('front of 13, 12, short', 300, 12, 3000, 6);
console.log('\n  A round wants to be tens of seconds, not minutes, and it wants');
console.log('  hundreds of hexes to visibly change -- not a dozen.');
