const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','outposts','bridges','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,styleNow,planUpgrades,resourceTargets});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const w=new ctx.World(777);
for(let t=0;t<1200*70;t++)w.step();
console.log('day',w.day,'known',JSON.stringify(w.tech.known),'styleNow',ctx.styleNow(w));
console.log('house styles',w.houses().map(h=>h.style).join(','));
const {tgt,eff}=ctx.resourceTargets(w);console.log('wood',Math.round(eff.wood),'/',Math.round(tgt.wood),'stone',Math.round(eff.stone),'/',Math.round(tgt.stone),'food',w.stock.food,'pop',w.vills.length,'nextUpgrade',w.nextUpgrade,'bps',w.bps.map(b=>b.type).join(','));
ctx.planUpgrades(w);console.log('after planUpgrades bps:',w.bps.map(b=>b.type+(b.toStyle?'->'+b.toStyle:'')).join(','));
