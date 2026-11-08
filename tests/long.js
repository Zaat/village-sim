// Long-run stability probe: node tests/long.js SEED MAXDAYS [survival]
const fs=require('fs'),vm=require('vm'),path=require('path');const dir=path.join(__dirname,'..','src');
const files=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','discovery','voices','save','world'];
const code=files.map(f=>fs.readFileSync(path.join(dir,f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,TECHS});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+(process.argv[2]||777),maxDays=+(process.argv[3]||460),mode=process.argv[4]||'',surv=mode==='survival';
const w=new ctx.World(seed,{survival:surv,disasters:true,crime:true});
const errs=new Map();let tAll=Date.now(),tWin=Date.now(),ticksWin=0;
function log(...a){console.log(...a)}
for(let d=1;d<=maxDays;d++){
  for(let t=0;t<ctx.CFG.TPD;t++){
    try{w.step()}catch(e){const k=(e.stack||String(e)).split('\n').slice(0,3).join(' | ');const n=(errs.get(k)||0)+1;errs.set(k,n);if(n===1)log(`!! ERROR day ${w.day} tick ${w.tick}: ${k}`);if(errs.size>6){log('too many distinct errors, abort');process.exit(1)}}
    ticksWin++;
  }
  if(mode==='alltech'&&d===24){for(const id of Object.keys(ctx.TECHS))w.tech.known[id]=d}
  if(d%16===0||d===maxDays){
    const ms=(Date.now()-tWin)/ticksWin;tWin=Date.now();ticksWin=0;
    log(`D${d} Y${w.year} pop=${w.vills.length} animals=${w.animals.length} bps=${w.bps.length} rel=${w.rel.size} groups=${w.groups.length} tech=${Object.keys(w.tech.known).length} camps=${w.of('logcamp').length+w.of('minecamp').length+w.of('lodge').length} boats=${w.boats.length} food=${w.stock.food} wood=${w.stock.wood} stone=${w.stock.stone} houses=${w.houses().length} farms=${w.of('farm').length} ms/tick=${ms.toFixed(2)} heap=${(process.memoryUsage().heapUsed/1048576).toFixed(0)}MB elapsed=${((Date.now()-tAll)/1000).toFixed(0)}s`);
  }
  if(w.vills.length===0){log('EXTINCT at day',d);break}
}
log('DONE day',w.day,'errors',JSON.stringify([...errs]));
