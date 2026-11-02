// One seed of the sweep; prints a single JSON line. node tests/sweep_one.js SEED DAYS [forced]
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','character','regime','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,TECHS,CFG,PROJECTS});';
const ctx={console:{log(){},error(){}},Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+process.argv[2],days=+process.argv[3],forced=process.argv[4]==='forced';
const w=new ctx.World(seed);let minPop=1e9,peak=0,t0=Date.now();const series=[];
for(let d=1;d<=days;d++){for(let t=0;t<1200;t++)w.step();if(forced&&d===24)for(const id of Object.keys(ctx.TECHS))w.tech.known[id]=24;
  const p=w.vills.length;peak=Math.max(peak,p);if(d>60)minPop=Math.min(minPop,p);if(d%32===0)series.push(p)}
const ad=w.vills.filter(v=>v.isAdult()),coins=ad.map(v=>v.coins||0).sort((a,b)=>a-b),tot=coins.reduce((a,b)=>a+b,0);let g=0;if(tot>0){let c=0;coins.forEach((x,i)=>{c+=(2*(i+1)-coins.length-1)*x});g=c/(coins.length*tot)}
const gov=w.gov,R=gov.ruling,lessons=Object.fromEntries(Object.entries(w.chron.lessons).filter(e=>e[1]>0.2).map(e=>[e[0],+e[1].toFixed(2)]));
const bs=[...w.buildings.values()],RG=w.regime,ch=w.vills.find(v=>w.gov.council.some(c=>c.id===v.id&&c.title==='Chief'));
console.log(JSON.stringify({seed,days,pop:w.vills.length,peak,minPop:minPop===1e9?null:minPop,series,houses:w.houses().length,buildings:bs.length,cond:+(bs.reduce((s,b)=>s+(b.maxHp?b.hp/b.maxHp:1),0)/Math.max(1,bs.length)).toFixed(2),
  techs:Object.keys(w.tech.known).length,projects:Object.keys(w.proj.done).length,groups:w.groups.length,elections:gov.elections,ruling:R?R.name:null,policy:gov.policy,approval:Math.round(gov.approval),
  mood:Math.round(ad.reduce((s,v)=>s+v.mood,0)/Math.max(1,ad.length)),treasury:Math.round(w.econ.treasury),gini:+g.toFixed(2),
  found:w.neigh?w.neigh.filter(n=>n.found).length:0,pacts:w.neigh?w.neigh.filter(n=>n.pact>0).length:0,raids:w.neigh?w.neigh.reduce((s,n)=>s+(n.raids||0),0):0,
  deaths:w.causes,births:w.births,lessons,food:w.stock.food,wood:w.stock.wood,stone:w.stock.stone,regime:RG.label,ax:Object.fromEntries(Object.entries(RG.ax).map(([k,v])=>[k,+v.toFixed(2)])),shifts:RG.history.length,div:+(RG.div||0).toFixed(2),coups:RG.coups,revolts:RG.revolts,dynasty:RG.dynasty,purges:RG.purges,prophet:!!RG.prophet,chiefRuth:ch?+ch.char.ruth.toFixed(2):null,errors:w.dbg.total,msTick:+(w.dbg.tickMs/w.dbg.ticks).toFixed(3),wallS:Math.round((Date.now()-t0)/1000)}));
