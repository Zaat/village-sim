// Round-trip test: node tests/save.js
const fs=require('fs'),vm=require('vm'),path=require('path');const dir=path.join(__dirname,'..','src');
const code=['config','animals','villager','town','society','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','save','world'].map(f=>fs.readFileSync(path.join(dir,f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,serializeWorld,deserializeWorld,Villager,Animal,TECHS,techAvailable});';
const ctx={console,Buffer};vm.createContext(ctx);vm.runInContext(code,ctx);
const w=new ctx.World(777,{survival:false,disasters:true,crime:true});
for(let t=0;t<1200*70;t++)w.step();
const json=JSON.stringify(ctx.serializeWorld(w));console.log('saved: day',w.day,'pop',w.vills.length,'size',(json.length/1024).toFixed(0)+' KB');
const L=ctx.deserializeWorld(JSON.parse(json));
const eq=(name,a,b)=>console.log((JSON.stringify(a)===JSON.stringify(b)?'OK  ':'DIFF')+' '+name+(JSON.stringify(a)===JSON.stringify(b)?'':`  saved=${JSON.stringify(a).slice(0,80)} loaded=${JSON.stringify(b).slice(0,80)}`));
eq('tick',w.tick,L.tick);eq('stock',w.stock,L.stock);eq('villagers',w.vills.length,L.vills.length);eq('animals',w.animals.filter(a=>a.alive).length,L.animals.length);
eq('buildings',[...w.buildings.values()].map(b=>b.type+b.x+','+b.y).sort(),[...L.buildings.values()].map(b=>b.type+b.x+','+b.y).sort());
eq('blueprints',w.bps.length,L.bps.length);eq('roads',w.road.reduce((a,b)=>a+b,0),L.road.reduce((a,b)=>a+b,0));eq('features',Array.from(w.feat).join('').length+':'+w.feat.reduce((a,b)=>a+b,0),Array.from(L.feat).join('').length+':'+L.feat.reduce((a,b)=>a+b,0));
eq('relations',w.rel.size,L.rel.size);eq('groups',w.groups.map(g=>g.name),L.groups.map(g=>g.name));eq('council',w.gov.council,L.gov.council);eq('policy',w.gov.policy,L.gov.policy);
eq('storeAdj',w.storeAdj.reduce((a,b)=>a+b,0),L.storeAdj.reduce((a,b)=>a+b,0));eq('rng',w.rng.s,L.rng.s);
const a=w.vills[3],b=L.vills[3];eq('villager sample',[a.name,a.age.toFixed(3),a.role,a.partner,a.kids,a.bio.length,a.op],[b.name,b.age.toFixed(3),b.role,b.partner,b.kids,b.bio.length,b.op]);
eq('villager methods',typeof a.update,typeof b.update);eq('stage',a.stage(),b.stage());
// keep running the loaded village, and compare against the original continuing
let err=null;try{for(let t=0;t<1200*40;t++){L.step();w.step()}}catch(e){err=e}
console.log('ran 40 more days each:',err?('ERROR '+err.stack):'no errors');
const sum=x=>`pop=${x.vills.length} food=${x.stock.food} wood=${x.stock.wood} stone=${x.stock.stone} houses=${x.houses().length} farms=${x.of('farm').length} groups=${x.groups.length} council=${x.gov.council.length} births=${x.births} deaths=${x.deaths}`;
console.log('original :',sum(w));console.log('reloaded :',sum(L));
// a save taken right after load must also reload
const L2=ctx.deserializeWorld(JSON.parse(JSON.stringify(ctx.serializeWorld(L))));for(let t=0;t<1200*5;t++)L2.step();console.log('second-generation reload ok, pop',L2.vills.length);
