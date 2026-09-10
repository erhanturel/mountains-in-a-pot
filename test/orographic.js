/* C3 -- THE RAIN SHADOW, AND WHERE A CLOUD DIES.

   A ridge across the pot, the wind blowing over it, one cloud released
   upwind. The thing to prove is not that water pools -- on an open pot most
   of it runs off the rim, which says nothing about the rule. It is WHERE THE
   RAIN FALLS, which is the cloud's tile count times the ticks it spends
   there. So the test prints the journey: hex by hex, how tall the cloud
   still is and how much it has dropped. */
const fs = require('fs');
const core = fs.readFileSync('index.html', 'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];

function world(ridge) {
  global.POT_R = 9;
  const M = new Function(core + 'return {T,at,tick,LAYER,SLAB,CELL,ZN,TOP,retop,raise,gnd,' +
    'CLOUD,AIR,ROCK,addCloud,delCloud,clouds,CLOUD_MAX,windDir,DRIFT,SHED,' +
    'RAINFALL,set WEATHER(v){WEATHER=v}};')();
  M.WEATHER = 0;
  for (let i = 0; i < M.T.length; i++) { M.raise(i, 4 * M.SLAB, M.ROCK); M.T[i].sed = 0; }
  if (ridge) for (let i = 0; i < M.T.length; i++)
    if (M.T[i].q === 0 || M.T[i].q === 1) M.raise(i, ridge * M.SLAB, M.ROCK);
  return M;
}
const cloudAt = M => { for (let i = 0; i < M.T.length; i++) if (M.clouds(i)) return i; return -1; };

function journey(ridge) {
  const M = world(ridge);
  M.addCloud(M.at(-7, 0), 6);
  const legs = [];
  let dropped = 0, left = false;
  for (let t = 1; t <= 6000; t++) {
    const i = cloudAt(M);
    if (i >= 0) dropped += M.clouds(i) * M.RAINFALL;
    M.tick();
    if (t % M.DRIFT === 0) {
      const j = cloudAt(M);
      if (j < 0) { left = (legs.length && legs[legs.length - 1].q >= 8); break; }
      legs.push({ q: M.T[j].q, n: M.clouds(j), gnd: +M.gnd(j).toFixed(1) });
    }
  }
  return { legs, dropped: dropped / M.LAYER, left };
}

console.log('ONE CLOUD OF SIX TILES, CROSSING A RIDGE  (SHED = 1.5 tiles an elevation)\n');
for (const ridge of [0, 2, 4]) {
  const r = journey(ridge);
  const trail = r.legs.map(l => 'q' + String(l.q).padStart(2) + ':' + l.n).join('  ');
  console.log('  ridge ' + ridge + ' elevations');
  console.log('    the cloud, hex by hex : ' + (trail || '(gone at once)'));
  console.log('    it rained ' + r.dropped.toFixed(0) + ' courses in all, and ' +
    (r.left ? 'left over the far rim.' : 'was spent by the climb.'));
  console.log('');
}

/* and the shadow itself: rain delivered on each side of the ridge */
console.log('WHERE THE RAIN LANDED, either side of the crest\n');
console.log('  ridge |  windward   the crest   lee   shadow');
for (const ridge of [0, 1, 2, 3, 4]) {
  const M = world(ridge);
  M.addCloud(M.at(-7, 0), 6);
  let w = 0, c = 0, l = 0;
  for (let t = 0; t < 6000; t++) {
    const i = cloudAt(M);
    if (i >= 0) {
      const amt = M.clouds(i) * M.RAINFALL / M.LAYER, q = M.T[i].q;
      if (q < 0) w += amt; else if (q <= 1) c += amt; else l += amt;
    }
    M.tick();
  }
  console.log('  ' + String(ridge).padStart(5) + ' |' + w.toFixed(0).padStart(10) +
    c.toFixed(0).padStart(12) + l.toFixed(0).padStart(6) +
    (l > 0.5 ? ((w + c) / l).toFixed(1) + 'x' : '  total').padStart(9));
}
