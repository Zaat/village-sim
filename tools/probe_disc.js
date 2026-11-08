// node tools/probe_disc.js SEED MAP YEARS : discoveries. Sites known, expeditions, finds, materials and fish stock, every year.
const fs=require('fs'),vm=require('vm'),path=require('path');
const files=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','discovery','save','world'];
const code=files.map(f=>fs.readFileSync(path.join(process.env.SRC||path.join(__dirname,'..','src'),f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,localMats,matOk,techBlocked,TECHS,evTotal});';
const ctx={console:{log(){},error(){}},Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+process.argv[2]||12,map=process.argv[3]||'island',years=+process.argv[4]||10;
const w=new ctx.World(seed,{map});const faults=[];const f0=w.fault.bind(w);w.fault=(k,e,en)=>{faults.push(k+': '+String(e&&e.stack||e).split('\n').slice(0,3).join(' | '));return f0(k,e,en)};
let shown=false;
for(let d=1;d<=years*32;d++){for(let t=0;t<1200;t++)w.step();
 if(!shown&&w.disc.gen){shown=true;console.log('local mats',ctx.localMats(w).join(','),'sites',w.disc.sites.map(s=>s.kind+'@'+s.x+','+s.y).join(' '))}
 if(d%32===0){const D=w.disc,fish=w.fish.reduce((a,b)=>a+b,0);
  console.log(`Y${d/32} pop ${w.vills.length} sites ${D.sites.length} known ${D.sites.filter(s=>s.known).length} done ${D.sites.filter(s=>s.done).length} exped ${D.done} lost ${D.lost} finds ${D.finds} lore ${D.lore} mats [${Object.keys(D.mats)}] fish ${fish} flow b${ctx.evTotal(w,'born')} d${ctx.evTotal(w,'died')} (age ${ctx.evTotal(w,'died_age')} hun ${ctx.evTotal(w,'died_hunger')} cold ${ctx.evTotal(w,'died_cold')} sea ${ctx.evTotal(w,'died_sea')}) arr ${ctx.evTotal(w,'arrivals')} outpop ${w.out?w.out.list.reduce((t,o)=>t+(o.state==='active'?o.pop||0:0),0):0} known ${Object.keys(w.tech.known).length}/${Object.keys(ctx.TECHS).length} blocked ${ctx.techBlocked(w).length}`+(D.log[0]?' | '+D.log[0].text:''))}}
console.log('faults',faults.length,faults.slice(0,4));
