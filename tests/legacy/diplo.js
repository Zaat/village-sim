// Diplomacy: node tests/diplo.js SEED DAYS [raids] [natural]
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=require('../lib').SRC.map(f=>fs.readFileSync(path.join(__dirname,'..','..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,TECHS,CFG,serializeWorld,deserializeWorld});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+(process.argv[2]||777),days=+(process.argv[3]||200),raids=process.argv[4]==='raids',natural=process.argv.includes('natural');
const w=new ctx.World(seed,{raids});
const ev=[];w.listeners.push((t,txt)=>{if(t==='diplomacy'||t==='trade'&&/ships of/i.test(txt||''))ev.push(`D${w.day} ${txt}`)});
if(process.argv.includes('hostile'))w.neigh.forEach(n=>{if(n.kind==='raiders'){n.hostileTest=true}});
for(let d=1;d<=days;d++){if(process.argv.includes('hostile')&&d===60){const n=w.neigh.find(n=>n.kind==='raiders');n.rel=-40;n.grudge=0.4;n.pact=0;n.tribute=0}for(let t=0;t<1200;t++)w.step();if(d===24&&!natural)for(const id of Object.keys(ctx.TECHS))w.tech.known[id]=24;
 if(d%40===0||d===days)console.log(`D${d} pop=${w.vills.length} food=${w.stock.food} wood=${w.stock.wood} `+w.neigh.map(n=>`${n.name.slice(0,6)}[${n.kind[0]}] ${n.found?Math.round(n.rel):'?'} p${n.pact}`).join(' | '))}
console.log(ev.length+' diplomatic events; first 40:\n'+ev.slice(0,40).join('\n'));
console.log('deaths by cause',JSON.stringify(w.causes));
console.log('lessons',JSON.stringify(Object.fromEntries(Object.entries(w.chron.lessons).filter(e=>e[1]>0.02).map(e=>[e[0],+e[1].toFixed(2)]))));
console.log('errors:',JSON.stringify([...w.dbg.errors.values()].map(e=>e.where+': '+e.msg+' x'+e.count+'\n'+e.stack)));
const L=ctx.deserializeWorld(JSON.parse(JSON.stringify(ctx.serializeWorld(w))));console.log('reload ok',L.neigh.map(n=>n.pact).join(','),'fortify',L.fortifyUntil);for(let t=0;t<12000;t++)L.step();console.log('ran 10 days, errors',L.dbg.total);
