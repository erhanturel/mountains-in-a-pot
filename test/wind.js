/* C2 -- A CLOUD IS A PASS, NOT A TAP.

   The thing being measured is not that clouds move -- that is one line -- but
   what it does to the economy. A parked cloud gave unlimited water, which is
   why test/one-cut.js found the cost of a cut was -1 against a gain of +11:
   the pot was never short. A cloud that crosses the pot and leaves makes
   water finite without a budget or a cap. */
const fs = require('fs');
const core = fs.readFileSync('index.html', 'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];
function world() {
  global.POT_R = 12;
  const M = new Function(core + 'return {T,at,tick,LAYER,SLAB,CELL,ZN,TOP,genPot,markPot,' +
    'addCloud,delCloud,clouds,CLOUD_MAX,windDir,DRIFT,SEASON_LEN,gnd,drowned,' +
    'set WEATHER(v){WEATHER=v}};')();
  M.genPot(42); M.markPot(); M.WEATHER = 0.10 / 420;
  return M;
}
const RATE = 8.5;
const totalCloud = M => M.T.reduce((a, t, i) => a + M.clouds(i), 0);
const water = M => M.T.reduce((a, t) => a + t.pool, 0) / M.LAYER;

console.log('ONE CLOUD, PLACED ONCE, NEVER TOUCHED AGAIN\n');
console.log('  placed at   survived      travelled   water it delivered   wind turned');
for (const [q, r, lbl] of [[-8, 0, 'the west rim'], [0, 0, 'the middle'], [6, -3, 'the east side']]) {
  const M = world();
  const i0 = M.at(q, r);
  M.addCloud(i0, 3);
  let t = 0, turns = 0, lastDir = M.windDir();
  const w0 = water(M);
  while (totalCloud(M) > 0 && t < M.SEASON_LEN * 8) {
    M.tick(); t++;
    if (M.windDir() !== lastDir) { turns++; lastDir = M.windDir(); }
  }
  console.log('  ' + lbl.padEnd(12) + (t + ' ticks').padStart(11) +
    (Math.round(t / M.DRIFT) + ' hexes').padStart(15) +
    ((water(M) - w0).toFixed(0) + ' courses').padStart(21) +
    String(turns).padStart(13));
}

console.log('\nPARKED AGAINST DRIFTING: what one placement is worth\n');
console.log('  clouds placed |  water delivered   wet hexes at the end');
for (const n of [1, 3, 8]) {
  const M = world();
  const spots = M.T.map((t, i) => i).sort((a, b) => (M.T[b].h - M.T[a].h) || (a - b)).slice(0, n);
  for (const i of spots) M.addCloud(i, 2);
  for (let k = 0; k < M.SEASON_LEN * 4; k++) M.tick();
  console.log('  ' + String(n).padStart(13) + ' |' +
    (water(M).toFixed(0) + ' courses').padStart(18) +
    String(M.T.filter((t, i) => M.drowned(i)).length).padStart(23));
}
console.log('\n  A Year is 1920 ticks and a cloud crosses one hex every 120, so it walks');
console.log('  about sixteen hexes a Year -- ' + (120 / RATE).toFixed(0) + ' seconds a hex at 1x.');
console.log('  A closed basin in its path fills and HOLDS: measured separately, a 7-hex');
console.log('  basin keeps 20.6 / 47.3 / 128.6 courses at 1, 2 and 4 elevations deep,');
console.log('  two Years after the cloud has gone. Flat ground keeps nothing, so rain');
console.log('  is something to CATCH -- and digging is what catches it.');
