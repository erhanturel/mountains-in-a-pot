/* THE THREE UPGRADES, one at a time, each against its own control.

   The requirement is that an upgrade changes a DECISION, not a number. So
   each test is built as the decision it is supposed to change: scatter vs
   clump, hold vs drain, smooth vs stepped. If the upgrade is doing its job,
   the arrangement it favours wins and the other does not. */
const fs = require('fs');
const core = fs.readFileSync('index.html', 'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];

const world = R => { global.POT_R = R; return new Function(core +
  'return {T,at,tick,use,LAYER,SLAB,CLOUD,AIR,CELL,ZN,TOP,retop,raise,ROCK,SHALE,' +
  'gnd,soil,alive,habitable,habit,drowned,within,clumped,draining,underFall,SEED,MOSS,' +
  'set WEATHER(v){WEATHER=v}, set UP_ROOTS(v){UP_ROOTS=v}, set UP_FLOOD(v){UP_FLOOD=v},' +
  'set UP_CASCADE(v){UP_CASCADE=v}, get QUICK_FLOOD(){return QUICK_FLOOD},' +
  'set QUICK_FLOOD(v){QUICK_FLOOD=v}, get QUICK_CASCADE(){return QUICK_CASCADE},' +
  'set QUICK_CASCADE(v){QUICK_CASCADE=v}, LIFE_EVERY:LIFE_EVERY};')(); };

const dig = (M, i, n) => { for (let k = 0; k < n; k++) {
  const t = M.TOP[i]; if (t < 0) break; M.CELL[i * M.ZN + t] = M.AIR; M.retop(i); } };

/* ---------- 1. ROOT NETWORK: clump or scatter? -------------------------- */
function rootTest(on, clump) {
  const M = world(8); M.WEATHER = 0; M.UP_ROOTS = on;
  const c = M.at(0, 0);
  /* a shallow pan with soil in it */
  for (const j of M.within(c, 3)) { dig(M, j, 3); M.T[j].sed = 2 * M.LAYER; }
  /* plant seven hexes: together, or spread out */
  const spots = clump ? M.within(c, 1)
                      : [[0,0],[3,0],[0,3],[-3,0],[0,-3],[3,-3],[-3,3]].map(a => M.at(a[0], a[1]));
  for (let n = 0; n < 20; n++) M.tick();          /* let it damp down */
  for (const j of spots) if (j >= 0) M.T[j].life = M.SEED;
  const planted = M.alive();
  /* now flood it one tile deep and hold it there */
  for (let n = 0; n < 300; n++) {
    for (const j of M.within(c, 3)) M.T[j].pool = Math.max(M.T[j].pool, 1.2 * M.LAYER);
    M.tick();
  }
  return { planted, survived: M.alive() };
}

console.log('1. ROOT NETWORK  --  does it make clumping the right move?\n');
console.log('              scattered        clumped');
console.log('            planted survived  planted survived');
for (const on of [false, true]) {
  const s = rootTest(on, false), c = rootTest(on, true);
  console.log('  ' + (on ? 'with  ' : 'without') +
    String(s.planted).padStart(8) + String(s.survived).padStart(9) +
    String(c.planted).padStart(9) + String(c.survived).padStart(9));
}

/* ---------- 2. FERTILE FLOOD: hold the water or drain it? --------------- */
function floodTest(on, drain, roots, bowl) {
  const M = world(8); M.WEATHER = 0; M.UP_FLOOD = on; M.QUICK_FLOOD = 0;
  M.UP_ROOTS = !!roots;
  const c = M.at(0, 0);
  /* A BOWL, NOT A PAN, and this turns out to be the whole point. A
     flat-bottomed pan either stays full or empties: there is never a ring. A
     bowl drains to a lake in the middle and lays bare a ring around it that
     is still in reach of the water -- which is exactly the ground Fertile
     Flood is looking for. */
  for (let ring = 3; ring >= 0; ring--)
    for (const j of M.within(c, ring)) {
      dig(M, j, bowl ? 4 : 12);
      M.T[j].sed = 2 * M.LAYER;
    }
  for (let n = 0; n < 20; n++) M.tick();
  for (const j of M.within(c, 2)) M.T[j].life = M.SEED;     /* a planted basin */
  const planted = M.alive();
  /* FILL IT TO A LEVEL, not to a depth. Setting the same depth on every hex
     is not a flood -- it is a film that runs straight to the bottom. A flood
     is a water SURFACE, so each hex takes however much brings it up to the
     line, and the deep middle takes more than the shallow rim. The line here
     is one layer over the rim of the bowl, which clumped roots can stand in
     and lone ones cannot. */
  const level = M.gnd(M.at(3, 0)) + 1.0 * M.LAYER;
  for (let n = 0; n < 150; n++) {
    for (const j of M.within(c, 3))
      M.T[j].pool = Math.max(M.T[j].pool, Math.max(0, level - M.T[j].h - M.T[j].sed - M.T[j].sand));
    M.tick();
  }
  /* HOW DEEP YOU CUT THE OUTLET is the decision. To the floor and the basin
     empties, the ground stops being damp, and everything on it dies. Shallow
     and the water falls to a lake, leaving a ring draining but still in
     reach. */
  if (drain) {
    const deep = drain === 'deep' ? 20 : 6;
    for (let q = 4; q <= 8; q++) { const j = M.at(q, 0); if (j >= 0) dig(M, j, deep); }
  }
  for (let n = 0; n < 500; n++) M.tick();
  let lake = 0; for (let i = 0; i < M.T.length; i++) if (M.drowned(i)) lake++;
  return { planted, alive: M.alive(), byFlood: M.QUICK_FLOOD, lake };
}

console.log('\n\n2. FERTILE FLOOD  --  does it make DRAINING the right move?\n');
console.log('   Root Network is on for the lower two rows. Without it the planting');
console.log('   drowns during the flood and there is nothing left to burst from --');
console.log('   which is the two upgrades needing each other.\n');
console.log('                       held under      drained to a     drained to');
console.log('                          water            lake            the floor');
console.log('                       alive  burst    alive  burst     alive  burst');
for (const roots of [false, true])
  for (const on of [false, true]) {
    const h = floodTest(on, false, roots, true),
          d = floodTest(on, 'shallow', roots, true),
          e = floodTest(on, 'deep', roots, true);
    console.log('  ' + ((roots ? 'roots, ' : 'no roots, ') + (on ? 'flood' : 'plain')).padEnd(20) +
      String(h.alive).padStart(6) + String(h.byFlood).padStart(7) +
      String(d.alive).padStart(9) + String(d.byFlood).padStart(7) +
      String(e.alive).padStart(9) + String(e.byFlood).padStart(7));
  }
{
  const bowl = floodTest(true, 'shallow', true, true);
  const pan  = floodTest(true, 'shallow', true, false);
  console.log('');
  console.log('  and the SHAPE OF THE HOLE, both upgrades on, drained to a lake:');
  console.log('    a bowl  ->  ' + String(bowl.alive).padStart(3) + ' alive, ' +
    String(bowl.byFlood).padStart(3) + ' burst, a lake of ' + bowl.lake);
  console.log('    a pan   ->  ' + String(pan.alive).padStart(3) + ' alive, ' +
    String(pan.byFlood).padStart(3) + ' burst, a lake of ' + pan.lake);
}

/* ---------- 3. CASCADE: smooth channel or steps? ------------------------ */
function cascadeTest(on, stepped) {
  const M = world(10); M.WEATHER = 0; M.UP_CASCADE = on; M.QUICK_CASCADE = 0;
  /* a slope west to east, as one smooth ramp or as four steps */
  for (let i = 0; i < M.T.length; i++) {
    const q = M.T[i].q;
    const h = stepped ? Math.max(0, Math.ceil((-q + 6) / 3)) * 3
                      : Math.max(0, Math.round((-q + 6) * 1.0));
    if (h > 0) M.raise(i, h * M.SLAB, M.ROCK);
  }
  for (let i = 0; i < M.T.length; i++) M.T[i].sed = 2 * M.LAYER;
  for (let k = 0; k < 8; k++) M.use(M.at(-8, 0), {k:'place'}, 0, 1, M.CLOUD);
  for (let n = 0; n < 200; n++) M.tick();
  /* one seed at the top of the run */
  const head = M.at(-7, 0); if (head >= 0) M.T[head].life = M.SEED;
  for (let n = 0; n < 600; n++) M.tick();
  let falls = 0;
  for (let i = 0; i < M.T.length; i++) if (M.underFall(i)) falls++;
  return { alive: M.alive(), falls, byFall: M.QUICK_CASCADE };
}

console.log('\n\n3. CASCADE  --  does it make a STEPPED river the right move?\n');
console.log('              smooth ramp            stepped');
console.log('            falls  alive  burst   falls  alive  burst');
for (const on of [false, true]) {
  const sm = cascadeTest(on, false), st = cascadeTest(on, true);
  console.log('  ' + (on ? 'with  ' : 'without') +
    String(sm.falls).padStart(6) + String(sm.alive).padStart(7) + String(sm.byFall).padStart(7) +
    String(st.falls).padStart(9) + String(st.alive).padStart(7) + String(st.byFall).padStart(7));
}
