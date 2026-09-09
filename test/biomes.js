/* B3. The founder asked for grass and moss to become forest. The one thing
   that had to be got right is that it is a CONDITION and not a timer, because
   a counter is stored order-dependent state and this project has been burnt
   by that twice.

   So: hold the ground still and vary only the conditions. If forest is a
   condition, it appears and disappears with them and time never enters. */
const fs = require('fs');
const core = fs.readFileSync('index.html', 'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];

const world = R => { global.POT_R = R; return new Function(core +
  'return {T,at,tick,use,LAYER,SLAB,CLOUD,raise,gnd,soil,biome,BIOME_NAME,BIOMES,' +
  'elevAt,tempAt,moistAt,SEED,MOSS,REED,ROCK,drowned,riverEdge};')(); };

/* ---- 1. the same hex, the same tick, different ground ------------------- */
{
  const M = world(8);
  const i = M.at(0, 0);
  const nb = M.T[i].nb.filter(j => j >= 0);
  console.log('ONE HEX, TIME FROZEN. Only the conditions change.\n');
  console.log('  life  courses  elev   temp   moist    biome');
  const show = () => {
    console.log('  ' + (M.T[i].life ? 'yes ' : 'no  ') +
      (M.soil(i) / M.LAYER).toFixed(1).padStart(8) +
      M.elevAt(i).toFixed(2).padStart(7) +
      (M.tempAt(i).toFixed(0) + 'C').padStart(7) +
      M.moistAt(i).toFixed(2).padStart(8) + '    ' +
      M.BIOME_NAME[M.biome(i)]);
  };
  show();                                             /* bare, dry, no life */
  M.T[i].sed = 4 * M.LAYER; show();                   /* soil, still dry */
  for (const j of nb.slice(0, 3)) M.T[j].pool = 3 * M.LAYER;
  show();                                             /* water in reach */
  M.T[i].life = M.SEED; show();                       /* and something living */
  M.T[i].sed = 0.5 * M.LAYER; show();                 /* take the soil away */
  M.T[i].sed = 4 * M.LAYER;
  M.raise(i, 9 * M.SLAB, M.ROCK); show();             /* lift it into the cold */
}

/* ---- 2. the biome is a pure function of the board ----------------------- */
{
  const M = world(8);
  const i = M.at(0, 0);
  const set = () => {
    for (const j of M.T[i].nb) if (j >= 0) M.T[j].pool = 3 * M.LAYER;
    M.T[i].sed = 4 * M.LAYER; M.T[i].life = M.SEED;
  };
  set();
  const first = M.biome(i);
  /* run the world a long way, doing whatever it likes */
  for (let n = 0; n < 5000; n++) M.tick();
  const drifted = M.biome(i);
  /* now put the same conditions back and ask again */
  set();
  const again = M.biome(i);
  console.log('\n\nIS THE BIOME A PURE FUNCTION OF THE BOARD?\n');
  console.log('  with the conditions set      ' + M.BIOME_NAME[first]);
  console.log('  after 5000 ticks of drift    ' + M.BIOME_NAME[drifted] +
              '   (the water drained; it should differ)');
  console.log('  conditions restored          ' + M.BIOME_NAME[again]);
  console.log('  ' + (again === first
    ? 'Same answer from the same board. Nothing is remembered.'
    : 'DIFFERENT -- something is storing state.'));
}

/* ---- 3. what the whole table can actually produce ------------------------ */
{
  const M = world(8);
  const i = M.at(0, 0);
  console.log('\n\nEVERY BIOME THE TABLE CAN REACH, and what it takes\n');
  console.log('  biome              elevation   temp    moisture  needs');
  for (const B of M.BIOMES) {
    console.log('  ' + B.nm.padEnd(18) +
      (B.e[0] + '-' + B.e[1]).padStart(9) +
      (B.t[0] + '..' + B.t[1] + 'C').padStart(10) +
      (B.m[0] + '-' + B.m[1]).padStart(11) + '   ' +
      (B.life ? 'life' : 'bare') + (B.soil ? ', ' + B.soil + ' courses' : ''));
  }
}
