// Pacing of technology and ages: node tools/pace.js SEED MAP DAYS  ->  when each age began, techs per decade, population, speed
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,villageAge,AGES,TECHS,techFx,ST});';
const ctx={console:{log(){},error(){}},Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+process.argv[2],map=process.argv[3]||'island',days=+process.argv[4]||2400;
const w=new ctx.World(seed,{map});const ageStart=[0],series=[];let lastAge=0,t0=Date.now(),last=Date.now();
for(let d=1;d<=days;d++){for(let t=0;t<1200;t++)w.step();const a=ctx.villageAge(w);if(a>lastAge){ageStart[a]=d;lastAge=a}
  if(d%160===0){series.push({day:d,year:+(d/32).toFixed(0),techs:Object.keys(w.tech.known).length,age:a,pop:w.vills.length,msTick:+((Date.now()-last)/(160*1200)).toFixed(2),learn:+ctx.techFx(w,'learn').toFixed(2),farm:+ctx.techFx(w,'farm').toFixed(2),food:w.stock.food,lost:w.tech.lost||0});last=Date.now()}}
console.log(JSON.stringify({seed,map,days,ageStartYears:ageStart.map(x=>x===undefined?null:+(x/32).toFixed(1)),final:{techs:Object.keys(w.tech.known).length,age:ctx.villageAge(w),pop:w.vills.length,lost:w.tech.lost||0,errors:w.dbg.total},series}));
