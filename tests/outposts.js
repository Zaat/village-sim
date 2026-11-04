// v0.21 outposts: planning, founding, growth, hauls, loyalty, break-away, save/load
const fs=require('fs'),vm=require('vm');
const code=['config','animals','villager','town','society','techtree','unlocks','tech','water','trade','projects','history','buildings','places','neighbours','diplomacy','routes','mapgen','character','regime','strife','lives','livelihoods','stats','concerns','outposts','bridges','terraform','save','world'].map(f=>fs.readFileSync(__dirname+'/../src/'+f+'.js','utf8')).join('\n')+'\n;Object.assign(globalThis,{World,CFG,serializeWorld,deserializeWorld,planOutpost,sendSettlers,findOutpostSites,OP,outTend,breakAway,TERR});';
const ctx={console,Buffer,performance};vm.createContext(ctx);vm.runInContext(code,ctx);
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const seed=+process.argv[2]||777, map=process.argv[3]||'island';
const w=new ctx.World(seed,{map});
for(let t=0;t<1200*70;t++)w.step();
console.log('pop',w.vills.length,'day',w.day,'dbg',w.dbg.total);
const sites=ctx.findOutpostSites(w);ok(sites.length>0,'finds sites');console.log('sites',sites.map(s=>s.role+'@'+s.x+','+s.y+' d'+Math.round(s.d)+(s.same?' land':' sea')).join(' | '));
const p=ctx.planOutpost(w);ok(!!p,'plan');console.log('plan',p&&{role:p.role,mode:p.mode,days:p.days,ratio:p.cb.ratio.toFixed(2),go:p.cb.go});
if(p){const n0=w.vills.length;ok(ctx.sendSettlers(w,p),'send');ok(w.vills.length<n0,'settlers left');const o=ctx.OP(w).list[0];ok(o&&o.state==='travelling','travelling');
  for(let t=0;t<1200*(p.days+2);t++)w.step();ok(o.state==='active'||o.fate==='lost','arrived or lost: '+o.state);
  if(o.state==='active'){for(let t=0;t<1200*120;t++)w.step();console.log('outpost after 120d',o.state,o.pop,o.stage,'loyalty',o.loyalty.toFixed(2),'hauled',o.hauled,'back',JSON.stringify(ctx.OP(w).back),'sent',JSON.stringify(ctx.OP(w).sent));
    ok(o.pop>=3||o.state==='gone','alive or ended cleanly');
    const d=ctx.serializeWorld(w);const w2=ctx.deserializeWorld(JSON.parse(JSON.stringify(d)));ok(ctx.OP(w2).list.length===ctx.OP(w).list.length,'save keeps outposts');for(let t=0;t<1200*10;t++)w2.step();ok(w2.dbg.total===0,'no errors after load: '+[...w2.dbg.errors.values()].map(e=>e.msg).join(';'));
    const o2=ctx.OP(w).list.find(x=>x.state==='active');if(o2){o2.loyalty=0.05;o2.pop=Math.max(o2.pop,9);o2.lowDays=7;const nn=w.neigh.length;ctx.outTend(w,o2);for(let i=0;i<10&&o2.state==='active';i++){o2.loyalty=0.05;o2.lowDays=8;ctx.outTend(w,o2)}ok(o2.state==='gone'&&w.neigh.length===nn+1,'break-away makes a neighbour')}}}
ok(w.dbg.total===0,'no errors: '+[...w.dbg.errors.values()].map(e=>e.where+' '+e.msg).join(';'));
console.log(fail?'FAILED '+fail:'outposts passed '+pass);process.exit(fail?1:0);
