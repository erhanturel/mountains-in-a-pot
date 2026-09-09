/* THE STORE-VIDEO MOMENT, TESTED BEFORE ANYTHING IS BUILT ON IT.

   The founder's commercial read: the purchase reason is not "meet different
   creatures' needs" -- games already do that -- but that the player changes
   the TERRAIN and thereby makes the relationship happen. The clip a stranger
   has to understand in six seconds:

     a passage is opened -> the waters join -> life reaches a shore it could
     not reach -> and what rose somewhere threatens something else.

   Every clause has to be true in the five rules as they stand, from ONE cut.

   THREE SETUPS FAILED FIRST, and the reason is the same each time and is
   itself the thing being proved -- on this board only the SHAPE of the land
   routes water:

     1  the cloud sat on the plateau, so the rain sheeted across and filled
        both basins before the cut. Nothing the player did caused anything.
     2  rain falling INSIDE the west basin still spread over the flat top and
        filled the east. Rule 4 levels with every lower neighbour, so a flat
        plateau is not a divide -- it needs relief.
     3  with a ridge in place, the notch was cut at (0,0) while the west
        basin sat at q=-4..-2, with plateau in between. The notch opened onto
        ground the lake could never reach. Third time this project has
        authored a lead that was not connected. */
const fs = require('fs');
const core = fs.readFileSync('index.html', 'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];

function world() {
  global.POT_R = 9;
  const M = new Function(core + 'return {T,at,tick,LAYER,SLAB,CELL,ZN,TOP,retop,raise,gnd,' +
    'CLOUD,AIR,ROCK,habitable,SEED,drowned,addCloud,delCloud,CLOUD_MAX,' +
    'set WEATHER(v){WEATHER=v}};')();
  M.WEATHER = 0;                       /* the moment is about water, not wear */
  for (let i = 0; i < M.T.length; i++) { M.raise(i, 8 * M.SLAB, M.ROCK); M.T[i].sed = 3 * M.LAYER; }
  return M;
}
const cut = (M, q, r, n) => { const i = M.at(q, r); if (i < 0) return -1;
  for (let k = 0; k < n; k++) { const z = M.TOP[i]; if (z < 0) break;
    M.CELL[i * M.ZN + z] = M.AIR; M.retop(i); }
  return i; };
const ringOf = (M, cells) => { const inside = new Set(cells); const out = [];
  for (const i of inside) for (const j of M.T[i].nb)
    if (j >= 0 && !inside.has(j) && out.indexOf(j) < 0) out.push(j);
  return out; };

/* the basins TOUCH the ridge, so the notch is between them and nothing else */
const WEST = [[-1, 0], [-1, 1], [-2, 0], [-2, 1], [-3, 1], [-3, 0]];
const EAST = [[2, 0], [2, -1], [3, 0], [3, -1], [4, 0], [4, -1]];
const NOTCH = [[0, 0], [1, 0]];

function moment(rain, label) {
  const M = world();
  for (const t of M.T) if (t.q === 0 || t.q === 1)      /* the divide */
    M.raise(M.T.indexOf(t), 3 * M.SLAB, M.ROCK);
  const west = WEST.map(([q, r]) => cut(M, q, r, 15)).filter(i => i >= 0);
  const east = EAST.map(([q, r]) => cut(M, q, r, 15)).filter(i => i >= 0);
  const rimW = ringOf(M, west), rimE = ringOf(M, east);

  for (const i of west) M.addCloud(i, 2);
  for (let n = 0; n < rain; n++) M.tick();
  for (let i = 0; i < M.T.length; i++) M.delCloud(i, M.CLOUD_MAX);
  for (let n = 0; n < 300; n++) M.tick();
  for (const i of rimW.concat(rimE)) if (M.habitable(i, M.SEED)) M.T[i].life = M.SEED;
  for (let n = 0; n < 300; n++) M.tick();

  const wet = l => l.filter(i => M.drowned(i)).length;
  const live = l => l.filter(i => M.T[i].life).length;
  const row = t => console.log('  ' + t.padEnd(22) +
    String(live(rimW) + '/' + rimW.length).padStart(11) +
    String(live(rimE) + '/' + rimE.length).padStart(11) +
    String(wet(west) + '/' + west.length).padStart(12) +
    String(wet(east) + '/' + east.length).padStart(12));

  console.log('  ' + label);
  row('  before the cut');
  const w0 = live(rimW);
  const crest = M.T[M.at(0, 0)].h, surf = Math.max(...west.map(i => M.gnd(i)));
  for (const [q, r] of NOTCH) cut(M, q, r, Math.ceil((crest - surf) * 6) + 2);
  for (const [n, lbl] of [[200, '  200 ticks after'], [400, '  600 ticks after'],
                          [600, '  1200 ticks after']]) {
    for (let k = 0; k < n; k++) M.tick(); row(lbl);
  }
  console.log('  ' + '  the trade'.padEnd(22) +
    ('east +' + (live(rimE) - 0)).padStart(11) + ('west ' + (live(rimW) - w0)).padStart(11));
  console.log('');
}

console.log('ONE CUT THROUGH A RIDGE. The rain stops before the cut, so the');
console.log('water in the pot is all the water there is.\n');
console.log('  moment                  west rim   east rim   west water   east water');
moment(420, 'PLENTY -- 420 ticks of rain');
moment(200, 'ENOUGH FOR ONE -- 200 ticks');
moment(120, 'SCARCE -- 120 ticks');

/* WHAT THIS SHOWS, AND WHAT IT DOES NOT.

   THE POWER IS REAL AND IT IS THE CLIP. One cut through a ridge turns twelve
   dead-dry hexes into living shore, and ten of the eleven arrive inside 200
   ticks -- about 25 seconds at 1x. A stranger watching that understands what
   the verb does without a word of tutorial. That is the six seconds the
   store page needs and it exists today.

   THE COST DOES NOT EXIST. Measured at three water budgets -- 420, 200 and
   120 ticks of rain, with the rain OFF before the cut so the pot holds all
   the water it will ever have -- the outcome is identical every time:

     east +11 shore hexes,  west -1

   The west barely notices. A cloud outproduces what a basin can hold by so
   much that the pot is never short, so opening the passage costs nothing and
   there is no decision -- only a good move. Reducing the rain does not fix
   it at this scale: 120 ticks still fills both.

   So the demo's problem is now a number rather than a system: how much water
   a Year against how much the pot can hold. Until a cut has to TAKE water
   from somewhere, the founder's second clause -- and what rose somewhere
   threatens something else -- is not in the build, and no amount of new
   mechanics will put it there. */
