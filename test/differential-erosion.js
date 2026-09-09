/* Two halves of one slab, identical in every way but the rock: shale to the
   west, granite to the east, the same cloud line over both. If hardness does
   anything, the halves end at different heights. */
const fs=require('fs');
const core=fs.readFileSync('index.html','utf8')
  .split('/*==CORE-START==*/')[1].split('/*==CORE-END==*/')[0];
function run(contrast,ticks){
  global.POT_R=10;
  const M=new Function(core+'return {T,at,tick,use,LAYER,SLAB,CLOUD,GRANITE,SHALE,'+
    'gnd,raise,MATS,'+
    'set WEATHER(v){WEATHER=v}, set CONTRAST(v){CONTRAST=v}};')();
  M.CONTRAST=contrast; M.WEATHER=0.35/420;
  for(let k=0;k<M.T.length;k++)
    M.raise(k, 4*M.SLAB, M.T[k].q<0 ? M.SHALE : M.GRANITE);
  /* one line of cloud straight down the middle, so both halves get the same */
  for(let r=-8;r<=8;r++){ const j=M.at(0,r); if(j>=0) M.use(j,{k:'place'},0,3,M.CLOUD); }
  for(let n=0;n<ticks;n++) M.tick();
  let ws=0,wn=0,es=0,en=0;
  for(let k=0;k<M.T.length;k++){
    const t=M.T[k];
    if(t.q<=-2){ ws+=M.gnd(k); wn++; } else if(t.q>=2){ es+=M.gnd(k); en++; }
  }
  return {shale:ws/wn, granite:es/en};
}
console.log('Mean ground height after the same rain on the same shape\n');
console.log('  ticks   CONTRAST      shale   granite   granite stands higher by');
for(const n of [20000,60000]){
  for(const c of [0,1]){
    const r=run(c,n);
    console.log('  '+String(n).padStart(6)+String(c).padStart(11)+
      r.shale.toFixed(3).padStart(11)+r.granite.toFixed(3).padStart(10)+
      (r.granite-r.shale).toFixed(3).padStart(21));
  }
}
