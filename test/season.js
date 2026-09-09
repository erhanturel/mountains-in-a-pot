/* C1 -- THE SEASON MOVES THE TEMPERATURE AND MUST NOT MOVE THE MAP.

   Two temperatures. `tempAt` is the Year's mean and the biome reads it;
   `tempNow` carries the Season's swing and snow and the palette read that.
   The split exists because B3's finding was that a forest has to be a
   CONDITION rather than a timer -- feed a swinging temperature into the
   biome and a hex changes what it IS four times a Year on a clock, which is
   the identity flicker that argument was against.

   Measured on a STILL board: weathering off, no clouds, settled. The board
   is then a pure function of ground that is not moving, so anything that
   changes across the Year changed because of the Season and nothing else. */
const fs = require('fs');
const core = fs.readFileSync('index.html', 'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];
global.POT_R = 12;
const M = new Function(core + 'return {T,tick,TICKS,LAYER,CELL,ZN,TOP,genPot,markPot,biome,' +
  'BIOMES,tempAt,tempNow,seasonSwing,SEASON_LEN,SWING,LAPSE,' +
  'set WEATHER(v){WEATHER=v}};')();
M.genPot(42); M.markPot();
M.WEATHER = 0;                       /* nothing moves but the clock */
/* genPot resets TICKS to 0, so the swing and the clock share a zero.
   Settle in whole Seasons so every sample lands on a season boundary. */
for (let n = 0; n < M.SEASON_LEN * 4; n++) M.tick();

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const biomesNow = () => M.T.map((t, i) => M.biome(i));
const base = biomesNow();
const lo = () => Math.min(...M.T.map((t, i) => M.tempNow(i)));
const hi = () => Math.max(...M.T.map((t, i) => M.tempNow(i)));

console.log('THE SEASON, ON A BOARD THAT IS OTHERWISE STILL\n');
console.log('  season    swing    coldest   warmest   biomes changed   drawn ground changed');
for (let s = 0; s < 8; s++) {
  const nm = SEASONS[s % 4] + (s >= 4 ? ' (Y2)' : '');
  const now = biomesNow();
  let ch = 0; for (let i = 0; i < base.length; i++) if (now[i] !== base[i]) ch++;
  let moved = 0; for (let i = 0; i < M.T.length; i++) if (Math.abs(M.T[i].h - 0) < -1) moved++;
  console.log('  ' + nm.padEnd(12) + M.seasonSwing().toFixed(2).padStart(6) +
    lo().toFixed(1).padStart(11) + hi().toFixed(1).padStart(10) +
    String(ch).padStart(17) + String(moved).padStart(23));
  for (let n = 0; n < M.SEASON_LEN; n++) M.tick();
}
console.log('\n  relief is worth ' + ((Math.max(...M.T.map(t => t.h)) - Math.min(...M.T.map(t => t.h))) * M.LAPSE).toFixed(1) +
  ' degrees on this pot; the Season is worth ' + (2 * M.SWING).toFixed(1) + '.');
console.log('  The mountain decides what a place is. The Season decides what it is doing today.');
