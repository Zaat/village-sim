// Grants every technology early so camps, docks, boats and upgrades can be exercised: node tests/techforce.js SEED DAYS
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','tech','water','trade','projects','history','places','neighbours','diplomacy','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,TECHS,techEra,serializeWorld,deserializeWorld});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+(process.argv[2]||777),days=+(process.argv[3]||110);
const w=new ctx.World(seed);
for(let d=1;d<=days;d++){
  for(let t=0;t<1200;t++)w.step();
  if(d===24){for(const id of Object.keys(ctx.TECHS))w.tech.known[id]=d;w.say('(test) all technologies granted')}
  if(d%16===0||d===days){const c=t=>w.of(t).length,styles={};for(const h of w.houses())styles[h.style||0]=(styles[h.style||0]||0)+1;
    console.log(`D${d} pop=${w.vills.length} food=${w.stock.food} wood=${w.stock.wood} stone=${w.stock.stone} logcamp=${c('logcamp')} minecamp=${c('minecamp')} lodge=${c('lodge')} docks=${c('dock')} boats=${w.boats.length} styles=${JSON.stringify(styles)} cobbled=${w.road.filter(x=>x===2).length} bps=${w.bps.map(b=>b.type).join(',')} era=${ctx.techEra(w)}`)}
}
const fish={}; for(const v of w.vills){ if(/boat|Sail|Fishing at sea|dock/i.test(v.label)) fish[v.label]=(fish[v.label]||0)+1 }
{ const ad=w.vills.filter(v=>v.isAdult()),cs=ad.map(v=>v.coins||0).sort((a,b)=>a-b),E=w.econ;
  console.log(`ECON: markets=${w.of('market').length} treasury=${Math.round(E.treasury)} prices=${JSON.stringify(E.prices)} sold=${Math.round(E.sold)} bought=${Math.round(E.bought)} spent=${Math.round(E.spent)} comfort=${E.comfort} taxPolicy=${w.gov.policy.tax}`);
  console.log(`WEALTH: adults=${ad.length} median=${cs[cs.length>>1]} max=${cs[cs.length-1]} min=${cs[0]} withCoins=${cs.filter(x=>x>0).length} total=${cs.reduce((a,b)=>a+b,0)}`);
  console.log('TRADES:\n  '+E.trades.slice(0,6).map(t=>`D${t.day} ${t.text}`).join('\n  ')); }
console.log('boat activity now:',JSON.stringify(fish),'| boats states:',w.boats.map(b=>b.state).join(','));
console.log('camp/dock log:',w.log.filter(l=>/camp|dock|lodge|boat/i.test(l.text)).slice(0,8).map(l=>`D${l.day} ${l.text}`).join(' | '));
console.log('errors:',JSON.stringify([...w.dbg.errors.values()].map(e=>e.where+': '+e.msg+' x'+e.count+'\n'+e.stack)));
// save/load round trip with docks, boats, camps, styles
const L=ctx.deserializeWorld(JSON.parse(JSON.stringify(ctx.serializeWorld(w))));
console.log('reload: boats',L.boats.length,'docks',L.of('dock').length,'camps',L.of('logcamp').length+L.of('minecamp').length+L.of('lodge').length,'styles equal',JSON.stringify(L.houses().map(h=>h.style||0))===JSON.stringify(w.houses().map(h=>h.style||0)),'campAdj',L.campAdj.wood.reduce((a,b)=>a+b,0)===w.campAdj.wood.reduce((a,b)=>a+b,0));
for(let t=0;t<1200*10;t++)L.step(); console.log('reloaded village ran 10 more days, pop',L.vills.length,'errors',L.dbg.total);
