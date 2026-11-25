// [CP=checkpointName] node tools/probe_wood.js SEED MAP YEARS [HARDSHIP] : firewood and timber runs by boat, every year.
const fs=require('fs'),vm=require('vm'),path=require('path');
const files=require('../tests/lib').SRC;
const code=files.map(f=>fs.readFileSync(path.join(process.env.SRC||path.join(__dirname,'..','src'),f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,evTotal,winterWood,deserializeWorld});';
const ctx={console:{log(){},error(){}},Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+process.argv[2]||12,map=process.argv[3]||'island',years=+process.argv[4]||10,hard=process.argv[5]===undefined?1:+process.argv[5];
const zlib=require('zlib');const w=process.env.CP?ctx.deserializeWorld(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'..','tests','checkpoints',process.env.CP+'.json.gz'))))):new ctx.World(seed,{map,hardship:hard});const faults=[];const f0=w.fault.bind(w);w.fault=(k,e,en)=>{faults.push(k+': '+String(e&&e.stack||e).split('\n').slice(0,3).join(' | '));return f0(k,e,en)};
let cold=0;
for(let d=1;d<=years*32;d++){for(let t=0;t<1200;t++)w.step(); if(w.cold)cold++;
 if(d%32===0){const T=w.timber||{};
  console.log(`Y${(d/32).toFixed(0)}+${process.env.CP?'cp':''} pop ${w.pop} wood ${Math.floor(w.stock.wood)} food ${Math.floor(w.stock.food)} trees ${w.trees}/${w.trees0} boats ${w.boats.length} woodcutters ${w.vills.filter(v=>v.role==='woodcutter').length} cold days ${cold} cold deaths ${ctx.evTotal(w,'died_cold')} hunger deaths ${ctx.evTotal(w,'died_hunger')} | timber runs ${T.runs||0} wood ${T.wood||0} lost ${T.lost||0} none ${T.none||0} why "${T.why||''}"`)}}
console.log('faults',faults.length,faults.slice(0,4));
