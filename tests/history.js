// Factions and lessons: node tests/history.js SEED DAYS [survival]
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','discovery','voices','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,TECHS,PROJECTS,LESSONS,serializeWorld,deserializeWorld});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+(process.argv[2]||777),days=+(process.argv[3]||260),surv=process.argv[4]==='survival';
const w=new ctx.World(seed,surv?{survival:true}:undefined);
for(let d=1;d<=days;d++){
  for(let t=0;t<1200;t++)w.step();
  if(d%32===0||d===days){const R=w.gov.ruling,L=Object.entries(w.chron.lessons).filter(e=>e[1]>0.02).map(e=>e[0]+':'+e[1].toFixed(2)).join(' ');
    console.log(`D${d} pop=${w.vills.length} groups=${w.groups.length} ruling=${R?R.name+'('+R.seats+'/'+w.gov.council.length+',t'+R.terms+')':'-'} elections=${w.gov.elections} lessons[${L}]`)}
}
console.log('PLATFORMS:\n  '+w.groups.map(g=>`${g.name} (${g.members.length}): focus ${g.platform.focus}; ${g.platform.issues.map(i=>i.k+(i.dir>0?'+':'-')).join(',')||'-'}; satisfied ${(g.satisfied||0).toFixed(2)}`).join('\n  '));
console.log('CHRONICLE:\n  '+w.chron.events.slice(0,14).map(e=>`Y${e.year} D${e.day} [${e.kind}] ${e.text}`).join('\n  '));
console.log('election/faction log:\n  '+w.log.filter(l=>/leads the council|coalition|term ends|first council|pledg/i.test(l.text)).slice(0,8).map(l=>`D${l.day} ${l.text}`).join('\n  '));
console.log('errors:',JSON.stringify([...w.dbg.errors.values()].map(e=>e.where+': '+e.msg+' x'+e.count+'\n'+e.stack)));
const L=ctx.deserializeWorld(JSON.parse(JSON.stringify(ctx.serializeWorld(w))));
console.log('reload: lessons',JSON.stringify(L.chron.lessons)===JSON.stringify(w.chron.lessons),'chron',L.chron.events.length,'ruling',L.gov.ruling&&L.gov.ruling.name);
for(let t=0;t<12000;t++)L.step();console.log('reloaded ran 10 days, pop',L.vills.length,'errors',L.dbg.total);
