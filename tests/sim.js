// Headless engine test: node tests/sim.js [seed] [days]
const fs=require('fs'),vm=require('vm'),path=require('path');
const dir=path.join(__dirname,'..','src');
const code=['config','animals','villager','town','world'].map(f=>fs.readFileSync(path.join(dir,f+'.js'),'utf8')).join('\n')+'\n;globalThis.World=World;globalThis.CFG=CFG;';
const ctx={console};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+(process.argv[2]||12345),days=+(process.argv[3]||96);
const w=new ctx.World(seed);
console.log('start',w.cx,w.cy,'fishOK',w.fishOK,'animals',w.animals.length);
const t0=Date.now();
for(let d=1;d<=days;d++){
  for(let t=0;t<ctx.CFG.TPD;t++)w.step();
  if(d%4===0||d<3){
    const roles={};for(const v of w.vills)roles[v.role||'-']=(roles[v.role||'-']||0)+1;
    const an={};for(const a of w.animals)an[a.kind]=(an[a.kind]||0)+1;
    console.log(`D${d} Y${w.year} ${['Sp','Su','Au','Wi'][w.season]} pop=${w.vills.length} kids=${w.vills.filter(v=>v.isChild()).length} stock=${JSON.stringify(w.stock)} cap=${w.cap()} houses=${w.houses().length} farms=${w.of('farm').length} stores=${w.of('store').length} roads=${w.road.reduce((a,b)=>a+b,0)} bps=${w.bps.length} b/d=${w.births}/${w.deaths} cold=${w.cold} roles=${JSON.stringify(roles)} animals=${JSON.stringify(an)}`);
  }
}
console.log('ms',Date.now()-t0);console.log('causes',JSON.stringify(w.causes));
console.log(w.log.slice(0,14).map(l=>`D${l.day} ${l.text}`).join('\n'));
