/* Does soil actually TRAVEL at the settings the player plays at?
   The playtest reports it does not: no drag, no fan, no delta. This measures
   it on a player-scale board over a run's worth of ticks. Reads the CORE out
   of index.html. */
const fs = require('fs');
const core = fs.readFileSync('index.html', 'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];

const RUN_TICKS = 15360;                 /* eight Years, the whole run */

function build(R, weather, thresh, cap) {
  global.POT_R = R;
  const M = new Function(core + 'return {T,at,tick,use,LAYER,SLAB,CLOUD,SHALE,ROCK,' +
    'raise,gnd,soil,fertility,' +
    'set WEATHER(v){WEATHER=v}, get THRESH(){return THRESH}, set THRESH(v){THRESH=v},' +
    'get CAP(){return CAP}, set CAP(v){CAP=v}};')();
  M.WEATHER = weather / 420;
  if (thresh !== undefined) M.THRESH = thresh;
  if (cap !== undefined) M.CAP = cap;
  /* a hill in the west falling to a plain in the east: the shape that should
     make a fan at the break of slope */
  for (let i = 0; i < M.T.length; i++) {
    const up = Math.max(0, -M.T[i].q);
    if (up) M.raise(i, up * M.SLAB, M.SHALE);
  }
  for (let k = 0; k < 4; k++) M.use(M.at(-7, 0), {k:'place'}, 0, 1, M.CLOUD);
  return M;
}

function measure(label, M, ticks) {
  const before = M.T.map((t, i) => M.soil(i));
  for (let n = 0; n < ticks; n++) M.tick();
  /* where is the loose material, and did any of it move DOWNHILL? */
  let mass = 0, mx = 0, made = 0, moved = 0;
  for (let i = 0; i < M.T.length; i++) {
    const s = M.soil(i);
    made += s;
    mass += s; mx += s * M.T[i].q;
    moved += Math.max(0, s - before[i] * 0);   /* total now */
  }
  const com = mass > 0 ? mx / mass : 0;
  /* the fan test: is there more soil just past the break of slope (q=0)
     than on the slope itself? */
  const at = q => { let s = 0, n = 0;
    for (let r = -3; r <= 3; r++) { const j = M.at(q, r); if (j >= 0) { s += M.soil(j); n++; } }
    return n ? s / n / M.LAYER : 0; };
  console.log(label.padEnd(30) +
    (made / M.LAYER).toFixed(0).padStart(9) +
    com.toFixed(2).padStart(9) +
    at(-6).toFixed(1).padStart(9) + at(-2).toFixed(1).padStart(8) +
    at(1).toFixed(1).padStart(8) + at(4).toFixed(1).padStart(8) +
    at(7).toFixed(1).padStart(8));
}

console.log('A shale hill in the west falling to a plain, one cloud on the summit.');
console.log('If soil travels, the courses should PEAK PAST the break of slope at q=0.\n');
console.log('                                total   centre    q=-6    q=-2     q=1     q=4     q=7');
console.log('                              courses  of mass  (slope) (slope)  (plain) (plain) (plain)');

measure('player default (0.05)', build(10, 0.05), RUN_TICKS);
measure('the old default (0.7)', build(10, 0.7), RUN_TICKS);
measure('0.7, threshold /4', build(10, 0.7, 0.05), RUN_TICKS);
measure('0.7, threshold /4, carry x4', build(10, 0.7, 0.05, 0.2), RUN_TICKS);
measure('0.7, threshold /20, carry x8', build(10, 0.7, 0.01, 0.4), RUN_TICKS);
