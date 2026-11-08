// One world for the insight report: node tools/insight_one.js SEED MAP DAYS  ->  one JSON line (summary + a few derived features)
const fs=require('fs'),vm=require('vm'),path=require('path');
const code=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','discovery','save','world'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,ST,statsSummary,CFG});';
const ctx={console:{log(){},error(){}},Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+process.argv[2],map=process.argv[3]||'island',days=+process.argv[4]||320;
const w=new ctx.World(seed,{map,survival:process.env.SURVIVAL==='1',raids:process.env.RAIDS==='1'});for(let t=0;t<1200*days;t++)w.step();
const S=ctx.ST(w),sm=ctx.statsSummary(w),n=S.days.length,third=Math.max(1,Math.floor(n/3)),avg=(id,a,b)=>{const x=S.s[id].slice(a,b);return x.length?x.reduce((p,c)=>p+c,0)/x.length:0};
const yrs=w.year,ev=k=>(S.ev[k]||{y:[]}).y,sumFrom=(k,y0)=>ev(k).slice(y0).reduce((p,c)=>p+c,0);
const unrestKeys=['coup','uprising','strike','rival_council','civil_strife'],y1=Math.floor(yrs/3);
const feat={...sm,regime:w.regime.label,map,seed,earlyGini:+avg('gini',0,third).toFixed(3),earlyMood:+avg('mood',0,third).toFixed(1),earlyWealth:+avg('wealth',0,third).toFixed(2),lateUnrest:unrestKeys.reduce((a,k)=>a+sumFrom(k,y1),0),earlyUnrest:unrestKeys.reduce((a,k)=>a+ev(k).slice(0,y1).reduce((p,c)=>p+c,0),0),lateGrowth:+((S.s.pop[n-1]-S.s.pop[2*third])/Math.max(1,(n-2*third)*4/32)).toFixed(2),lateMood:+avg('mood',2*third,n).toFixed(1),tradeLate:sumFrom('trip',y1)+sumFrom('deal',y1),errors:w.dbg.total};
console.log(JSON.stringify(feat));
