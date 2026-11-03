// Building stats: node tests/bld.js SEED DAYS
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','stats','outposts','bridges','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,TECHS,CFG,serializeWorld,deserializeWorld});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+(process.argv[2]||777),days=+(process.argv[3]||200);const w=new ctx.World(seed);
const ev=[];w.listeners.push((t,txt)=>{if(/Fire!|collapses|batters|scorched/.test(txt||''))ev.push(`D${w.day} ${txt}`)});
for(let d=1;d<=days;d++){for(let t=0;t<1200;t++)w.step();if(d===24)for(const id of Object.keys(ctx.TECHS))w.tech.known[id]=24;
 if(d%40===0||d===days){const bs=[...w.buildings.values()];const worn=bs.filter(b=>b.hp/b.maxHp<0.6).length,avg=bs.reduce((s,b)=>s+b.hp/b.maxHp,0)/bs.length,rep=bs.reduce((s,b)=>s+(b.repairs||0),0);
  console.log(`D${d} pop=${w.vills.length} buildings=${bs.length} avgCondition=${(avg*100).toFixed(0)}% worn(<60%)=${worn} repairs=${rep} stock w${w.stock.wood} s${w.stock.stone}`)}}
console.log('deaths',JSON.stringify(w.causes),'births',w.births);console.log(ev.length+' damage events:\n'+ev.slice(0,8).join('\n'));
console.log('errors:',JSON.stringify([...w.dbg.errors.values()].map(e=>e.where+': '+e.msg+' x'+e.count+'\n'+e.stack)));
const L=ctx.deserializeWorld(JSON.parse(JSON.stringify(ctx.serializeWorld(w))));const a=[...w.buildings.values()],b=[...L.buildings.values()];
console.log('reload hp equal',a.length===b.length&&a.every((x,i)=>Math.abs(x.hp-b[i].hp)<1e-6&&x.built===b[i].built));for(let t=0;t<12000;t++)L.step();console.log('ran 10 days, errors',L.dbg.total);
