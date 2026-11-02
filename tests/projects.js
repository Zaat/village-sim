// Great projects: node tests/projects.js SEED DAYS  (all tech at day 24)
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','tech','water','trade','projects','history','places','neighbours','diplomacy','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,TECHS,PROJECTS,serializeWorld,deserializeWorld});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+(process.argv[2]||777),days=+(process.argv[3]||200);
const w=new ctx.World(seed);
for(let d=1;d<=days;d++){
  for(let t=0;t<1200;t++)w.step();
  if(d===24){for(const id of Object.keys(ctx.TECHS))w.tech.known[id]=d}
  if(d%20===0||d===days){const P=w.proj;console.log(`D${d} pop=${w.vills.length} wood=${w.stock.wood} stone=${w.stock.stone} groups=${w.groups.length} active=${P.active?P.active.type+'('+P.active.names.join('+')+')':'-'} done=${Object.keys(P.done).join(',')||'-'} cd=${P.cooldown}`)}
}
console.log(w.log.filter(l=>/great|hall|library|bastion|monument|project|Work begins|finished!/i.test(l.text)).slice(0,14).map(l=>`D${l.day} ${l.text}`).join('\n'));
console.log('errors:',JSON.stringify([...w.dbg.errors.values()].map(e=>e.where+': '+e.msg+' x'+e.count+'\n'+e.stack)));
const L=ctx.deserializeWorld(JSON.parse(JSON.stringify(ctx.serializeWorld(w))));
console.log('reload: done',Object.keys(L.proj.done).join(','),'active',L.proj.active&&L.proj.active.type,'bps',L.bps.map(b=>b.type+(b.proj?'*':'')).join(','));
for(let t=0;t<1200*10;t++)L.step();console.log('reloaded ran 10 days, pop',L.vills.length,'errors',L.dbg.total);
