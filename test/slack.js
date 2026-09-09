/* WHY THE TRAITS CARRY NO DECISION YET.

   The objective is met without any of them, so there is no reason to choose
   one. That is slack, and slack has three sources. This measures each. */
const fs = require('fs');
const core = fs.readFileSync('index.html', 'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];

const W = () => { global.POT_R = 8; return new Function(core +
  'return {T,at,tick,use,LAYER,SLAB,CLOUD,ROCK,AIR,CELL,ZN,TOP,retop,raise,gnd,soil,' +
  'habitable,SEED,drowned,within,alive,sowDormant,SOWN,' +
  'set WEATHER(v){WEATHER=v}, set EXP_A(v){EXP_A=v}, set UP_FLOOD(v){UP_FLOOD=v},' +
  'get QUICK_FLOOD(){return QUICK_FLOOD}, set QUICK_FLOOD(v){QUICK_FLOOD=v},' +
  'LIFE_EVERY:LIFE_EVERY};')(); };

/* one basin, filled, with N seeds on its rim and S ticks of settle */
function trial(seeds, settle, soil, quick) {
  const M = W(); M.WEATHER = 0; M.EXP_A = true; M.UP_FLOOD = !!quick; M.QUICK_FLOOD = 0;
  const dig = (i, n) => { for (let k = 0; k < n; k++) {
    const z = M.TOP[i]; if (z < 0) break; M.CELL[i * M.ZN + z] = M.AIR; M.retop(i); } };
  for (let i = 0; i < M.T.length; i++) { M.raise(i, 8 * M.SLAB, M.ROCK); M.T[i].sed = soil * M.LAYER; }
  const c = M.at(0, 0);
  const floor = M.within(c, 1);
  const rim = M.within(c, 2).filter(j => floor.indexOf(j) < 0);
  for (const j of floor) dig(j, 14);
  for (let k = 0; k < seeds; k++) if (rim[k] !== undefined) M.sowDormant(rim[k], M.SEED);
  for (let n = 0; n < 200; n++) {
    for (const j of floor) M.T[j].pool = Math.max(M.T[j].pool, 4 * M.LAYER);
    M.tick();
  }
  for (let n = 0; n < settle; n++) M.tick();
  return { alive: rim.filter(j => M.T[j].life).length, rim: rim.length, quick: M.QUICK_FLOOD };
}

console.log('SLACK ONE -- how long the settle needs to be for life to fill a rim unaided\n');
console.log('   settle ticks   rim alive (of 12), one seed');
for (const s of [0, 100, 200, 400, 600, 900])
  console.log('   ' + String(s).padStart(11) + '   ' + trial(1, s, 3, false).alive);

console.log('\nSLACK TWO -- and with the fast clock on, at a short settle\n');
console.log('   settle ticks   plain   with Quickening   hexes it took');
for (const s of [0, 60, 120, 200]) {
  const a = trial(1, s, 3, false), b = trial(1, s, 3, true);
  console.log('   ' + String(s).padStart(11) + String(a.alive).padStart(8) +
    String(b.alive).padStart(18) + String(b.quick).padStart(15));
}

console.log('\nSLACK THREE -- soil. The spec supplies it everywhere; if the rim is bare,');
console.log('               sediment has to be DELIVERED and Reed Trap has something to do.\n');
console.log('   courses of soil on the rim   rim alive after 600 ticks');
for (const soil of [0, 0.5, 1, 2, 3])
  console.log('   ' + String(soil).padStart(27) + '   ' + trial(1, 600, soil, false).alive);
