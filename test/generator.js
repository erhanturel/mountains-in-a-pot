/* D1 -- THE POT IS GROWN. What does a player actually meet?

   The case for building this before the climate block, measured on the flat
   disc every run used to open on:

     relief 0.00 elevations · 1 of 5 rocks exposed · 1 of 11 biomes ·
     temperature range 0.0 C

   So B1 through B4 were invisible and C1/C3 would have multiplied by zero.
   This reads the same six numbers off a generated pot. */
const fs = require('fs');
const core = fs.readFileSync('index.html', 'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];

function world(r) {
  global.POT_R = r;
  return new Function(core + 'return {T,at,tick,LAYER,SLAB,CELL,ZN,TOP,gnd,soil,biome,' +
    'BIOMES,fertility,genPot,GEN,elevAt,tempAt,moistAt,STRATA,drowned,within,' +
    'habitable,SEED,MOSS,settle};')();
}
const M = world(12);
const n = M.T.length;
const surf = i => M.TOP[i] >= 0 ? M.CELL[i * M.ZN + M.TOP[i]] : 0;

function read(M, tag) {
  const el = M.T.map(t => t.h);
  const mats = new Set(); for (let i = 0; i < n; i++) mats.add(surf(i));
  const bio = new Set(); for (let i = 0; i < n; i++) bio.add(M.biome(i));
  const tp = M.T.map((t, i) => M.tempAt(i));
  const f = M.T.map((t, i) => M.fertility(i));
  const soil = M.T.reduce((a, t) => a + t.sed + t.sand, 0) / M.LAYER;
  return { tag, relief: (Math.max(...el) - Math.min(...el)),
    lo: Math.min(...el), hi: Math.max(...el),
    rocks: mats.size, biomes: bio.size,
    temp: Math.max(...tp) - Math.min(...tp),
    fert: Math.max(...f), soil };
}
const row = r => console.log('  ' + String(r.tag).padEnd(10) +
  r.relief.toFixed(2).padStart(8) + (r.lo.toFixed(1) + ' to ' + r.hi.toFixed(1)).padStart(13) +
  String(r.rocks + '/5').padStart(8) + String(r.biomes + '/11').padStart(9) +
  r.temp.toFixed(1).padStart(9) + r.fert.toFixed(2).padStart(8) + r.soil.toFixed(0).padStart(10));

console.log('WHAT A PLAYER MEETS  (radius 12, ' + n + ' hexes)\n');
console.log('  seed        relief    range      rocks   biomes     dT    fert     soil');
console.log('                                 exposed  present   (C)    max   (courses)');
/* the old opening board, for the comparison */
for (let i = 0; i < n; i++) { M.T[i].h = 1; M.T[i].sed = 0; M.T[i].sand = 0; }
row(read(M, 'flat disc'));
console.log('');
for (const s of [1, 42, 7, 1337, 2026]) { M.genPot(s); row(read(M, 'seed ' + s)); }

console.log('\nSAME SEED, SAME POT -- generated three times, and once after a different seed:');
const sig = () => { let h = 0; for (let i = 0; i < n; i++)
  h = (Math.imul(h, 31) + M.T[i].h * 64 + surf(i) + Math.round(M.T[i].sed)) | 0; return h >>> 0; };
M.genPot(42); const a = sig();
M.genPot(42); const b = sig();
M.genPot(7);  const other = sig();
M.genPot(42); const c = sig();
console.log('  ' + a + '   ' + b + '   ' + c + '   (a different seed gives ' + other + ')');
console.log('  identical: ' + (a === b && b === c) + '        different seeds differ: ' + (a !== other));

console.log('\nAND THE SHAPE: is there anywhere for water to gather?');
M.genPot(42);
let basins = 0, shore = 0;
for (let i = 0; i < n; i++) {
  const t = M.T[i]; let low = false;
  for (const j of t.nb) { if (j < 0) { low = true; break; } if (M.gnd(j) < M.gnd(i)) { low = true; break; } }
  if (!low) basins++;
}
console.log('  closed hollows (nothing beside them is lower) : ' + basins);
console.log('  hexes with a course of soil already on them   : ' +
  M.T.filter(t => t.sed + t.sand >= M.LAYER).length + '/' + n);
console.log('  hexes moss could take today                   : ' +
  M.T.map((t, i) => i).filter(i => M.habitable(i, M.MOSS)).length + '/' + n);
