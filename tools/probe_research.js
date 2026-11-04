// node tools/probe_research.js SEED MAP YEARS [OPEN] [PHIL] : research pace. Known techs, age, blocked-by-gate, scholar cap hits, pop, every 5 years.
const fs=require('fs'),vm=require('vm'),path=require('path');
const files=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','save','world'];
const code=files.map(f=>fs.readFileSync(path.join(process.env.SRC||path.join(__dirname,'..','src'),f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,TECHS,AGES,techBlocked,techGaps,GATES,techEra});';
const ctx={console:{log(){},error(){}},Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+process.argv[2]||12,map=process.argv[3]||'island',years=+process.argv[4]||40,open=+process.argv[5]||0,philosophy=process.argv[6]||'balanced';
const w=new ctx.World(seed,{map,openKnowledge:open,philosophy});const total=Object.keys(ctx.TECHS).length;
for(let d=1;d<=years*32;d++){for(let t=0;t<1200;t++)w.step();
 if(d%160===0){const k=Object.keys(w.tech.known).length,bl=ctx.techBlocked(w),gaps={};for(const id of bl)for(const g of ctx.techGaps(w,id))gaps[g]=(gaps[g]||0)+1;
  console.log(`Y${d/32} pop ${w.vills.length} known ${k}/${total} (${Math.round(100*k/total)}%) age ${ctx.AGES[ctx.techEra(w)]} blocked ${bl.length} ${JSON.stringify(gaps)} focus ${w.tech.focus||'-'} capHit ${w.tech.capHit||0} works ${w.terra.built}/${w.terra.tiles}t towers ${[...w.buildings.values()].filter(b=>b.type==='house'&&b.style===6).length} loy ${(w.out&&w.out.list||[]).filter(o=>o.state==='live'||o.state==='active').map(o=>Math.round(o.loyalty*100)).join('/')} err ${w.dbg.total}`)}}
