// Concern states (v0.24.2a): gauge, responding, easing, failed, council nudges, resolved list
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CN,concernsDay,respond,responseState,concernState,concernGauge,actLive,RESPONSES});';
const ctx={console:{log(){},error(){}},Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++}else{fail++;console.log('FAIL',m)}};
const day=(w,n=1)=>{for(let d=0;d<n;d++){for(let t=0;t<1200;t++)w.step()}};
const w=new ctx.World(31,{map:'island'});day(w,60);const C=ctx.CN(w);
// attention: fresh critical food concern, no response yet
w.stock.food=Math.floor(w.vills.length*0.8);ctx.concernsDay(w);
let c=C.list.find(x=>x.key==='food');ok(c&&c.m&&c.m.v<c.m.ok,'food concern carries a metric');
let st=ctx.concernState(w,c);ok(st.state==='attention','fresh concern needs attention ('+st.state+')');ok(st.frac>0.5,'severity bar is high when food is very low ('+st.frac.toFixed(2)+')');
// responding: ration is live with a countdown
ok(ctx.respond(w,'ration',c.key),'ration accepted');st=ctx.concernState(w,c);ok(st.state==='responding'&&st.live.length===1,'ration makes the concern responding');
ok(c.acts[0].until-c.acts[0].start===16,'ration lasts 16 days');
ok(!ctx.respond(w,'ration',c.key),'cooldown blocks repeating it');
// failed: ration ends, food still low
for(let i=0;i<18;i++){w.stock.food=Math.floor(w.vills.length*0.8);w.tick+=1200;ctx.concernsDay(w)}
c=C.list.find(x=>x.key==='food');st=ctx.concernState(w,c);ok(st.state==='failed','ended response with trouble remaining is "failed" ('+st.state+')');
// another response is possible again, and returns to responding
ok(ctx.respond(w,'hands_food',c.key),'a different response can follow');ok(ctx.concernState(w,c).state==='responding','second response is live');
// easing: food recovers while no response live
w.tick+=30*1200;w.stock.food=Math.floor(w.vills.length*1.5);for(let i=0;i<10;i++){w.stock.food+=w.vills.length*0.1;w.tick+=1200;ctx.concernsDay(w)}
c=C.list.find(x=>x.key==='food');if(c){st=ctx.concernState(w,c);ok(st.trend<=0,'trend is not worsening as food recovers ('+st.trend+')')}
// resolved: concern leaves with what was tried
w.stock.food=w.vills.length*8;for(let i=0;i<5;i++){w.tick+=1200;ctx.concernsDay(w)}
const h=C.hist.find(x=>x.key==='food');ok(h&&h.did&&h.did.includes('Ration food'),'resolved concern remembers responses tried');
// council nudge: stays "council deciding" until it answers; declined is recorded
w.regime.ax.auth=0.9;w.vills.splice(0,Math.floor(w.vills.length*0.35));ctx.concernsDay(w);
const pf=C.list.find(x=>x.key==='pop_fall');ok(pf,'population fall raised');
if(pf){C.cd.nudge_family=0;ok(ctx.respond(w,'nudge_family',pf.key),'nudge accepted');const a=pf.acts[pf.acts.length-1];
 ok(['council','heeded','declined'].includes(a.status),'nudge act has a council status ('+a.status+')');
 let g=0;while(a.status==='council'&&g++<40){day(w,1)}
 ok(a.status!=='council','council eventually answers ('+a.status+' after '+g+' days)');
 if(a.status==='declined')ok(ctx.concernState(w,pf).state==='failed'||ctx.concernState(w,pf).state==='easing','declined nudge leaves concern failed or easing')}
// save round trip
const snap=JSON.parse(JSON.stringify(w.concerns));ok(snap.list.every(x=>Array.isArray(x.acts)),'acts serialise');
console.log(`concerns_states: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
