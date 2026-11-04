// node tools/probe_liv.js SEED MAP DAYS : livelihoods health record (employment, trades, income, errors)
const fs=require('fs'),vm=require('vm'),path=require('path');
const files=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','save','world'];
const code=files.map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,LIV,livelihoodSummary,TRADES,census});';
const ctx={console:{log(){},error(){}},Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
if(process.env.NOLIV){ctx.livelihoodsDay=()=>{}}
const seed=+process.argv[2]||12,map=process.argv[3]||'island',days=+process.argv[4]||320;
const w=new ctx.World(seed,{map});let t0=Date.now(),errs=0;
for(let d=1;d<=days;d++){try{for(let t=0;t<1200;t++)w.step()}catch(e){errs++;console.log('ERR',e.message.slice(0,200));break}
 if(d%32===0){const s=ctx.livelihoodSummary(w),L=ctx.LIV(w),ad=w.vills.filter(v=>v.isAdult()).length;
  const coins=w.vills.reduce((a,v)=>a+(v.coins||0),0),wl=w.vills.reduce((a,v)=>a+(v.wealth||0),0);
  console.log(`Y${d/32} pop ${w.vills.length} adults ${s.adults} roles ${s.roles} trades ${s.trades} idle ${s.idle} | jobs ${L.stats.jobs} paid ${Math.round(L.stats.paid)} inv ${L.stats.invented}/${L.stats.failed}/${L.inv.length} dreams ${L.stats.dreams} ot ${L.stats.ot} | coins ${Math.round(coins)} wealth ${Math.round(wl)} | goods ${Object.entries(L.goods).map(([k,x])=>k+Math.round(x)).join(' ')} | stuck ${w.vills.filter(v=>v.stuck).length} | ${((Date.now()-t0)/d).toFixed(0)}ms/day`)}}
const s=ctx.livelihoodSummary(w);console.log('trades:',s.rows.map(r=>`${r.name} ${r.w}w D${r.D} J${r.J}`).join(' | '));console.log('errors',errs);
