/* Why the objective does not land: life's clock against the pulse. */
const fs = require('fs');
const core = fs.readFileSync('index.html', 'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];
global.POT_R = 9;
const M = new Function(core + 'return {T,at,tick,use,LAYER,SLAB,CLOUD,ROCK,AIR,CELL,ZN,TOP,' +
  'retop,raise,gnd,habitable,SEED,drowned,alive,' +
  'set WEATHER(v){WEATHER=v}, set EXP_A(v){EXP_A=v}, LIFE_EVERY:LIFE_EVERY};')();
M.WEATHER = 0; M.EXP_A = true;

const dig = (q, r, n) => { const i = M.at(q, r); if (i < 0) return;
  for (let k = 0; k < n; k++) { const z = M.TOP[i]; if (z < 0) break;
    M.CELL[i * M.ZN + z] = M.AIR; M.retop(i); } };

const POND = [[-5,1],[-5,0],[-4,1],[-5,2],[-6,1],[-4,0]];
const MIDDLE = [[-2,1],[-1,1],[-2,2],[-1,0],[0,0],[0,1],[-1,2]];
const PATCH_N = [[4,-4],[3,-4],[5,-4],[4,-3],[3,-3],[5,-5]];
const PATCH_S = [[3,3],[2,3],[4,3],[3,2],[2,4],[4,2]];

for (let i = 0; i < M.T.length; i++) { M.raise(i, 8 * M.SLAB, M.ROCK); M.T[i].sed = 3 * M.LAYER; }
const carve = (cells, d) => { for (const [q, r] of cells) dig(q, r, d); };
carve(POND, 4); carve(MIDDLE, 9); carve(PATCH_N, 15); carve(PATCH_S, 15);
M.raise(M.at(-7, 1), 4 * M.SLAB, M.ROCK);

/* the "cut the sill" plan */
dig(-3, 1, 7); dig(1, -1, 13); dig(2, -2, 13); dig(1, 1, 13); dig(1, 2, 13); dig(2, 2, 13);

const PULSE = 260;
const corridor = [[0,0],[1,-1],[2,-2],[3,-3],[4,-4]];
const hab = corridor.map(() => 0);
let patchTicks = 0;
for (let k = 0; k < 4; k++) M.use(M.at(-7, 1), {k:'place'}, 0, 1, M.CLOUD);
for (let n = 0; n < PULSE; n++) {
  M.tick();
  corridor.forEach(([q, r], ix) => { const i = M.at(q, r);
    if (i >= 0 && M.habitable(i, M.SEED)) hab[ix]++; });
  const ok = PATCH_N.filter(([q, r]) => { const i = M.at(q, r);
    return i >= 0 && M.habitable(i, M.SEED); }).length;
  if (ok >= 6) patchTicks++;
}
console.log('LIFE STEPS ONCE EVERY ' + M.LIFE_EVERY + ' TICKS, one hex at a time.\n');
console.log('  the corridor from the middle to the north patch is ' + corridor.length + ' hexes');
console.log('  so life needs ' + (corridor.length * M.LIFE_EVERY) + ' ticks of UNBROKEN damp to cross it');
console.log('  the rain pulse is ' + PULSE + ' ticks\n');
console.log('  ticks each corridor hex was actually plantable, out of ' + PULSE + ':');
corridor.forEach(([q, r], ix) =>
  console.log('    (' + q + ',' + r + ')'.padEnd(4) + String(hab[ix]).padStart(6)));
console.log('\n  ticks the whole north patch was plantable: ' + patchTicks);
