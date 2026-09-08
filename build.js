/* ONE FILE TO SEND. The page loads three.js as an ES module, and a module
   loaded from file:// is refused by every browser -- so index.html needs a
   server. This folds three.core, three.module and OrbitControls into the
   page itself, each in its own scope, and writes pot.html: a single file
   that opens with a double click and can be sent over a chat.

   Nothing is transformed but the import/export lines. The libraries are
   wrapped in functions so their minified names cannot collide with the
   page's own. Run: node build.js */
const fs=require('fs');
const core=fs.readFileSync('vendor/three.core.min.js','utf8');
const mod =fs.readFileSync('vendor/three.module.min.js','utf8');
const orb =fs.readFileSync('vendor/addons/controls/OrbitControls.js','utf8');
let page=fs.readFileSync('index.html','utf8');

/* `export{a as B,c as D}` -> an object literal {B:a,D:c} */
const exportsOf=src=>{
  const m=src.match(/export\{([^}]*)\};?\s*$/);
  if(!m) throw new Error('no export list');
  const body=m[1].split(',').map(x=>{ const [a,b]=x.trim().split(/\s+as\s+/); return (b||a)+':'+a; }).join(',');
  return {stripped:src.slice(0,m.index), object:'{'+body+'}'};
};
const c=exportsOf(core);
/* the module file imports core's names under aliases: `Matrix3 as e` -> `Matrix3:e` */
const imp=mod.match(/import\{([^}]*)\}from"\.\/three\.core\.min\.js";?/);
if(!imp) throw new Error('no core import');
const bindings='const {'+imp[1].split(',').map(x=>x.trim().replace(/\s+as\s+/,':')).join(',')+'}=CORE;';
let modBody=mod.replace(imp[0],'').replace(/export\*from"\.\/three\.core\.min\.js";?/,'');
/* the module also re-exports core's names by a plain list near its top --
   `export{AdditiveAnimationBlendMode,...}` with no aliases. Those are
   already in CORE, so the statement just goes. */
modBody=modBody.replace(/export\{[^}]*\}(from"[^"]*")?;?/g,(m)=>/\sas\s/.test(m)?m:'');
const m=exportsOf(modBody);
const three=
  'const THREE=(()=>{\n'+
  '  const CORE=(()=>{'+c.stripped+'\n;return '+c.object+';})();\n'+
  '  const MOD=(()=>{'+bindings+m.stripped+'\n;return '+m.object+';})();\n'+
  '  return Object.assign({},CORE,MOD);\n})();\n';
const orbBody=orb.replace(/import\s*\{([^}]*)\}\s*from\s*'three';/, (_,names)=>'const {'+names.replace(/\s+/g,'')+'}=THREE;')
                 .replace(/export\s*\{\s*OrbitControls\s*\};?/,'return {OrbitControls};');
const orbit='const {OrbitControls}=(()=>{'+orbBody+'\n})();\n';

page=page.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/,'');
page=page.replace(/import \* as THREE from 'three';\s*import \{ OrbitControls \} from '\.\/vendor\/addons\/controls\/OrbitControls\.js';/,
  ()=>three+orbit);
if(page.includes('import * as THREE')||page.includes("from './vendor")) throw new Error('an import survived');
fs.writeFileSync('pot.html',page);
console.log('pot.html',(page.length/1024).toFixed(0)+' KB');
