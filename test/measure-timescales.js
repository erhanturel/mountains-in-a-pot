/* Measure the three timescales headlessly, out of the CORE that ships. */
const fs = require('fs');
const page = fs.readFileSync('index.html', 'utf8');
const core = page.split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];

function world(R) {
  global.POT_R = R;
  return new Function(core +
    'return {T,at,settle,tick,use,LAYER,RAINFALL,CELL,ZN,CLOUD_Z,CLOUD,SLAB,TOP,retop,AIR,ROCK,' +
    'raise,lower,within,gnd,habit,habitable,grow,alive,SEED,MOSS,REED,addCloud,clouds,' +
    'get WEATHER(){return WEATHER}, set WEATHER(v){WEATHER=v},' +
    'get LIFE_EVERY(){return LIFE_EVERY}, set LIFE_EVERY(v){LIFE_EVERY=v},' +
    'get TICKS(){return TICKS}};')();
}

const M = world(12);
const L = M.LAYER;
const c = M.at(0, 0);

// ---- 1. how long does a seven-hex bowl two steps deep take to fill?
for (const j of M.within(c, 1)) M.lower(j, 2 * M.SLAB);
M.addCloud(c, 1);
let fillTicks = -1;
for (let k = 1; k <= 4000; k++) {
  M.tick();
  if (fillTicks < 0 && M.T[c].pool >= 2 * 6 * L) { fillTicks = k; break; }
}

// ---- 2. how long does life take to cover a settled lake rim?
const M2 = world(12);
const c2 = M2.at(0, 0);
for (const j of M2.within(c2, 1)) M2.lower(j, 2 * M2.SLAB);
for (const j of M2.within(c2, 1)) M2.T[j].pool = 6 * M2.LAYER;
for (const j of M2.within(c2, 2)) M2.T[j].sed = 2 * M2.LAYER;   // a course of soil on the rim
for (let k = 0; k < 200; k++) M2.tick();                        // let it settle
let seeded = -1;
for (let i = 0; i < M2.T.length; i++) if (M2.habitable(i, M2.SEED)) { M2.T[i].life = M2.SEED; seeded = i; break; }
const before = M2.alive();
let t0 = M2.TICKS, lifeTicks = -1, last = before, still = 0;
for (let k = 1; k <= 6000; k++) {
  M2.tick();
  const a = M2.alive();
  if (a === last) { if (++still > 400) { lifeTicks = M2.TICKS - t0 - 400; break; } }
  else { still = 0; last = a; }
}

// ---- 3. how long to weather one slab, WET and DRY. Weathering scales with
//         the water working on a hex now, so one number will not do: the gap
//         between these two is what puts soil in the valleys and leaves the
//         ridges bare.
function slab(wet) {
  const M = world(8);
  const i = M.at(0, 0);
  M.WEATHER = (+process.argv[4] || 0.7) / 420;
  M.raise(i, 6, M.ROCK);
  const h0 = M.T[i].h;
  for (let k = 1; k <= 400000; k++) {
    if (wet) M.T[i].pool = 6 * M.LAYER;   /* deep enough to survive settle */
    M.tick();
    /* the ROCK converting, not the slag piling up: on a wet hex the water
       carries the slag off as fast as it is made, so waiting for a course of
       it to accumulate measures transport rather than weathering. */
    if (M.T[i].h <= h0 - 1 / M.SLAB + 1e-9) return k;
  }
  return -1;
}
const slabWet = slab(true), slabTicks = slab(false);

const R = +process.argv[2] || 2, S = +process.argv[3] || 120;
const secs = t => (t / R).toFixed(0);
console.log('BASE_RATE ' + R + ' ticks/s,  SEASON ' + S + ' ticks\n');
console.log('  process                       ticks     seconds at 1x   in Seasons');
const row = (n, t) => console.log('  ' + n.padEnd(28) + String(t).padStart(6) +
  String(secs(t)).padStart(15) + 's' + (t / S).toFixed(2).padStart(13));
row('a bowl fills', fillTicks);
row('life covers a lake rim', lifeTicks);
row('one slab weathers, WET', slabWet);
row('one slab weathers, DRY', slabTicks);
row('ONE SEASON', S);
console.log('\n  spread (slowest / fastest): ' +
  (Math.max(fillTicks, lifeTicks, slabTicks) / Math.min(fillTicks, lifeTicks, slabWet)).toFixed(2) + 'x');
