/* the basin rules, run against the LIVE sim block out of the page */
const fs=require('fs'), path=require('path');
/* works whether this file sits at the repo root or in test/ */
const HTML=[ '../index.html', 'index.html',
             '../lab-uplift.html', 'lab-uplift.html' ]
  .map(f=>path.join(__dirname,f)).find(fs.existsSync);
if(!HTML){ console.error('cannot find index.html next to or above this file'); process.exit(1); }
const core=fs.readFileSync(HTML,'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];
const M=new Function(core+'return {T,at,flood,use,legal,basinAt,surf,WALL,R,NONE,WATER,LAVA,habit,patchAt,soils,RATE,fillFrom};')();
const {T,at,flood,use,basinAt}=M;
let fails=0;
const ok=(c,m)=>{ console.log((c?'  ok   ':'  FAIL')+'  '+m); if(!c)fails++; };
const UP={k:'uplift',d:1}, DN={k:'subduct',d:-1}, RN={k:'deluge',d:0};
const flat=()=>{ for(const t of T){t.h=0;t.src=0;t.vol=false;t.seed=false;} flood(); };
const W=(q,r)=>T[at(q,r)].liq===M.WATER, HH=(q,r)=>T[at(q,r)].h;
const nw=()=>T.filter(t=>t.liq===M.WATER).length;
const inland=at(0,0);

console.log('\n=== a fresh pot is dry, with soil already at its skirts ===');
{
  flat();
  const skirt=T.filter(t=>t.coast>0), mid=T.filter(t=>!t.coast);
  console.log('   '+skirt.length+' hexes against the wall, soil '+
    [...new Set(skirt.map(t=>+t.soil.toFixed(2)))].sort((a,b)=>a-b).join(' / ')+
    ';   '+mid.length+' inland, soil '+[...new Set(mid.map(t=>t.soil))].join('/'));
  ok(nw()===0,'no water anywhere');
  ok(T.every(t=>t.moist===0),'and no moisture either — the wall is rock, not sea');
  ok(skirt.every(t=>t.soil>0),'the wall has shed onto every hex it touches');
  ok(mid.every(t=>t.soil===0),'and nowhere else — the floor is still bare');
  ok(T.every(t=>t.rel===0),'a flat floor is sloped nowhere, not even against the wall');
}

console.log('\n=== THE WHOLE POT IS ONE BASIN: deluge undug ground and it fills ===');
{
  flat();
  const b=basinAt(inland);
  console.log('   preview on the undug floor: '+b.cells.length+' hexes to level '+b.level);
  ok(!!b && b.cells.length===T.length,'the preview rings the entire board');
  ok(b.level===M.WALL,'it would stand level with the wall');
  use(inland,RN);
  console.log('   after that one click -> '+nw()+'/'+T.length+' under water');
  ok(nw()===T.length,'and it does exactly what it said');
}

console.log('\n=== deluge fills a one-hex basin to the brim ===');
{
  flat();
  use(inland,DN);
  ok(!W(0,0),'digging alone does not fill it');
  use(inland,RN);
  console.log('   pit at h '+HH(0,0)+' -> water '+W(0,0)+', surface at '+T[inland].ls);
  ok(W(0,0),'one deluge fills it');
  ok(T[inland].ls===0,'and the surface sits level with the plain, at 0');
  ok(T[inland].nb.every(j=>T[j].liq===M.NONE),'nothing around it flooded');
}

console.log('\n=== deluge one hex of a 3-hex basin, the whole basin fills ===');
{
  flat();
  const cells=[at(0,0),at(1,0),at(0,1)];
  for(const i of cells) use(i,DN);
  use(cells[0],RN);
  console.log('   the three: '+cells.map(i=>T[i].liq===M.WATER?'water':'dry').join(', ')+
              '   total water '+nw());
  ok(cells.every(i=>T[i].liq===M.WATER),'all three are water from the one click');
  ok(nw()===3,'and only those three');
}

console.log('\n=== a deeper basin fills to its lowest rim, not to the top ===');
{
  flat();
  const c=at(0,0);
  use(c,DN); use(c,DN); use(c,DN);            /* floor at -3 */
  for(const j of T[c].nb) use(j,UP);          /* rim at +1 ... */
  use(T[c].nb[0],DN);                         /* ...except one notch back at 0 */
  use(c,RN);
  console.log('   floor '+HH(0,0)+', rim +1 with one notch at '+T[T[c].nb[0]].h+
              ' -> water surface '+T[c].ls);
  ok((T[c].liq===M.WATER),'it fills');
  ok(T[c].ls===0,'to the level of the lowest notch, not the highest wall');
}

console.log('\n=== dig beside a full basin and the water flows in ===');
{
  flat();
  const c=at(0,0), n1=T[c].nb[0];
  use(c,DN); use(c,RN);
  ok(W(0,0)&&!(T[n1].liq===M.WATER),'one full pit, one dry neighbour');
  use(n1,DN);                                  /* open the neighbour */
  console.log('   after subducting the neighbour: '+
    ((T[n1].liq===M.WATER)?'it filled':'it stayed dry')+',  total water '+nw());
  ok((T[n1].liq===M.WATER),'it fills — water is an endless source');
  ok((T[c].liq===M.WATER),'and the original did not drain to pay for it');
}

console.log('\n=== two pools that never touch are still ONE pool ===');
{
  /* A source can sit inside a basin filled from somewhere else without the
     two ever touching. Grouping bodies by which SOURCES touch missed that:
     both bodies wrote their own level over the shared hex and the last one
     won, leaving a hex holding water at a level its own neighbours did not
     share. It healed itself on the next click — once the pool had written
     src across all its cells the groups touched — so the board was quietly
     one click stale, and only the seed sweep at the bottom ever caught it. */
  flat();
  const A=at(0,0), MID=at(1,0), B=at(2,0);
  T[A].h=2; T[MID].h=2; T[B].h=0;
  for(const [q,r] of [[1,-1],[0,-1],[-1,0],[-1,1],[0,1],[2,-1],[1,1],[3,0],[3,-1],[2,1]])
    T[at(q,r)].h=3;
  flood();
  use(B,RN);                        /* the low hollow — a small basin of its own */
  ok(T[B].liq===M.WATER && T[MID].liq===M.NONE,'the low hollow fills on its own');
  use(A,RN);                        /* the higher pour, whose pool engulfs it */
  console.log('   A h'+T[A].h+' surface '+T[A].ls+'  |  middle h'+T[MID].h+
              ' surface '+T[MID].ls+'  |  B h'+T[B].h+' surface '+T[B].ls);
  ok([A,MID,B].every(i=>T[i].liq===M.WATER),'the bigger pour takes in all three');
  ok(T[A].ls===T[MID].ls && T[MID].ls===T[B].ls,'and all three stand at ONE surface');
}

console.log('\n=== fill a pit, lift it back, and the POT floods ===');
{
  /* The sharp edge of a walled pot, and worth a test of its own because it is
     not obvious. Water is an endless source, so lifting a full pit back to the
     floor does not remove the water — it moves the SOURCE onto the floor, and
     the floor's basin is the entire pot. Subduct-then-Uplift, the natural undo,
     drowns the board. Under the old sea this same gesture just dried the hex. */
  flat();
  const c=at(0,0);
  use(c,DN); use(c,RN);
  ok(W(0,0)&&nw()===1,'one pit, filled, and nothing else wet');
  use(c,UP);
  console.log('   lifted back to h '+HH(0,0)+' -> '+nw()+'/'+T.length+' under water');
  ok(nw()===T.length,'the source now stands on the floor, and the floor is one basin');
}

console.log('\n=== raise the floor to the brim and liquid spills over the wall ===');
{
  flat();
  for(let pass=0;pass<M.WALL;pass++) for(let i=0;i<T.length;i++) use(i,UP);
  console.log('   floor raised to '+Math.min(...T.map(t=>t.h))+', level with the wall at '+M.WALL);
  ok(T.every(t=>t.h===M.WALL),'the whole floor now stands at the wall height');
  ok(basinAt(at(0,0))===null,'nothing is a basin any more — it runs over the rim');
  use(at(0,0),RN);
  console.log('   a deluge up there -> '+nw()+' water tiles');
  ok(nw()===0,'so it simply spills away, and nothing is remembered');
  ok(!T[at(0,0)].src,'no source is left behind');
}

console.log('\n=== the wall is rock, so it neither wets nor quenches ===');
{
  flat();
  const e=T.findIndex(t=>t.coast>0);
  use(e,DN);
  console.log('   a pit dug against the wall -> '+['dry','water','LAVA'][T[e].liq]);
  ok(T[e].liq===M.NONE,'it stays dry — nothing seeps in from outside');
  ok(T[e].moist===0,'and it reads no moisture from the wall beside it');
}

console.log('\n=== the preview tells the truth ===');
{
  flat();
  const cells=[at(0,0),at(1,0),at(0,1)];
  for(const i of cells) use(i,DN);
  const b=basinAt(cells[0]);
  const before=T.map(t=>t.liq===M.WATER);
  ok(b && cells.every(i=>b.cells.includes(i)),'it names all three as one basin');
  ok(T.every((t,i)=>(t.liq===M.WATER)===before[i]),'and it changed nothing on the board');
  use(cells[0],RN);
  ok(T.every((t,i)=>t.liq!==M.WATER||b.cells.includes(i)),'and the real click matches');
  /* There is no "not a basin" in a walled pot any more — undug floor is the
     pot's own basin, to the brim. NESTING is the entire reason the little
     hollow you dug still fills to the floor and stops there. */
  ok(b.level===0,'the hollow fills to the floor around it, not up to the wall');
  const whole=basinAt(at(5,-3));
  ok(!!whole && whole.level===M.WALL,'while undug floor reports the pot itself, brim-full');
}

const LV={k:'lava',d:0};

console.log('\n=== LAVA fills the same basin, and STAYS lava ===');
{
  flat();
  const cells=[at(0,0),at(1,0),at(0,1)];
  for(const i of cells) use(i,DN);
  use(cells[0],LV);
  console.log('   the three: '+cells.map(i=>['dry','water','LAVA'][T[i].liq]).join(', ')+
              ',  ground still at '+cells.map(i=>T[i].h).join(','));
  ok(cells.every(i=>T[i].liq===M.LAVA),'all three hold lava from the one click');
  ok(cells.every(i=>T[i].h===-1),'the ground underneath is untouched');
  ok(cells.every(i=>!T[i].vol),'and nothing has set into rock yet');
  for(let n=0;n<10;n++) use(at(5,-3),UP);
  ok(cells.every(i=>T[i].liq===M.LAVA),'ten clicks later it is still lava');
}

console.log('\n=== lava is an endless source too ===');
{
  const c=at(0,0), n1=T[c].nb.find(j=>T[j].liq===M.NONE);
  use(n1,DN);
  console.log('   dug a hex beside the lava -> '+['dry','water','LAVA'][T[n1].liq]);
  ok(T[n1].liq===M.LAVA,'it flows in, exactly as water would');
}

console.log('\n=== water and lava cannot share a basin: it ends as rock ===');
{
  /* Two adjacent basins always merge into one — a hex cannot be enclosed if
     something lower sits next to it. So lava only ever meets water inside its
     own basin, or at the sea. Both routes end the same way. */
  flat();
  const c=at(0,0);
  use(c,DN); use(c,LV);
  ok(T[c].liq===M.LAVA,'a lava pool');
  const n1=T[c].nb[0];
  use(n1,DN);
  ok(T[n1].liq===M.LAVA,'digging beside it just makes the pool bigger');
  use(n1,RN);                       /* now rain into it */
  console.log('   after raining into the pool: '+[c,n1].map(i=>
    'h'+T[i].h+' '+['dry','water','LAVA'][T[i].liq]+(T[i].vol?' volcanic':'')).join(' | '));
  ok([c,n1].every(i=>T[i].vol),'both hexes set into volcanic rock');
  ok([c,n1].every(i=>T[i].liq===M.NONE),'no lava and no water is left');
  ok([c,n1].every(i=>T[i].h===0),'the ground is level with the brim');
}

console.log('\n=== lava against the wall does NOT set ===');
{
  /* Removing the sea removed one of the two routes to basalt. Pouring lava
     into the sea used to make new land at the coast; there is no coast now,
     and raining into a lava pool is the only way left. */
  flat();
  const e=T.findIndex(t=>t.coast>0);
  use(e,DN); use(e,LV);
  console.log('   lava in a pit against the wall -> h '+T[e].h+
              ', volcanic='+T[e].vol+', '+['dry','water','LAVA'][T[e].liq]);
  ok(T[e].liq===M.LAVA,'it stays lava');
  ok(!T[e].vol,'the wall is rock, not water, so nothing quenches it');
}

console.log('\n=== deluge onto a lava pool sets it too ===');
{
  flat();
  const cells=[at(0,0),at(1,0)];
  for(const i of cells) use(i,DN);
  use(cells[0],LV);
  ok(cells.every(i=>T[i].liq===M.LAVA),'a two-hex lava pool');
  use(cells[1],RN);                 /* rain straight onto it */
  console.log('   after raining on it: '+cells.map(i=>
    'h'+T[i].h+(T[i].vol?' volcanic':'')).join(', '));
  ok(cells.every(i=>T[i].vol&&T[i].liq===M.NONE),'the whole pool set into rock');
}

console.log('\n=== temperature is a count, like moisture ===');
{
  flat();
  const c=at(0,0);
  use(c,DN); use(c,LV);
  const ring=T[c].nb.map(j=>T[j].temp);
  console.log('   ring around the lava reads: '+ring.join(' ')+
              ';  its own temp '+T[c].temp);
  ok(ring.every(v=>v===1),'each neighbour of one lava hex reads exactly 1');
  ok(T[c].temp===0,'the lava itself has no reading');
  ok(T[c].nb.every(j=>T[j].liq===M.NONE),'and heat never turns anything into lava');
}

console.log('\n=== lava on ground that is not a basin does nothing ===');
{
  flat();
  const before=T.map(t=>t.h).join();
  for(let n=0;n<5;n++) use(at(0,0),LV);
  ok(T.map(t=>t.h).join()===before,'five clicks on the flat change nothing');
}

console.log('\n=== lava fills to the LOWEST pass, like water would ===');
{
  flat();
  const c=at(0,0);
  use(c,DN); use(c,DN); use(c,DN);              /* floor at -3 */
  for(const j of T[c].nb) use(j,UP);            /* rim at +1 */
  use(T[c].nb[0],DN);                           /* one notch back to 0 */
  use(c,LV);
  console.log('   floor -3, rim +1, one notch at 0 -> lava surface '+T[c].ls);
  ok(T[c].liq===M.LAVA && T[c].ls===0,'it pools to the notch, not the high wall');
}

console.log('\n=== moisture is a count, and never becomes water ===');
{
  flat();
  const c=at(0,0);
  use(c,DN); use(c,RN);
  const ring=T[c].nb.map(j=>T[j].moist);
  console.log('   ring around the lake reads: '+ring.join(' '));
  ok(ring.every(v=>v===1),'each neighbour of one lake reads exactly 1');
  ok(T[c].moist===0,'the lake itself has no moisture reading');
  for(let n=0;n<30;n++) use(at(5,-3),n%2?UP:DN);
  ok(T[c].nb.every(j=>T[j].liq===M.NONE),'thirty clicks later the shore has still not waterlogged');
}

console.log('\n=== nothing runs away, and the board is a pure function ===');
{
  flat();
  let z=20260902;
  const rnd=()=>{z^=z<<13;z^=z>>>17;z^=z<<5;return((z>>>0)/4294967296)};
  for(let n=0;n<900;n++)
    use(Math.floor(rnd()*T.length),[UP,DN,RN][Math.floor(rnd()*3)]);
  console.log('   after 900 clicks: '+nw()+' water tiles');
  ok(T.every(t=>Math.abs(t.h)<=M.R*2),'heights stay sane');
  ok(T.every(t=>t.liq===M.NONE||t.ls>=t.h),'no liquid surface below its own bed');
  ok(T.every(t=>t.liq===M.NONE||t.nb.every(j=>j<0||T[j].liq!==t.liq||T[j].ls===t.ls)),
     'adjacent hexes holding the same liquid always share one surface');
  const snap=T.map(t=>t.liq+'/'+t.ls+'/'+t.h);
  for(let n=0;n<5;n++) flood();
  ok(T.map(t=>t.liq+'/'+t.ls+'/'+t.h).join()===snap.join(),
     'flooding again from the same ground gives the same answer');
}

/* ================= SOIL ================= */
const SD={k:'seed',d:0};
const soil=(q,r)=>T[at(q,r)].soil;

console.log('\n=== a fresh pot has soil only at its skirts ===');
{
  flat();
  console.log('   hexes with any soil: '+T.filter(t=>t.soil>0).length+' of '+T.length);
  ok(T.filter(t=>!t.coast).every(t=>t.soil===0),
     'the floor makes none of its own until you give it some relief');
  ok(T.filter(t=>t.coast>0).every(t=>t.soil>0),
     'but the wall has already fed its skirts — that is the starting condition');
}

console.log('\n=== soil gathers at the FOOT of high ground, not on it ===');
{
  flat();
  const peak=at(0,0);
  for(let n=0;n<4;n++) use(peak,UP);
  const foot=T[peak].nb.map(j=>T[j].soil);
  console.log('   a peak of '+T[peak].h+': its own soil '+T[peak].soil.toFixed(2)+
              ', the ring below it '+foot.map(v=>v.toFixed(2)).join(', '));
  ok(T[peak].soil===0,'the peak itself stays bare rock');
  ok(foot.some(v=>v>0),'and soil appears around its foot');
}

console.log('\n=== a taller mountain makes more of it ===');
{
  const seq=[];
  for(const H of [1,2,4,7]){
    flat();
    const c=at(0,0);
    for(let n=0;n<H;n++) use(c,UP);
    seq.push(H+':'+T[c].nb.reduce((a,j)=>a+T[j].soil,0).toFixed(1));
  }
  console.log('   height:soil around it   '+seq.join('   '));
  const v=seq.map(x=>+x.split(':')[1]);
  ok(v[3]>v[0],'more relief, more soil');
}

console.log('\n=== volcanic rock sheds double ===');
{
  flat();
  const a=at(-2,0), b=at(2,0);
  for(let n=0;n<3;n++){ use(a,UP); use(b,UP); }
  T[b].vol=true; flood();
  const sa=T[a].nb.reduce((x,j)=>x+T[j].soil,0);
  const sb=T[b].nb.reduce((x,j)=>x+T[j].soil,0);
  console.log('   plain peak sheds '+sa.toFixed(2)+
              ', the same peak in basalt sheds '+sb.toFixed(2));
  ok(sb>sa,'basalt weathers richer');
}

console.log('\n=== soil is a pure function of the shape ===');
{
  flat();
  let z=5; const rnd=()=>{z^=z<<13;z^=z>>>17;z^=z<<5;return((z>>>0)/4294967296)};
  for(let n=0;n<300;n++) use(Math.floor(rnd()*T.length),[UP,DN,RN,LV][Math.floor(rnd()*4)]);
  const snap=T.map(t=>t.soil).join();
  for(let n=0;n<4;n++) flood();
  ok(T.map(t=>t.soil).join()===snap,'recomputing gives the same soil every time');
  ok(T.every(t=>t.soil>=0&&t.soil<=5),'and it always sits in 0-5');
}

/* ================= LIFE ================= */
console.log('\n=== nothing will grow in a bare pot ===');
{
  flat();
  ok(T.every(t=>!M.habit(t)),'no hex is habitable — the skirts have soil but no water');
  ok(!use(at(0,0),SD),'and a seed simply does not take');
}

/* The standing recipe for somewhere to live, now that there is no sea to
   supply moisture for free: a tall peak for soil, and a hollow dug and filled
   below it for water. The peak has to be TALL — 9 — because soil is the scarce
   half of the pair once the coast stops weathering. */
const LIFE=()=>{
  flat();
  const peak=at(1,-2);
  for(let n=0;n<9;n++) use(peak,UP);
  use(at(0,0),DN); use(at(1,0),DN); use(at(0,0),RN);
  return peak;
};

console.log('\n=== a mountain AND a lake make somewhere to live ===');
{
  flat();
  const peak=at(1,-2);
  for(let n=0;n<9;n++) use(peak,UP);
  ok(T.every(t=>!M.habit(t)),'a mountain on its own is not enough — the pot is dry');
  use(at(0,0),DN); use(at(1,0),DN); use(at(0,0),RN);
  const good=T.map((t,i)=>i).filter(i=>M.habit(T[i]));
  console.log('   peak of '+T[peak].h+' with a two-hex lake below it -> habitable: '+good.length+
    '   (soil '+good.map(i=>T[i].soil.toFixed(2)).join(',')+
    ' | moisture '+good.map(i=>T[i].moist).join(',')+')');
  ok(good.length>0,'dig a hollow beside it and fill it, and somewhere becomes habitable');
  ok(good.every(i=>T[i].soil>=1&&T[i].moist>=1),'each has both soil and water');
  const took=good.length?use(good[0],SD):false;
  console.log('   after one seed: '+T.filter(t=>t.life).length+' hexes are alive');
  ok(took&&T.filter(t=>t.life).length>0,'and a seed takes there');
}

console.log('\n=== one seed greens the whole connected patch ===');
{
  const alive=T.map((t,i)=>i).filter(i=>T[i].life);
  const p=alive.length?M.patchAt(alive[0]):null;
  ok(!!p&&alive.length===p.length,'the living patch is exactly the habitable patch');
}

console.log('\n=== life remembers itself, and can be cut in two ===');
{
  const before=T.filter(t=>t.life).length;
  ok(before>=2,'a patch of at least two');
  /* Lift one hex of the patch clear of EVERYTHING that feeds it. A smaller
     lift is not enough: a living hex holds what it is handed, so as long as
     the mountain above still feeds it, it keeps its soil and survives. */
  const alive=T.map((t,i)=>i).filter(i=>T[i].life);
  for(let n=0;n<9;n++) use(alive[0],UP);
  const after=T.filter(t=>t.life).length;
  console.log('   lifted one hex to h'+T[alive[0]].h+' — above everything that fed it: '+
    before+' alive -> '+after+'  (its soil is now '+T[alive[0]].soil.toFixed(2)+')');
  ok(!T[alive[0]].life,'nothing is left growing up there');
  ok(after>0,'but the rest of the patch did not die with it');
}

console.log('\n=== lava kills what it touches ===');
{
  LIFE();
  const good=T.map((t,i)=>i).filter(i=>M.habit(T[i]));
  if(good.length) use(good[0],SD);
  const n0=T.filter(t=>t.life).length;
  ok(n0>0,'a living patch');
  /* dig a pit against a living hex and fill it with lava. It must not touch
     the lake — two adjacent basins are one basin, so the water would arrive
     with the lava and quench it on the spot. */
  let victim=-1, pit=-1;
  for(let i=0;i<T.length && pit<0;i++){
    if(!T[i].life) continue;
    for(const j of T[i].nb){
      if(j<0||T[j].life||T[j].liq!==M.NONE||T[j].h>0) continue;
      if(T[j].nb.some(k=>k>=0&&T[k].liq===M.WATER)) continue;   /* not beside water */
      victim=i; pit=j; break;
    }
  }
  ok(pit>=0,'found somewhere dry to open a vent');
  use(pit,DN); use(pit,LV);
  console.log('   lava next door: '+n0+' alive -> '+T.filter(t=>t.life).length+
              '   (pit is '+['dry','water','LAVA'][T[pit].liq]+
              ', temp on its neighbour: '+T[victim].temp+')');
  ok(T[pit].liq===M.LAVA,'the vent holds lava');
  ok(T[victim].temp>0,'the hex beside it is now hot');
  ok(!T[victim].life,'and nothing lives there any more');
}

console.log('\n=== life never grows in the water ===');
{
  ok(T.every(t=>!t.life||t.liq===M.NONE),'no living hex holds a liquid');
}

console.log('\n=== the whole board is still a pure function ===');
{
  flat();
  let z=77; const rnd=()=>{z^=z<<13;z^=z>>>17;z^=z<<5;return((z>>>0)/4294967296)};
  for(let n=0;n<700;n++)
    use(Math.floor(rnd()*T.length),[UP,DN,RN,LV,SD][Math.floor(rnd()*5)]);
  console.log('   after 700 mixed clicks: '+T.filter(t=>t.liq===M.WATER).length+' water, '+
    T.filter(t=>t.liq===M.LAVA).length+' lava, '+T.filter(t=>t.vol).length+' basalt, '+
    T.filter(t=>t.soil>0).length+' with soil, '+T.filter(t=>t.life).length+' alive');
  const snap=T.map(t=>[t.h,t.vol,t.liq,t.ls,t.soil,t.life].join('/')).join();
  for(let n=0;n<4;n++) flood();
  ok(T.map(t=>[t.h,t.vol,t.liq,t.ls,t.soil,t.life].join('/')).join()===snap,
     'solving again from the same ground gives the same world');
  ok(T.every(t=>!t.life||M.habit(t)),'every living hex is habitable');
}

console.log('\n=== NO DIRECTION WINS: a symmetric peak gives a symmetric apron ===');
{
  flat();
  const c=at(0,0);
  for(let n=0;n<4;n++) use(c,UP);
  const ring=T[c].nb.map(j=>T[j].soil);
  console.log('   ring: '+ring.map(v=>v.toFixed(4)).join('  '));
  ok(ring.every(v=>Math.abs(v-ring[0])<1e-9),
     'all six neighbours receive exactly the same');
  ok(T[c].soil===0,'and the summit is bare — fresh rock always moves on');
}

console.log('\n=== soil follows the steepest way down ===');
{
  flat();
  const c=at(0,0);
  for(let n=0;n<4;n++) use(c,UP);
  const deep=T[c].nb[3], shallow=T[c].nb[0];
  use(deep,DN); use(deep,DN);           /* one flank drops 6, the rest 4 */
  console.log('   drop 6 receives '+T[deep].soil.toFixed(2)+
              ', drop 4 receives '+T[shallow].soil.toFixed(2));
  ok(T[deep].soil>T[shallow].soil,'the deeper flank takes the larger share');
}

console.log('\n=== water drives the weathering ===');
{
  /* the same peak, dry inland versus with a lake against its foot */
  flat();
  const c=at(0,0);
  for(let n=0;n<4;n++) use(c,UP);
  const dry=T[c].nb.reduce((a,j)=>a+T[j].soil,0);
  const wet=T[c].nb[0];
  use(wet,DN); use(wet,RN);             /* a lake right against the mountain */
  flood();
  console.log('   peak moisture '+T[c].moist+
              '  ->  soil around it '+dry.toFixed(2)+' dry, '+
              T[c].nb.reduce((a,j)=>a+T[j].soil,0).toFixed(2)+' with a lake at its foot');
  ok(T[c].moist>0,'the peak now stands beside water');
  ok(T[c].nb.reduce((a,j)=>a+T[j].soil,0)>dry,'and erodes faster for it');
}

console.log('\n=== life binds the ground it stands on ===');
{
  LIFE();
  const good=T.map((t,i)=>i).filter(i=>M.habit(T[i]));
  ok(good.length>0,'somewhere is habitable');
  const before=good.map(i=>T[i].soil);
  use(good[0],SD);
  const after=good.map(i=>T[i].soil);
  console.log('   soil on the patch: '+before.map(v=>v.toFixed(2)).join(',')+
              '  ->  '+after.map(v=>v.toFixed(2)).join(','));
  ok(T.filter(t=>t.life).length>0,'it greened');
  ok(after.every((v,n)=>v>=before[n]-1e-9),'and none of it lost soil by greening');
  ok(T.filter(t=>t.life).every(t=>t.soil>=1),'every living hex still has soil to stand in');
}

console.log('\n=== and the whole thing is still a pure function ===');
{
  flat();
  let z=31; const rnd=()=>{z^=z<<13;z^=z>>>17;z^=z<<5;return((z>>>0)/4294967296)};
  for(let n=0;n<800;n++)
    use(Math.floor(rnd()*T.length),[UP,DN,RN,LV,SD][Math.floor(rnd()*5)]);
  console.log('   after 800 mixed clicks: '+T.filter(t=>t.liq===M.WATER).length+' water, '+
    T.filter(t=>t.liq===M.LAVA).length+' lava, '+T.filter(t=>t.vol).length+' basalt, '+
    T.filter(t=>t.soil>=1).length+' with soil, '+T.filter(t=>t.life).length+' alive');
  const snap=T.map(t=>[t.h,t.vol,t.liq,t.ls,t.soil.toFixed(6),t.life].join('/')).join();
  for(let n=0;n<4;n++) flood();
  ok(T.map(t=>[t.h,t.vol,t.liq,t.ls,t.soil.toFixed(6),t.life].join('/')).join()===snap,
     'solving again from the same ground gives the same world, to six decimals');
  ok(T.every(t=>t.soil>=0&&t.soil<=5),'soil always sits in 0-5');
}

console.log('\n=== a pool never stands at two surfaces, at ANY point in play ===');
{
  /* The split pool healed itself on the very next click, so looking at the
     END of a run almost never saw it — 0/200 boards. Looking after EVERY
     click sees it on 11 boards in 40. That gap is the whole lesson: the
     state was reachable constantly and observable almost never, and the
     only thing that ever caught it was a board that happened to stop while
     it was still broken. Cheap, so check every click. */
  let boards=0, hits=0;
  for(let seed=1;seed<=40;seed++){
    flat();
    let z=seed; const rnd=()=>{z^=z<<13;z^=z>>>17;z^=z<<5;return((z>>>0)/4294967296)};
    let hit=false;
    for(let n=0;n<800;n++){
      use(Math.floor(rnd()*T.length),[UP,DN,RN,LV,SD][Math.floor(rnd()*5)]);
      if(!T.every(t=>t.liq===M.NONE ||
          t.nb.every(j=>j<0||T[j].liq!==t.liq||T[j].ls===t.ls))){ hits++; hit=true; }
    }
    if(hit) boards++;
  }
  console.log('   40 boards x 800 clicks, checked after every single click -> '+
              hits+' clicks left a pool split across two surfaces');
  ok(boards===0,'no pool is ever left standing at two different surfaces');
}

console.log('\n=== and it is still one on EVERY board, not just a lucky one ===');
{
  /* One seed can be lucky. This suite was green on seeds 31 and 77 for a long
     while, and all the time roughly one board in sixteen was quietly drifting.
     So sweep a FIXED range instead of trusting a single roll. Fixed, because a
     suite that fails only sometimes is worse than one that passes by luck —
     this either fails every run or never. ~3s. */
  const BAD=[]; let worst=0;
  for(let seed=1;seed<=200;seed++){
    flat();
    let z=seed; const rnd=()=>{z^=z<<13;z^=z>>>17;z^=z<<5;return((z>>>0)/4294967296)};
    for(let n=0;n<800;n++)
      use(Math.floor(rnd()*T.length),[UP,DN,RN,LV,SD][Math.floor(rnd()*5)]);
    const cell=t=>[t.h,t.vol,t.liq,t.ls,t.soil.toFixed(6),t.life].join('/');
    const snap=T.map(cell).join(), was=T.map(t=>t.soil);
    for(let n=0;n<4;n++) flood();
    if(T.map(cell).join()!==snap){
      let d=0; T.forEach((t,i)=>{const x=Math.abs(t.soil-was[i]); if(x>d) d=x;});
      if(d>worst) worst=d;
      BAD.push(seed);
    }
  }
  console.log('   200 boards x 800 mixed clicks -> '+BAD.length+' moved when left alone'+
    (BAD.length?'   (seed'+(BAD.length>1?'s':'')+' '+BAD.join(' ')+
     ', worst soil drift '+worst.toFixed(3)+' of 5)':''));
  ok(BAD.length===0,'leave any board alone and nothing moves');
}

console.log('\n=== BASINS NEST: you choose the scale by where you click ===');
{
  flat();
  /* a plateau at -1 with a single -2 hex in the middle of it */
  const mid=at(0,0);
  const plate=[...new Set([mid].concat(T[mid].nb)
                 .concat(T[T[mid].nb[0]].nb.filter(j=>j>=0)))];
  for(const i of plate) T[i].h=-1;
  T[mid].h=-2; flood();
  const snapshot=T.map(t=>t.h);

  use(mid,RN);
  console.log('   deluge the -2 hex:  '+T.filter(t=>t.liq===M.WATER).length+
              ' water, surface '+T[mid].ls);
  ok(T[mid].liq===M.WATER,'the deep hex fills');
  ok(T.filter(t=>t.liq===M.WATER).length===1,'and NOTHING else does');
  ok(T[mid].ls===-1,'it stands at -1, against the plateau around it');

  for(let i=0;i<T.length;i++){T[i].h=snapshot[i];T[i].src=0;} flood();
  const edge=T[mid].nb[0];
  use(edge,RN);
  console.log('   deluge a -1 hex:    '+T.filter(t=>t.liq===M.WATER).length+
              ' water, surface '+T[edge].ls);
  ok(T.filter(t=>t.liq===M.WATER).length===plate.length,
     'the whole plateau fills, the deep hex included');
  ok(T[edge].ls===0,'and it stands at 0, against the plain around it');
}

console.log('\n=== a filled small basin still grows when you open it up ===');
{
  flat();
  const mid=at(0,0);
  const plate=[...new Set([mid].concat(T[mid].nb))];
  for(const i of plate) T[i].h=-1;
  T[mid].h=-2; flood();
  use(mid,RN);
  ok(T.filter(t=>t.liq===M.WATER).length===1,'one deep hex of water');
  use(T[mid].nb[1],DN);                 /* deepen a neighbour to -2 as well */
  console.log('   after digging a neighbour down to its level: '+
              T.filter(t=>t.liq===M.WATER).length+' water');
  ok(T.filter(t=>t.liq===M.WATER).length===2,'the pool takes in the new hollow');
}


console.log(fails? '\n'+fails+' FAILED\n':'\nall passed\n');
process.exit(fails?1:0);
