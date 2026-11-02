// Regimes: node tests/regime.js SEED DAYS
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,TECHS,CFG,serializeWorld,deserializeWorld});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+(process.argv[2]||777),days=+(process.argv[3]||200);const w=new ctx.World(seed);
const ev=[];w.listeners.push((t,txt)=>{if(t==='regime')ev.push(`D${w.day} ${txt}`)});
for(let d=1;d<=days;d++){for(let t=0;t<1200;t++)w.step();
 if(d%32===0||d===days){const a=w.regime.ax,c=w.vills.find(v=>w.gov.council.some(x=>x.id===v.id&&x.title==='Chief'));
  console.log(`D${d} pop=${w.vills.length} ${w.regime.label.padEnd(24)} `+Object.entries(a).map(([k,v])=>k+' '+v.toFixed(2)).join(' ')+` | chief ${c?c.name+' r'+c.char.ruth.toFixed(2)+' p'+c.char.piety.toFixed(2)+' a'+c.char.amb.toFixed(2):'-'} approval ${Math.round(w.gov.approval)}`)}}
console.log(ev.slice(0,14).join('\n'));console.log('coups',w.regime.coups,'revolts',w.regime.revolts,'dynasty',w.regime.dynasty,'purges',w.regime.purges,'history',JSON.stringify(w.regime.history.map(h=>h.to)));
console.log(w.regime.leaderText);
console.log('errors:',JSON.stringify([...w.dbg.errors.values()].map(e=>e.where+': '+e.msg+' x'+e.count+'\n'+e.stack)));
const L=ctx.deserializeWorld(JSON.parse(JSON.stringify(ctx.serializeWorld(w))));console.log('reload',L.regime.label,L.vills.every(v=>v.char&&v.life));for(let t=0;t<12000;t++)L.step();console.log('ran 10 days, errors',L.dbg.total);
