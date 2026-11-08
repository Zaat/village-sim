const fs=require('fs'),vm=require('vm'),path=require('path');const dir=path.join(__dirname,'..','src');
const code=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','discovery','voices','save','world'].map(f=>fs.readFileSync(path.join(dir,f+'.js'),'utf8')).join('\n')+'\n;globalThis.World=World;globalThis.Animal=Animal;globalThis.CFG=CFG;';
const ctx={console};vm.createContext(ctx);vm.runInContext(code,ctx);
const w=new ctx.World(777);for(let t=0;t<1200*12;t++)w.step();
console.log('pop before',w.vills.length);
for(let k=0;k<4;k++)w.animals.push(new ctx.Animal(w,'wolf',w.cx+8+k,w.cy+4));
const seen={};
for(let t=0;t<900;t++){w.step();if(t%30===0)for(const v of w.vills){if(/Fight|Charg|Flee|Hiding/.test(v.label))seen[v.label]=(seen[v.label]||0)+1}}
console.log('behaviors seen',JSON.stringify(seen));
console.log('wolves alive',w.animals.filter(a=>a.kind==='wolf'&&a.alive).length,'pop after',w.vills.length,'causes',JSON.stringify(w.causes));
console.log(w.log.slice(0,8).map(l=>l.text).join('\n'));
