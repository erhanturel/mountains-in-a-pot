/* C4 -- SNOW, AND THE SPRING MELT.

   Rule 9 is one clause on rule 1: water arriving below freezing is held as
   SNOW, does not flow, and melts back when the hex rises above zero.

   What has to be true for a Season to MEAN something: water is withheld
   through the cold and RELEASED when it warms. A pack that never clears is
   scenery, not a mechanic -- measured once at MELT = RAINFALL/40, a Season
   cleared twelve courses against a pack of three thousand. Snow now melts
   about as fast as it falls, so a winter's fall is a spring's flood. */
const fs = require('fs');
const core = fs.readFileSync('index.html', 'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];

function world(seed) {
  global.POT_R = 12;
  const M = new Function(core + 'return {T,at,tick,LAYER,SLAB,CELL,ZN,TOP,genPot,markPot,' +
    'addCloud,delCloud,clouds,CLOUD_MAX,tempNow,seasonSwing,SEASON_LEN,FREEZE,MELT,' +
    'raise,ROCK,gnd,TEMP_SEA,LAPSE,SWING,phase:()=>TICKS,set WEATHER(v){WEATHER=v}};')();
  M.genPot(seed); M.markPot(); M.WEATHER = 0;
  return M;
}
const NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'];
const snow = M => M.T.reduce((a, t) => a + t.snow, 0) / M.LAYER;
const pool = M => M.T.reduce((a, t) => a + t.pool, 0) / M.LAYER;
const snowy = M => M.T.filter(t => t.snow > 0.01).length;
const season = M => NAMES[Math.floor(M.phase() / M.SEASON_LEN) % 4];

console.log('A POT NOBODY BUILT, played the way a player would:');
console.log('one cloud a Season over the high ground, left to drift.\n');
console.log('  sampled mid-      snow hexes   snow held   standing water   released this Season');
{
  const M = world(42);
  const high = () => M.T.map((t, i) => i).sort((a, b) => (M.T[b].h - M.T[a].h) || (a - b))[0];
  let last = 0;
  for (let s = 0; s < 8; s++) {
    for (let k = 0; k < M.SEASON_LEN / 2; k++) { if (k === 0) M.addCloud(high(), 4); M.tick(); }
    const held = snow(M), rel = Math.max(0, last - held); last = held;
    console.log('  ' + (season(M) + (s >= 4 ? ' (Y2)' : '')).padEnd(18) +
      String(snowy(M)).padStart(8) + held.toFixed(1).padStart(13) +
      pool(M).toFixed(1).padStart(16) +
      (rel > 0.5 ? rel.toFixed(0) + ' courses' : '\u2014').padStart(22));
    for (let k = 0; k < M.SEASON_LEN / 2; k++) M.tick();
  }
}

console.log('\nHOW HIGH IS TOO HIGH? A hex freezes below 0, and never thaws if it');
console.log('is still below 0 at midsummer.\n');
console.log('  h      midwinter   midsummer   what it does');
{
  const M = world(42);
  for (const h of [4, 5, 6, 7, 8, 10]) {
    const w = M.TEMP_SEA - h * M.LAPSE - M.SWING, sm = M.TEMP_SEA - h * M.LAPSE + M.SWING;
    console.log('  ' + String(h).padStart(3) + (w.toFixed(1) + '\u00b0').padStart(12) +
      (sm.toFixed(1) + '\u00b0').padStart(12) + '   ' +
      (w >= 0 ? 'never holds snow' : sm >= 0 ? 'takes snow in winter, gives it back in spring'
                                             : 'holds it for good \u2014 a glacier, and the water never returns'));
  }
}
