// regression: hungry villagers with unreachable stores must not flood-search the whole map every tick
const fs=require('fs'),vm=require('vm');
const code=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','save','world'].map(f=>fs.readFileSync(__dirname+'/../src/'+f+'.js','utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const w=new ctx.World(4242,{});
for(let t=0;t<1200*20;t++)w.step();
w.storeAdj.fill(0);                       // stores become unreachable
w.stock.food=50;
for(const v of w.vills){v.hunger=10}
const t0=performance.now();for(let t=0;t<300;t++){w.step();for(const v of w.vills)if(v.hunger>5)v.hunger=5}
const ms=(performance.now()-t0)/300;
console.log('ms/tick with unreachable stores',ms.toFixed(2),'villagers',w.vills.length);
if(ms>5){console.log('FAILED: slow');process.exit(1)}console.log('unreach passed');
