/* WHERE DOES THE FERTILE SHORE LAND, AND DO TWO SHORES DIFFER?

   The proposal being tested: do not hand-place soil and do not hand-place
   bare rock. Start on bare stone, let the rain weather it and the water carry
   it, and let the SHAPE of the land decide which shore ends up fertile and
   which stays rock. If that works, the difference between one shore and
   another is earned rather than authored.

   The board: a shale slope falling from the west into a basin, one inlet, a
   deliberately GENTLE shelf on the east side against a STEEP drop on the
   west. Everything starts as bare stone -- sed and sand zeroed on every hex.
   Weathering at the player rate, which is water-dependent, so only wet ground
   breaks down.

   One course of soil is the bar for grass. Moss needs none. */
const fs = require('fs');
const core = fs.readFileSync('index.html', 'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];
global.POT_R = 9;
const M = new Function(core + 'return {T,at,tick,use,LAYER,SLAB,CLOUD,SHALE,AIR,CELL,ZN,TOP,' +
  'retop,raise,gnd,soil,habitable,habit,drowned,within,SEED,MOSS,' +
  'set WEATHER(v){WEATHER=v}, set EXP_A(v){EXP_A=v}};')();
M.EXP_A = true;
M.WEATHER = 0.10 / 420;
const cut = (i, n) => { for (let k = 0; k < n; k++) { const z = M.TOP[i]; if (z < 0) break;
  M.CELL[i * M.ZN + z] = M.AIR; M.retop(i); } };
for (let i = 0; i < M.T.length; i++) { const t = M.T[i];
  const up = Math.max(0, Math.round((-t.q + 7) * 0.8));
  if (up) M.raise(i, up * 3, M.SHALE);         /* soft rock, so it can wear */
  M.T[i].sed = 0; M.T[i].sand = 0;             /* BARE STONE. Nothing supplied. */ }
const c = M.at(2, 0);
for (const j of M.within(c, 1)) cut(j, 12);                        /* the basin */
for (const [q, r] of [[4, 0], [4, -1], [5, -1], [5, 0]]) {         /* the gentle shelf */
  const i = M.at(q, r); if (i >= 0) cut(i, 9); }

const floor = M.within(c, 1);
const rim   = M.within(c, 2).filter(j => floor.indexOf(j) < 0);
const west  = rim.filter(i => M.T[i].q < 2);    /* steep, upstream */
const east  = rim.filter(i => M.T[i].q > 2);    /* gentle, downstream */
const shelf = [[4, 0], [4, -1], [5, -1], [5, 0]].map(([q, r]) => M.at(q, r)).filter(i => i >= 0);

function pulse() {
  const inlet = M.at(-7, 0);
  for (let k = 0; k < 4; k++) M.use(inlet, {k: 'place'}, 0, 1, M.CLOUD);
  for (let n = 0; n < 300; n++) M.tick();
  for (let z = 0; z < M.ZN; z++) for (let j = 0; j < M.T.length; j++)
    if (M.CELL[j * M.ZN + z] === M.CLOUD) { M.CELL[j * M.ZN + z] = M.AIR; M.retop(j); }
  for (let n = 0; n < 300; n++) M.tick();
}
const green = l => l.filter(i => M.habitable(i, M.SEED)).length;
const moss  = l => l.filter(i => M.habitable(i, M.MOSS)).length;
const soil  = l => (l.reduce((a, i) => a + M.soil(i), 0) / l.length / M.LAYER);
const lake  = () => floor.concat(shelf).filter(i => M.drowned(i)).length;

console.log('BARE STONE, ONE INLET, EIGHT PULSES. Where does the green band land?\n');
console.log('  pulse   lake  |  WEST shore (steep, upstream) |  EAST shore (gentle, downstream)');
console.log('          hexes |  soil   grass   moss          |  soil   grass   moss');
const row = t => console.log('  ' + t.padEnd(8) + String(lake()).padStart(4) + '   |' +
  soil(west).toFixed(2).padStart(7) + String(green(west) + '/' + west.length).padStart(8) +
  String(moss(west) + '/' + west.length).padStart(8) + '          |' +
  soil(east).toFixed(2).padStart(7) + String(green(east) + '/' + east.length).padStart(8) +
  String(moss(east) + '/' + east.length).padStart(8));
row('nothing');
for (let k = 1; k <= 8; k++) { pulse(); row('pulse ' + k); }

console.log('\n  the shelf itself, which collects the MOST sediment:');
console.log('    soil (courses) : ' + shelf.map(i => (M.soil(i) / M.LAYER).toFixed(2)).join('  '));
console.log('    pool (courses) : ' + shelf.map(i => (M.T[i].pool / M.LAYER).toFixed(2)).join('  '));
console.log('    it is DROWNED, not a shore. The calmest water is under the lake.');
