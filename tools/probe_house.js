// node tools/probe_house.js SEED [MAP] [YEARS] [SIZE]: housing per year (homes, beds, pop, wood, stone, building sites and why a house was not placed)
const fs=require('fs'),vm=require('vm'),path=require('path');
const files=require('../tests/lib').SRC;
const code=files.map(f=>fs.readFileSync(path.join(process.env.SRC||path.join(__dirname,'..','src'),f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,pickMapType,MAP_TYPES,placeFunnel});';
const ctx={console:{log(){},error(){}},Buffer,performance};vm.createContext(ctx);
try{vm.runInContext(code,ctx)}catch(e){}
const seed=+process.argv[2]||351323045,years=+process.argv[4]||35,size=process.argv[5]||'standard';
const dims={compact:[200,140],standard:[260,180],large:[340,236]}[size];
let map=process.argv[3];if(!map||map==='auto'){map=(ctx.pickMapType?ctx.pickMapType(seed):'island')}
const w=new ctx.World(seed,{map,fade:true},dims);
console.log('seed',seed,'map',map,size,dims.join('x'));
for(let d=1;d<=years*32;d++){for(let t=0;t<1200;t++)w.step();
 if(d%32===0){const hb=w.bps.filter(b=>b.type==='house'),all=w.bps.filter(b=>b.type!=='road');
  console.log(`Y${d/32} pop ${w.vills.length} homes ${w.houses().length} beds ${w.beds()} bpHouse ${hb.length} (workers ${hb.reduce((a,b)=>a+b.workers,0)}, ready ${hb.filter(b=>b.ready()).length}) structBps ${all.length}/${2+Math.floor(w.vills.length/8)} wood ${w.stock.wood|0} stone ${w.stock.stone|0} food ${w.stock.food|0} style ${typeof styleNow==='function'?'':''} noRoom ${w.noRoom==null?'-':d-w.noRoom} sprawl ${w.sprawl||0} deferred ${w.dbg.deferred||0}`+(()=>{const a=ctx.placeFunnel(w,"house",false),b=ctx.placeFunnel(w,"house",true);return `\n   funnel close: ${JSON.stringify(a)}\n   funnel wide:  ${JSON.stringify(b)}`})())}}
