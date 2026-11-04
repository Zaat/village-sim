// every map type at every allowed size: generates, starts on land, runs without errors, reports speed
const fs=require('fs'),vm=require('vm');
const code=['config','animals','villager','town','society','techtree','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','save','world'].map(f=>fs.readFileSync(__dirname+'/../src/'+f+'.js','utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,TERR,serializeWorld,deserializeWorld});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const SIZES={compact:[200,140],standard:[260,180],large:[340,236]};const DAYS=+process.argv[2]||60;
let bad=0;
for(const size of Object.keys(SIZES))for(const map of ['island','archipelago','continent','peninsula','lakeland','river']){
  if(size==='compact'&&(map==='island'||map==='archipelago'))continue;
  for(const seed of [5,77]){
    const t0=Date.now();const w=new ctx.World(seed,{map,fade:true},SIZES[size]);const tg=Date.now()-t0;
    const onLand=w.terr[(w.cy+2)*ctx.CFG.W+w.cx]>=2;
    const t1=Date.now();for(let t=0;t<1200*DAYS;t++)w.step();const ms=(Date.now()-t1)/(1200*DAYS);
    const d=ctx.serializeWorld(w);const w2=ctx.deserializeWorld(JSON.parse(JSON.stringify(d)));for(let t=0;t<600;t++)w2.step();
    const problem=!onLand||w.dbg.total||w2.dbg.total||w.vills.length<5;if(problem)bad++;
    console.log((problem?'PROBLEM ':'ok      ')+size.padEnd(9)+map.padEnd(12)+('s'+seed).padEnd(5)+'gen '+String(tg).padStart(4)+'ms  '+ms.toFixed(2)+' ms/tick  pop '+w.vills.length+' neigh '+(w.neigh?w.neigh.length:0)+(w.dbg.total?' errs '+[...w.dbg.errors.values()].map(e=>e.msg).join(';'):''));
  }
}
console.log(bad?'FAILED '+bad:'sizes passed');process.exit(bad?1:0);
