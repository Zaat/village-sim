// Old saves lack newer statistics series: loading must backfill them and the daily record must not throw.
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,serializeWorld,deserializeWorld,STAT_SERIES});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
let bad=0; const ck=(ok,m)=>{if(!ok){bad++;console.log('FAIL',m)}else console.log('ok  ',m)};
const W=new ctx.World(31,{}); for(let t=0;t<1200*40;t++)W.step();
const d=JSON.parse(JSON.stringify(ctx.serializeWorld(W)));
for(const id of ['employed','trades','concerns','tage']) delete d.stats.s[id];     // as in a save from before those series existed
d.stats.s.pop.length = d.stats.days.length - 3;                                    // and one series that fell behind
const R=ctx.deserializeWorld(d);
const S=R.stats;
ck(Object.keys(S.s).length===ctx.STAT_SERIES.length,'all series present after load');
ck(ctx.STAT_SERIES.every(s=>S.s[s.id].length===S.days.length),'every series as long as days');
for(let t=0;t<1200*30;t++)R.step();
ck(R.dbg.total===0,'no errors after 30 more days ('+R.dbg.total+')');
ck(ctx.STAT_SERIES.every(s=>R.stats.s[s.id].length===R.stats.days.length),'series stay aligned after running');
process.exit(bad?1:0);
