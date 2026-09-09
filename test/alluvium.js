/* B2. Fertility: does erosion produce ground that is worth more to live on,
   and does the rock it came off decide how much? Reads the CORE out of
   index.html so it exercises the code that ships. */
const fs = require('fs');
const core = fs.readFileSync('index.html', 'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];

const world = (R, extra) => { global.POT_R = R; return new Function(core +
  'return {T,at,tick,use,LAYER,SLAB,CLOUD,SHALE,BASALT,LIMESTONE,ROCK,GRANITE,BEDROCK,' +
  'raise,gnd,soil,fertility,FERT,FERT_GAIN,ALLU_FULL,SOIL_MIN,MATS,SEED,' +
  'set WEATHER(v){WEATHER=v}};')(); };

/* ---- 1. bare rock is worth nothing, and one course is the floor ---------- */
{
  const M = world(8);
  const i = M.at(0, 0);
  console.log('HOW FERTILITY RISES WITH DEPTH  (the opening surface is limestone, F = 0.55)\n');
  console.log('  courses of soil   fertility   a grass hex is worth');
  for (const c of [0, 0.5, 1, 2, 3, 4, 8, 20]) {
    M.T[i].sed = c * M.LAYER; M.T[i].sand = 0;
    const f = M.fertility(i);
    console.log(String(c).padStart(17) + f.toFixed(3).padStart(12) +
      (1 + M.FERT_GAIN * f).toFixed(3).padStart(23));
  }
  console.log('\n  below one course nothing can root, so fertility is 0 by rule 6;');
  console.log('  above four it saturates, because roots only reach so far.');
}

/* ---- 2. the same soil on different rock --------------------------------- */
console.log('\n\nTHE SAME FOUR COURSES ON DIFFERENT ROCK\n');
console.log('  rock          F(rock)   fertility   a grass hex is worth');
for (const k of ['BASALT', 'SHALE', 'LIMESTONE', 'ROCK', 'GRANITE', 'BEDROCK']) {
  const W = world(8);
  const i = W.at(0, 0);
  W.raise(i, 1, W[k]);
  W.T[i].sed = 4 * W.LAYER;
  const f = W.fertility(i);
  console.log('  ' + W.MATS[W[k]].padEnd(13) + W.FERT[W[k]].toFixed(2).padStart(5) +
    f.toFixed(3).padStart(12) + (1 + W.FERT_GAIN * f).toFixed(3).padStart(20));
}

/* ---- 3. erosion actually produces it ------------------------------------ */
{
  const M = world(10);
  M.WEATHER = 0.35 / 420;
  for (let i = 0; i < M.T.length; i++) {
    const up = Math.max(0, (-M.T[i].q) * 2);
    if (up) M.raise(i, up * M.SLAB, M.SHALE);
  }
  for (let r = -8; r <= 8; r++) { const j = M.at(-7, r); if (j >= 0) M.use(j, {k:'place'}, 0, 3, M.CLOUD); }
  const spot = M.at(6, 0);
  console.log('\n\nEROSION MAKING GROUND WORTH LIVING ON  (a shale ramp under rain)\n');
  console.log('   ticks   courses   fertility   a grass hex is worth');
  let done = 0;
  const line = () => console.log(String(done).padStart(8) +
    (M.soil(spot) / M.LAYER).toFixed(1).padStart(10) +
    M.fertility(spot).toFixed(3).padStart(12) +
    (1 + M.FERT_GAIN * M.fertility(spot)).toFixed(3).padStart(23));
  line();
  for (const upto of [2000, 5000, 15000, 40000]) {
    for (; done < upto; done++) M.tick();
    line();
  }
}
