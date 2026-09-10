/* GOLDEN FIXTURES FOR A PORT.

   The simulation is 671 lines. Rewriting it is a week; rewriting it and not
   knowing it is subtly wrong is the whole history of this project -- handing
   over the whole contents, levelling with only the highest lower neighbour,
   a season phase a quarter out, a camera behind its own far plane. None of
   those was visible by reading. All of them were visible by measuring.

   So this file emits an ORACLE. Each fixture is a board built from
   DECLARATIVE ops -- no JavaScript to port, just a list a C# reader can
   replay -- a number of ticks, and what the state must then be. A port is
   correct when it reproduces every hash.

   THE HASH IS QUANTISED. Values are rounded to six decimals before hashing,
   the same rounding the save format already uses, so IEEE-754 double
   arithmetic that agrees to a part in a million agrees on the hash. Anything
   that disagrees earlier than that is a real difference and should fail.

   Run:  node test/fixtures.js          prints a summary
         node test/fixtures.js --write  writes design/unity/fixtures.json  */
const fs = require('fs'), path = require('path');
const core = fs.readFileSync('index.html', 'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];

const EXPORTS = 'T,at,tick,settle,LAYER,SLAB,CELL,ZN,TOP,Z0,retop,setTop,raise,lower,' +
  'gnd,soil,addCloud,delCloud,clouds,CLOUD,CLOUD_Z,CLOUD_MAX,AIR,ROCK,BEDROCK,GRANITE,' +
  'SHALE,LIMESTONE,SEED,MOSS,REED,RAINFALL,DIRS,within,habitable,drowned,biome,' +
  'genPot,markPot,windDir,tempNow,seasonSwing,seasonPhase,seasonRain,SEASON_LEN,' +
  'stratum,zBot,' +
  'get TICKS(){return TICKS}, set TICKS(v){TICKS=v},' +
  'set WEATHER(v){WEATHER=v}, set THRESH(v){THRESH=v}, set CAP(v){CAP=v},' +
  'set ABRADE(v){ABRADE=v}, set LIFE_EVERY(v){LIFE_EVERY=v},' +
  'set DRIFT(v){DRIFT=v}, get DRIFT(){return DRIFT}, SHED, FREEZE, MELT, YEAR_LEN';

function world(radius) {
  global.POT_R = radius;
  return new Function(core + 'return {' + EXPORTS + '};')();
}

/* ---- the declarative op set a port has to implement ---------------- */
function applyOps(M, ops) {
  for (const o of ops) {
    switch (o.op) {
      case 'knob': M[o.name] = o.value; break;
      case 'ticks0': M.TICKS = o.value; break;
      case 'genPot': M.genPot(o.seed); M.markPot(); break;
      case 'flat':                    /* every column: strata full depth, cut to h */
        for (let i = 0; i < M.T.length; i++) {
          const b = i * M.ZN;
          for (let z = 0; z < M.ZN; z++) M.CELL[b + z] = M.stratum(M.zBot(z));
          M.setTop(i, o.h);
          const t = M.T[i];
          t.pool = 0; t.flow = 0; t.sed = 0; t.sand = 0;
          t.wear = 0; t.grit = 0; t.life = 0; t.snow = 0;
          for (let k = 0; k < 6; k++) t.out[k] = 0;
        }
        break;
      case 'setTop': M.setTop(M.at(o.q, o.r), o.h); break;
      case 'raise':  M.raise(M.at(o.q, o.r), o.n, M[o.mat || 'ROCK']); break;
      case 'lower':  M.lower(M.at(o.q, o.r), o.n); break;
      case 'pool':   M.T[M.at(o.q, o.r)].pool = o.courses * M.LAYER; break;
      case 'sed':    M.T[M.at(o.q, o.r)].sed  = o.courses * M.LAYER; break;
      case 'snow':   M.T[M.at(o.q, o.r)].snow = o.courses * M.LAYER; break;
      case 'life':   M.T[M.at(o.q, o.r)].life = M[o.kind]; break;
      case 'cloud':  M.addCloud(M.at(o.q, o.r), o.n); break;
      default: throw new Error('unknown op ' + o.op);
    }
  }
}

/* ---- the hash: FNV-1a over values rounded to six decimals ---------- */
const q6 = v => Math.round(v * 1e6) / 1e6;
function hashState(M) {
  let h = 0x811c9dc5;
  const push = s => { for (let k = 0; k < s.length; k++) {
    h ^= s.charCodeAt(k); h = Math.imul(h, 0x01000193) >>> 0; } };
  for (let i = 0; i < M.T.length; i++) {
    const t = M.T[i];
    push(M.TOP[i] + ',' + (M.TOP[i] >= 0 ? M.CELL[i * M.ZN + M.TOP[i]] : 0) + ',');
    push(q6(t.pool) + ',' + q6(t.sed) + ',' + q6(t.sand) + ',' + q6(t.snow) + ',');
    push(q6(t.wear) + ',' + q6(t.grit) + ',' + (t.life | 0) + ',');
    for (let k = 0; k < 6; k++) push(q6(t.out[k]) + ',');
  }
  return ('00000000' + h.toString(16)).slice(-8);
}
function readings(M) {
  const sum = f => M.T.reduce((a, t) => a + f(t), 0);
  return {
    water:  q6(sum(t => t.pool) / M.LAYER),
    snow:   q6(sum(t => t.snow) / M.LAYER),
    slag:   q6(sum(t => t.sed) / M.LAYER),
    sand:   q6(sum(t => t.sand) / M.LAYER),
    ground: q6(sum(t => t.h)),
    alive:  M.T.filter(t => t.life).length,
    wet:    M.T.filter((t, i) => M.drowned(i)).length,
    clouds: M.T.reduce((a, t, i) => a + M.clouds(i), 0),
    maxPool: q6(Math.max(0, ...M.T.map(t => t.pool)) / M.LAYER),
    /* the climate is DERIVED, so it never reaches the hash -- but a port
       that gets the phase wrong has to fail somewhere, and this is it */
    swing:  q6(M.seasonSwing()),
    phase:  q6(M.seasonPhase()),
    rain:   q6(M.seasonRain()),
    wind:   M.windDir(),
    tempAtOrigin: q6(M.tempNow(M.at(0, 0))),
  };
}

/* ================= THE FIXTURES ==================================== */
const FIX = [];
const fix = (name, why, radius, ops, steps) => FIX.push({ name, why, radius, ops, steps });

/* --- rule 4, the cases CLAUDE.md already records ------------------- */
fix('basin-one-hex',
  'Rule 4 as recorded: 70 units a tick into a one-hex basin at -1, 420 at the rim by ' +
  'tick 6, and on the 7th the surplus is shared seven ways.',
  6, [{op:'knob',name:'DRIFT',value:0}, {op:'knob',name:'WEATHER',value:0}, {op:'flat',h:0},
      {op:'setTop',q:0,r:0,h:-1}, {op:'cloud',q:0,r:0,n:1}],
  [{ticks:6}, {ticks:1}, {ticks:60}]);

fix('cliff-shed',
  'A tile with seven courses, two neighbours two steps down: all of it goes into the ' +
  'deep ones. Levelling with only the highest lower neighbour gives a different answer ' +
  'and is the classic wrong implementation.',
  6, [{op:'knob',name:'DRIFT',value:0}, {op:'knob',name:'WEATHER',value:0}, {op:'flat',h:0},
      {op:'setTop',q:1,r:0,h:-2}, {op:'setTop',q:0,r:1,h:-2},
      {op:'pool',q:0,r:0,courses:7}],
  [{ticks:1}, {ticks:20}]);

fix('flat-symmetry',
  'One rain tile on a flat board. The distinct depths per ring must come out ' +
  '1,1,2,2,3,3,4 -- exactly the symmetry orbits of each ring. An in-place update ' +
  'instead of a snapshot breaks this and nothing else shows it.',
  6, [{op:'knob',name:'DRIFT',value:0}, {op:'knob',name:'WEATHER',value:0}, {op:'flat',h:0}, {op:'cloud',q:0,r:0,n:1}],
  [{ticks:40}]);

fix('conservation-void',
  'Water is created only by clouds and lost only over the edge. Nothing in a tick may ' +
  'invent any.',
  6, [{op:'knob',name:'DRIFT',value:0}, {op:'knob',name:'WEATHER',value:0}, {op:'flat',h:0},
      {op:'cloud',q:-2,r:1,n:2}, {op:'cloud',q:3,r:-1,n:1}],
  [{ticks:120}, {ticks:400}]);

/* --- weathering and transport -------------------------------------- */
fix('bedrock-never',
  'Bedrock does not weather at any rate. That is the whole of what makes it bedrock, ' +
  'and a port that treats it as ordinary rock loses the floor of the world.',
  6, [{op:'knob',name:'DRIFT',value:0}, {op:'knob',name:'WEATHER',value:0.7/420}, {op:'flat',h:-8},
      {op:'cloud',q:0,r:0,n:2}],
  [{ticks:2000}]);

fix('shield-self-limits',
  'Weathering divides by (1 + sed/SHIELD), so a peak with nothing to carry its debris ' +
  'away acquires a coat and stops. Weathering alone can never lower a mountain.',
  6, [{op:'knob',name:'DRIFT',value:0}, {op:'knob',name:'WEATHER',value:0.7/420}, {op:'knob',name:'THRESH',value:99},
      {op:'flat',h:2}],
  [{ticks:1000}, {ticks:9000}]);

fix('transport-conserves',
  'Rock lost equals slag on the board plus sand plus what went over the edge, and ' +
  'never goes negative.',
  6, [{op:'knob',name:'DRIFT',value:0}, {op:'knob',name:'WEATHER',value:0.7/420}, {op:'flat',h:1},
      {op:'setTop',q:0,r:0,h:4}, {op:'cloud',q:0,r:0,n:3}],
  [{ticks:500}, {ticks:4000}]);

/* --- life ----------------------------------------------------------- */
fix('life-binds',
  'Rule 8: a living hex sheds no soil and weathers no rock. Bare, the slag is carried ' +
  'off; green, most of it stays.',
  6, [{op:'knob',name:'DRIFT',value:0}, {op:'knob',name:'WEATHER',value:0.7/420}, {op:'flat',h:1},
      {op:'setTop',q:0,r:0,h:2}, {op:'sed',q:0,r:0,courses:3},
      {op:'life',q:0,r:0,kind:'MOSS'}, {op:'cloud',q:0,r:0,n:1}],
  [{ticks:200}]);

fix('life-clock',
  'Life steps once every LIFE_EVERY ticks, one hex, and only onto ground habitable at ' +
  'that moment. It is not a per-tick flood fill.',
  6, [{op:'knob',name:'DRIFT',value:0}, {op:'knob',name:'WEATHER',value:0}, {op:'flat',h:0},
      {op:'setTop',q:0,r:0,h:-2}, {op:'setTop',q:1,r:0,h:-2}, {op:'setTop',q:0,r:1,h:-2},
      {op:'pool',q:0,r:0,courses:8}, {op:'pool',q:1,r:0,courses:8}, {op:'pool',q:0,r:1,courses:8},
      {op:'sed',q:-1,r:0,courses:3}, {op:'sed',q:-1,r:1,courses:3}, {op:'sed',q:0,r:-1,courses:3},
      {op:'sed',q:1,r:-1,courses:3}, {op:'sed',q:2,r:0,courses:3}, {op:'sed',q:2,r:-1,courses:3},
      {op:'life',q:-1,r:0,kind:'SEED'}],
  [{ticks:40}, {ticks:200}, {ticks:600}]);

/* --- climate: C1 to C5 ---------------------------------------------- */
fix('season-phase',
  'The swing peaks in the MIDDLE of a Season, not on its edge. Sampled at midspring, ' +
  'midsummer, midautumn and midwinter it must read 0, +1, 0, -1. Getting this a ' +
  'quarter out stays invisible until something downstream reads two Seasons the same.',
  6, [{op:'knob',name:'DRIFT',value:0}, {op:'knob',name:'WEATHER',value:0}, {op:'flat',h:0}, {op:'ticks0',value:240}],
  [{ticks:0}, {ticks:480}, {ticks:480}, {ticks:480}]);

fix('wind-drift-and-shed',
  'A cloud crosses one hex every DRIFT ticks along the Year’s heading, and climbing ' +
  'spends floor(lift x SHED) of its tiles. A six-tile cloud crosses four elevations ' +
  'and arrives with nothing.',
  8, [{op:'knob',name:'WEATHER',value:0}, {op:'flat',h:0},
      {op:'setTop',q:0,r:0,h:4}, {op:'setTop',q:1,r:0,h:4},
      {op:'cloud',q:-6,r:0,n:6}],
  [{ticks:120}, {ticks:360}, {ticks:480}]);

fix('snow-and-melt',
  'Water arriving below freezing is held as snow, does not flow, and melts back above ' +
  'zero at MELT a tick. Only ARRIVING water freezes: a pool already standing keeps ' +
  'flowing however cold it is.',
  6, [{op:'knob',name:'DRIFT',value:0}, {op:'knob',name:'WEATHER',value:0}, {op:'flat',h:0},
      {op:'setTop',q:0,r:0,h:5}, {op:'snow',q:0,r:0,courses:20},
      {op:'ticks0',value:1680}],
  [{ticks:0}, {ticks:240}, {ticks:960}]);

/* --- the generator: same seed, same pot ------------------------------ */
for (const seed of [42, 7, 1337]) {
  fix('genpot-' + seed,
    'The pot is a pure function of the seed. Height is hashed from a hex’s own axial ' +
    'coordinates, never drawn from a stream, so it cannot depend on the order hexes are ' +
    'visited. Then the shipping erosion engine cuts the valleys and TICKS is set to zero.',
    12, [{op:'genPot',seed:seed}], [{ticks:0}, {ticks:480}]);
}

/* --- one long mixed run, which catches anything the others miss ----- */
fix('long-mixed-run',
  'Everything at once for a Year: generated terrain, drifting clouds, orographic ' +
  'shedding, weathering, transport, life, snow and the seasonal drought. If a port ' +
  'matches every other fixture and not this one, the fault is in how the parts are ' +
  'ORDERED inside a tick.',
  12, [{op:'genPot',seed:42}, {op:'knob',name:'WEATHER',value:0.10/420},
       {op:'cloud',q:-6,r:0,n:4}, {op:'cloud',q:2,r:-3,n:3},
       {op:'life',q:0,r:0,kind:'MOSS'}],
  [{ticks:480}, {ticks:960}, {ticks:1920}]);

/* ================= RUN THEM ======================================== */
const out = { format: 1,
  note: 'golden fixtures for a port; see design/UNITY-PORT.md',
  constants: null, fixtures: [] };
{
  const M = world(6);
  out.constants = {
    LAYER: M.LAYER, SLAB: M.SLAB, ZN: M.ZN, Z0: M.Z0, CLOUD_Z: M.CLOUD_Z,
    CLOUD_MAX: M.CLOUD_MAX, RAINFALL: M.RAINFALL, SEASON_LEN: M.SEASON_LEN,
    DIRS: M.DIRS,
    materials: { AIR: M.AIR, BEDROCK: M.BEDROCK, ROCK: M.ROCK, GRANITE: M.GRANITE,
                 SHALE: M.SHALE, LIMESTONE: M.LIMESTONE, CLOUD: M.CLOUD },
    life: { SEED: M.SEED, MOSS: M.MOSS, REED: M.REED },
  };
}
let n = 0;
for (const f of FIX) {
  const M = world(f.radius);
  applyOps(M, f.ops);
  const steps = [];
  for (const st of f.steps) {
    for (let k = 0; k < st.ticks; k++) M.tick();
    steps.push({ ticks: st.ticks, hash: hashState(M), readings: readings(M) });
    n++;
  }
  out.fixtures.push({ name: f.name, why: f.why, radius: f.radius, ops: f.ops, steps: steps });
}

if (process.argv.includes('--write')) {
  const p = path.join('design', 'unity', 'fixtures.json');
  fs.writeFileSync(p, JSON.stringify(out, null, 1));
  console.log('wrote ' + p + '  (' + FIX.length + ' fixtures, ' + n + ' checkpoints)');
} else {
  console.log('GOLDEN FIXTURES  (' + FIX.length + ' fixtures, ' + n + ' checkpoints)\n');
  for (const f of out.fixtures) {
    console.log('  ' + f.name.padEnd(22) + 'r=' + String(f.radius).padEnd(4) +
      f.steps.map(s => s.hash).join(' '));
  }
  console.log('\n  node test/fixtures.js --write   to emit design/unity/fixtures.json');
}
