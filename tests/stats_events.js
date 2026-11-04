// v0.23 statistics: counters agree with the world's own counts, series are sampled, thinning, csv, save/load, summary
const fs=require('fs'),vm=require('vm');
const code=['config','animals','villager','town','society','techtree','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','save','world'].map(f=>fs.readFileSync(__dirname+'/../src/'+f+'.js','utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,ST,STAT_EVENTS,STAT_SERIES,statCount,statsDay,statsSummary,statsCSV,statsRecords,evRate,evTotal,seriesPoints,serializeWorld,deserializeWorld,STAT_CAP});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const days=+process.argv[3]||260;const w=new ctx.World(+process.argv[2]||555,{map:process.argv[4]||'island'});
for(let t=0;t<1200*days;t++)w.step();
const S=ctx.ST(w);
ok(S.days.length===Math.floor((w.day-1)/4)||Math.abs(S.days.length-Math.floor(w.day/4))<=1,'series sampled every 4 days: '+S.days.length);
ok(ctx.STAT_SERIES.every(s=>S.s[s.id].length===S.days.length),'all series have equal length');
ok(ctx.evTotal(w,'born')===w.births-8||Math.abs(ctx.evTotal(w,'born')-w.births)<=12,'births counter ~ world births: '+ctx.evTotal(w,'born')+' vs '+w.births);
ok(ctx.evTotal(w,'died')===w.deaths,'deaths counter equals world deaths: '+ctx.evTotal(w,'died')+' vs '+w.deaths);
const causes=['died_age','died_hunger','died_cold','died_fever','died_wolf','died_sea','died_violence','died_other'].reduce((a,k)=>a+ctx.evTotal(w,k),0);ok(causes===ctx.evTotal(w,'died'),'death causes add up: '+causes);
const yr=S.ev.died.y.reduce((a,b)=>a+b,0);ok(yr===S.ev.died.n,'yearly columns add up to the total');
console.log('events:',ctx.STAT_EVENTS.map(e=>(S.ev[e.key]?e.key+'='+S.ev[e.key].n:null)).filter(Boolean).join(' '));
console.log('never seen:',ctx.STAT_EVENTS.filter(e=>!S.ev[e.key]).map(e=>e.key).join(' '));
const sm=ctx.statsSummary(w);ok(sm.pop===w.vills.length||Math.abs(sm.pop-w.vills.length)<10,'summary pop');ok(Object.values(sm).every(v=>Number.isFinite(v)),'summary numbers are finite');
const csv=ctx.statsCSV(w);ok(csv.split('\n').length>S.days.length,'csv has rows');ok(csv.startsWith('day,year,pop'),'csv header');
ok(ctx.statsRecords(w).length>=6,'records: '+ctx.statsRecords(w).length);ok(ctx.evRate(w,'born',3)>0,'rate of births');
const d=ctx.serializeWorld(w);const w2=ctx.deserializeWorld(JSON.parse(JSON.stringify(d)));ok(ctx.ST(w2).days.length===S.days.length&&ctx.evTotal(w2,'died')===ctx.evTotal(w,'died'),'stats survive save/load');
for(let t=0;t<1200*8;t++)w2.step();ok(ctx.ST(w2).days.length>S.days.length,'sampling continues after load');
// thinning
const w3=new ctx.World(9,{});const S3=ctx.ST(w3);for(let i=0;i<ctx.STAT_CAP+50;i++){w3.tick=(i*4+3)*1200;ctx.statsDay(w3)}ok(S3.days.length<=ctx.STAT_CAP&&ctx.STAT_SERIES.every(s=>S3.s[s.id].length===S3.days.length),'long runs are thinned: '+S3.days.length);
ok(w.dbg.total===0,'no errors: '+[...w.dbg.errors.values()].map(e=>e.where+' '+e.msg).join(';'));
console.log(fail?'FAILED '+fail:'stats passed '+pass);process.exit(fail?1:0);
