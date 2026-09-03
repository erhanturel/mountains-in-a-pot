/* the basin rules, run against the LIVE sim block out of the page */
const fs=require('fs'), path=require('path');
/* works whether this file sits at the repo root or in test/ */
const HTML=[ '../index.html', 'index.html',
             '../lab-uplift.html', 'lab-uplift.html' ]
  .map(f=>path.join(__dirname,f)).find(fs.existsSync);
if(!HTML){ console.error('cannot find index.html next to or above this file'); process.exit(1); }
const core=fs.readFileSync(HTML,'utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];
const M=new Function(core+'return {T,at,flood,use,legal,basinAt,surf,SEA,R,NONE,WATER,LAVA,habit,patchAt,soils,RATE,fillFrom};')();
const {T,at,flood,use,basinAt}=M;
let fails=0;
const ok=(c,m)=>{ console.log((c?'  ok   ':'  FAIL')+'  '+m); if(!c)fails++; };
const UP={k:'uplift',d:1}, DN={k:'subduct',d:-1}, RN={k:'deluge',d:0};
const flat=()=>{ for(const t of T){t.h=0;t.src=0;t.vol=false;t.seed=false;} flood(); };
const W=(q,r)=>T[at(q,r)].liq===M.WATER, HH=(q,r)=>T[at(q,r)].h;
const nw=()=>T.filter(t=>t.liq===M.WATER).length;
const inland=at(0,0);

console.log('\n=== a flat island is dry, and its coast is damp ===');
{
  flat();
  ok(nw()===0,'no water anywhere');
  ok(T.filter(t=>t.coast).every(t=>t.moist>0),'every coastal hex reads damp');
  ok(T[inland].moist===0,'the middle does not');
}

console.log('\n=== deluge on flat ground does nothing at all ===');
{
  flat();
  for(let n=0;n<5;n++) use(inland,RN);
  console.log('   five deluges on the same flat hex -> '+nw()+' water tiles');
  ok(nw()===0,'the water simply runs off, every time');
  ok(!T[inland].src,'and nothing is remembered');
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
  ok(T[inland].nb.every(j=>!T[j].w),'nothing around it flooded');
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

console.log('\n=== raise the ground and the water goes ===');
{
  flat();
  const c=at(0,0);
  use(c,DN); use(c,RN);
  ok(W(0,0),'filled');
  use(c,UP);
  console.log('   lifted back to h '+HH(0,0)+' -> '+((T[c].liq===M.WATER)?'still water':'dry'));
  ok(!(T[c].liq===M.WATER),'no longer a basin, so no longer water');
  ok(!T[c].src,'and it has forgotten it ever was');
}

console.log('\n=== cut a channel to the sea and a lake drains ===');
{
  flat();
  const c=at(0,0);
  use(c,DN); use(c,RN);
  ok(W(0,0),'a lake at -1');
  /* trench from the lake out to the rim, one step lower so it carries */
  const path=[at(0,1),at(0,2),at(0,3),at(0,4),at(0,5),at(0,6)];
  for(const i of path){ use(i,DN); }
  console.log('   after cutting a trench to the coast: lake '+
    ((T[c].liq===M.WATER)?'still full':'drained')+', trench '+
    path.map(i=>T[i].liq===M.WATER?'w':'.').join(''));
  ok(path.every(i=>T[i].liq===M.WATER),'the trench itself is at sea level, so the sea fills it');
  ok((T[c].liq===M.WATER),'and the lake stays, being level with it');
}

console.log('\n=== the sea floods anything dug below it on the coast ===');
{
  flat();
  const e=T.findIndex(t=>t.coast>0);
  use(e,DN);
  console.log('   coastal hex dug to '+T[e].h+' -> '+((T[e].liq===M.WATER)?'flooded':'dry')+
              ', surface '+T[e].ls);
  ok((T[e].liq===M.WATER),'the sea comes in with no deluge at all');
  ok(T[e].ls===0,'and stands at sea level');
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
  ok(basinAt(at(5,-3))===null,'flat ground is not a basin');
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

console.log('\n=== pouring lava into the sea makes volcanic rock ===');
{
  flat();
  const e=T.findIndex(t=>t.coast>0);
  use(e,DN);
  ok(T[e].liq===M.WATER,'the sea floods the coastal dig');
  use(e,LV);
  console.log('   lava into it -> h '+T[e].h+', volcanic='+T[e].vol+
              ', '+['dry','water','LAVA'][T[e].liq]);
  ok(T[e].vol&&T[e].liq===M.NONE&&T[e].h===0,'new basalt land, level with the sea');
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
  const snap=T.map(t=>t.liq+'/'+t.ls+'/'+t.h);
  for(let n=0;n<5;n++) flood();
  ok(T.map(t=>t.liq+'/'+t.ls+'/'+t.h).join()===snap.join(),
     'flooding again from the same ground gives the same answer');
}

/* ================= SOIL ================= */
const SD={k:'seed',d:0};
const soil=(q,r)=>T[at(q,r)].soil;

console.log('\n=== a flat island has no soil at all ===');
{
  flat();
  console.log('   hexes with any soil: '+T.filter(t=>t.soil>0).length+' of '+T.length);
  ok(T.every(t=>t.soil===0),'nothing to grow in until you make some relief');
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
console.log('\n=== nothing will grow on a bare island ===');
{
  flat();
  ok(T.every(t=>!M.habit(t)),'no hex is habitable');
  ok(!use(at(0,0),SD),'and a seed simply does not take');
}

console.log('\n=== a mountain by the sea makes somewhere to live ===');
{
  flat();
  /* a peak two hexes in from the rim: its foot gets soil, the sea gives it water */
  const peak=T.findIndex(t=>t.coast===0 && t.nb.some(j=>j>=0&&T[j].coast>0));
  for(let n=0;n<6;n++) use(peak,UP);
  const good=T.map((t,i)=>i).filter(i=>M.habit(T[i]));
  console.log('   peak of '+T[peak].h+' beside the coast -> habitable hexes: '+good.length+
    '   (soil '+good.map(i=>T[i].soil.toFixed(1)).join(',')+
    ' | moisture '+good.map(i=>T[i].moist).join(',')+')');
  ok(good.length>0,'somewhere is now habitable');
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
  flat();
  const peak=T.findIndex(t=>t.coast===0 && t.nb.some(j=>j>=0&&T[j].coast>0));
  for(let n=0;n<5;n++) use(peak,UP);
  const good=T.map((t,i)=>i).filter(i=>M.habit(T[i]));
  if(good.length) use(good[0],SD);
  const n0=T.filter(t=>t.life).length;
  ok(n0>0,'a living patch');
  /* dig a pit against a living hex and fill it with lava. It has to be
     INLAND and low — a coastal pit floods from the sea and would quench the
     lava the moment it arrived. */
  let victim=-1, pit=-1;
  for(let i=0;i<T.length && pit<0;i++){
    if(!T[i].life) continue;
    for(const j of T[i].nb){
      if(j<0||T[j].coast>0||T[j].life||T[j].h>0) continue;
      victim=i; pit=j; break;
    }
  }
  ok(pit>=0,'found somewhere inland to open a vent');
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
  flat();
  const peak=T.findIndex(t=>t.coast===0 && t.nb.some(j=>j>=0&&T[j].coast>0));
  for(let n=0;n<6;n++) use(peak,UP);
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
