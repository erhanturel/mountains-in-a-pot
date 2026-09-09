/* HOLD THE SOIL, OR LET IT TRAVEL? -- the review's step 3, and the answer
   is that the choice does not exist yet.

   The question: should a player hold soil where it is, or let it move down
   to feed a target below? Rule 8 (a living hex sheds no soil) is the lever.

   THREE MEASUREMENTS ON THE WAY, each of which killed a version of it.

   1. Planting an upper BENCH starves nothing: the lower target gained x0.94
      after one Year and x1.18 after two. A wide ramp is not a bottleneck --
      the water simply routes around what is planted.

   2. So plant the CARRIERS, the hexes the sediment actually crosses. But of
      the busiest thirty, Grass finds 1 habitable and Reed 1 -- they read
      `bare` (the sediment is passing through, not settling) or `drowned`.
      Forcing grass onto all thirty leaves 5 alive after 800 ticks.
      MOSS finds 15, because it roots on bare rock and a carrier is scoured
      bare rock with water beside it. So the lever is reachable, through the
      Moss card, and only through it.

   3. And then this, which is the file below: three Moss seeds, one board,
      three placements. Every placement is DOMINATED by sowing nothing.

   Moss holds sediment where it lands, so it starves the target below: grass
   seats there go 10 -> 5 -> 3. What it buys is material kept in the pot,
   282.6 courses over the rim falling to 115.4. That is a real trade and it
   is not a decision, because nothing scores it: the pot's health counts
   exposed granite, not mass lost over the side.

   So step 3 is blocked on finding 7 of the review -- what "the pot's health"
   is supposed to mean. If it counted what leaves, moss on the outlet becomes
   a strategy the same afternoon. It is a design decision and it is the
   founder's, so nothing here is tuned until it is made.

   NOT a successful experiment. Recorded so the next attempt starts here. */
const fs=require('fs');
const core=fs.readFileSync('index.html','utf8').split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];
function world(){
  global.POT_R=9;
  const M=new Function(core+'return {T,at,tick,LAYER,SLAB,CELL,ZN,TOP,retop,raise,gnd,soil,'+
    'CLOUD,AIR,SHALE,within,habitable,habit,SEED,MOSS,drowned,addCloud,worthOf,'+
    'get LOST(){return LOST}, set WEATHER(v){WEATHER=v}};')();
  M.WEATHER=0.10/420;
  for(let i=0;i<M.T.length;i++){
    const t=M.T[i], up=Math.max(0,Math.round((-t.q+7)*0.9));
    if(up) M.raise(i,up*3,M.SHALE);
    t.sed=0; t.sand=0;
  }
  M.addCloud(M.at(-7,0),2);
  return M;
}
const R=9;
const isRim=(M,i)=>M.T[i].nb.some(j=>j<0);
const upper=M=>M.T.map((t,i)=>i).filter(i=>M.T[i].q<=-3);
const lowerT=M=>M.T.map((t,i)=>i).filter(i=>M.T[i].q>=3&&!isRim(M,i));
const courses=(M,l)=>l.reduce((a,i)=>a+M.soil(i),0)/M.LAYER;

function trial(where){
  const M=world();
  for(let n=0;n<1500;n++) M.tick();
  const carried=M.T.map((t,i)=>({i,g:0}));
  for(let n=0;n<400;n++){ M.tick(); for(let i=0;i<M.T.length;i++) carried[i].g+=M.T[i].grit; }
  carried.sort((a,b)=>b.g-a.g);
  let pool;
  if(where==='none')   pool=[];
  if(where==='outlet') pool=carried.filter(o=>isRim(M,o.i)).map(o=>o.i);
  if(where==='high')   pool=carried.filter(o=>M.T[o.i].q<=-2).map(o=>o.i);
  let sown=0;
  for(const i of pool){ if(sown>=3) break;
    if(!M.T[i].life && M.habitable(i,M.MOSS)){ M.T[i].life=M.MOSS; sown++; } }
  const u0=courses(M,upper(M)), l0=courses(M,lowerT(M)), lost0=M.LOST;
  for(let n=0;n<3840;n++) M.tick();
  const grassSeats=lowerT(M).filter(i=>M.habitable(i,M.SEED)).length;
  return { sown, up:courses(M,upper(M))-u0, low:courses(M,lowerT(M))-l0,
    rim:(M.LOST-lost0)/M.LAYER, seats:grassSeats, n:lowerT(M).length,
    moss:M.T.filter(t=>t.life===M.MOSS).length };
}
console.log('THREE MOSS SEEDS, ONE BOARD, THREE PLACES  (two Years after sowing)\n');
console.log('  where the moss went |  sown  moss grew to |  kept high   fed the low   left the pot   grass seats below');
for(const [w,lbl] of [['none','nowhere'],['high','the high carriers'],['outlet','the outlet']]){
  const r=trial(w);
  console.log('  '+lbl.padEnd(20)+'|'+String(r.sown).padStart(6)+String(r.moss).padStart(14)+'  |'+
    r.up.toFixed(1).padStart(11)+r.low.toFixed(1).padStart(15)+r.rim.toFixed(1).padStart(15)+
    String(r.seats+'/'+r.n).padStart(19));
}
