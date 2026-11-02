// Neighbours: node tests/neigh.js SEED DAYS
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','mapgen','character','regime','strife','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,TECHS,CFG,serializeWorld,deserializeWorld});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+(process.argv[2]||777),days=+(process.argv[3]||140);const w=new ctx.World(seed);
console.log('map',ctx.CFG.W+'x'+ctx.CFG.H,'home',w.cx,w.cy,'islands',JSON.stringify(w.neigh.map(n=>[n.name,n.kind,n.x,n.y,n.dist,n.reach])));
const t0=Date.now();
for(let d=1;d<=days;d++){for(let t=0;t<1200;t++)w.step();if(d===24&&process.argv[4]!=='natural')for(const id of Object.keys(ctx.TECHS))w.tech.known[id]=24;
 if(d%20===0)console.log(`D${d} pop=${w.vills.length} docks=${w.of('dock').length} boats=${w.boats.length} found=${w.neigh.filter(n=>n.found).length}/${w.neigh.length} voyage=${w.voyage?'yes':'-'} seen=${(100*w.seen.reduce((a,b)=>a+b,0)/w.seen.length).toFixed(0)}%`)}
console.log('elapsed',((Date.now()-t0)/1000).toFixed(0)+'s','ms/tick',(w.dbg.tickMs/w.dbg.ticks).toFixed(2));
console.log(w.chron.events.filter(e=>e.kind==='voyage').map(e=>`D${e.day} ${e.text}`).join('\n'));
console.log('errors:',JSON.stringify([...w.dbg.errors.values()].map(e=>e.where+': '+e.msg+' x'+e.count+'\n'+e.stack)));
const L=ctx.deserializeWorld(JSON.parse(JSON.stringify(ctx.serializeWorld(w))));
console.log('reload dims',ctx.CFG.W+'x'+ctx.CFG.H,'found',L.neigh.filter(n=>n.found).length,'seen equal',L.seen.every((x,i)=>x===w.seen[i]));for(let t=0;t<12000;t++)L.step();console.log('ran 10 days, pop',L.vills.length,'errors',L.dbg.total);
