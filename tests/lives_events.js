// v0.22: hobbies and errands, ownership and inheritance, feuds, regime policy push, power shares, save/load
const fs=require('fs'),vm=require('vm');
const code=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','discovery','save','world'].map(f=>fs.readFileSync(__dirname+'/../src/'+f+'.js','utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,LV,startFeud,feudDay,feudOf,inheritFrom,propsOf,powerShares,policyTargets,serializeWorld,deserializeWorld,statusDay,wealthOf});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const w=new ctx.World(+process.argv[2]||555,{map:'island'});
for(let t=0;t<1200*60;t++)w.step();
const ad=w.vills.filter(v=>v.isAdult());
ok(ad.every(v=>v.hobby),'every adult has a hobby');ok(ctx.LV(w).stats.hobbies>0,'hobbies happened: '+ctx.LV(w).stats.hobbies);console.log('stats',JSON.stringify(ctx.LV(w).stats));
const owners=[...w.buildings.values()].filter(b=>b.owner);ok(owners.length>0,'buildings have owners: '+owners.length);
const sh=ctx.powerShares(w);ok(sh.length>=3&&Math.abs(sh.reduce((s,x)=>s+x.share,0)-1)<1e-6,'power shares sum to 1: '+sh.map(x=>x.label+' '+Math.round(x.share*100)).join(', '));
// regime push
w.regime.ax.auth=0.95;w.regime.ax.open=0.1;w.regime.ax.comm=0.5;for(let d=0;d<60;d++)w.onNewDay&&0;const p0=w.gov.policy.law;for(let t=0;t<1200*60;t++)w.step();w.regime.ax.auth=0.95;
ok(w.gov.policy.law>0.3||w.gov.policy.law>p0,'authoritarian regime pushes law strict: '+p0.toFixed(2)+' -> '+w.gov.policy.law.toFixed(2));
// inheritance
const par=w.vills.find(v=>v.isAdult()&&v.partner!=null&&v.kids.length>0&&w.vills.some(k=>v.kids.includes(k.id)&&k.isAdult()));
if(par){const house=w.buildings.get(par.home);if(house){house.owner=par.id;par.wealth=40;const partner=w.vills.find(x=>x.id===par.partner);const before=partner.wealth||0;w.kill(par,'passed away peacefully of old age');ok(house.owner===partner.id||w.vills.some(x=>x.id===house.owner),'house passed to an heir: '+house.owner);ok((partner.wealth||0)>before,'partner received wealth');ok(ctx.LV(w).stats.inherited>0,'estate counted')}}
else console.log('(no family with adult kids found; inheritance not checked)');
// feuds
const a=w.vills.filter(v=>v.isAdult()&&v.partner!=null);let x=null,y=null,f=null;
for(let i=0;i<a.length&&!f;i++)for(let j=i+1;j<a.length&&!f;j++){if(a[j].partner===a[i].id)continue;f=ctx.startFeud(w,a[i],a[j],'test cause',0.8);if(f){x=a[i];y=a[j]}}
ok(!!f,'feud started');if(f){const k=w.relKey(x,y);const r0=w.rel.get(k)||0;f.asked=w.day;ctx.feudDay(w);ok((w.rel.get(k)||0)<r0,'feud sours relations');f.asked=-99;
  for(let i=0;i<40&&!f.over;i++){f.heat-=0.05;ctx.feudDay(w)}ok(f.over,'feud fades')}
// save/load
{const b2=w.vills.filter(v=>v.isAdult()&&v.partner!=null);for(let i=0;i<b2.length;i++)for(let j=i+1;j<b2.length;j++)if(b2[j].partner!==b2[i].id&&ctx.startFeud(w,b2[i],b2[j],'again',0.6)){i=1e9;break}}
const d=ctx.serializeWorld(w);const w2=ctx.deserializeWorld(JSON.parse(JSON.stringify(d)));ok(ctx.LV(w2).feuds.length===ctx.LV(w).feuds.length,'feuds saved');ok(!ctx.LV(w2).feuds.some(f=>typeof f.ka.has!=='function'),'kin sets restored');
ok([...w2.buildings.values()].filter(b=>b.owner).length===[...w.buildings.values()].filter(b=>b.owner).length,'owners saved');
for(let t=0;t<1200*10;t++)w2.step();ok(w2.dbg.total===0,'no errors after load');
ok(w.dbg.total===0,'no errors: '+[...w.dbg.errors.values()].map(e=>e.where+' '+e.msg).join(';'));
console.log('deferred searches',w.dbg.deferred||0);console.log(fail?'FAILED '+fail:'lives passed '+pass);process.exit(fail?1:0);
