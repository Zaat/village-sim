// Resource balance probe: node tests/balance.js SEED DAYS
const fs=require('fs'),vm=require('vm'),path=require('path');const dir=path.join(__dirname,'..','src');
const code=['config','animals','villager','town','society','techtree','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','save','world'].map(f=>fs.readFileSync(path.join(dir,f+'.js'),'utf8')).join('\n')+'\n;globalThis.World=World;globalThis.CFG=CFG;globalThis.resourceTargets=typeof resourceTargets!=="undefined"?resourceTargets:null;';
const ctx={console};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+(process.argv[2]||12345),days=+(process.argv[3]||96);
const w=new ctx.World(seed,{survival:process.env.SURV==='1',disasters:process.env.DIS!=='0',crime:process.env.CRIME!=='0'});const rows=[];let blocked=0,coldDays=0,lowFood=0,fullWood=0,fullFood=0,n=0;const yr={};
for(let d=1;d<=days;d++){
  for(let t=0;t<ctx.CFG.TPD;t++)w.step();
  const pop=w.vills.length,cap=w.cap(),needS=w.bps.reduce((s,b)=>s+Math.max(0,b.cost.stone-b.have.stone-b.inc.stone),0),needW=w.bps.reduce((s,b)=>s+Math.max(0,b.cost.wood-b.have.wood-b.inc.wood),0);
  n++; if(w.stock.food<pop*1.5)lowFood++; if(w.stock.wood>=cap*0.9)fullWood++; if(w.stock.food>=cap*0.9)fullFood++; if(w.cold)coldDays++;
  if((needS>0&&w.stock.stone===0)||(needW>0&&w.stock.wood===0))blocked++;
  if(d%16===0){const y=Math.ceil(d/32)+'.'+(d%32<=16&&d%32!==0?1:2);rows.push(`D${d} pop=${pop} food=${w.stock.food}(${(w.stock.food/pop).toFixed(1)}/p) wood=${w.stock.wood}(${(w.stock.wood/pop).toFixed(1)}/p) stone=${w.stock.stone}(${(w.stock.stone/pop).toFixed(1)}/p) cap=${cap} farms=${w.of('farm').length} stores=${w.of('store').length} houses=${w.houses().length} bps=${w.bps.length}`)}
}
console.log(`seed ${seed}: days=${n} lowFoodDays=${lowFood} woodNearCapDays=${fullWood} foodNearCapDays=${fullFood} coldDays=${coldDays} buildBlockedDays=${blocked} deaths=${JSON.stringify(w.causes)}`);
console.log(rows.join('\n'));
