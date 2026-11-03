// which parts of the division formula keep unity low: node tools/probe_div.js SEED MAP DAYS
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','techtree','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','stats','concerns','outposts','bridges','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG});';
const ctx={console:{log(){},error(){}},Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const [seed,map,days]=[+process.argv[2],process.argv[3]||'continent',+process.argv[4]||900];
const names=['rivals','polarised','discontent','piety','gaps','opposition','alienation','inequality','coup','purge','strife'];
const w=new ctx.World(seed,{map});
for(let d=1;d<=days;d++){for(let t=0;t<1200;t++)w.step();
  if(d%64===0&&w.regime.divParts){const p=w.regime.divParts;console.log('y'+Math.round(d/32),'unity',w.regime.ax.cohes.toFixed(2),'div',w.regime.div.toFixed(2),names.map((n,i)=>n+'='+p[i].toFixed(2)).join(' '))}}
