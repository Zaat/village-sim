// Forces each regime event and checks it behaves: node tests/regime_events.js
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','discovery','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,regimeEvents,tryCoup,uprising,managedElection,holdElection,onChiefDeath,chiefOf,adultsOf,regimeDay,crisisIndex});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const w=new ctx.World(777);for(let d=1;d<=90;d++){for(let t=0;t<1200;t++)w.step()}
const log=[];w.listeners.push((t,txt)=>{if(t==='regime'||t==='election')log.push(`[${t}] ${txt}`)});
const R=w.regime,ad=()=>ctx.adultsOf(w),force=fn=>{const o=w.rng;w.rng=()=>0.001;try{fn()}finally{w.rng=o}};
let ok=0,bad=0;const check=(name,cond,extra)=>{console.log((cond?'PASS ':'FAIL ')+name+(extra?'  '+extra:''));cond?ok++:bad++};
// 1 prophet
{const a=ad().filter(v=>v.age<70).sort((x,y)=>y.charisma()-x.charisma())[0];a.char.piety=0.95;R.prophet=null;R.lastProphet=-999;R.lastCoup=w.day;const p0=R.ax.pious;force(()=>ctx.regimeEvents(w,0.6,70,ad()));check('prophet rises',!!R.prophet&&R.ax.pious>p0,R.prophet&&R.prophet.name)}
// 2 coup
{R.lastCoup=-999;R.ax.auth=0.4;const chief=ctx.chiefOf(w),c=ad().filter(v=>v!==chief&&v.age<60)[0];c.char.amb=0.95;c.char.ruth=0.9;c.reputation=100;c.trait.soc=0.95;for(const o of ad())if(o!==c)o.char.amb=Math.min(o.char.amb,0.3);const grp=ad().filter(v=>v!==chief&&v!==c).slice(0,6);for(const g of grp){g.char.ruth=0.6;w.rel.set(w.relKey(c,g),60)}R.lastCoup=-999;const a0=R.ax.auth,cp0=R.coups;force(()=>ctx.regimeEvents(w,0.8,45,ad()));const nc=ctx.chiefOf(w);check("coup seizes power",R.coups===cp0+1&&nc&&nc.id===c.id&&R.ax.auth>a0,nc&&nc.name)}
// 3 managed election under high authority
{R.ax.auth=0.8;R.noManage=0;const chief=ctx.chiefOf(w);ctx.holdElection(w,'term');const nc=ctx.chiefOf(w);check('managed election keeps the chief',nc&&nc.id===chief.id&&log.some(l=>/does not stand/.test(l)))}
// 4 purge
{R.ax.auth=0.85;const chief=ctx.chiefOf(w);chief.char.ruth=0.9;R.lastPurge=-999;const p0=R.purges;force(()=>ctx.regimeEvents(w,0.3,55,ad()));check('purge happens',R.purges>p0)}
// 5 uprising
{R.ax.auth=0.8;for(const v of ad())v.mood=20;R.unrest=40;const a0=R.ax.auth,r0=R.revolts;force(()=>ctx.regimeEvents(w,0.2,20,ad()));check('uprising overthrows',R.revolts>r0&&R.ax.auth<a0)}
// 6 succession by heir
{R.ax.auth=0.7;const chief=ctx.chiefOf(w);const kid=ad().find(v=>v!==chief);chief.kids=[kid.id];kid.parentIds=[chief.id];ctx.regimeDay(w);check('heir designated',R.heir===kid.id);const dyn=R.dynasty;ctx.onChiefDeath(w,chief);const nc=ctx.chiefOf(w);check('heir inherits',R.dynasty===dyn+1&&nc&&nc.id===kid.id,nc&&nc.name)}
console.log('\nrecent events:\n  '+log.slice(-8).join('\n  '));
// let the world run on and check stability
for(let t=0;t<1200*20;t++)w.step();
console.log('after 20 more days: pop',w.vills.length,'label',R.label,'errors',w.dbg.total,JSON.stringify([...w.dbg.errors.values()].map(e=>e.where+': '+e.msg+'\n'+e.stack)));
console.log(`\n${ok} passed, ${bad} failed`);process.exit(bad?1:0);
