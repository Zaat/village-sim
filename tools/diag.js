// Deep diagnostics for one long world: node tools/diag.js SEED MAP DAYS [every=32]  -> one JSON line per period
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,TERR,FEAT,villageAge,evTotal,ST});';
const ctx={console:{log(){},error(){}},Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+process.argv[2],map=process.argv[3]||'island',days=+process.argv[4]||2400,every=+process.argv[5]||32;
const w=new ctx.World(seed,{map}),W=ctx.CFG.W;let chats=0,evs={},evlog=[];const NOTABLE=/secession|civil|coup|uprising|purge|famine|fever|banish|strike|outpost|sect|exile|starv|storm|fire|wolves|harsh/;
w.listeners.push((t,txt,d)=>{evs[t]=(evs[t]||0)+1;if(t==='chat'||t==='talk')chats++;if(txt&&(NOTABLE.test(t)||(d&&(d.secession||d.civil||d.coup||d.uprising||d.purge||d.sect)))||(txt&&t==='regime'))evlog.push('y'+Math.round(w.day/32)+' d'+w.day+' ['+t+'] '+String(txt).slice(0,150))});
const lastPos=new Map(),stuckTicks=new Map();let prev={born:0,died:0,cause:{}},t0=Date.now(),secs={};
const sample=()=>{const ad=w.vills.filter(v=>v.isAdult()),farms=w.of('farm'),fert=farms.length?farms.reduce((s,f)=>s+(f.fert===undefined?1:f.fert),0)/farms.length:0;
  const jobs={};for(const v of w.vills){const k=v.jobKind||(v.sleeping?'sleep':'none');jobs[k]=(jobs[k]||0)+1}
  const roles={};for(const v of ad){roles[v.role||'none']=(roles[v.role||'none']||0)+1}
  const labels={};for(const v of w.vills){labels[v.label]=(labels[v.label]||0)+1}
  const stuck=[...stuckTicks.entries()].filter(([,n])=>n>=3).length;
  const causes={};for(const k in w.causes)causes[k]=w.causes[k]-(prev.cause[k]||0);prev.cause={...w.causes};
  let wolves=0,deer=0,rabbits=0,idleAnimals=0;for(const a of w.animals){if(!a.alive)continue;if(a.kind==='wolf')wolves++;else if(a.kind==='deer')deer++;else rabbits++}
  const left=(w.flow&&w.flow.tot&&w.flow.tot.left||0)-(prev.left||0);prev.left=(w.flow&&w.flow.tot&&w.flow.tot.left||0);const evOut=evs;evs={};
  return {concerns:(w.concerns?w.concerns.list.map(c=>c.key+':'+c.sev):[]),raised:w.concerns?w.concerns.raised:0,critical:w.concerns?w.concerns.critical:0,left,evs:evOut,secessions:w.strife?w.strife.secessions:0,civil:!!(w.strife&&w.strife.civil),day:w.day,year:Math.round(w.day/32),pop:w.vills.length,adults:ad.length,kids:w.vills.filter(v=>!v.isAdult()).length,elders:w.vills.filter(v=>v.isElder()).length,born:w.births-prev.born,died:w.deaths-prev.died,causes,
    food:w.stock.food,wood:w.stock.wood,stone:w.stock.stone,cap:w.cap(),trees:w.trees,treesRatio:+(w.trees/w.trees0).toFixed(2),farms:farms.length,fert:+fert.toFixed(2),houses:w.houses().length,beds:w.beds(),stores:w.of('store').length,
    hunger:Math.round(w.vills.reduce((s,v)=>s+v.hunger,0)/Math.max(1,w.vills.length)),mood:Math.round(ad.reduce((s,v)=>s+v.mood,0)/Math.max(1,ad.length)),
    regime:w.regime.label,auth:+w.regime.ax.auth.toFixed(2),unity:+w.regime.ax.cohes.toFixed(2),feuds:w.lives.feuds.filter(f=>!f.over).length,outposts:w.out.list.filter(o=>o.state==='active').length,outpop:w.out.list.filter(o=>o.state==='active').reduce((s,o)=>s+o.pop,0),
    techs:Object.keys(w.tech.known).length,age:ctx.villageAge(w),jobs,roles,topLabels:Object.entries(labels).sort((a,b)=>b[1]-a[1]).slice(0,6),stuck,chatsPerVillagerDay:+(chats/Math.max(1,w.vills.length)/every).toFixed(2),
    wolves,deer,rabbits,msTick:+((Date.now()-t0)/(every*1200)).toFixed(2),deferred:w.dbg.deferred||0,errors:w.dbg.total,hasStores:w.of('store').length,marketsOrTaverns:w.of('market').length+w.of('tavern').length}};
for(let d=1;d<=days;d++){for(let t=0;t<1200;t++){w.step();if(t%200===0){for(const v of w.vills){const p=lastPos.get(v.id);if(p&&Math.hypot(p[0]-v.x,p[1]-v.y)<0.4&&v.cur&&v.cur.type==='go'&&!v.sleeping)stuckTicks.set(v.id,(stuckTicks.get(v.id)||0)+1);else stuckTicks.delete(v.id);lastPos.set(v.id,[v.x,v.y])}}}
  if(d%every===0){const s=sample();prev.born=w.births;prev.died=w.deaths;chats=0;t0=Date.now();console.log(JSON.stringify(s));if(evlog.length){for(const l of evlog)console.log('#EV '+l);evlog=[]}}}
