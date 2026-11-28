// Old saves lack newer statistics series: loading must backfill them and the daily record must not throw.
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=require('./lib').SRC.map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,serializeWorld,deserializeWorld,STAT_SERIES});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
let bad=0; const ck=(ok,m)=>{if(!ok){bad++;console.log('FAIL',m)}else console.log('ok  ',m)};
const W=new ctx.World(31,{}); for(let t=0;t<1200*40;t++)W.step();
const d=JSON.parse(JSON.stringify(ctx.serializeWorld(W)));
for(const id of ['employed','trades','concerns','tage']) delete d.stats.s[id];     // as in a save from before those series existed
d.stats.s.pop.length = d.stats.days.length - 3;                                    // and one series that fell behind
// v0.39.4: death-cause series added after a village began took the whole running total as their first day (a spike as tall as every death so far)
for(const id of ['d_age','d_hunger','d_cold','d_illness','d_other']){ delete d.stats.s[id]; delete d.stats.prev[id] }
d.stats.ev.died_age={n:5000,y:[]};
const R=ctx.deserializeWorld(d);
const S=R.stats;
ck(Object.keys(S.s).length===ctx.STAT_SERIES.length,'all series present after load');
ck(ctx.STAT_SERIES.every(s=>S.s[s.id].length===S.days.length),'every series as long as days');
for(let t=0;t<1200*30;t++)R.step();
ck(R.dbg.total===0,'no errors after 30 more days ('+R.dbg.total+')');
ck(Math.max(...R.stats.s.d_age)<100,'a new death series starts from today, not from the running total ('+Math.max(...R.stats.s.d_age)+')');
{ // and a spike already in a saved village is repaired once, on load
  const d2=JSON.parse(JSON.stringify(ctx.serializeWorld(W))), n=d2.stats.days.length; delete d2.stats.fix394;
  for(const id of ['d_age','d_hunger','d_cold','d_illness','d_other']) d2.stats.s[id]=new Array(n).fill(0);
  d2.stats.s.d_age[3]=2733; d2.stats.s.d_hunger[3]=17; d2.stats.s.d_age[7]=3;
  const R2=ctx.deserializeWorld(d2);
  ck(R2.stats.s.d_age[3]===0&&R2.stats.s.d_hunger[3]===0&&R2.stats.s.d_age[7]===3,'a saved spike as tall as the running total is removed, real days are kept');
  const d3=JSON.parse(JSON.stringify(ctx.serializeWorld(W))); delete d3.stats.fix394; const m=d3.stats.days.length; d3.stats.s.d_age=new Array(m).fill(0); d3.stats.s.d_age[5]=4; d3.stats.s.d_age[8]=3;
  const R3=ctx.deserializeWorld(d3); ck(R3.stats.s.d_age[5]===4,'small first days are left alone');
}
ck(ctx.STAT_SERIES.every(s=>R.stats.s[s.id].length===R.stats.days.length),'series stay aligned after running');
process.exit(bad?1:0);
