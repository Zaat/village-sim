// node tools/probe_city.js SEED [MAP|auto] [YEARS] [SIZE]: city structure per year (styles, hamlets, land value, paving, clearing) and faults
const fs=require('fs'),vm=require('vm'),path=require('path');
const files=require('../tests/lib').SRC;
const code=files.map(f=>fs.readFileSync(path.join(process.env.SRC||path.join(__dirname,'..','src'),f+'.js'),'utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,pickMapType,cityStats,placeFunnel,housingDiag});';
const ctx={console:{log(){},error(){}},Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
const seed=+process.argv[2]||351323045,years=+process.argv[4]||15,size=process.argv[5]||'standard';
const dims={compact:[200,140],standard:[260,180],large:[340,236]}[size];
let map=process.argv[3];if(!map||map==='auto')map=ctx.pickMapType(seed);
const w=new ctx.World(seed,{map,fade:true},dims);const faults=[];const f0=w.fault.bind(w);w.fault=(k,e,en)=>{faults.push(k+': '+String(e&&e.stack||e).split('\n').slice(0,3).join(' | '));return f0(k,e,en)};
console.log('seed',seed,'map',map,size);
const t0=Date.now();
for(let d=1;d<=years*32;d++){for(let t=0;t<1200;t++)w.step();
 if(d%32===0){const s=ctx.cityStats(w),h=w._heat;let hot=0;if(h)for(let i=0;i<h.length;i++)if(h[i]>=18)hot++;
  console.log(`Y${d/32} pop ${w.vills.length} homes ${s.houses} beds ${w.beds()} styles ${s.byStyle.join('/')} core ${s.core} inner ${s.inner} outer ${s.outer} hamlet ${s.hamlet} (${s.hamlets.map(x=>x.name+':'+x.n).join(', ')}) lv ${s.avgLv}/${s.vmax} paved ${s.paved} surf ${s.surfaced} hot ${hot} cleared f${s.cleared.farm} r${s.cleared.ruin} roads ${w.road.reduce((a,b)=>a+(b?1:0),0)} farms ${w.of("farm").length} shops ${w.of("workshop").length} trees ${w.trees} wood ${w.stock.wood|0} ${((Date.now()-t0)/1000)|0}s`)}}
console.log('faults',faults.length,faults.slice(0,4));
