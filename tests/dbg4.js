const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','techtree','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','stats','concerns','outposts','bridges','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,styleNow});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const w=new ctx.World(777);let seen=false,lastN=-1;
for(let t=0;t<1200*80;t++){w.step();
  const ups=w.bps.filter(b=>b.type==='upgrade');
  if(ups.length!==lastN){lastN=ups.length;console.log(`tick ${t} day ${w.day}: upgrade blueprints=${ups.length}`,ups.map(u=>`target ${u.target} toStyle ${u.toStyle} cost ${JSON.stringify(u.cost)} have ${JSON.stringify(u.have)} prog ${u.prog}/${u.time} workers ${u.workers} ready ${u.ready()}`).join(' | '))}
}
for(const e of w.dbg.errors.values())console.log('STACK',e.where,e.count,'x first day',e.first.day,'\n'+e.stack);console.log('houses styles:',w.houses().map(h=>h.style===undefined?'u':h.style).join(','),' errors:',JSON.stringify([...w.dbg.errors.values()].map(e=>e.where+': '+e.msg)));
console.log('log:',w.log.filter(l=>/rebuilt|upgrade/i.test(l.text)).map(l=>l.text).join(' | '));
